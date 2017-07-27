var undoBtn = {
  name: 'undo',
  action: undo,
  className: 'fa fa-undo',
  title: 'Undo'
};
var redoBtn = {
  name: 'redo',
  action: redo,
  className: 'fa fa-repeat',
  title: 'Redo'
};

var simplemde = new SimpleMDE({
  element: document.getElementById('text-area'),
  autofocus: true,
  initialValue: site.document.data,
  spellChecker: false,

  toolbar: [undoBtn, redoBtn, '|', 'bold', 'italic', 'heading', '|', 'quote', 'unordered-list', 'ordered-list', '|', 'preview', 'guide'],
  status: false,
  shortcuts: {drawImage: null}
});

function setEditorValue(value, cursorFrom, cursorTo) {
  // set editor value, Simple MDE have some issues with value method
  // so we have to use timeout here and turn off event listeners
  if (value !== simplemde.value()) {
    setTimeout(function() {
      var cm = simplemde.codemirror;
      cm.off('change', onTextChanged);
      simplemde.value(value);
      cm.setSelection(
          cm.posFromIndex(cursorFrom),
          cm.posFromIndex(cursorTo));
      cm.on('change', onTextChanged);
    }, 1);
  }
}

simplemde.codemirror.on('change', onTextChanged);

simplemde.codemirror.setOption("extraKeys", {
  'Ctrl-Z': undo,
  'Shift-Ctrl-Z': redo,
  'Cmd-Z': undo,
  'Shift-Cmd-Z': redo
});
