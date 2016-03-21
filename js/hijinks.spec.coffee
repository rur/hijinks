expect = require('chai').expect

describe 'test hijinks library', ->
  it 'should have exported hijinks api to the window', ->
    expect(window.hijinks).to.exist