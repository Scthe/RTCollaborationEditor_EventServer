/*jslint indent: 2 */
/*jshint expr: true*/
/* global describe, it, beforeEach, expect, require, sinon, afterEach, faker, PromiseSync */

(function () {
  'use strict';

  var proxyquire = require('proxyquire').noCallThru(),
      _ = require('underscore');

  describe('Pipeline', function () {

    var app,// node application state f.e some messages are published on this object
        Pipeline,
        clientData;

    beforeEach(function () {
      RedisAdapterProxy.valueOverrides = {};
      var moduleOverrides = {
        './redis_adapter': RedisAdapterProxy,
        'q'              : PromiseSync
      };
      Pipeline = proxyquire('../../server/pipeline', moduleOverrides);
    });

    beforeEach(function () {
      PromiseSync.reset();
    });

    beforeEach(function () {
      app = function () {
      };
      app.emit = sinon.spy();
    });

    beforeEach(function () {
      clientData = {
        documentId: faker.internet.password(),
        clientId  : faker.random.number()
      };
    });

    afterEach(function () {
      RedisAdapterProxy.prototype.lastInstance = undefined;
    });

    describe('#create', function () {

      it('returns valid object', function () {
        var callbacks = {};
        var p = new Pipeline(app, clientData, callbacks);

        expect(p).to.exist;
        expect(p.clientData).to.exist;
        expect(p.redisAdapter).to.exist;
        expect(p.emitterCallbacks).to.exist;
      });

      it('creates RedisAdapter', function () {
        var callbacks = {};
        var p = new Pipeline(app, clientData, callbacks);

        expect(p.redisAdapter).to.exist;
        expect(p.redisAdapter.constructor).calledOnce;
        expect(p.redisAdapter.constructor).calledWithExactly(clientData, callbacks);
      });

      it('stores client data', function () {
        var p = new Pipeline(app, clientData);
        expect(p.clientData).to.be.equal(clientData);
      });

      it('initializes created RedisAdapter', function () {
        var p = new Pipeline(app, clientData);
        expect(p.redisAdapter.__init).calledOnce;
      });

      it('retrieves user list', function () {
        var p = new Pipeline(app, clientData);
        expect(p.redisAdapter.__getUsersForDocument).calledOnce;
      });

      it('publishes user list', function () {
        /*jshint camelcase: false */
        var expectedMsg = {
          type   : 'join',
          payload: { client: clientData.clientId, user_count: sinon.match.any }
        };
        var p = new Pipeline(app, clientData);
        expect(p.redisAdapter.__publish).calledOnce;
        expect(p.redisAdapter.__publish).calledWithExactly(expectedMsg);
      });

      describe('when user JUST STARTED EDITING', function () {

        beforeEach(function () {
          RedisAdapterProxy.valueOverrides.__init = 1;
        });

        it('propagates to node message bus', function () {
          /* jshint -W031 */ // well that's cute
          new Pipeline(app, clientData);

          expect(app.emit).calledOnce;
          expect(app.emit).calledWithExactly('new user', clientData);
        });

      });

      describe('when user IS ALREADY EDITING', function () {

        beforeEach(function () {
          RedisAdapterProxy.valueOverrides.__init = 2;
        });

        it('does not propagate to node message bus', function () {
          /* jshint -W031 */ // well that's cute
          new Pipeline(app, clientData);

          expect(app.emit).not.called;
        });

      });

    });

    describe('#onDisconnected', function () {

      var emitter;

      beforeEach(function () {
        emitter = {emit: sinon.spy()};
      });

      it('unsubscribes from redis', function () {
        var p = new Pipeline(app, clientData);
        p.onDisconnected(emitter);
        expect(p.redisAdapter.__unsubscribe).calledOnce;
      });

      describe('when user FINISHED EDITING', function () {
        beforeEach(function () {
          RedisAdapterProxy.valueOverrides.__unsubscribe = 0;
        });

        it('retrieves user list', function () {
          var p = new Pipeline(app, clientData);
          p.redisAdapter.__getUsersForDocument.reset();
          p.onDisconnected(emitter);
          expect(p.redisAdapter.__getUsersForDocument).calledOnce;
        });

        it('publishes user list', function () {
          /*jshint camelcase: false */
          var expectedMsg = {
            type   : 'left',
            payload: { client: clientData.clientId, user_count: sinon.match.any }// TODO override user count
          };
          var p = new Pipeline(app, clientData);
          p.redisAdapter.__getUsersForDocument.reset();

          p.onDisconnected(emitter);

          expect(p.redisAdapter.__publish).calledWithExactly(expectedMsg);
        });

        it('propagates to node message bus', function () {
          var emitter = {},
              pipeline = new Pipeline(emitter, clientData);
          emitter.emit = sinon.spy();

          pipeline.onDisconnected();

          expect(emitter.emit).calledOnce;
          expect(emitter.emit).calledWithExactly('remove user', clientData, undefined); // last undefined is added through Q
        });
      });

      describe('when OTHER editor INSTANCES exist', function () {
        beforeEach(function () {
          RedisAdapterProxy.valueOverrides.__unsubscribe = 1;
        });

        it('does not retrieve user list', function () {
          var p = new Pipeline(app, clientData);
          p.redisAdapter.__getUsersForDocument.reset();
          p.onDisconnected(emitter);
          expect(p.redisAdapter.__getUsersForDocument).not.called;
        });

        it('does not publish user list', function () {
          var p = new Pipeline(app, clientData);
          p.redisAdapter.__publish.reset();
          p.onDisconnected(emitter);
          expect(p.redisAdapter.__publish).not.called;
        });

        it('does not propagate to node message bus', function () {
          var pipeline = new Pipeline(app, clientData);
          var emitter = {};
          emitter.emit = sinon.spy();

          pipeline.onDisconnected(emitter);

          expect(emitter.emit).not.called;
        });

      });

    });

    describe('#onOperationMessage', function () {

      var msgTmpl;

      beforeEach(function () {
        msgTmpl = {
          payload: {
            a: faker.random.number()
          },
          type   : 'msg'
        };
      });

      it('propagates to redis', function () {
        var p = new Pipeline(app, clientData);
        p.redisAdapter.__publish.reset();

        p.onOperationMessage(msgTmpl.payload);

        expect(p.redisAdapter.__publish).calledOnce;
        expect(p.redisAdapter.__publish).calledWithExactly(msgTmpl);
      });

      it('adds to the message creator\'s id', function () {
        var p = new Pipeline(app, clientData);
        p.redisAdapter.__publish.reset();

        p.onOperationMessage(msgTmpl.payload);
        msgTmpl.payload = {
          username: clientData.clientId,
          a       : sinon.match.any
        };
        expect(p.redisAdapter.__publish).calledOnce;
        expect(p.redisAdapter.__publish).calledWithExactly(msgTmpl);
      });

    });

    describe('#onPropagatedMessage', function () {

      var publisher,
          pipeline,
          messageCallbacks,
          message;

      beforeEach(function () {
        publisher = {publish: sinon.spy()};
        messageCallbacks = {
          operation : sinon.spy(),
          join      : sinon.spy(),
          disconnect: sinon.spy()
        };
        message = {
          payload: {
            client   : faker.random.number(),
            userCount: faker.random.number()
          }
        };
        pipeline = new Pipeline(app, clientData, messageCallbacks);
      });

      var tests = [
        ['operation', 'msg', 'operation'],
        ['user join', 'join', 'join'],
        ['user left', 'left', 'disconnect']
      ];

      for (var i = 0; i < tests.length; i++) {
        var testName = 'type: ' + tests[i][0],
            type = tests[i][1],
            method = tests[i][2];

        it(testName, testCase.bind(undefined, type, method));
      }

      function testCase(type, method) {
        message.type = type;
        pipeline.onPropagatedMessage(undefined, JSON.stringify(message));
        expect(messageCallbacks[method]).called;
        expect(messageCallbacks[method]).calledWith(message.payload);
      }

    });

    describe('#validateMessage', function () {

      var whitelist = [
        'caret.register',
        'caret.move',
        'caret.selectionMove',
        'caret.setPosition',
        'caret.setSelection',

        'insert',
        'wrap',
        'unwrap',
        'bold',
        'italic',
        'underline',
        'delete',
        'heading',
        'anchor',
        'list',
        'newLine',
        'split'
      ];

      it('does not filter out correct event types', function () {
        var p = new Pipeline(app, clientData);

        _(whitelist).each(function (opName) {
          var op = {name: opName, args: {}};
          expect(p.validateMessage(op)).to.be.true;
        });
      });

    });


  });

  function RedisAdapterProxy() {
    var self = this;
    this.constructor = sinon.spy();
    this.constructor.apply(self, arguments);

    this.init = wrap('__init');
    this.publish = wrap('__publish');
    this.unsubscribe = wrap('__unsubscribe');
    this.getUsersForDocument = wrap('__getUsersForDocument');

    function wrap(name) {
      self[name] = sinon.spy();
      return function () {
        self[name].call(arguments);
        var args = self[name].args;
        args[args.length - 1 ] = arguments;
        return new PromiseSync(RedisAdapterProxy.valueOverrides[name]);
      };
    }
  }

})();
