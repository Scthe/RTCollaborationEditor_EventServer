/*jslint indent: 2 */
/*jshint expr: true*/
/* global describe, it, beforeEach, before, expect, require, sinon, voidFunction, faker, chai, PromiseSync */

(function () {
  'use strict';

  var proxyquire = require('proxyquire').noCallThru(),
      _ = require('underscore');

  describe('RedisAdapter', function () {

    var redisVoidProxy,
        clientData,
        adapter;

    before(function () {
      // little chai plugin to be able to use:
      // var args = expect(publisher.publish).secondArgument.to.be.JSON_ObjectsList();
      // expect(args).to.containEql(msgTemplate);
      //
      // ( writing sinon matcher would be easier but not nearly as fun)

      chai.use(function (_chai) {
        var Assertion = _chai.Assertion;

        Assertion.addProperty('secondArguments', function () {
          this._obj = _.map(this._obj.args, function (e) {
            return e[1];
          });
          return this;
        });

        Assertion.addChainableMethod('JSON_ObjectsList', function () {
          // we cannot just use 'return JSON.parse(this._obj);'
          // because array converted implicitly to string is not parseable  :(
          return  _.map(this._obj.args, function (e) {
            return JSON.parse(e);
          });
        });

        Assertion.addChainableMethod('containEql', function (tmpl) {
          return _.any(this._obj, function (e) {
            return _.isEqual(e, tmpl);
          });
        });
      });
    });

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
        documentId: faker.internet.password(),
        clientId  : faker.random.number()
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

      it('sets correct document path', function () {
        var client = {subscribe: sinon.spy()};
        var RedisAdapter = requireRedisAdapter(undefined, undefined, client);

        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);

        expect(adapter.documentPath).to.contain(clientData.documentId);
      });

      it('sets correct document users path', function () {
        var client = {subscribe: sinon.spy()};
        var RedisAdapter = requireRedisAdapter(undefined, undefined, client);

        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);

        expect(adapter.documentUsersPath).to.contain(clientData.documentId);
      });

      it('holds client data for further use', function () {
        var client = {subscribe: sinon.spy()};
        var RedisAdapter = requireRedisAdapter(undefined, undefined, client);

        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);

        expect(adapter.clientData).to.be.equal(clientData);
      });
      
      it('subscribes client to redis queue', function () {
        var client = {subscribe: sinon.spy()};
        var RedisAdapter = requireRedisAdapter(undefined, undefined, client);

        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);

        expect(client.subscribe).called;
        expect(client.subscribe).calledWith(adapter.documentPath);
      });

      it('adds client to document active users list', function (done) {
        var publisher = {sadd: sinon.spy()};
        var RedisAdapter = requireRedisAdapter(publisher, undefined, undefined);

        PromiseSync.doneCallback = function () {
          expect(publisher.sadd).calledOnce;
          expect(publisher.sadd).calledWithExactly(adapter.documentUsersPath, adapter.clientData.clientId);
          done();
        };

        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
      });

      it('broadcasts event \'new user\'', function (done) {
        // given
        var publisher = {publish: sinon.spy()};
        var RedisAdapter = requireRedisAdapter(publisher, undefined, undefined);

        // then
        var msgTemplate = {
          type   : 'join',
          payload: { client: clientData.clientId }
        };

        PromiseSync.doneCallback = function () {
          expect(publisher.publish).calledOnce;
          expect(publisher.publish).calledWith(adapter.documentPath, sinon.match.any);
          var args = expect(publisher.publish).secondArguments.to.be.JSON_ObjectsList();
          expect(args).to.containEql(msgTemplate);

          done();
        };

        // when
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
      });

      it('publishes user count', function (done) {
        // given
        var publisher = {
          publish: sinon.spy(),
          scard  : sinon.stub().returns(faker.random.number())
        };
        var RedisAdapter = requireRedisAdapter(publisher, undefined, undefined);

        // then
        var msgTemplate = {
          payload: { user_count: publisher.scard() }
        };

        PromiseSync.doneCallback = function () {
          expect(publisher.scard).called;
          expect(publisher.scard).calledWith(adapter.documentUsersPath, sinon.match.func);
          expect(publisher.publish).calledOnce;
          expect(publisher.publish).calledWith(adapter.documentPath, sinon.match.any);
          var args = expect(publisher.publish).secondArguments.to.be.JSON_ObjectsList();
          expect(args).to.containEql(msgTemplate);

          done();
        };

        // when
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
      });

    });

    describe('publishes', function () {

      var publisher,
          adapter;

      beforeEach(function () {
        publisher = {publish: sinon.spy()};
        var RedisAdapter = requireRedisAdapter(publisher, undefined, undefined);

        adapter = new RedisAdapter(clientData, voidFunction, voidFunction, voidFunction, voidFunction);
      });

      it('operation', function () {
        var msg = faker.lorem.sentence();
        var msgTemplate = { type: 'msg', payload: msg };

        adapter.publishOperation(msg);

        expect(publisher.publish).called;
        expect(publisher.publish).calledWith(adapter.documentPath, sinon.match.any);
        var args = expect(publisher.publish).secondArguments.to.be.JSON_ObjectsList();
        expect(args).to.containEql(msgTemplate);
      });

      it('selection', function () {
        var msg = faker.lorem.sentence();
        var msgTemplate = { type: 'sel', payload: msg };

        adapter.publishSelection(msg);

        expect(publisher.publish).called;
        expect(publisher.publish).calledWith(adapter.documentPath, sinon.match.any);
        var args = expect(publisher.publish).secondArguments.to.be.JSON_ObjectsList();
        expect(args).to.containEql(msgTemplate);
      });

    });

    describe('calls callbacks in case of', function () {

      var publisher,
          adapter,
          messageCallbacks;

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

      var tests = [
        ['operation', 'msg', 'operation'],
        ['selection', 'sel', 'selection'],
        ['user join', 'join', 'join'],
        ['user left', 'left', 'disconnect']
      ];

      for (var i = 0; i < tests.length; i++) {
        var testName = tests[i][0],
            type = tests[i][1],
            method = tests[i][2];

        it(testName, testCase.bind(undefined, type, method));
      }

      function testCase(type, method) {
        var message = {
          type   : type,
          payload: {
            client    : faker.random.number(),
            user_count: faker.random.number()
          }
        };
        adapter._messageHandler(undefined, JSON.stringify(message));
        expect(messageCallbacks[method]).called;
        expect(messageCallbacks[method]).calledWith(message.payload);
      }

    });

    describe('#unsubscribe', function () {

      it('removes client from document\'s active users list', function () {
        var publisher = {srem: sinon.spy()};
        var RedisAdapter = requireRedisAdapter(publisher, undefined, undefined);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);

        adapter.unsubscribe();

        expect(publisher.srem).called;
        expect(publisher.srem).calledWith(adapter.documentUsersPath, adapter.clientData.clientId);
      });

      it('broadcasts event \'user disconnected\' containing user count', function (done) {
        // given
        var publisher = {
          publish: sinon.spy(),
          scard  : sinon.stub().returns(faker.random.number())
        };
        var RedisAdapter = requireRedisAdapter(publisher, undefined, undefined);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);

        // then
        var msgTemplate = {
          type   : 'left',
          payload: {
            client    : clientData.clientId,
            user_count: publisher.scard()
          }
        };
        PromiseSync.doneCallback = function () {
          expect(publisher.publish).called;
          expect(publisher.publish).calledWith(adapter.documentPath, sinon.match.any);
          var args = expect(publisher.publish).secondArguments.to.be.JSON_ObjectsList();
          expect(args).to.containEql(msgTemplate);
          done();
        };

        // when
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

