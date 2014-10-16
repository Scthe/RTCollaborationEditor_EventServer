/*jslint indent: 2 */
/*jshint expr: true*/
/* global describe, it, beforeEach, expect, _, require, sinon */

(function () {
  'use strict';

  var proxyquire = require('proxyquire').noCallThru();

  function voidFunction() {
  }

  describe('RedisAdapter', function () {

    var redisVoidProxy = {
      on     : voidFunction,
      monitor: voidFunction
    };

    it('creates default publisher', function () {
      var publisherSpy = {
        on: sinon.spy()
      };
      var redisLibraryCreateClient = sinon.stub();
      redisLibraryCreateClient.onFirstCall().returns(publisherSpy);
      redisLibraryCreateClient.onSecondCall().returns(redisVoidProxy);
      var redisLibraryStub = {createClient: redisLibraryCreateClient};

      proxyquire('../../server/redis_adapter', { 'redis': redisLibraryStub });

      expect(publisherSpy.on).to.have.callCount(1);
    });

    it('creates default monitor', function () {
      var monitorSpy = {
        on     : sinon.spy(),
        monitor: sinon.spy()
      };
      var redisLibraryCreateClient = sinon.stub();
      redisLibraryCreateClient.onFirstCall().returns(redisVoidProxy);
      redisLibraryCreateClient.onSecondCall().returns(monitorSpy);
      var redisLibraryStub = {createClient: redisLibraryCreateClient};

      proxyquire('../../server/redis_adapter', { 'redis': redisLibraryStub });

      expect(monitorSpy.on).to.have.callCount(2);
      expect(monitorSpy.monitor).to.have.callCount(1);
    });

    describe('#create', function () {
    });

  });


})();

