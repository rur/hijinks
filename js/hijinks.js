// hijinks clientside library implementation here

window.hijinks = (function ($, hijinks) {
    /**
     * Hijinks API Constructor
     *
     * @constructor
     * @param {Array|Hijinks} setup GA style initialization
     */
    function Hijinks(setup) {
        if (setup instanceof Hijinks) {
            this._setup = setup._setup;
        } else if (setup instanceof Array) {
            this._setup = setup;
        }
        this._setup = (this._setup || []).slice();
        $.bindComponentsAsync(this._setup);
    }

    /**
     * Add a component definition
     * @param  {Object} def Dict containing component
     * @return {[type]}     [description]
     */
    Hijinks.prototype.push = function (def) {
        this._setup.push(def);
        $.bindComponentsAsync(this._setup);
    };

    /**
     * trigger mount event on a node and it's subtree
     * @param  {HTMLElement} el
     */
    Hijinks.prototype.mount = function (el) {
        $.mount(el);
    };

    /**
     * trigger mount event on a node and it's subtree
     * @param  {HTMLElement} el
     */
    Hijinks.prototype.unmount = function (el) {
        $.unmount(el);
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
        if ($.METHODS.indexOf(method.toUpperCase()) === -1) {
            throw new Error("Hijinks: Unknown request method '" + method + "'");
        }
        var req = (XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("MSXML2.XMLHTTP");
        req.open(method.toUpperCase(), $.hijinksURL(url));
        req.setRequestHeader("X-Hijinks", "partial", false);
        if (data) {
            req.setRequestHeader('Content-Type', encoding || 'application/x-www-form-urlencoded');
        }
        req.onload = function() {
          $.ajaxSuccess(this);
        };
        req.send(data || null);
    };

    // api
    return new Hijinks(hijinks);
}({
    //
    // Private
    //
    bindNodeName: {},
    bindAttrName: {},

    /**
     * White-list of request methods types
     * @type {Array}
     */
    METHODS: ['POST','GET','PUT','PATCH','DELETE'],

    /**
     * List of HTML element for which there can be only one
     * @type {Array}
     */
    SINGLETONS: ['TITLE'],

    /**
     * XHR onload handler
     *
     * This will convert the response HTML into nodes and
     * figure out how to attached them to the DOM
     *
     * @param {XMLHttpRequest} xhr The xhr instance used to make the request
     */
    ajaxSuccess: function (xhr) {
        if (xhr.getResponseHeader("X-Hijinks") !== "partial") {
            return;
        }
        var i, len, temp, child, old, dup = [];
        temp = document.createElement("div");
        temp.innerHTML = xhr.responseText;
        for (i = 0, len = temp.children.length; i < len; i++) {
            dup[i] = temp.children[i];
        }
        for (i = 0, len = dup.length; i < len; i++) {
            child = dup[i];
            if (this.SINGLETONS.indexOf(child.nodeName.toUpperCase()) > -1) {
                old = document.getElementsByTagName(child.nodeName)[0];
                if (old) {
                    old.parentNode.replaceChild(child, old);
                    this.unmount(old);
                    this.mount(child);
                    continue;
                }
            }
            if (child.id) {
                old = document.getElementById(child.id);
                if (old) {
                    old.parentNode.replaceChild(child, old);
                    this.unmount(old);
                    this.mount(child);
                    continue;
                }
            }
        }
    },

    /**
     * Attach an external components to an element and its children depending
     * on the node name or its attributes
     *
     * @param  {HTMLElement} el
     */
    mount: function (el) {
        var i, name, comp;
        // TODO: do this with a stack not recursion
        for (i = 0; i < el.children.length; i++) {
            this.mount(el.children[i]);
        }
        el._hijinksComponents = (el._hijinksComponents || []);
        name = el.tagName.toUpperCase();
        comp = this.bindNodeName.hasOwnProperty(name) ? this.bindNodeName[name] : null;
        if (comp && el._hijinksComponents.indexOf(comp) === -1 && typeof comp.mount === "function") {
            comp.mount(el);
            el._hijinksComponents.push(comp);
        }
        for (i = el.attributes.length - 1; i >= 0; i--) {
            name = el.attributes[i].name.toUpperCase();
            comp = this.bindAttrName.hasOwnProperty(name) ? this.bindAttrName[name] : null;
            if (comp && el._hijinksComponents.indexOf(comp) === -1 && typeof comp.mount === "function") {
                comp.mount(el);
                el._hijinksComponents.push(comp);
            }
        }
    },

    /**
     * Trigger unmount handler on all Hijinks mounted components attached
     * to a DOM Element
     *
     * @param  {HTMLElement} el
     */
    unmount: function (el) {
        var i, comp;
        // TODO: do this with a stack not recursion
        for (i = 0; i < el.children.length; i++) {
            this.unmount(el.children[i]);
        }
        if (el._hijinksComponents instanceof Array) {
            for (i = el._hijinksComponents.length - 1; i >= 0; i--) {
                comp = el._hijinksComponents[i];
                if (comp && typeof comp.unmount === "function") {
                    comp.unmount(el);
                }
            }
            el._hijinksComponents = null;
        }
    },

    /**
     * index all component definitions and mount the full document
     *
     * @param  {Array} setup List of component definitions
     */
    bindComponents: function (setup) {
        var def, i, len = setup.length;
        this.bindNodeName = {};
        this.bindAttrName = {};
        for (i = 0; i < len; i++) {
            def = setup[i];
            if (def.tagName) {
                this.bindNodeName[def.tagName.toUpperCase()] = def;
            }
            if (def.attrName) {
                this.bindAttrName[def.attrName.toUpperCase()] = def;
            }
        }
        this.mount(document.body);
    },

    /**
     * index all component definitions some time before the next rendering frame
     *
     * @param  {Array} setup List of component definitions
     */
    bindComponentsAsync: function(setup) {
        this.animationFrame.cancel(this._id);
        this._id = this.animationFrame.request(this.bind(function () {
            this.bindComponents(setup);
        }, this));
    },

    /**
     * add 'hijinks' query parameter to a url string
     *
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
     * Cross browser shim for (request|cancel)AnimationFrame
     */
    animationFrame: (function() {
        // see: https://gist.github.com/paulirish/1579671
        var requestAnimationFrame = window.requestAnimationFrame;
        var cancelAnimationFrame = window.cancelAnimationFrame;
        var lastTime = 0;
        var vendors = ['ms', 'moz', 'webkit', 'o'];
        for(var x = 0; x < vendors.length && !requestAnimationFrame; ++x) {
            requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
            cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
        }

        if (!requestAnimationFrame)
            requestAnimationFrame = function(callback, element) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function() { callback(currTime + timeToCall); },
                  timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };

        if (!cancelAnimationFrame)
            cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };

        return {
            request: requestAnimationFrame,
            cancel: cancelAnimationFrame
        };
    }()),

    /**
     * LoFi bind method
     *
     * @param  {Function} fn        method to be bound
     * @param  {Object}   self      thisArg
     * @param  {*}        args...   variadic arguments
     * @returns {Function} Bound function
     */
    bind: function (fn, self) {
        var args = [].slice.call(arguments, 2);
        if (typeof fn.bind === "function") {
            return fn.bind.apply(fn, [self].concat(args));
        }
        return function() {
            args = args.concat([].slice.call(arguments));
            return fn.apply(self, args);
        };
    },

    /**
     * Navigate to a url
     *
     * @param  {string} url The url to set as the location href
     */
    browserNavigate: function (url) {
        window.location.href = url;
    }
}, window.hijinks));
