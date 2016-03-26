(function(window, document, history) {
  "use strict";
  var bindToElement = {},
      bindToAttribute = {},
      hijinksGroups = {},
      SINGLETONS = ["title"], // tags for which there can be only one in a doc (no incl html, head, body)
      HJ_GROUP_REG = /^\s*hijinks-group: ([a-zA-Z][\w-\d]*)( prepend)?\s*$/,
      MOUNT = "mount",
      UNMOUNT = "unmount";

  function bindElementChildren(event, el) {
    var i = el.childNodes.length - 1,
      child;
    for (; i >= 0; i--) {
      child = el.childNodes[i];
      bindElement(event, child);
    }
  }

  function bindElement(event, el) {
    var name, fns = [],
      i;
    if (!el || el["__hijinks_" + event + "ed__"]) {
      return;
    }

    switch (el.nodeType) {
      case Node.COMMENT_NODE:
        var conf = el.nodeValue.match(HJ_GROUP_REG);
        if (conf) {
          switch (event) {
            case MOUNT:
              hijinksGroups[conf[1]] = {
                element: el,
                prepend: conf[2] === " prepend"
              };
              break;

            case UNMOUNT:
              if (hijinksGroups[conf[1]] && hijinksGroups[conf[1]].element === el) {
                delete hijinksGroups[conf[1]];
              }
              break;
          }
        }
        break;

      case Node.ELEMENT_NODE:
      case Node.DOCUMENT_NODE:
        bindElementChildren(event, el);
        name = el.tagName.toLowerCase()
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
        break;
    }
  }

  function replaceElement(el, target) {
    if (target) {
      (target.parentElement || target.parentNode).replaceChild(el, target);
      bindElement(MOUNT, el);
      bindElement(UNMOUNT, target);
    }
  }

  function insertToGroup(el, groupName) {
    var group = hijinksGroups[groupName],
      parent = group && (group.element.parentElement || group.element.parentNode),
      last = group.element;
    if (!parent) return;

    if (group.prepend) {
      while (last.previousSibling &&
        (last.previousSibling.nodeType != Node.ELEMENT_NODE ||
          (last.previousSibling.hasAttribute("data-hijinks-group") &&
            last.previousSibling.getAttribute("data-hijinks-group") === groupName))) {
        last = last.previousSibling;
      }
      parent.insertBefore(el, last);
    } else {
      while (last.nextSubling &&
        (last.nextSubling.nodeType != Node.ELEMENT_NODE ||
          (last.nextSubling.hasAttribute("data-hijinks-group") &&
            last.nextSubling.getAttribute("data-hijinks-group") === groupName))) {
        last = last.nextSubling;
      }
      parent.insertBefore(el, last.nextSubling || null);
    }
  }

  function insertScript(el) {
    var spt = document.createElement("script");
    spt.innerHTML = el.innerHTML;
    document.head.appendChild(spt);
  }

  function hijinksResponse(text) {
    var temp = document.createElement("div"),
      dup = [],
      id, parent, child, old, i, j, name, group, gfrag;

    // assign HTML response to a temporary container
    temp.innerHTML = text;
    for (i = 0; i < temp.children.length; i++) {
      dup[i] = temp.children[i]
    };

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
        if (SINGLETONS.indexOf(name) > -1) {
          // this node is one of the singleton tags
          old = document.getElementsByTagName(name)[0];
          replaceElement(child, old);
          continue;
        }
        if (child.hasAttribute("data-hijinks-group")) {
          group = child.getAttribute("data-hijinks-group");
          if (group && hijinksGroups.hasOwnProperty(group)) {
            gfrag = document.createDocumentFragment();
            // look ahead and consume all adjacent members of this group into a fragment
            for (j = i; j < dup.length; j++) {
              child = dup[j];
              if (child && child.getAttribute("data-hijinks-group") === group) {
                if (!handleElementId(child)) {
                  gfrag.appendChild(child);
                }
                i = j;
              } else {
                break
              }
            }
            insertToGroup(gfrag, group);
            continue;
          }
        }
        if (child.hasAttribute("id")) {
          if (handleElementId(child)) {
            continue;
          }
        }
      }
    }
  }

  function handleElementId(element) {
    // This node has an id which much be unique on the page.
    var old, id = element.getAttribute("id");
    if (id) {
      old = document.getElementById(id);
      if (old) {
        replaceElement(element, old);
        return true;
      }
    }
    return false;
  }

  function documentClick(e) {
    e = e || event;
    var from = findParent('a', e.target || e.srcElement);
    if (from && from.hasAttribute("hijinks")) {
      e.preventDefault();
      var url = from.getAttribute('href');
      if (history) {
        history.pushState({
          hijinks_url: url,
          partial: true
        }, null, url);
      }
      getHijinksPartial(url)
      return false;
    }
  }

  function readFormInputValue(el) {
    if (el.length != null) var type = el[0].type;
    if ((typeof(type) == 'undefined') || (type == 0)) var type = el.type;

    switch (type) {
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

  function findParent(tagname, el) {
    if ((el.nodeName || el.tagName).toLowerCase() === tagname.toLowerCase()) {
      return el;
    }
    while (el = el.parentNode) {
      if ((el.nodeName || el.tagName).toLowerCase() === tagname.toLowerCase()) {
        return el;
      }
    }
    return null;
  }

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
    req.send(data);
  }

  function findParent(tagname, el) {
    if ((el.nodeName || el.tagName).toLowerCase() === tagname.toLowerCase()) {
      return el;
    }
    while (el = el.parentNode) {
      if ((el.nodeName || el.tagName).toLowerCase() === tagname.toLowerCase()) {
        return el;
      }
    }
    return null;
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
      mount: _curry(bindElement, MOUNT),
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
  }())

  // replace existing
  window.hijinks = new Hijinks(window.hijinks);

  (function() {
    var el = document;
    var inited = false;

    if (el.addEventListener) {
      el.addEventListener('click', documentClick, false);
      el.addEventListener('submit', formSubmit, false);
    } else if (el.attachEvent) {
      el.attachEvent('onclick', documentClick);
      el.attachEvent('onsubmit', formSubmit);
    }

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
  }());
}(window, window.document, window.history));