/*jslint indent: 2 */
/*jshint expr: true*/
/* global describe, it, beforeEach, expect, _ */

(function () {
  'use strict';

  var proxyquire = require('proxyquire').noCallThru();

  describe('RedisAdapter', function () {

    it('creates default publisher & monitor', function () {
      // TODO use withArgs to differentate monitor/publisher cases
      var redisClientMock = sinon.spy();

      var redisStub = {
        createClient: function (port, host) {
          return {
            on     : redisClientMock,
            monitor: redisClientMock
          };
        }
      }

      expect(redisClientMock).to.not.have.been.called;
      proxyquire('../../server/redis_adapter', { 'redis': redisStub });
      expect(redisClientMock).to.have.been.called;
      expect(redisClientMock).to.have.callCount(4);
    });

    describe('#create', function () {
    });

  });


})();

