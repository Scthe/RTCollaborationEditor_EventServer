/*jslint indent: 2 */
/*jshint expr: true*/
/* global describe, it, beforeEach, expect, _, require, sinon */

(function () {
  'use strict';

  var proxyquire = require('proxyquire').noCallThru(),
      _ = require('underscore');

  describe('RedisAdapter', function () {

    var redisVoidProxy;

    beforeEach(function () {
      redisVoidProxy = {
        on       : voidFunction,
        monitor  : voidFunction,
        subscribe: voidFunction,
        publish  : voidFunction,
        srem     : voidFunction,
        sadd     : voidFunction,
        scard    : voidFunction,
        quit     : voidFunction
      };
    });

    it('creates default publisher', function () {
      var publisherSpy = {
        on: sinon.spy()
      };
      var redisLibraryCreateClient = sinon.stub();
      redisLibraryCreateClient.onFirstCall().returns(publisherSpy);
      redisLibraryCreateClient.onSecondCall().returns(redisVoidProxy);
      var redisLibraryStub = {createClient: redisLibraryCreateClient};

      proxyquire('../../server/redis_adapter', { 'redis': redisLibraryStub });

      expect(publisherSpy.on).to.be.calledOnce;
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

      expect(monitorSpy.on).to.be.calledTwice;
      expect(monitorSpy.monitor).to.be.calledOnce;
    });

    describe('#create', function () {

      var redisLibraryCreateClient,
          clientData,
          redisAdapterModuleOverrides,
          adapter;

      beforeEach(function () {
        redisLibraryCreateClient = sinon.stub();
        redisLibraryCreateClient.onFirstCall().returns(redisVoidProxy);
        redisLibraryCreateClient.onSecondCall().returns(redisVoidProxy);
        redisLibraryCreateClient.onThirdCall().returns(redisVoidProxy);
        var redisLibraryStub = {createClient: redisLibraryCreateClient};

        clientData = {
          chat_room: 'a',
          client_id: 5
        };

        redisAdapterModuleOverrides = {
          'redis': redisLibraryStub,
          'Q'    : PromiseSync
        };
      });

      it('returns valid object', function () {
        var RedisAdapter = proxyquire('../../server/redis_adapter', redisAdapterModuleOverrides);

        var obj = new RedisAdapter(clientData, voidFunction, voidFunction);
        expect(obj).to.exist;
      });

      it('subscribes client to redis queue', function () {
        var client = _.clone(redisVoidProxy);
        client.subscribe = sinon.spy();
        redisLibraryCreateClient.onThirdCall().returns(client);

        var RedisAdapter = proxyquire('../../server/redis_adapter', redisAdapterModuleOverrides);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);

        expect(client.subscribe).called;
        expect(client.subscribe).calledWith(adapter.redis_path);
      });

      it('adds client to document active users list', function (done) {
        var publisher = _.clone(redisVoidProxy);
        publisher.sadd = sinon.spy();
        redisLibraryCreateClient.onFirstCall().returns(publisher);

        PromiseSync.doneCallback = function () {
          expect(publisher.sadd).calledOnce;
          expect(publisher.sadd).calledWithExactly(adapter.redis_user_count_path, adapter.client_data.client_id);
          done();
        };
        var RedisAdapter = proxyquire('../../server/redis_adapter', redisAdapterModuleOverrides);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
      });

      it('broadcasts event \'new user\'', function (done) {
        var publisher = _.clone(redisVoidProxy);
        publisher.publish = sinon.spy();
        redisLibraryCreateClient.onFirstCall().returns(publisher);

        PromiseSync.doneCallback = function () {
          expect(publisher.publish).called;
          var msgTemplate = {
            type   : sinon.match.any,
            payload: sinon.match.any
          };
          expect(publisher.publish).calledWith(adapter.redis_path, sinon.match(msgTemplate));
          done();
        };
        var RedisAdapter = proxyquire('../../server/redis_adapter', redisAdapterModuleOverrides);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
      });

      it('checks how many users there are ( to return this value to clients)', function (done) {
        // TODO we cannot test this function 100%
        // ( which would mean we would check if the user value is actually in the message)

        var publisher = _.clone(redisVoidProxy);
        publisher.scard = sinon.spy();
        redisLibraryCreateClient.onFirstCall().returns(publisher);

        PromiseSync.doneCallback = function () {
          expect(publisher.scard).called;
          expect(publisher.scard).calledWith(adapter.redis_user_count_path, sinon.match.func);
          done();
        };
        var RedisAdapter = proxyquire('../../server/redis_adapter', redisAdapterModuleOverrides);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
      });

    });

  });

  function voidFunction() {
  }
})();

