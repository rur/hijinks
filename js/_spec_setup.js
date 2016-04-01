var jsdom = require('jsdom');
sinon = require('sinon');

// Define some html to be our basic document
// JSDOM will consume this and act as if we were in a browser
var DEFAULT_HTML = '<html><head><title>Default Title</title></head><body></body></html>';

// Define some variables to make it look like we're a browser
// First, use JSDOM's fake DOM as the document
global.document = jsdom.jsdom(DEFAULT_HTML);

// Set up a mock window
global.window = document.defaultView;

global.window.requestAnimationFrame = sinon.spy();
global.window.cancelAnimationFrame = sinon.spy();

// Allow for things like window.location
global.navigator = window.navigator;
