/*jslint indent: 2 */
/*jshint expr: true*/
/* global describe, it, beforeEach, expect, require, sinon, afterEach, faker, config */

(function () {
  'use strict';

  var proxyquire = require('proxyquire').noCallThru(),
      io = require('socket.io-client'),
      jwt = require('jsonwebtoken'),
      SOCKET_PORT = 8082,
      SOCKET_HOST = 'localhost';

  GLOBAL.config = {
    socket_port: SOCKET_PORT,
    secret_key : 'test_key'
  };

  var pipelineForwardedCalls;

  describe('SocketHandler', function () {

    var server, // normal host&port server as underlying for socket connection receiver
        app,// node application state f.e some messages are published on this object
        socket,// client socket
        clientData;

    beforeEach(function () {
      // constructor like function
      var socketHandlerModuleOverrides = {
        './pipeline': PipelineProxy
      };
      var registerSocketHandler = proxyquire('../../server/socket_handler', socketHandlerModuleOverrides);

      // create app object
      app = function () {
      };
      app.emit = sinon.spy();

      // start socket server
      server = registerSocketHandler(app, SOCKET_PORT);

      // data for client auth step
      clientData = {
        documentId: faker.internet.password(),
        clientId  : faker.random.number()
      };

      // either test creates socket on it's own or relies of it_ to do it
    });

    beforeEach(function () {
      pipelineForwardedCalls = {
        _onDisconnected    : sinon.spy(),
        _onOperationMessage: sinon.spy(),
        _onSelectionMessage: sinon.spy()
      };
    });

    afterEach(function () {
      if (server) {
        server.close();
      }
    });

    it('connects', function (done) {
      var token = jwt.sign(clientData, config.secret_key);
      // client socket
      socket = io.connect('http://' + SOCKET_HOST + ':' + SOCKET_PORT, {
        forceNew: true,
        query   : 'token=' + token
      });

      socket.on('connect', function () {
        done();
      });
    });

    it('should never let connect with incorrect token', function (done) {
      var token = jwt.sign(clientData, config.secret_key) + '~';
      // client socket
      socket = io.connect('http://' + SOCKET_HOST + ':' + SOCKET_PORT, {
        forceNew: true,
        query   : 'token=' + token
      });

      var EXPECTED_TIMEOUT = 100;
      this.timeout(EXPECTED_TIMEOUT + 100);
      var timeout = setTimeout(done, EXPECTED_TIMEOUT);
      socket.on('connect', function () {
        clearTimeout(timeout);
        // expected behavior: this should never happen
        done(new Error('Unexpected call'));
      });
    });

    describe('#connected', function () {

      it_('creates pipeline for message processing', function (done) {
        var pipeline = PipelineProxy.prototype.lastInstance;
        expect(pipeline).to.exist;
        expect(pipeline.constructor).calledOnce;
        expect(pipeline.constructor).calledWithExactly(
          app,
          sinon.match.object,
          sinon.match.object);

        done();
      });

      it('reads provided client data', function (done) {
        var token = jwt.sign(clientData, config.secret_key);
        // client socket
        socket = io.connect('http://' + SOCKET_HOST + ':' + SOCKET_PORT, {
          forceNew: true,
          query   : 'token=' + token
        });

        socket.on('connect', function () {
          var pipeline = PipelineProxy.prototype.lastInstance;
          expect(pipeline).to.exist;
          expect(pipeline.clientData).to.exist;
          expect(pipeline.clientData.documentId).to.be.equal(clientData.documentId);
          expect(pipeline.clientData.clientId).to.be.equal(clientData.clientId);

          done();
        });
      });


    });

    describe('CLIENT -> server:', function () {

      var msgTmpl;

      beforeEach(function () {
        msgTmpl = {
          data: {
            a: faker.random.number()
          }
        };
      });

      it_('#emit_operation', function (done) {
        pipelineForwardedCalls._onOperationMessage = function (data) {
          expect(data).to.deep.equal(msgTmpl);
          done();
        };
        socket.emit('operation', msgTmpl);
      });

      it_('#emit_selection', function (done) {
        pipelineForwardedCalls._onSelectionMessage = function (data) {
          expect(data).to.deep.equal(msgTmpl);
          done();
        };
        socket.emit('selection', msgTmpl);
      });

      /* TODO #disconnect test
       it('#disconnect', function (done) {
       socket.on('connect', function () {
       pipelineForwardedCalls._onDisconnected = function (data) {
       done();
       };

       socket.disconnect();
       });
       });
       */
    });

    describe('SERVER -> client:', function () {

      var msgTmpl;

      beforeEach(function () {
        msgTmpl = {
          data: {
            a: faker.random.number()
          }
        };
      });

      var tests = [
        ['#emit_operation', 'operation', 'operation'],
        ['#emit_selection', 'selection', 'selection'],
        ['#emit_reconnect', 'reconnect', 'join'],
        ['#emit_client_left', 'client_left', 'disconnect']
      ];

      // create the test for us since they are in 90% the same
      for (var i = 0; i < tests.length; i++) {
        var testName = tests[i][0],
            testChannel = tests[i][1],
            senderMethod = tests[i][2];

        it_(testName, testCase.bind(undefined, testChannel, senderMethod));
      }

      function testCase(testChannel, senderMethod, done) {
        // send through provided callback interface
        var sender = PipelineProxy.prototype.lastInstance.emitterCallbacks;
        sender[senderMethod](msgTmpl);

        // expect to receive
        socket.on(testChannel, function (data) {
          expect(data).to.deep.equal(msgTmpl);
          done();
        });
      }

    });

    function it_(name, f) {
      it(name, function (done) {
        var token = jwt.sign(clientData, config.secret_key);
        // client socket
        socket = io.connect('http://' + SOCKET_HOST + ':' + SOCKET_PORT, {
          forceNew: true,
          query   : 'token=' + token
        });

        socket.on('connect', function () {
          f(done);
        });
      });
    }

  });

  function PipelineProxy(app, clientData, emitterCallbacks) {
    /* jshint unused:false */
    this.constructor = sinon.spy();
    this.constructor.apply(this, arguments);

//    this.app = app;
    this.clientData = clientData;
    this.emitterCallbacks = emitterCallbacks;


    PipelineProxy.prototype.lastInstance = this;
  }

  PipelineProxy.prototype = {
    // ( functions below are binded in constructor which limits their testability
    // (binding process creates separate object to which we do not have access).
    // by forwarding calls to different object we can overcome this limitation )

    onDisconnected    : function () {
      pipelineForwardedCalls._onDisconnected.apply(this, arguments);
    },
    onOperationMessage: function () {
      pipelineForwardedCalls._onOperationMessage.apply(this, arguments);
    },
    onSelectionMessage: function () {
      pipelineForwardedCalls._onSelectionMessage.apply(this, arguments);
    },

    lastInstance: undefined // in tests we need reference to Pipeline object !
  };

})();

