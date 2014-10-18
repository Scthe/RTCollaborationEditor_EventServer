var chai = require('chai');

global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.assert = chai.assert;

var sinon = require('sinon');
global.sinon = sinon;
global.assertTrue = sinon.assertTrue;

var sinonChai = require("sinon-chai");
chai.use(sinonChai);

global.faker =  require("faker");
