module.exports = {
  /**
   * port on which to run the express application serving the HTML files
   */
  'app_port': 3000,

  /**
   * port on which runs the socket server
   */
  'socket_port': 8082,

  /**
   * when client views the page it tries to connect to the socket server
   * on a specified host
   */
  'socket_host': 'localhost',

  /**
   * port on which redis instance runs
   */
  'redis_port': 6379,

  /**
   * host of the redis instance
   */
  'redis_host': 'localhost',

  'profiles': {

    'c9': {
      /**
       * does not start HTML server
       */
      'socket_only': true,
      'socket_port': process.env.PORT,
      'socket_host': process.env.IP
      // client:
      // var socket = io.connect('http://sublime_docs-server-c9-dbxmvqtn111.c9.io')
    },

    'sock': {
      'socket_only': true
    }
  },

  /**
   * Hidden in plain sight !
   */
  'secret_key': 'abcde'

};
