/*jslint indent: 2 */
/*jshint expr: true*/
/* global describe, it,  expect, sinon,  faker, expect */
/* global casper, before, after */

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

 */

(function () {
  'use strict';


  describe('e2e', function () {

    it('???', function () {
      expect(true).to.be.true;
    });

    describe('Google searching', function() {
	  before(function() {
		casper.start('http://www.google.fr/');
	  });

	  it('should retrieve 10 or more results', function() {
		casper.then(function() {
		  'Google'.should.matchTitle;
		  'form[action="/search"]'.should.be.inDOM.and.be.visible;
		  this.fill('form[action="/search"]', {
			q: 'casperjs'
		  }, true);
		});

		casper.waitForUrl(/q=casperjs/, function() {
		  (/casperjs/).should.matchTitle;
		});
	  });
	});


  });

})();
