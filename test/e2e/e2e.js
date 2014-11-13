/*jslint indent: 2 */
/*jshint expr: true*/
/* global casper, it,  expect, faker, beforeEach */

/*
 Test plan:

 user count:
 * join1
 * expect user_count ==1
 * join2
 * expect user_count ==2
 * 2:disconnect
 * expect user_count ==1
 * 1:disconnect
 * expect user_count ==0

 [DONE] modify docs:
 * join1
 * 1:write
 * expect changes visible

 multi-user collaboration:
 * join1
 * join2
 * 2:write
 * 1:expect changes visible

 does not mix events between documents:
 * docA:join1
 * docB:join2
 * 2:write
 * 1:expect no changes

 not auth:
 * join1 with wrong auth
 * 1:write
 * expect NO changes

 */

(function () {
  'use strict';

  var url = 'http://localhost:3000/docA';

  beforeEach(function () {
    // register phantomjs console handler
    casper.on('remote.message', function (message) {
      console.log('>>> ' + message);
    });

//    casper.on('page.error', function (msg, trace) {
//      this.echo('Error:    ' + msg, 'ERROR');
//      this.echo('file:     ' + trace[0].file, 'WARNING');
//      this.echo('line:     ' + trace[0].line, 'WARNING');
//      this.echo('function: ' + trace[0]['function'], 'WARNING');
//    });
  });

  it('Base event propagation test', function () {

    var line = 1,
        ch = 3,
        chEnd = 3,
        testText = 'Test', // TODO find a way to require a faker
        expectedText = 'var' + testText + ' bindings = {';

    casper.start(url);

    casper.then(function () {
      expect('sublime-docs').to.matchTitle;

      // move selector
      this.evaluate(function (line, ch, chEnd) {
        /*global editor, CodeMirror*/

        var anchor = new CodeMirror.Pos(line, ch),
            head = new CodeMirror.Pos(line, chEnd),
            options = {origin: '*mouse'};
        editor.setSelection(anchor, head, options);
      }, line, ch, chEnd);
    });

    // write
    casper.then(function () {
      // TODO input should be focused ! ( line: 2424, fast bail condition)
      this.sendKeys('#texteditor-input', testText);
    });

    // wait for event propagation
    casper.wait(1000);

    // check event result
    casper.then(function () {
      var lineText = this.evaluate(function (line) {
        return editor.doc.getLine(line);
      }, line);

      expect(lineText).to.equal(expectedText);
    });

  });

  /*
   * snippets:
   *
   * LOG CASPER
   * delete casper.test;
   * console.log(casper);
   *
   * TITLE
   * var title = this.evaluate(function () {
   * return document.title;
   * });
   *
   * USER COUNT
   * var userCount = this.evaluate(function () {
   * return $('#user_count').text();
   * });
   *
   * CAPTURE
   * casper.capture('../selection.png');
   *
   */

})();
