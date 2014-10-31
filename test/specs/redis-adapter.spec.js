/*jslint indent: 2 */
/*jshint expr: true*/
/* global describe, it, beforeEach, expect, require, sinon, voidFunction, faker, PromiseSync */

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

    // TODO create utils function requireRedisAdapter( redisProxy1, redisProxy2, redisProxy3),
    // where redisProxyX is object containing overrides for redisVoidProxy

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
            type   : 'join',
            payload: {
              client: sinon.match.number
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

    describe('publish', function () {

      var publisher,
          adapter;

      beforeEach(function () {
        publisher = _.clone(redisVoidProxy);
        publisher.publish = sinon.spy();
        redisLibraryCreateClient.onFirstCall().returns(publisher);

        var RedisAdapter = proxyquire('../../server/redis_adapter', redisAdapterModuleOverrides);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction, voidFunction, voidFunction);
      });

      it('operation', function () {
        var msg = faker.lorem.sentence();
        adapter.publish_operation(msg);

        expect(publisher.publish).called;
        expect(publisher.publish).calledWith(adapter.redis_path, sinon.match.string);
        // second arg should be stringified JSON
        for (var i = 0; i < publisher.publish.args.length; i++) {
          publisher.publish.args[i][1] = JSON.parse(publisher.publish.args[i][1]);
        }

        expect(publisher.publish).calledWith(adapter.redis_path, sinon.match({ type: 'msg', payload: msg }));
      });

      it('selection', function () {
        var msg = faker.lorem.sentence();
        adapter.publish_selection(msg);

        expect(publisher.publish).called;
        expect(publisher.publish).calledWith(adapter.redis_path, sinon.match.string);
        // second arg should be stringified JSON
        for (var i = 0; i < publisher.publish.args.length; i++) {
          publisher.publish.args[i][1] = JSON.parse(publisher.publish.args[i][1]);
        }

        expect(publisher.publish).calledWith(adapter.redis_path, sinon.match({ type: 'sel', payload: msg }));
      });

    });

    describe('calls callbacks', function () {

      var publisher,
          adapter,
          messageCallbacks,
          message;

      beforeEach(function () {
        publisher = _.clone(redisVoidProxy);
        publisher.publish = sinon.spy();
        redisLibraryCreateClient.onFirstCall().returns(publisher);

        messageCallbacks = {
          operation : sinon.spy(),
          selection : sinon.spy(),
          join      : sinon.spy(),
          disconnect: sinon.spy()
        };

        var RedisAdapter = proxyquire('../../server/redis_adapter', redisAdapterModuleOverrides);
        adapter = new RedisAdapter(clientData, messageCallbacks);
      });

      it('operation', function () {
        adapter._messageHandler(undefined, createMessage('msg'));
        expect(messageCallbacks.operation).called;
        expect(messageCallbacks.operation).calledWith(message.payload);
      });

      it('selection', function () {
        adapter._messageHandler(undefined, createMessage('sel'));
        expect(messageCallbacks.selection).called;
        expect(messageCallbacks.selection).calledWith(message.payload);
      });

      it('user join', function () {
        message = {
          type   : 'join',
          payload: {
            client    : faker.random.number(),
            user_count: faker.random.number()
          }
        };
        adapter._messageHandler(undefined, JSON.stringify(message));
        expect(messageCallbacks.join).called;
        expect(messageCallbacks.join).calledWith(message.payload);
      });

      it('user left', function () {
        message = {
          type   : 'left',
          payload: {
            client    : faker.random.number(),
            user_count: faker.random.number()
          }
        };
        adapter._messageHandler(undefined, JSON.stringify(message));
        expect(messageCallbacks.disconnect).called;
        expect(messageCallbacks.disconnect).calledWith(message.payload);
      });

      function createMessage(type_) {
        message = {
          type   : type_,
          payload: faker.random.number()
        };
        return JSON.stringify(message);
      }

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
        var fakeUserCount = faker.random.number();
        publisher.scard = sinon.stub().returns(fakeUserCount);
        redisLibraryCreateClient.onFirstCall().returns(publisher);

        var RedisAdapter = proxyquire('../../server/redis_adapter', redisAdapterModuleOverrides);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);

        PromiseSync.doneCallback = function () {
          expect(publisher.publish).called;
          expect(publisher.publish).calledWith(adapter.redis_path, sinon.match.string);
          // second arg should be stringified JSON
          publisher.publish.args[1][1] = JSON.parse(publisher.publish.args[1][1]);
          var msgTemplate = {
            type   : 'left',
            payload: {
              client    : clientData.client_id,
              user_count: fakeUserCount
            }
          };
          expect(publisher.publish).calledWith(adapter.redis_path, sinon.match(msgTemplate));
          done();
        };
        adapter.unsubscribe();
      });

    });

  });

})();

