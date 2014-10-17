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
          redisLibraryStub,
          clientData;

      beforeEach(function () {
        redisLibraryCreateClient = sinon.stub();
        redisLibraryCreateClient.onFirstCall().returns(redisVoidProxy);
        redisLibraryCreateClient.onSecondCall().returns(redisVoidProxy);
        redisLibraryCreateClient.onThirdCall().returns(redisVoidProxy);
        redisLibraryStub = {createClient: redisLibraryCreateClient};

        clientData = {
          chat_room: 'a',
          client_id: 5
        };

      });

      it('returns valid object', function () {
        var RedisAdapter = proxyquire('../../server/redis_adapter', { 'redis': redisLibraryStub });

        var obj = new RedisAdapter(clientData, voidFunction, voidFunction);
        expect(obj).to.exist;
      });

      it('subscribes client to redis queue', function (done) {
        var adapter;

        var client = _.clone(redisVoidProxy);
        client.subscribe = function () {
          expect(arguments[0]).to.eq(adapter.redis_path);
          done();
        };
        redisLibraryCreateClient.onThirdCall().returns(client);

        var RedisAdapter = proxyquire('../../server/redis_adapter', { 'redis': redisLibraryStub });
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
      });

      it('adds client to document active users list', function (done) {
        var publisher = _.clone(redisVoidProxy);
        publisher.sadd = sinon.spy();
        redisLibraryCreateClient.onFirstCall().returns(publisher);

        var reqOverrides = {
          'redis': redisLibraryStub,
          'Q'    : PromiseSync
        };
        PromiseSync.doneCallback = function () {
          // TODO check publisher.sadd args
          expect(publisher.sadd).called;
          done();
        };
        var RedisAdapter = proxyquire('../../server/redis_adapter', reqOverrides);
        new RedisAdapter(clientData, voidFunction, voidFunction);
      });

      /*
       it('broadcasts event \'new user\'', function () {
       var publisher = _.extend({}, redisVoidProxy);
       publisher.publish = sinon.spy();
       redisLibraryCreateClient.onFirstCall().returns(publisher);

       var RedisAdapter = proxyquire('../../server/redis_adapter', { 'redis': redisLibraryStub });


       //        expect(publisher.publish).to.be.calledOnce();
       // TODO check publisher.publish args
       });
       */

    });

  });

  function voidFunction() {
  }
})();

