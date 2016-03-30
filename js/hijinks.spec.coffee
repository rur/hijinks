expect = require('chai').expect
sinon = require('sinon')

describe 'test hijinks library', ->
  it 'should have exported hijinks api to the window', ->
    expect(global.window.hijinks).to.exist

describe 'hijinks.request', ->
  requests = null

  beforeEach ->
    this.xhr = sinon.useFakeXMLHttpRequest();
    global.XMLHttpRequest = this.xhr
    requests = []
    this.xhr.onCreate = (req) ->
      requests.push(req)

  afterEach ->
    this.xhr.restore()

  describe 'issue basic GET request', ->
    req = null
    beforeEach ->
      window.hijinks.request("GET", "/test")
      req = requests[0]

    it 'should have issued a request', ->
      expect(req).to.exist

    it 'should have issued a request with the method and url', ->
      expect(req.url).to.contain "/test"
      expect(req.method).to.equal "GET"

    it 'should have added the hijinks header', ->
      expect(req.requestHeaders["X-Hijinks"]).to.equal "partial"

    it 'should add the hijinks query param', ->
      expect(req.url).to.equal "/test?hijinks"

    it 'should have no body', ->
      expect(req.requestBody).to.be.null

  describe 'issue basic POST request', ->
    req = null
    beforeEach ->
      window.hijinks.request("POST", "/test", "a=123&b=987", "application/x-www-form-urlencoded")
      req = requests[0]

    it 'should have issued a request with right info', ->
      expect(req).to.exist
      expect(req.url).to.contain "/test"
      expect(req.method).to.equal "POST"
      expect(req.requestHeaders["X-Hijinks"]).to.equal "partial"
      expect(req.url).to.equal "/test?hijinks"

    it 'should have added the content type header', ->
      expect req.requestHeaders["Content-Type"]
        .to.contain  "application/x-www-form-urlencoded"

    it 'should have a body', ->
      expect(req.requestBody).to.equal "a=123&b=987"

  describe 'rejected request', ->
    it 'should have a white list of methods', ->
      expect -> window.hijinks.request("NOMETHOD")
        .to.throw "Hijinks: Unknown request method 'NOMETHOD'"


  describe 'replace indexed elements', ->
    el = null
    beforeEach ->
      el = document.createElement("p")
      el.setAttribute("id", "test")
      el.textContent = "before!"
      document.body.appendChild(el);

    afterEach ->
      document.body.removeChild(document.getElementById("test"))

    it 'should have appended the child', ->
      expect(el.parentNode.tagName).to.equal "BODY"

    it 'should replace <p>before!</p> with <em>after!</em>', ->
      window.hijinks.request("GET", "/test")
      requests[0].respond(
        200,
        { 'Content-Type': 'text/html', 'X-Hijinks': 'partial' },
        '<em id="test">after!</em>'
      )
      expect(document.body.textContent).to.equal "after!"

    it 'should do nothing with an unmatched response', ->
      window.hijinks.request("GET", "/test")
      requests[0].respond(
        200,
        { 'Content-Type': 'text/html', 'X-Hijinks': 'partial' },
        '<em id="test_other">after!</em>'
      )
      expect(document.body.textContent).to.equal "before!"