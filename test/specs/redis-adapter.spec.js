/*jslint indent: 2 */
/*jshint expr: true*/
/* global describe, it, beforeEach, expect, require, sinon, voidFunction, faker, PromiseSync */

(function () {
  'use strict';

  var proxyquire = require('proxyquire').noCallThru(),
      _ = require('underscore');

  describe('RedisAdapter', function () {

//    var redisVoidProxy;
//    var redisLibraryCreateClient,
//        clientData,
//        redisAdapterModuleOverrides,
//        adapter;
    var redisVoidProxy,
        clientData,
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

      clientData = {
        chat_room: faker.internet.password(),
        client_id: faker.random.number()
      };
    });

    beforeEach(function () {
      PromiseSync.reset();
    });

    it('creates default publisher', function () {
      var publisherSpy = {
        on: sinon.spy()
      };

      requireRedisAdapter(publisherSpy);
      expect(publisherSpy.on).to.be.calledOnce;
    });

    it('creates default monitor', function () {
      var monitorSpy = {
        on     : sinon.spy(),
        monitor: sinon.spy()
      };

      requireRedisAdapter(undefined, monitorSpy);
      expect(monitorSpy.on).to.be.calledTwice;
      expect(monitorSpy.monitor).to.be.calledOnce;
    });

    describe('#create', function () {

      it('returns valid object', function () {
        var RedisAdapter = requireRedisAdapter();
        var obj = new RedisAdapter(clientData, voidFunction, voidFunction);
        expect(obj).to.exist;
      });

      it('subscribes client to redis queue', function () {
        var client = {subscribe: sinon.spy()};
        var RedisAdapter = requireRedisAdapter(undefined, undefined, client);

        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);

        expect(client.subscribe).called;
        expect(client.subscribe).calledWith(adapter.redis_path);
      });

      it('adds client to document active users list', function (done) {
        var publisher = {sadd: sinon.spy()};
        var RedisAdapter = requireRedisAdapter(publisher, undefined, undefined);

        PromiseSync.doneCallback = function () {
          expect(publisher.sadd).calledOnce;
          expect(publisher.sadd).calledWithExactly(adapter.redis_user_count_path, adapter.client_data.client_id);
          done();
        };

        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
      });

      it('broadcasts event \'new user\'', function (done) {
        var publisher = {publish: sinon.spy()};
        var RedisAdapter = requireRedisAdapter(publisher, undefined, undefined);

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

        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
      });

      it('publishes correct user count', function (done) {
        var publisher = {
          publish: sinon.spy(),
          scard  : sinon.stub().returns(faker.random.number())
        };
        var RedisAdapter = requireRedisAdapter(publisher, undefined, undefined);

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

        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
      });

    });

    describe('publish', function () {

      var publisher,
          adapter;

      beforeEach(function () {
        publisher = {publish: sinon.spy()};
        var RedisAdapter = requireRedisAdapter(publisher, undefined, undefined);

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
        publisher = {publish: sinon.spy()};
        var RedisAdapter = requireRedisAdapter(publisher, undefined, undefined);

        messageCallbacks = {
          operation : sinon.spy(),
          selection : sinon.spy(),
          join      : sinon.spy(),
          disconnect: sinon.spy()
        };

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
        var publisher = {srem: sinon.spy()};
        var RedisAdapter = requireRedisAdapter(publisher, undefined, undefined);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);

        adapter.unsubscribe();

        expect(publisher.srem).called;
        expect(publisher.srem).calledWith(adapter.redis_user_count_path, adapter.client_data.client_id);
      });

      it('publishes correct user count', function (done) { // TODO same as #create.publishes-correct-user-count
        var publisher = {
          publish: sinon.spy(),
          scard  : sinon.stub().returns(faker.random.number())
        };
        var RedisAdapter = requireRedisAdapter(publisher, undefined, undefined);
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
        var fakeUserCount = faker.random.number();
        var publisher = {
          publish: sinon.spy(),
          scard  : sinon.stub().returns(fakeUserCount)
        };
        var RedisAdapter = requireRedisAdapter(publisher, undefined, undefined);
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


    /**
     *
     * @param redisProxy1 publisher object
     * @param redisProxy2 monitor object
     * @param redisProxy3
     * @returns {*} module with stubbed all superfluous dependencies
     */
    function requireRedisAdapter(redisProxy1, redisProxy2, redisProxy3) {
      var r1 = createRedisClientInstance(redisProxy1),
          r2 = createRedisClientInstance(redisProxy2),
          r3 = createRedisClientInstance(redisProxy3);

      var redisLibraryCreateClient = sinon.stub();
      redisLibraryCreateClient.onFirstCall().returns(r1);
      redisLibraryCreateClient.onSecondCall().returns(r2);
      redisLibraryCreateClient.onThirdCall().returns(r3);
      var redisLibrary = {createClient: redisLibraryCreateClient};

      var redisAdapterModuleOverrides = {
        'redis': redisLibrary,
        'q'    : PromiseSync
      };

      return proxyquire('../../server/redis_adapter', redisAdapterModuleOverrides);

      function createRedisClientInstance(overrides) {
        var overrides_ = overrides ? overrides : {};
        var o = _.clone(redisVoidProxy);
        return _.extend(o, overrides_);
      }
    }

  });

})();

