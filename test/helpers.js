var chai = require('chai');
global.chai = chai;

global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.assert = chai.assert;

var sinon = require('sinon');
global.sinon = sinon;

var sinonChai = require('sinon-chai');
chai.use(sinonChai);

global.faker = require('faker');

global.voidFunction = function () {
};

global.log = {
  debug  : console.log,
  redis  : console.log,
  verbose: console.log,
  info   : console.log,
  warn   : console.log,
  error  : console.error
};

global.requireHelper = function (path) {
  'use strict';
//  return require((process.env.APP_DIR_FOR_CODE_COVERAGE || '../server/') + path);
  return (process.env.APP_DIR_FOR_CODE_COVERAGE || '../../server/') + path;
};