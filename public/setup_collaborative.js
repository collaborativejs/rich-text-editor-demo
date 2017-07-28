// Creates Collaborative.js string document using initial data from the server
var stringDocument = new clv.string.Document(
    site.id,
    site.document.execOrder,
    site.document.context
);

// Creates Collaborative.js net object
var net = new clv.net.Http();
net.setSendingFn(sendingFunc);

// start sending with default interval 1000ms
net.start();

// define undo/redo functions
function undo() {
  if (stringDocument.canUndo()) {
    var tuple = stringDocument.undo();
    processTuple(tuple);
  }
}

function redo() {
  if (stringDocument.canRedo()) {
    var tuple = stringDocument.redo();
    processTuple(tuple);
  }
}

function processTuple(tuple) {
  // current values
  var cursorFrom = simplemde.codemirror.indexFromPos(simplemde.codemirror.getCursor('from'));
  var cursorTo = simplemde.codemirror.indexFromPos(simplemde.codemirror.getCursor('to'));
  var value = site.document.data;

  // new values
  cursorFrom = clv.string.moveCursor(cursorFrom, tuple.toExec, stringDocument.getSiteId());
  cursorTo = clv.string.moveCursor(cursorTo, tuple.toExec, stringDocument.getSiteId());
  value = clv.string.exec(value, tuple.toExec);

  site.document.data = value;
  setEditorValue(value, cursorFrom, cursorTo);
  net.send(stringDocument.getExecOrder(), tuple.toSend);
}

/**
 * On each change event, generates Collaborative.js operations using the difference between
 * the textarea control value and the text stored in the site data object.
 * Generated operations are used to update local site data and are sent to the server.
 */
function onTextChanged(event) {
  var ops = clv.string.genOps(site.document.data, event.getValue());
  var tuple = stringDocument.commit(ops);
  processTuple(tuple);
}


/**
 * This is a temporary function, it will be replaced with XhrIO implementation ASAP.
 */
function sendingFunc(execOrder, updates, callback) {
  var data = {execOrder: execOrder, updates: updates};

  $.ajax({
    url: '/' + site.document.id + '/update',
    type: 'POST',
    data: JSON.stringify(data),
    dataType: 'json',
    contentType: 'application/json',
    success: function(data) {
      var otherSitesUpdates = data.updates;
      if (otherSitesUpdates && otherSitesUpdates.length) {
        var tuple = stringDocument.update(otherSitesUpdates);
        processTuple(tuple);
      }
      callback(true, stringDocument.getExecOrder(), otherSitesUpdates);
    },
    error: function(data) {
      callback(false);
      console.log('Fail to update document\n' + data.status + ', ' + data.responseText);
    }
  });
}