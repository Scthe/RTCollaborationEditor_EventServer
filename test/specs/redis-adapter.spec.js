/*jslint indent: 2 */
/*jshint expr: true*/
/* global describe, it, beforeEach, expect, _, require, sinon, voidFunction */

(function () {
  'use strict';

  var proxyquire = require('proxyquire').noCallThru(),
      _ = require('underscore');

  describe('RedisAdapter', function () {

    var redisVoidProxy;
    var redisLibraryCreateClient,
        clientData,
        redisAdapterModuleOverrides,
        adapter;

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

      redisLibraryCreateClient = sinon.stub();
      redisLibraryCreateClient.onFirstCall().returns(redisVoidProxy);
      redisLibraryCreateClient.onSecondCall().returns(redisVoidProxy);
      redisLibraryCreateClient.onThirdCall().returns(redisVoidProxy);
      var redisLibraryStub = {createClient: redisLibraryCreateClient};

      clientData = {
        chat_room: faker.internet.password(),
        client_id: faker.random.number()
      };

      redisAdapterModuleOverrides = {
        'redis': redisLibraryStub,
        'q'    : PromiseSync
      };
    });

    beforeEach(function () {
      PromiseSync.reset();
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
          expect(publisher.publish).calledWith(adapter.redis_path, sinon.match.string);
          // second arg should be stringified JSON
          publisher.publish.args[0][1] = JSON.parse(publisher.publish.args[0][1]);
          var msgTemplate = {
            type   : "user_mgmt",
            payload: {
              text: sinon.match.string
            }
          };
          expect(publisher.publish).calledWith(adapter.redis_path, sinon.match(msgTemplate));
          done();
        };

        var RedisAdapter = proxyquire('../../server/redis_adapter', redisAdapterModuleOverrides);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
      });

      it('publishes correct user count', function (done) {
        var publisher = _.clone(redisVoidProxy);
        publisher.scard = sinon.stub().returns(faker.random.number());
        publisher.publish = sinon.spy();
        redisLibraryCreateClient.onFirstCall().returns(publisher);

        PromiseSync.doneCallback = function () {
          expect(publisher.scard).called;
          expect(publisher.scard).calledWith(adapter.redis_user_count_path, sinon.match.func);
          expect(publisher.publish).called;
          expect(publisher.publish).calledWith(adapter.redis_path, sinon.match.string);
          // second arg should be stringified JSON
          publisher.publish.args[0][1] = JSON.parse(publisher.publish.args[0][1]);
          var msgTemplate = {
            payload: {
              user_count: publisher.scard()
            }
          };
          expect(publisher.publish).calledWith(adapter.redis_path, sinon.match(msgTemplate));
          done();
        };

        var RedisAdapter = proxyquire('../../server/redis_adapter', redisAdapterModuleOverrides);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
      });

    });

    describe('#publish_message', function () {

      it('works', function () {
        var publisher = _.clone(redisVoidProxy);
        publisher.publish = sinon.spy();
        redisLibraryCreateClient.onFirstCall().returns(publisher);

        var RedisAdapter = proxyquire('../../server/redis_adapter', redisAdapterModuleOverrides);
        var adapter = new RedisAdapter(clientData, voidFunction, voidFunction);

        var msg = faker.lorem.sentence();
        adapter.publish_message(msg);

        expect(publisher.publish).called;
        expect(publisher.publish).calledWith(adapter.redis_path, sinon.match.string);
        // second arg should be stringified JSON
        for (var i = 0; i < publisher.publish.args.length; i++) {
          publisher.publish.args[i][1] = JSON.parse(publisher.publish.args[i][1]);
        }

        expect(publisher.publish).calledWith(adapter.redis_path, sinon.match({ type: "msg", payload: msg }));
      });

    });

    describe('#unsubscribe', function () {

      it('removes client from document\'s active users list', function () {
        var publisher = _.clone(redisVoidProxy);
        publisher.srem = sinon.spy();
        redisLibraryCreateClient.onFirstCall().returns(publisher);

        var RedisAdapter = proxyquire('../../server/redis_adapter', redisAdapterModuleOverrides);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);

        adapter.unsubscribe();

        expect(publisher.srem).called;
        expect(publisher.srem).calledWith(adapter.redis_user_count_path, adapter.client_data.client_id);
      });

      it('publishes correct user count', function (done) { // TODO same as #create.publishes-correct-user-count
        var publisher = _.clone(redisVoidProxy);
        publisher.scard = sinon.stub().returns(faker.random.number());
        publisher.publish = sinon.spy();
        redisLibraryCreateClient.onFirstCall().returns(publisher);

        var RedisAdapter = proxyquire('../../server/redis_adapter', redisAdapterModuleOverrides);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);

        PromiseSync.doneCallback = function () {
          expect(publisher.scard).called;
          expect(publisher.scard).calledWith(adapter.redis_user_count_path, sinon.match.func);
          expect(publisher.publish).called;
          expect(publisher.publish).calledWith(adapter.redis_path, sinon.match.string);
          // second arg should be stringified JSON
          publisher.publish.args[0][1] = JSON.parse(publisher.publish.args[0][1]);
          var msgTemplate = {
            payload: {
              user_count: publisher.scard()
            }
          };
          expect(publisher.publish).calledWith(adapter.redis_path, sinon.match(msgTemplate));
          done();
        };
        adapter.unsubscribe();
      });

      it('broadcasts event \'user #{client_id} disconnected\'', function (done) {
        var publisher = _.clone(redisVoidProxy);
        publisher.publish = sinon.spy();
        redisLibraryCreateClient.onFirstCall().returns(publisher);

        var RedisAdapter = proxyquire('../../server/redis_adapter', redisAdapterModuleOverrides);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);

        PromiseSync.doneCallback = function () {
          expect(publisher.publish).called;
          expect(publisher.publish).calledWith(adapter.redis_path, sinon.match.string);
          // second arg should be stringified JSON
          publisher.publish.args[0][1] = JSON.parse(publisher.publish.args[0][1]);
          var msgTemplate = {
            type   : "user_mgmt",
            payload: {
              text: sinon.match.string
            }
          };
          expect(publisher.publish).calledWith(adapter.redis_path, sinon.match(msgTemplate));
          done();
        };
        adapter.unsubscribe();
      });

      // TODO broadcasts id of disconnected client, so that client can create msg on it's own
    });

  });

})();

