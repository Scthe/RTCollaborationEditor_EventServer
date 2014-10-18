/*jslint indent: 2 */
/*jshint expr: true*/
/* global describe, it, beforeEach, expect, _, require, sinon, voidFunction */

(function () {
  'use strict';

  var proxyquire = require('proxyquire').noCallThru(),
      _ = require('underscore');

  describe('SocketHandler', function () {

    describe('#connected', function () {

      describe('RedisAdapter', function () {

        it('is created', function () {
        });

        it('has correct message handler', function () {
        });

        it('has correct user status change handler', function () {
        });

      });

      it('propagates to node message bus', function () {
      });

    });

    describe('#disconnected', function () {

      it('propagates to redis', function () {
      });

      it('propagates to node message bus', function () {
      });

    });

    it('propagates client messages to redis', function () {
    });

    describe('propagates', function () {

      describe('messages', function () {

        it(' - redis', function () {
        });

        it(' - node message bus', function () {
        });

      });

      it('user status changes', function () {
      });

    });
  });

})();

