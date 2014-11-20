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
        var RedisAdapter = requireRedisAdapter(),
            obj = new RedisAdapter(clientData, voidFunction, voidFunction);
        expect(obj).to.exist;
        expect(obj.clientId).to.exist;
        expect(obj.documentPath).to.exist;
        expect(obj.documentUsersPath).to.exist;
        expect(obj.client).to.exist;
      });

      it('sets correct document path', function () {
        var RedisAdapter = requireRedisAdapter();
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
        expect(adapter.documentPath).to.contain(clientData.documentId);
      });

      it('sets correct document users path', function () {
        var RedisAdapter = requireRedisAdapter();
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
        expect(adapter.documentUsersPath).to.contain(clientData.documentId);
      });

      it('creates redis client', function () {
        var redisClient = { id: faker.internet.password() },
            RedisAdapter = requireRedisAdapter(undefined, undefined, redisClient);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
        expect(adapter.client.id).to.be.equal(redisClient.id);
      });
    });

    describe('#init', function () {

      it('subscribes client to redis queue', function () {
        var client = {subscribe: sinon.spy()},
            RedisAdapter = requireRedisAdapter(undefined, undefined, client);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);

        adapter.init();

        expect(client.subscribe).called;
        expect(client.subscribe).calledWith(adapter.documentPath);
      });

      it('sets the message handler', function () {
        var client = {on: sinon.spy()};
        client.on.bind = sinon.spy();
        var msgHandler = { id: faker.internet.password() },
            RedisAdapter = requireRedisAdapter(undefined, undefined, client);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);

        adapter.init(msgHandler);

        expect(client.on.bind).called;
        expect(client.on.bind).calledWith(sinon.match.any, 'message', msgHandler);
      });

      it('adds client to document\'s client list', function () {
        var publisher = {sadd: sinon.spy()};
        var RedisAdapter = requireRedisAdapter(publisher, undefined, undefined);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);

        adapter.init({});

        expect(publisher.sadd).calledOnce;
        expect(publisher.sadd).calledWithExactly(adapter.documentUsersPath, clientData.clientId);
      });

    });

    describe('#unsubscribe', function () {

      it('quits the redis client', function () {
        var client = {quit: sinon.spy()},
            RedisAdapter = requireRedisAdapter(undefined, undefined, client);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
        adapter.init();

        adapter.unsubscribe();

        expect(client.quit).called;
      });

      it('removes client from document\'s active users list', function () {
        var publisher = {srem: sinon.spy()},
            RedisAdapter = requireRedisAdapter(publisher, undefined, undefined);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
        adapter.init();

        adapter.unsubscribe();

        expect(publisher.srem).called;
        expect(publisher.srem).calledWith(adapter.documentUsersPath, clientData.clientId);
      });

    });

    describe('#publish', function () {

      it('forwards to redis', function () {
        var msg = faker.lorem.sentence(),
            publisher = {publish: sinon.spy()},
            RedisAdapter = requireRedisAdapter(publisher, undefined, undefined);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
        adapter.init();

        adapter.publish(msg);

        expect(publisher.publish).called;
        expect(publisher.publish).calledWith(adapter.documentPath, sinon.match.any);
        var args = expect(publisher.publish).secondArguments.to.be.JSON_ObjectsList();
        expect(args).to.containEql(msg);
      });
    });

    describe('#getUsersForDocument', function () {

      it('forwards to redis', function () {
        var publisher = {scard: sinon.spy()},
            RedisAdapter = requireRedisAdapter(publisher, undefined, undefined);
        adapter = new RedisAdapter(clientData, voidFunction, voidFunction);
        adapter.init();

        adapter.getUsersForDocument();

        expect(publisher.scard).called;
        expect(publisher.scard).calledWith(adapter.documentUsersPath);
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

})
();

