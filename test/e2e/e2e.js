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

 modify docs:
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




 casper.evaluate(function(username, password) {
 document.querySelector('#username').value = username;
 document.querySelector('#password').value = password;
 document.querySelector('#submit').click();
 }, 'sheldon.cooper', 'b4z1ng4');
 */

(function () {
  'use strict';

  var url = 'http://localhost:3000/docA';

  beforeEach(function () {
    // register phantomjs console handler
    casper.on('remote.message', function (message) {
      console.log('>>> ' + message);
    });
  });

  it('e2e test 1', function () {

    casper.start(url);

    casper.then(function () {
      expect('sublime-docs').to.matchTitle;

      // move selector
      this.evaluate(function () {
        /*global editor, CodeMirror*/
        var line = 1,
            ch = 3,
            chEnd = 3;
//            chEnd = 12;
        var anchor = new CodeMirror.Pos(line, ch),
            head = new CodeMirror.Pos(line, chEnd),
            options = {origin: '*mouse'};
        editor.setSelection(anchor, head, options);
      });

      casper.capture('../selection.png');

    });

    // write
    casper.then(function () {
      // TODO input should be focused ! ( line: 2424, fast bail condition)
      this.sendKeys('#texteditor-input', 'Test');
    });

    // wait for event propagation
    casper.wait(1000);

    // check event result
    casper.then(function () {
      var line = this.evaluate(function () {
        return editor.doc.getLine(1);
      });
      expect(line).to.equal('varTest bindings = {');
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
   */

})();
