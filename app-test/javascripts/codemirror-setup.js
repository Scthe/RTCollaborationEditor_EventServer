'use strict';
/* global remoteInterface, CodeMirror*/

var editor;

$(document).ready(function () {

  //region init
  var value = '// The bindings defined specifically in the Sublime Text mode\n';
  value += 'var bindings = {\n';
  value += '}\n';
  value += '\n';
  value += '// The implementation of joinLines\n';

  try {
    editor = CodeMirror(document.getElementById('editor-div'), {
      value                  : value,
      lineNumbers            : true,
      autoCloseBrackets      : true,
      matchBrackets          : true,
      showCursorWhenSelecting: true,
      indentUnit             : 2,
      smartIndent            : false,
      tabSize                : 2,
      lineWrapping           : false,
      undoDepth              : 5,
      historyEventDelay      : 350,
      dragDrop               : false
    });
  } catch (e) {
    console.log(e.stack);
  }
  //endregion

  // bind input for easier debugging
  var input = editor.display.input;
  input.id = 'texteditor-input';
  document.getElementById('debug-textarea').appendChild(input);


  // region set handlers

  editor.on('beforeChange', function (instance, changeObj) {
    /* jshint unused:false */ // isntance is not used
    changeObj.cancel();
    remoteInterface.send_operation(changeObj);
  });

  editor.on('cursorActivity', function (instance) {
    /* jshint unused:false */ // isntance is not used
    var selRange = editor.doc.sel.ranges[0];
//    console.log('[cursorActivity] ' + selRange.anchor.line + ':' + selRange.anchor.ch + '  ' + selRange.head.line + ':' + selRange.head.ch);
    remoteInterface.send_selection(selRange);
  });

  //endregion

  remoteInterface.on_operation = function (changeObj) {
//    console.log(changeObj);
    editor.makeRemoteChange(changeObj.data);
  };

  remoteInterface.on_selection = function (selData) {
    console.log(selData);
  };

  remoteInterface.on_reconnect = function (data) {
    console.log(data);
    $('#user_count').text(data.user_count);
  };

  remoteInterface.on_client_left = function (data) {
//    console.log(data);
    $('#user_count').text(data.user_count);
  };

});