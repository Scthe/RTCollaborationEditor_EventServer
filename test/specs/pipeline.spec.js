/*jslint indent: 2 */
/*jshint expr: true*/
/* global describe, it, beforeEach, expect, require, sinon, afterEach, faker */

(function () {
  'use strict';

  var proxyquire = require('proxyquire').noCallThru();

  describe.only('Pipeline', function () {

    var app,// node application state f.e some messages are published on this object
        Pipeline;

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

    afterEach(function () {
      RedisAdapterProxy.prototype.lastInstance = undefined;
    });

    describe('#create', function () {

      it('creates RedisAdapter', function () {
        /*
         expect(RedisAdapterProxy.prototype.lastInstance).to.exist;
         var redisAdapter = RedisAdapterProxy.prototype.lastInstance;
         expect(redisAdapter.constructor).calledOnce;
         expect(redisAdapter.constructor).calledWithExactly(
         sinon.match.object,
         sinon.match.func,
         sinon.match.func,
         sinon.match.func,
         sinon.match.func);
         */
      });

      it('propagates to node message bus', function () {
        /*
         expect(app.emit).calledOnce;
         var msgTemplate = {
         chat_room    : sinon.match.string,
         client_id    : sinon.match.number,
         redis_adapter: RedisAdapterProxy.prototype.lastInstance
         };
         expect(app.emit).calledWithExactly('new user', sinon.match(msgTemplate));
         */
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
      });

      it('propagates to node message bus', function () {
        /*
         expect(app.emit).calledOnce;
         var msgTemplate = {
         chat_room    : sinon.match.string,
         client_id    : sinon.match.number,
         redis_adapter: RedisAdapterProxy.prototype.lastInstance
         };
         expect(app.emit).calledWithExactly('new user', sinon.match(msgTemplate));
         */
      });
    });

    describe('#onOperationMessage', function () {
      it('propagates to redis', function () {
        // TODO check if adds f.e. username
      });
    });

    describe('#onSelectionMessage', function () {
      it('propagates to redis', function () {
        // TODO check if adds f.e. username
      });
    });

  });

  function RedisAdapterProxy(clientData, f1, f2, f3, f4) {
    /* jshint unused:false */ // clientData is not used
    this.constructor = sinon.spy();
    this.constructor.apply(this, arguments);
    RedisAdapterProxy.prototype.lastInstance = this;

//    this.messageHandler = f1;
//    this.f2 = f2;
//    this.f3 = f3;
//    this.userStatusChangeHandler = f4;
  }

  RedisAdapterProxy.prototype = {
    unsubscribe      : sinon.spy(),
    publish_operation: sinon.spy(),
    publish_selection: sinon.spy(),
    lastInstance     : undefined
  };

})();
