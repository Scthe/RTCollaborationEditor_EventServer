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


  describe('SocketHandler', function () {

    var server,
        app,            // server state
        socket;

    beforeEach(function () {
      // constructor like function
      var socketHandlerModuleOverrides = {
        './redis_adapter': RedisAdapterProxy
      };
      var registerSocketHandler = proxyquire('../../server/socket_handler', socketHandlerModuleOverrides);

      // start socket server
      app = function () {
      };
      app.emit = sinon.spy();
      server = registerSocketHandler(app, SOCKET_PORT);

      socket = io.connect('http://' + SOCKET_HOST + ':' + SOCKET_PORT, { forceNew: true });
    });

    afterEach(function () {
      if (server) {
        server.close();
      }
      RedisAdapterProxy.prototype.lastInstance = undefined;
    });

    it('connects', function (done) {
      socket.on('connect', function () {
        done();
      });
    });

    describe('#connected', function () {

      it('creates RedisAdapter', function (done) {
        socket.on('connect', function () {
          expect(RedisAdapterProxy.prototype.lastInstance).to.exist;
          var redisAdapter = RedisAdapterProxy.prototype.lastInstance;
          expect(redisAdapter.constructor).calledOnce;
          expect(redisAdapter.constructor).calledWithExactly(
            sinon.match.object,
            sinon.match.func,
            sinon.match.func);
          done();
        });
      });

      it('propagates to node message bus', function (done) {
        socket.on('connect', function () {
          expect(app.emit).calledOnce;
          var msgTemplate = {
            chat_room    : sinon.match.string,
            client_id    : sinon.match.number,
            redis_adapter: RedisAdapterProxy.prototype.lastInstance
          };
          expect(app.emit).calledWithExactly('new user', sinon.match(msgTemplate));
          done();
        });
      });

    });

    /*
     // TODO check why this test conflicts with the connects test
     describe('#disconnected', function () {

     it('propagates to redis', function (done) {
     socket.on('connect', function () {
     RedisAdapterProxy.prototype.lastInstance.unsubscribe = onRedisUnsubscribe;
     socket.disconnect();
     });

     function onRedisUnsubscribe() {
     done();
     }
     });

     it('propagates to node message bus', function (done) {
     socket.on('connect', function () {
     app.emit = function (path, data) {
     if (path === 'remove user') {
     expect(data.chat_room).to.be.a('string');
     expect(data.client_id).to.be.a('number');
     expect(data.redis_adapter).to.be.eq(RedisAdapterProxy.prototype.lastInstance);
     done();
     }
     };
     socket.disconnect();
     });
     });

     });
     */

    it('#on_socket_message propagates client messages to redis', function (done) {
      socket.on('connect', function () {
        var msgTmpl = {
          data: {
            a: faker.random.number()
          }
        };

        RedisAdapterProxy.prototype.lastInstance.publish_message = function (msg) {
          expect(msg).to.have.keys(['data', 'username']);
          expect(msg.data).to.deep.equal(msgTmpl.data);
          expect(msg.username).to.be.a('number');
          done();
        };

        socket.emit('message', msgTmpl);
      });
    });

    describe('propagates to user', function () {

      var msgTmpl;

      beforeEach(function () {
        msgTmpl = {
          data: {
            a: faker.random.number()
          }
        };
      });

      it('#on_message', function (done) {
        socket.on('connect', function () {
          RedisAdapterProxy.prototype.lastInstance.messageHandler(msgTmpl);
          socket.on('message_return', function (data) {
            expect(data).to.deep.equal(msgTmpl);
            done();
          });
        });
      });

      it('#on_user_status', function (done) {
        socket.on('connect', function () {
          RedisAdapterProxy.prototype.lastInstance.userStatusChangeHandler(msgTmpl);
          socket.on('user_mgmt', function (data) {
            expect(data).to.deep.equal(msgTmpl);
            done();
          });
        });
      });

    });

  });

  function RedisAdapterProxy(clientData, messageHandler, userStatusChangeHandler) {
    /* jshint unused:false */ // clientData is not used
    this.constructor = sinon.spy();
    this.constructor.apply(this, arguments);
    RedisAdapterProxy.prototype.lastInstance = this;

    this.messageHandler = messageHandler;
    this.userStatusChangeHandler = userStatusChangeHandler;
  }

  RedisAdapterProxy.prototype = {
    unsubscribe    : sinon.spy(),
    publish_message: sinon.spy(),
    lastInstance   : undefined
  };

})();

