chai = require('chai')
expect = chai.expect
sinon = require('sinon')

describe 'Hijinks FormSerialize', ->
  hijinks = null
  beforeEach ->
    hijinks = window.hijinks

  it 'should have exported FormSerialize', ->
    expect(hijinks.FormSerialize).to.be.instanceof Function

  describe 'basic GET form', ->
    data = fd = null

    beforeEach ->
      el = document.createElement("div");
      el.innerHTML = """
      <form action="/test" method="GET">
        <input type="text" name="abc" value="123">
      </form>
      """
      fd = new hijinks.FormSerialize(
        el.children[0],
        (d) -> data = d
      )

    it 'should not have method', ->
      expect(data.method).to.equal 'GET'

    it 'should have parsed the action', ->
      expect(data.action).to.equal "/test?abc=123"

    it 'should not have request body data', ->
      expect(data.data).to.be.null

    it 'should not have enctype', ->
      expect(data.enctype).to.be.null


  describe 'plain/text POST form', ->
    data = fd = null

    beforeEach ->
      el = document.createElement("div");
      el.innerHTML = """
      <form action="/test" method="POST" enctype="text/plain">
        <input type="text" name="abc" value="123">
        <input type="checkbox" name="def" checked="checked" value="987">
      </form>
      """
      fd = new hijinks.FormSerialize(
        el.children[0],
        (d) -> data = d
      )

    it 'should not have method', ->
      expect(data.method).to.equal 'POST'

    it 'should have parsed the action', ->
      expect(data.action).to.equal "/test"

    it 'should not have request body data', ->
      expect(data.data).to.equal "abc=123\r\ndef=987"

    it 'should not have enctype', ->
      expect(data.enctype).to.equal "text/plain"


  describe 'urlencoded POST form', ->
    data = fd = null

    beforeEach ->
      el = document.createElement("div");
      el.innerHTML = """
      <form action="/test" method="POST">
        <input type="text" name="abc" value="123">
        <input type="checkbox" name="def" checked="checked" value="987">
      </form>
      """
      fd = new hijinks.FormSerialize(
        el.children[0],
        (d) -> data = d
      )

    it 'should not have method', ->
      expect(data.method).to.equal 'POST'

    it 'should have parsed the action', ->
      expect(data.action).to.equal "/test"

    it 'should not have request body data', ->
      expect(data.data).to.equal "abc=123&def=987"

    it 'should not have enctype', ->
      expect(data.enctype).to.equal "application/x-www-form-urlencoded"


  describe 'multipart POST form', ->
    data = fd = null

    beforeEach ->
      el = document.createElement("div");
      el.innerHTML = """
      <form action="/test" method="POST" enctype="multipart/form-data">
        <input type="text" name="abc" value="123">
        <input type="checkbox" name="def" checked="checked" value="987">
      </form>
      """
      fd = new hijinks.FormSerialize(
        el.children[0],
        (d) -> data = d
      )

    it 'should not have method', ->
      expect(data.method).to.equal 'POST'

    it 'should have parsed the action', ->
      expect(data.action).to.equal "/test"

    it 'should not have request body data', ->
      expect(data.data).to.be.instanceof window.FormData

    it 'should not have enctype', ->
      expect(data.enctype).to.be.null
