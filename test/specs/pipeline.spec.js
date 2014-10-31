/*jslint indent: 2 */
/*jshint expr: true*/
/* global describe, it, beforeEach, expect, require, sinon, afterEach, faker */

(function () {
  'use strict';

  var proxyquire = require('proxyquire').noCallThru();

  describe.only('Pipeline', function () {

    var app,// node application state f.e some messages are published on this object
        Pipeline,
        clientData;

    beforeEach(function () {
      var moduleOverrides = {
        './redis_adapter': RedisAdapterProxy
      };
      Pipeline = proxyquire('../../server/pipeline', moduleOverrides);
    });

    beforeEach(function () {
      app = function () {
      };
      app.emit = sinon.spy();
    });

    beforeEach(function () {
      clientData = {
        chat_room: faker.internet.password(),
        client_id: faker.random.number()
      };
    });

    afterEach(function () {
      RedisAdapterProxy.prototype.lastInstance = undefined;
    });

    describe('#create', function () {

      it('creates RedisAdapter', function () {
        /* jshint -W031 */ // well that's cute

        var callbacks = {};
        new Pipeline(app, clientData, callbacks);

        var redisAdapter = RedisAdapterProxy.prototype.lastInstance;
        expect(redisAdapter).to.exist;
        expect(redisAdapter.constructor).calledOnce;
        expect(redisAdapter.constructor).calledWithExactly(clientData, callbacks);
      });

      it('propagates to node message bus', function () {
        /* jshint -W031 */ // well that's cute

        new Pipeline(app, clientData);

        expect(app.emit).calledOnce;
        expect(app.emit).calledWithExactly('new user', clientData);
      });

    });

    /*
     var msgTmpl = {
     data: {
     a: faker.random.number()
     }
     };

     RedisAdapterProxy.prototype.lastInstance.publish_selection = function (msg) {
     expect(msg).to.have.keys(['data', 'username']);
     expect(msg.data).to.deep.equal(msgTmpl.data);
     expect(msg.username).to.be.a('number');
     done();
     };
     */

    describe('#onDisconnected', function () {

      it('propagates to redis', function () {
        var pipeline = new Pipeline(app, clientData);
        var emitter = {};
        emitter.emit = sinon.spy();

        pipeline.onDisconnected(emitter);

        var redisAdapter = RedisAdapterProxy.prototype.lastInstance;
        expect(redisAdapter).to.exist;
        expect(redisAdapter.unsubscribe).calledOnce;
      });

      it('propagates to node message bus', function () {
        /* jshint -W031 */ // well that's cute

        var pipeline = new Pipeline(app, clientData);
        var emitter = {};
        emitter.emit = sinon.spy();

        pipeline.onDisconnected(emitter);

        expect(emitter.emit).calledOnce;
        expect(emitter.emit).calledWithExactly('remove user', clientData);
      });

    });

    describe('#onOperationMessage', function () {

      var msgTmpl;

      beforeEach(function () {
        msgTmpl = {
          data: {
            a: faker.random.number()
          }
        };
      });

      it('propagates to redis', function () {
        var pipeline = new Pipeline(app, clientData);

        pipeline.onOperationMessage(msgTmpl);

        var redisAdapter = RedisAdapterProxy.prototype.lastInstance;
        expect(redisAdapter).to.exist;
        expect(redisAdapter.publish_operation).calledOnce;
        expect(redisAdapter.publish_operation).calledWithExactly(msgTmpl);
      });

      it.only('adds to the message creator\'s id', function () {
        var pipeline = new Pipeline(app, clientData);
        var usernamePattern = {
          username: clientData.client_id,
          data    : sinon.match.object
        };

        pipeline.onOperationMessage(msgTmpl);

        var redisAdapter = RedisAdapterProxy.prototype.lastInstance;
        expect(redisAdapter).to.exist;
        expect(redisAdapter.publish_operation).calledOnce;
        expect(redisAdapter.publish_operation).calledWithExactly(usernamePattern);
      });
    });

    describe('#onSelectionMessage', function () {
      var msgTmpl;

      beforeEach(function () {
        msgTmpl = {
          data: {
            a: faker.random.number()
          }
        };
      });

      it('propagates to redis', function () {
        var pipeline = new Pipeline(app, clientData);

        pipeline.onSelectionMessage(msgTmpl);

        var redisAdapter = RedisAdapterProxy.prototype.lastInstance;
        expect(redisAdapter).to.exist;
        expect(redisAdapter.publish_selection).calledOnce;
        expect(redisAdapter.publish_selection).calledWithExactly(msgTmpl);
      });

      it.only('adds to the message creator\'s id', function () {
        var pipeline = new Pipeline(app, clientData);
        var usernamePattern = {
          username: clientData.client_id,
          data    : sinon.match.object
        };

        pipeline.onSelectionMessage(msgTmpl);

        var redisAdapter = RedisAdapterProxy.prototype.lastInstance;
        expect(redisAdapter).to.exist;
        expect(redisAdapter.publish_selection).calledOnce;
        expect(redisAdapter.publish_selection).calledWithExactly(usernamePattern);
      });
    });

  });

  function RedisAdapterProxy(clientData, callbacks) {
    /* jshint unused:false */ // clientData is not used
    this.constructor = sinon.spy();
    this.constructor.apply(this, arguments);

    this.unsubscribe = sinon.spy();
    this.publish_operation = sinon.spy();
    this.publish_selection = sinon.spy();

    RedisAdapterProxy.prototype.lastInstance = this;
  }

  RedisAdapterProxy.prototype = {
    lastInstance: undefined // in tests we need reference to RedisAdapter object !
  };

})();
