(function() {

  function hijinksResponse() {
    var temp = document.createElement("div"),
        dup = [],
        id, child, old, i, tagName;

    // assign HTML response to a temporary container
    temp.innerHTML = this.responseText;
    for (i = 0; i < temp.children.length; i++) {
      dup[i] = temp.children[i]
    };

    for (i = 0; i < dup.length; i++) {
      old = null;
      child = dup[i];
      tagName = child.tagName.toLowerCase()
      if (["html", "head", "title", "body"].indexOf(tagName) > -1) {
        // this node is one of the singleton tags
        old = document.getElementsByTagName(tagName)[0];
      } else if (child.hasAttribute("id")) {
        // This node has an id which much be unique on the page.
        id = child.getAttribute("id");
        if (id) {
          old = document.getElementById(id);
        }
      } else {
        // ignore this node
      }
      if (old) {
        old.parentElement.replaceChild(child, old);
      }
    }
  }

  function documentClick(e) {
    e = e || event;
    var from = findParent('a', e.target || e.srcElement);
    if (from && from.hasAttribute("hijinks")) {
      var url = from.getAttribute('href');
      if (history) {
        history.pushState({
          url: url
        }, null, url);
      }
      loadHijinksPartial(url)
      event.preventDefault();
    }
  }

  function loadHijinksPartial(url) {
    var oReq = new XMLHttpRequest();
    oReq.addEventListener("load", hijinksResponse);
    oReq.open("GET", url);
    oReq.setRequestHeader("X-Hijinks", "partial", false);
    oReq.send();
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
    if (e.state.url) {
      loadHijinksPartial(e.state.url);
    }
  };

  (function() {
    var el = document;

    if (el.addEventListener) {
      el.addEventListener('click', documentClick, false);
    } else if (el.attachEvent) {
      el.attachEvent('onclick', documentClick);
    }

    if (history) {
      // set the state so that back button will work properly
      var url = window.location.toLocaleString();
      history.replaceState({
        url: url
      }, document.title);
    }
  }());
}());