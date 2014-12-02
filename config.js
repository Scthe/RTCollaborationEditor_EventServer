module.exports = {
  /**
   * port on which to run the express application serving the HTML files
   */
  'appPort': 3000,

  /**
   * port on which runs the socket server
   */
  'socketPort': 8082,

  /**
   * when client views the page it tries to connect to the socket server
   * on a specified host
   */
  'socketHost': 'localhost',

  /**
   * port on which redis instance runs
   */
  'redisPort': 6379,

  /**
   * host of the redis instance
   */
  'redisHost': 'localhost',

  /**
   * Hidden in plain sight !
   */
  'secretKey': 'abcde',

  /**
   * Can be used to bypass the message validation. Used in f.e. e2e tests
   */
  'skipValidation': false,

  /**
   * path to the log file
   */
  'logFilePath': 'log/main.log',

  /**
   * console log level, one of: 'debug','verbose','info', 'warn', 'error'
   */
  'logLevel': 'debug',

  'profiles': {

    'c9': {
      /**
       * does not start HTML server
       */
      'socketOnly': true,
      'socketPort': process.env.PORT,
      'socketHost': process.env.IP
      // client:
      // var socket = io.connect('http://sublime_docs-server-c9-dbxmvqtn111.c9.io')
    },

    'sock': {
      'socketOnly': true
    },

    'e2e': {
      'socketOnly'    : false,
      'skipValidation': true
    }
  }

};
