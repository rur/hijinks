(function(window, document, history) {
  "use strict";
  var bindToElement = {},
      bindToAttribute = {},
      SINGLETONS = {title: true}, // tags for which there can be only one in a doc (no incl html, head, body)
      MOUNT = "mount",
      UNMOUNT = "unmount";

  var HijinksGroupIndex = (function () {
    var HJ_GROUP_REG = /^\s*hijinks-group: ([a-zA-Z][\w-\d]*)( prepend)?\s*$/;

    function HijinksGroupIndex(context) {
      // scan DOM from group comment nodes
      // stack search adapted from http://stackoverflow.com/a/25388984/81962
      this.byName = {};
      var conf, el, i, node,
          elementPath = [context];
      while (elementPath.length > 0) {
        el = elementPath.pop();
        for (i = 0; i < el.childNodes.length; i++) {
          node = el.childNodes[i];
          if (node.nodeType === 8) {
            conf = node.nodeValue.match(HJ_GROUP_REG);
            if (conf) {
              this.byName[conf[1]] = {
                name: conf[1],
                element: node,
                prepend: conf[2] === " prepend"
              };
            }
          } else {
            elementPath.push(node);
          }
        }
      }
    }
    return HijinksGroupIndex;
  }());

  function bindElementChildren(event, el) {
    var i = el.children.length - 1,
      child;
    for (; i >= 0; i--) {
      child = el.children[i];
      bindElement(event, child);
    }
  }

  function bindElement(event, el) {
    var name, fns = [],
      i;
    if (el instanceof DocumentFragment) {
      for (i = 0; i < el.children.length; i++) {
        bindElement(event, el.children[i]);
      }
      return;
    }
    if (!el || el["__hijinks_" + event + "ed__"]) {
      return;
    }
    bindElementChildren(event, el);
    name = el.tagName.toLowerCase();
    if (bindToElement.hasOwnProperty(name) &&
      bindToElement[name].hasOwnProperty(event) &&
      typeof bindToElement[name][event] === "function") {
      fns.push(bindToElement[name][event]);
    }
    for (i = el.attributes.length - 1; i >= 0; i--) {
      name = el.attributes[i].name.toLowerCase();
      if (bindToAttribute.hasOwnProperty(name) &&
        bindToAttribute[name].hasOwnProperty(event) &&
        typeof bindToAttribute[name][event] === "function") {
        fns.push(bindToAttribute[name][event]);
      }
    }
    for (i = 0; i < fns.length; i++) {
      fns[i](el);
    }
    el["__hijinks_" + event + "ed__"] = true;
  }

  function replaceElement(el, target) {
    if (target) {
      (target.parentElement || target.parentNode).replaceChild(el, target);
      bindElement(MOUNT, el);
      bindElement(UNMOUNT, target);
    }
  }

  function insertToGroup(el, group) {
    var parent = group && (group.element.parentElement || group.element.parentNode),
        last = group.element;
    if (!parent) return;

    if (group.prepend) {
      while (last.previousSibling &&
        (last.previousSibling.nodeType != Node.ELEMENT_NODE ||
          (last.previousSibling.hasAttribute("data-hijinks-group") &&
            last.previousSibling.getAttribute("data-hijinks-group") === group.name))) {
        last = last.previousSibling;
      }
      parent.insertBefore(el, last);
    } else {
      while (last.nextSubling &&
        (last.nextSubling.nodeType != Node.ELEMENT_NODE ||
          (last.nextSubling.hasAttribute("data-hijinks-group") &&
            last.nextSubling.getAttribute("data-hijinks-group") === group.name))) {
        last = last.nextSubling;
      }
      parent.insertBefore(el, last.nextSubling);
    }
    bindElement(MOUNT, el);
  }

  /**
   * Execute the contents of a loaded script element
   * @param  {HTMLScriptElement} el A script element that was loaded by never attached to the DOM
   */
  function insertScript(el) {
    var spt = document.createElement("script");
    spt.innerHTML = el.innerHTML;
    document.head.appendChild(spt);
  }

  /**
   * Handle Hijinks AJAX response body
   * @param  {string} text The body of the response containing raw HTML
   */
  function hijinksResponse(text) {
    var temp = document.createElement("div"),
      dup = [],
      id, parent, child, old, i, j, name,
      groups, group, groupName, gfrag;

    // assign HTML response to a temporary container
    temp.innerHTML = text;
    for (i = 0; i < temp.children.length; i++) {
      dup[i] = temp.children[i];
    }

    for (i = 0; i < dup.length; i++) {
      parent = null;
      old = null;
      child = dup[i];
      name = child.tagName.toLowerCase();

      if (name === "script") {
        // evaluate script element by appending to the head
        insertScript(child);
        continue;
      } else {
        if (SINGLETONS[name]) {
          // this node is one of the singleton tags
          old = document.getElementsByTagName(name)[0];
          replaceElement(child, old);
          continue;
        }
        if (child.id) {
          old = document.getElementById(child.id);
          if (old) {
            replaceElement(child, old);
            continue;
          }
        }
        if (child.hasAttribute("data-hijinks-group")) {
          groups = groups || new HijinksGroupIndex(document);
          groupName = child.getAttribute("data-hijinks-group");
          if (groups.byName.hasOwnProperty(groupName)) {
            group = groups.byName[groupName];
            gfrag = document.createDocumentFragment();
            for (j = i; j < dup.length; j++) {
              // look ahead and consume all adjacent members of this group into a fragment
              child = dup[j];
              if (child && child.getAttribute("data-hijinks-group") === groupName) {
                // group members with a matched id will be inserted to the DOM before the
                // fragment is added to the end of the group
                old = document.getElementById(child.id);
                if (old) {
                  replaceElement(child, old);
                } else {
                  gfrag.appendChild(child);
                }
                // an element has been consumed, bump the outer loop index
                i = j;
              } else {
                break;
              }
            }
            insertToGroup(gfrag, group);
            continue;
          }
        }
      }
    }
  }

  /**
   * document onclick handler, it should detect a link click before
   * navigation occurs the check for the [hijinks] attribute
   * @param  {Event} e
   * @return {Boolean}
   */
  function documentClick(e) {
    e = e || event;
    var from = findParent('a', e.target || e.srcElement),
        url = from && (from.href === void 0 ? null : from.href);
    if (url && (from.hasAttribute("hijinks") || from.hasAttribute("data-hijinks"))) {
      e.preventDefault();
      if (history) {
        history.pushState({
          hijinks_url: url,
          partial: true
        }, null, url);
      }
      getHijinksPartial(url);
      return false;
    }
  }

  /**
   * search for the nearest ancestor with a specified tag name
   * @param  {String} tagname
   * @param  {Node} el
   * @return {HTMLElement|null}
   */
  function findParent(tagname, el) {
    if ((el.nodeName || el.tagName).toLowerCase() === tagname.toLowerCase()) {
      return el;
    }
    while (el.parentNode) {
      if ((el.nodeName || el.tagName).toLowerCase() === tagname.toLowerCase()) {
        return el;
      }
      el = el.parentNode;
    }
    return null;
  }

  /**
   * Scan the inputs of a form element and encode their
   * values into a query url-encoded string
   *
   * @param  {HTMLFormElement} el
   * @return {string}    url-encoded string
   */
  function readFormInputValue(el) {
    if (el.length != null) var t = el[0].type;
    if ((typeof(t) == 'undefined') || (t == 0)) var t = el.type;

    switch (t) {
      case 'undefined':
        return;

      case 'radio':
        for (var x = 0; x < el.length; x++)
          if (el[x].checked == true)
            return el[x].value;

      case 'select-multiple':
        var myArray = new Array();
        for (var x = 0; x < el.length; x++)
          if (el[x].selected == true)
            myArray[myArray.length] = el[x].value;
        return myArray;

      case 'checkbox':
        return el.checked;

      default:
        return el.value;
    }
  }

  function formSubmit(e) {
    e = e || event;
    var form = e.target;
    if (form && form.hasAttribute("hijinks")) {
      e.preventDefault();
      var url, inputs = [],
        i;
      for (i = form.elements.length - 1; i >= 0; i--) {
        inputs[i] = encodeURIComponent(form.elements[i].name) + "=" + encodeURIComponent(readFormInputValue(form.elements[i]));;
      }
      var query = inputs.join('&').replace(/%20/g, '+');
      switch (form.method.toLowerCase()) {
        case "get":
          url = form.action.split("?")
          url = url[0] + "?" + (url[1] || "").replace(/#.*$/, '') + query;
          if (history) {
            history.pushState({
              hijinks_url: url,
              partial: true
            }, null, url);
          }
          getHijinksPartial(url)
          return false;
          break;

        case "post":
          postHijinksPartial(form.action, query, form.enctype);
          return false;
      }
    }
  }

  /**
   * add ?hijinks query parameter to a url
   * @param {string} url
   * @return {string} the url with hijinks query parameter added
   */
  function addHijinksQuery(url) {
    var _url;
    try {
      _url = url.toString();
    } catch (e) {
      return ""
    };
    var i = _url.indexOf("#"),
        hash = i > -1 ? _url.slice(i + 1) : "",
        j = _url.indexOf("?"),
        query = j > -1 ? _url.slice(j + 1, (i > -1 ? i : void 0)) : "",
        path = _url.slice(0, (j > -1 ? j : void 0));
    if (/(^|&)hijinks(&|$)/.test(query)) {
      return _url;
    }
    _url = path + "?" + (query ? query + "&" : "") +
      "hijinks" +
      (hash ? "#" + hash : "");
    return _url;
    f
  }

  function getHijinksPartial(url) {
    var req = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("MSXML2.XMLHTTP");

    req.onreadystatechange = function() {
      if (req.readyState === 4 && req.status < 300) {
        hijinksResponse(req.responseText);
      }
    }
    req.open("GET", addHijinksQuery(url));
    req.setRequestHeader("X-Hijinks", "partial", false);
    req.send();
  }

  /**
   * Issue a XHR POST request
   * @param  {string} url
   * @param  {string} data     The body of the request
   * @param  {string} encoding The Content-Type of the data
   */
  function postHijinksPartial(url, data, encoding) {
    var req = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("MSXML2.XMLHTTP");

    req.onreadystatechange = function() {
      if (req.readyState === 4 && req.status < 300) {
        hijinksResponse(req.responseText);
      }
    }
    req.open("POST", addHijinksQuery(url));
    req.setRequestHeader("X-Hijinks", "partial", false);

    // We add the required HTTP header to handle a form data POST request
    req.setRequestHeader('Content-Type', encoding || 'application/x-www-form-urlencoded');
    req.send(data || "");
  }

  /**
   * The Hijinks API class
   */
  var Hijinks = (function() {
    var _ATTRIBUTE_NAME = /^\[([\w-]+)\]$/;
    var _ELEMENT_NAME = /^[\w-]+$/;

    function Hijinks(def) {
      if (def instanceof Array) {
        for (var i = 0; i < def.length; i += 2) {
          this.push(def[i], def[i + 1]);
        }
      }
    }

    function _curry(fn, event) {
      return function(arg) {
        return fn(event, arg);
      }
    }

    Hijinks.prototype = {
      get: getHijinksPartial,
      post: postHijinksPartial,
      mount: _curry(bindElement, MOUNT),
      unmount: _curry(bindElement, UNMOUNT),
      push: function(name, bind) {
        if (_ATTRIBUTE_NAME.test(name)) {
          name = name.match(_ATTRIBUTE_NAME)[1];
          bindToAttribute[name.toLowerCase()] = bind;
        } else if (_ELEMENT_NAME.test(name)) {
          bindToElement[name.toLowerCase()] = bind;
        } else {
          throw new Error("Hijinks: Cannot bind component '" + name + "' invalid name");
        }
      },
    };
    return Hijinks;

  }());

  /**
   * nasty setup code
   */
  function main() {
    var el = document;
    var inited = false;

    // replace existing
    window.hijinks = new Hijinks(window.hijinks);

    if (el.addEventListener) {
      el.addEventListener('click', documentClick, false);
      el.addEventListener('submit', formSubmit, false);
    } else if (el.attachEvent) {
      el.attachEvent('onclick', documentClick);
      el.attachEvent('onsubmit', formSubmit);
    }

    window.onpopstate = function(e) {
      if (e.state && e.state.hijinks_url) {
        if (e.state.partial) {
          getHijinksPartial(e.state.hijinks_url);
        } else {
          window.location.href = e.state.hijinks_url;
        }
      }
    };

    if (history) {
      // set the state so that back button will work properly
      var url = window.location.toLocaleString();
      history.replaceState({
        hijinks_url: url,
        partial: false
      }, document.title);
    }

    function initialize() {
      if (inited) return;
      inited = true;
      bindElement(MOUNT, document.body.parentNode);
    }

    if (document.readyState === 'complete') {
      setTimeout(initialize);
    } else {
      if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', initialize);
      } else {
        window.attachEvent('onload', initialize);
      }
    }
  }
  //
  main();
  //
}(window, window.document, window.history));