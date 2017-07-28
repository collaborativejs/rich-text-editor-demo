var express = require('express');
var bodyParser = require('body-parser');
var uuid = require('uuid');
var clv = require('collaborative');
var path = require('path');
var fs = require('fs');


// Creates server instance with JSON requests and static files support
var app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/node_modules/collaborative/dist'));
app.use(express.static(__dirname + '/public'));

var initialText = fs.readFileSync(__dirname + '/public/initial_text.md', 'utf8');


// Crates in-memory storage
// Note: As far as Node.js is single-threaded by its nature, for the example application
// we can use regular JavaScript object. In the real life application, you will need to replace
// it with the disk database (like MongoDB, MySQL, PostgreSQL, etc.) or with the in-memory database
// (like Redis, Tarantool, etc.) with replication to disk database.
var storage = {};

/**
 * Creates new Collaborative.js document representation for the storage.
 * Object fields:
 *   id - Unique string to identify the document. See docs at http://collaborativejs.org/api/clv#clvdocid
 *   data - Data stored in the document. Depends on the type of the document,
 *        can be one of the supported data types. See docs at http://collaborativejs.org/docs/supported-data-types
 *   ops - List of all operations that had ever been executed on the document.
 *        These operations can be used in the transformation process in cases of undo, redo and some other.
 *        See operation definition at http://collaborativejs.org/api/clv#clvlocaloperation
 *   execOrder - Index of the last valid operation executed on the document.
 *        See docs at http://collaborativejs.org/api/clv#clvexecorder
 *   context - Context object describes current state of the document on the certain site.
 *        See docs at http://collaborativejs.org/api/clv#clvcontext
 * @return {Object}
 */
function createDocument() {
  // Generates RFC4122 v4 UUID (random based) for the document.
  var id = uuid.v4();

  // Creates new document data.
  var document = {
    id: id,
    data: initialText,
    ops: [],
    execOrder: 0,
    context: null
  };

  // Saves it to the storage.
  storage[id] = document;

  return document;
}


/**
 * Defines the endpoint to access the document.
 * Note: In the Collaborative.js terminology, each client accessing the document is called a site and must have an ID.
 * See http://collaborativejs.org/api/clv#clvsiteid to learn more about site IDs.
 */
app.get('/:id?', function(req, res) {
  var documentId = req.params.id;
  var document = null;

  // If document id is passed, looks for the document data. Otherwise creates the new one.
  if (documentId) {
    document = storage[documentId];
  } else {
    document = createDocument();
  }

  if (document) {
    // Generates RFC4122 v1 UUID (timestamp based) for the site.
    var id = uuid.v1();

    // Generates site data.
    var site = {id: id, document: document};

    // For example application we are using a fs.readFileSync and string replace methods to render the page,
    // in real world application you might use one of the dozens Node.js templating engines.
    var template = fs.readFileSync(__dirname + '/index.html').toString();
    var page = template.replace("'{{site}}'", JSON.stringify(site));

    res.send(page);
  } else {
    res.status(404);
    res.send('Document not found');
  }
});


/**
 * Defines the endpoint to update a document.
 */
app.post('/:id/update', function(req, res) {
  var documentId = req.params.id;
  var execOrder = req.body.execOrder;
  var updates = req.body.updates;

  // Looks for the document data in the storage
  var documentData = storage[documentId];

  if (documentData) {
    // Applies updates to the document on the server
    applyUpdates(documentData, updates);

    // Looks for the updates to return to the site
    var response = {
      updates: searchForUpdates(documentData, execOrder)
    };

    res.status(200);
    res.send(JSON.stringify(response));
  } else {
    res.status(500);
    res.send('Document with id ' + documentId + 'not found');
  }
});


/**
 * Updates document data on the server. The results of the update process are:
 * 1. New document data value.
 * 2. Updated list of document operations.
 * 3. New document context value.
 * 4. New document execOrder value.
 */
function applyUpdates(documentData, updates) {
  // Creates new string document instance with the latest state known to the server
  // and passes all known operations to it.
  var document = new clv.string.Document(null, documentData.execOrder, documentData.context);
  document.update(documentData.ops);

  for (var i = 0, count = updates.length; i < count; i++) {
    var op = updates[i];
    // Checks whether the operation was not seen by the server yet.
    if (!clv.seen(op, documentData.context)) {
      // Checks whether the operation is valid and can be applied to the document.
      if (clv.canApply(op, documentData.context)) {
        // Sets the operation exec order to be the next exec order after all seen operations.
        op.execOrder = documentData.ops.length + 1;
        // Updates the document and stored document data.
        var tuple = document.update(op);
        documentData.data = clv.string.exec(documentData.data, tuple.toExec);
        documentData.context = document.getContext();
        documentData.ops.push(op);
        documentData.execOrder = document.getExecOrder();
      } else {
        throw Error("One of the received operations is corrupted, can't apply this and all following operations.");
        // Note:
        // As far as we see there can only be two possible reasons for this error:
        //    1. Incorrect front-end implementation.
        //    2. Unexpected network errors caused by network providers environment.
        // To avoid corruption of the whole document, it is required to resend all corrupted operations.
        // In case you're using clv.net objects, you don't need to do anything, all operations will be resent
        // automatically. Otherwise, you have to resend them by yourself.
        // In real world app, you also might want to have some error reporting here.
      }
    } else {
      // Note:
      // As far as we see there can be three possible reasons for receiving duplicate operations:
      //    1. Incorrect front-end implementation.
      //    2. Incorrect network implementation (in case of custom implementation instead of clv.net objects).
      //    3. Unexpected network errors caused by network providers environment.
      // There are no additional actions required in case of receiving duplicate operations - just don't execute them.
      // In real world app, you also might want to have some error reporting here.
    }
  }
}


/**
 * Looks for the updates to send.
 * All operations with the exec order greater than passed should be sent to the client site.
 * @return {Array}
 */
function searchForUpdates(documentData, execOrder) {
  return documentData.ops.filter(function(op) {
    return op.execOrder > execOrder;
  });
}


// Runs express server
app.listen(3000, function() {
  console.log('Example app listening on port ' + 3000 + '!');
});
