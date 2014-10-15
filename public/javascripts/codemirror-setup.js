var editor;

$(document).ready(function () {

  //region init
  var value = "// The bindings defined specifically in the Sublime Text mode\n";
  value += "var bindings = {\n";
  value += "}\n";
  value += "\n";
  value += "// The implementation of joinLines\n";

  editor = CodeMirror(document.getElementById("editor"), {
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
  //endregion

  // region set handlers
  editor.on("change", function (instance, changeObj) {
    console.log("change");
  });
//  editor.on("changes", function (instance, changes) {
//    console.log("changes");
//  });
  editor.on("beforeChange", function (instance, changeObj) {
//    console.log("beforeChange");
//    console.log(changeObj);
    changeObj.cancel();
    remoteInterface.send_message(changeObj);
  });
  editor.on("cursorActivity", function (instance) {
    var selRange = editor.doc.sel.ranges[0];
    console.log("[cursorActivity] " + selRange.anchor.line + ':' + selRange.anchor.ch + '  ' + selRange.head.line + ':' + selRange.head.ch);
  });

//  editor.on("beforeSelectionChange",function (instance, obj: {ranges, update}){});

  editor.on("update", function (instance) {
//    console.log("update");
  });

  //endregion

  remoteInterface.handler = function (changeObj) {
    console.log(changeObj);
    editor.makeRemoteChange(changeObj);
  }
});