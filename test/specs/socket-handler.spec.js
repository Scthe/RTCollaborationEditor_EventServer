/*jslint indent: 2 */
/*jshint expr: true*/
/* global describe, it, beforeEach, expect, require, sinon, afterEach, faker */

(function () {
  'use strict';

  var proxyquire = require('proxyquire').noCallThru(),
      io = require('socket.io-client'),
      SOCKET_PORT = 8082,
      SOCKET_HOST = 'localhost';

  GLOBAL.config = {socket_port: SOCKET_PORT};

  var pipelineForwardedCalls;

  describe.only('SocketHandler', function () {

    var server, // normal host&port server as underlying for socket connection receiver
        app,// node application state f.e some messages are published on this object
        socket;// client socket

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

      // client socket
      socket = io.connect('http://' + SOCKET_HOST + ':' + SOCKET_PORT, { forceNew: true });
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

    /*
     TODO replace:
     it('#disconnect', function (done) {
     socket.on('connect', function () {
     }}

     with it_
     */

    it('connects', function (done) {
      socket.on('connect', function () {
        done();
      });
    });

    describe('#connected', function () {

      it('creates pipeline for message processing', function (done) {
        socket.on('connect', function () {
          expect(PipelineProxy.prototype.lastInstance).to.exist;
          var pipeline = PipelineProxy.prototype.lastInstance;
          expect(pipeline.constructor).calledOnce;
          expect(pipeline.constructor).calledWithExactly(
            app,
            sinon.match.object,
            sinon.match.object);

          done();
        });
      });

      // TODO add tests for reading proper client data

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

      it('#emit_operation', function (done) {
        socket.on('connect', function () {
          pipelineForwardedCalls._onOperationMessage = function (data) {
            expect(data).to.deep.equal(msgTmpl);
            done();
          };
          socket.emit('operation', msgTmpl);
        });
      });

      it('#emit_selection', function (done) {
        socket.on('connect', function () {
          pipelineForwardedCalls._onSelectionMessage = function (data) {
            expect(data).to.deep.equal(msgTmpl);
            done();
          };
          socket.emit('selection', msgTmpl);
        });
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

      // TODO: We could use for loop to create this tests as they are nearly exactly the same

      it('#emit_operation', function (done) {
        socket.on('connect', function () {
          // send through provided callback interface
          var sender = PipelineProxy.prototype.lastInstance.emitterCallbacks;
          sender.operation(msgTmpl);

          // expect to receive
          socket.on('operation', function (data) {
            expect(data).to.deep.equal(msgTmpl);
            done();
          });
        });
      });

      it('#emit_selection', function (done) {
        socket.on('connect', function () {
          // send through provided callback interface
          var sender = PipelineProxy.prototype.lastInstance.emitterCallbacks;
          sender.selection(msgTmpl);

          // expect to receive
          socket.on('selection', function (data) {
            expect(data).to.deep.equal(msgTmpl);
            done();
          });
        });
      });

      it('#emit_reconnect', function (done) {
        socket.on('connect', function () {
          // send through provided callback interface
          var sender = PipelineProxy.prototype.lastInstance.emitterCallbacks;
          sender.join(msgTmpl);

          // expect to receive
          socket.on('reconnect', function (data) {
            expect(data).to.deep.equal(msgTmpl);
            done();
          });
        });
      });

      it('#emit_client_left', function (done) {
        socket.on('connect', function () {
          // send through provided callback interface
          var sender = PipelineProxy.prototype.lastInstance.emitterCallbacks;
          sender.disconnect(msgTmpl);

          // expect to receive
          socket.on('client_left', function (data) {
            expect(data).to.deep.equal(msgTmpl);
            done();
          });
        });
      });

    });

  });

  function PipelineProxy(app, client_data, emitterCallbacks) {
    /* jshint unused:false */
    this.constructor = sinon.spy();
    this.constructor.apply(this, arguments);

    this.app = app;
    this.client_data = client_data;
    this.emitterCallbacks = emitterCallbacks;


    PipelineProxy.prototype.lastInstance = this;
  }

  PipelineProxy.prototype = {

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

