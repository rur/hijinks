chai = require('chai')
expect = chai.expect
sinon = require('sinon')

describe 'Hijinks', ->
  hijinks = requests = null

  beforeEach ->
    this.xhr = sinon.useFakeXMLHttpRequest();
    global.XMLHttpRequest = this.xhr
    requests = []
    hijinks = window.hijinks
    this.xhr.onCreate = (req) ->
      requests.push(req)

  afterEach ->
    this.xhr.restore()
    window.requestAnimationFrame.reset()
    window.cancelAnimationFrame.reset()

  describe 'issue basic GET request', ->
    req = null
    beforeEach ->
      hijinks.request("GET", "/test")
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
      hijinks.request("POST", "/test", "a=123&b=987", "application/x-www-form-urlencoded")
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
      expect -> hijinks.request("NOMETHOD")
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
      hijinks.request("GET", "/test")
      requests[0].respond(
        200,
        { 'Content-Type': 'text/html', 'X-Hijinks': 'partial' },
        '<em id="test">after!</em>'
      )
      expect(document.body.textContent).to.equal "after!"

    it 'should do nothing with an unmatched response', ->
      hijinks.request("GET", "/test")
      requests[0].respond(
        200,
        { 'Content-Type': 'text/html', 'X-Hijinks': 'partial' },
        '<em id="test_other">after!</em>'
      )
      expect(document.body.textContent).to.equal "before!"

  describe 'replace singleton elements', ->

    it 'should replace title tag', ->
      hijinks.request("GET", "/test")
      requests[0].respond(
        200,
        { 'Content-Type': 'text/html', 'X-Hijinks': 'partial' },
        '<title>New Title!</title>'
      )
      expect(document.title).to.equal "New Title!"

  describe 'mounting and unmounting elements', ->
    beforeEach ->
      this.el = document.createElement("DIV")
      this.el.textContent = "Before!"
      this.el.setAttribute("id", "test")
      document.body.appendChild(this.el)
      hijinks.mount(document.body)

    afterEach ->
      document.body.removeChild(document.getElementById("test"))

    it 'should have mounted the body element', ->
      expect(document.body._hijinksComponents).to.eql []

    it 'should have mounted the child element', ->
      expect(this.el._hijinksComponents).to.eql []

    describe 'when elements are replaced', ->
      beforeEach ->
        hijinks.request("GET", "/test")
        requests[0].respond(
          200,
          { 'Content-Type': 'text/html', 'X-Hijinks': 'partial' },
          '<em id="test">after!</em>'
        )
        this.nue = document.getElementById('test')

      it 'should remove the element from the DOM', ->
        expect(this.el.parentNode).to.be.null

      it 'should unmount the existing element', ->
        expect(this.el._hijinksComponents).to.be.null

      it 'should have inserted the new #test element', ->
        expect(this.nue.tagName).to.equal "EM"

      it 'should mount the new element', ->
        expect(this.nue._hijinksComponents).to.eql []

  describe 'binding components', ->
    beforeEach ->
      this.el = document.createElement("test-node")
      this.el.setAttribute("id", "test")
      document.body.appendChild(this.el)
      this.el2 = document.createElement("div")
      this.el2.setAttribute("id", "test2")
      this.el2.setAttribute("test-node", 123)
      document.body.appendChild(this.el2)
      # component definition:
      this.component = {
        tagName: "test-node",
        attrName: "test-node",
        mount: sinon.spy(),
        unmount: sinon.spy()
      }
      hijinks.push(this.component)
      window.requestAnimationFrame.lastCall.args[0]()

    afterEach ->
      document.body.removeChild(document.getElementById("test"))
      document.body.removeChild(document.getElementById("test2"))

    it 'should have called the mount on the element', ->
      expect(this.component.mount.calledWith(this.el)).to.be.true

    it 'should have called the mount on the attribute', ->
      expect(this.component.mount.calledWith(this.el2)).to.be.true

    describe 'when unmounted', ->
      beforeEach ->
        hijinks.request("GET", "/test")
        requests[0].respond(
          200,
          { 'Content-Type': 'text/html', 'X-Hijinks': 'partial' },
          '<div id="test">after!</div><div id="test2">after2!</div>'
        )

      it 'should have called the unmount on the element', ->
        expect(this.component.unmount.calledWith(this.el)).to.be.true

      it 'should have called the unmount on the attribute', ->
        expect(this.component.unmount.calledWith(this.el2)).to.be.tru

  describe 'inserting groups', ->
    beforeEach ->
      lists = document.createDocumentFragment();
      this.c1 = document.createComment("hijinks-group: test")
      this.list = document.createElement("UL")
      this.list.setAttribute("id", "list")
      this.list.appendChild(this.c1)
      lists.appendChild(this.list)
      this.c2 = document.createComment("hijinks-group: test2 prepend")
      this.list2 = document.createElement("UL")
      this.list2.setAttribute("id", "list2")
      this.list2.appendChild(this.c2)
      lists.appendChild(this.list2)
      document.body.appendChild(lists)

    afterEach ->
      document.body.removeChild(document.getElementById("list"))
      document.body.removeChild(document.getElementById("list2"))

    it 'should have created commoent element', ->
      expect(this.list.childNodes[0].nodeValue).to.equal "hijinks-group: test"

    it 'should have created prepend comment element', ->
      expect(this.list2.childNodes[0].nodeValue).to.equal "hijinks-group: test2 prepend"

    it 'should insert an element below the first list comment', ->
      hijinks
      hijinks.request("GET", "/test")
      requests[0].respond(
        200,
        { 'Content-Type': 'text/html', 'X-Hijinks': 'partial' },
        '<li data-hijinks-group="test">my first element!</li>'
      )
      expect(this.list.textContent).to.equal "my first element!"
      expect([].map.call(this.list.childNodes, (n) -> n.textContent))
        .to.eql [
          "hijinks-group: test"
          "my first element!"
        ]

    it 'should insert two elements above list2 in the correct order', ->
      mount = sinon.spy()
      hijinks.push({
        tagName: "LI",
        mount: mount
      })
      window.requestAnimationFrame.lastCall.args[0]()
      hijinks.request("GET", "/test")
      requests[0].respond(
        200,
        { 'Content-Type': 'text/html', 'X-Hijinks': 'partial' },
        '<li data-hijinks-group="test2">my first element!</li><li data-hijinks-group="test2">my second element!</li>'
      )
      expect([].map.call(this.list2.childNodes, (n) -> n.textContent)).to.eql [
        "my first element!",
        "my second element!",
        "hijinks-group: test2 prepend",
      ]

      for child in this.list2.children
        unless mount.calledWith(child)
          throw new chai.AssertionError("Expected " + child + " to have been mounted")


