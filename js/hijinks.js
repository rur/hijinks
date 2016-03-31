// hijinks clientside library implementation here

window.hijinks = (function (util, init) {
    var bindNodeName = {},
        bindAttrName = {};

    /**
     * XHR onload handler
     *
     * This will convert the response HTML into nodes and
     * figure out how to attached them to the DOM
     *
     * @private
     */
    function ajaxSuccess() {
        if (this.getResponseHeader("X-Hijinks") !== "partial") {
            return;
        }
        var i, len, temp, child, old, dup = [];
        temp = document.createElement("div");
        temp.innerHTML = this.responseText;
        for (i = 0, len = temp.children.length; i < len; i++) {
            dup[i] = temp.children[i];
        }
        for (i = 0, len = dup.length; i < len; i++) {
            child = dup[i];
            if (child.id) {
                old = document.getElementById(child.id);
                if (old) {
                    old.parentNode.replaceChild(child, old);
                    bindElement("unmount", old);
                    bindElement("mount", child);
                }
            }
        }
    }

    function bindElement(event, el) {
        var i, name;
        // TODO: do this with a stack
        for (i = 0; i < el.children.length; i++) {
            bindElement(event, el.children[i]);
        }
        name = el.tagName.toUpperCase();
        if (bindNodeName.hasOwnProperty(name) && typeof bindNodeName[name][event] === 'function') {
            bindNodeName[name][event](el);
        }
        for (i = el.attributes.length - 1; i >= 0; i--) {
            name = el.attributes[i].name.toUpperCase();
            if (bindAttrName.hasOwnProperty(name) && typeof bindAttrName[name][event] === 'function') {
                bindAttrName[name][event](el);
            }
        }
        el["__hijinks_" + event + "ed__"] = true;
    }

    /**
     * Hijinks API Constructor
     *
     * @param {Array|Hijinks} setup GA style initialization
     */
    function Hijinks(setup) {
        this._setup = setup instanceof Hijinks ? setup._setup : (
            setup instanceof Array ? setup : []
        );
        for (var i = 0; i < this._setup.length; i++) {
            this.push(this._setup[i]);
        }
    }

    Hijinks.prototype.push = function (def) {
        if (def.tagName) {
            bindNodeName[def.tagName.toUpperCase()] = def;
        }
        if (def.attrName) {
            bindAttrName[def.attrName.toUpperCase()] = def;
        }
    };

    Hijinks.prototype.mount = function (el) {
        bindElement("mount", el);
    };

    Hijinks.prototype.unmount = function (el) {
        bindElement("unmount", el);
    };

    /**
     * Send XHR request to Hijinks endpoint. The response is handled
     * internally, the response is handled internally.
     *
     * @public
     * @param  {string} method The request method GET|POST|...
     * @param  {string} url    The url
     */
    Hijinks.prototype.request = function (method, url, data, encoding) {
        if (util.METHODS.indexOf(method.toUpperCase()) === -1) {
            throw new Error("Hijinks: Unknown request method '" + method + "'");
        }
        var req = (XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("MSXML2.XMLHTTP");
        req.open(method.toUpperCase(), util.hijinksURL(url));
        req.setRequestHeader("X-Hijinks", "partial", false);
        if (data) {
            req.setRequestHeader('Content-Type', encoding || 'application/x-www-form-urlencoded');
        }
        req.onload = ajaxSuccess;
        req.send(data || null);
    };

    // api
    return new Hijinks(init);
}({
    //
    // Utils:
    //
    /**
     * add 'hijinks' query parameter to a url string
     *
     * @private
     * @param {string} url
     * @return {string} the url with hijinks query parameter added
     */
    hijinksURL: function (url) {
      var _url, i, hash, j, query, path;
      try {
        _url = url.toString();
      } catch (e) {
        return "";
      }
      i = _url.indexOf("#");
      hash = i > -1 ? _url.slice(i + 1) : "";
      j = _url.indexOf("?");
      query = j > -1 ? _url.slice(j + 1, (i > -1 ? i : void 0)) : "";
      path = _url.slice(0, (j > -1 ? j : void 0));
      if (/(^|&)hijinks(=|&|$)/.test(query)) {
        return _url;
      }
      _url = path + "?" + (query ? query + "&" : "") +
        "hijinks" +
        (hash ? "#" + hash : "");
      return _url;
    },
    /**
     * Navigate to a url
     *
     * @param  {string} url The url to set as the location href
     */
    browserNavigate: function (url) {
        window.location.href = url;
    },
    /**
     * White-list of request methods types
     * @type {Array}
     */
    METHODS: ['POST','GET','PUT','PATCH','DELETE']
}, window.hijinks));
