// hijinks clientside library implementation here

window.hijinks = (function (util, init) {
    /**
     * Send XHR request to Hijinks endpoint. The response is handled
     * internally, the response is handled internally.
     *
     * @public
     * @param  {string} method The request method GET|POST|...
     * @param  {string} url    The url
     */
    function request(method, url, data, encoding) {
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
    }

    /**
     * XHR onload handler
     *
     * @private
     */
    function ajaxSuccess() {
        if (this.getResponseHeader("X-Hijinks") !== "partial") {
            util.browserNavigate(this.responseURL);
        }
        var i, len, temp, child, old;
        temp = document.createElement("div");
        temp.innerHTML = this.responseText;
        for (i = 0, len = temp.children.length; i < len; i++) {
            child = temp.children[i];
            old = document.getElementById(child.id);
            if (old) {
                old.parentNode.replaceChild(child, old);
            }
        }
    }

    // api
    return {
        request: request
    };
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
