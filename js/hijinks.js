// hijinks clientside library implementation here

window.hijinks = (function ($, settings) {
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
    return new Hijinks(settings);
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
        "use strict";
        if (xhr.getResponseHeader("X-Hijinks") !== "partial") {
            return;
        }
        var i, len, temp, child, old, dup = [], groups, groupName;
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
            if (child.hasAttribute("data-hijinks-group")) {
                groups = groups || new this.HijinksGroupIndex(document.body);
                groupName = child.getAttribute("data-hijinks-group");
                if (groups.byName.hasOwnProperty(groupName)) {
                    group = groups.byName[groupName];
                    gfrag = document.createDocumentFragment();
                    groupitem_lookahead:
                    for (j = i; j < dup.length; j++) {
                        // look ahead and consume all adjacent members of this group into a fragment
                        child = dup[j];
                        if (child && child.getAttribute("data-hijinks-group") === groupName) {
                          // group members with a matched id will be inserted to the DOM before the
                          // fragment is added to the end of the group
                          old = document.getElementById(child.id);
                          if (old) {
                            old.parentNode.replaceElement(child, old);
                            this.unmount(old);
                            this.mount(child);
                          } else {
                            gfrag.appendChild(child);
                          }
                          // an element has been consumed, bump the outer loop index
                          i = j;
                        } else {
                          break groupitem_lookahead;
                        }
                    }
                    // take aggregated group and add elements to the list
                    this.insertToGroup(gfrag, group);
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
        var i, name, comp, attr;
        if (el.nodeType !== 1 && el.nodeType !== 10) {
            return;
        }
        // TODO: do this with a stack not recursion
        for (i = 0; i < el.children.length; i++) {
            this.mount(el.children[i]);
        }
        el._hijinksComponents = (el._hijinksComponents || []);
        name = (el.tagName || "").toUpperCase();
        comp = this.bindNodeName.hasOwnProperty(name) ? this.bindNodeName[name] : null;
        if (comp && el._hijinksComponents.indexOf(comp) === -1 && typeof comp.mount === "function") {
            comp.mount(el);
            el._hijinksComponents.push(comp);
        }
        for (i = el.attributes.length - 1; i >= 0; i--) {
            attr = el.attributes[i];
            name = (attr.name || "").toUpperCase();
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
        this.cancelAnimationFrame(this._id);
        this._id = this.requestAnimationFrame(this.bind(function () {
            this.bindComponents(setup);
        }, this));
    },

    /**
     * take an element or document fragment and inserts into the tail end of
     * the supplied group
     *
     * @param  {HTMLElement|DocumentFragment} el
     * @param  {Object} group The group definition taken from the HijinksGroupIndex
     */
    insertToGroup: function (el, group) {
        var parent = group && (group.element.parentElement || group.element.parentNode),
            last = group.element, toMount, len, i;
        if (!parent) return;
        if (el instanceof window.DocumentFragment) {
            len = el.children.length;
            toMount = Array(len);
            for (i = 0; i < len; i++) {
                toMount[i] = el.children[i];
            }
        } else {
            len = 1;
            toMount = [el];
        }

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
        for (i = 0; i < len; i++) {
            this.mount(toMount[i]);
        }
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
     * x-browser requestAnimationFrame shim
     *
     * see: https://gist.github.com/paulirish/1579671
     */
    requestAnimationFrame: (function() {
        var requestAnimationFrame = window.requestAnimationFrame;
        var lastTime = 0;
        var vendors = ['ms', 'moz', 'webkit', 'o'];
        for(var i = 0; i < vendors.length && !requestAnimationFrame; ++i) {
            requestAnimationFrame = window[vendors[i]+'RequestAnimationFrame'];
        }

        if (!requestAnimationFrame) {
            requestAnimationFrame = function(callback, element) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function() { callback(currTime + timeToCall); },
                  timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };
        }

        return function (cb) {
            // must be bound to window object
            return requestAnimationFrame.call(window, cb);
        };
    }()),

    /**
     * x-browser cancelAnimationFrame shim
     *
     * see: https://gist.github.com/paulirish/1579671
     */
    cancelAnimationFrame: (function () {
        var cancelAnimationFrame = window.cancelAnimationFrame;
        var vendors = ['ms', 'moz', 'webkit', 'o'];
        for(var i = 0; i < vendors.length && !cancelAnimationFrame; ++i) {
            cancelAnimationFrame = window[vendors[i]+'CancelAnimationFrame'] || window[vendors[i]+'CancelRequestAnimationFrame'];
        }

        if (!cancelAnimationFrame) {
            cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
        }

        return function (cb) {
            // must be bound to window object
            return cancelAnimationFrame.call(window, cb);
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
    },

    /**
     * class used the search for hijinks group comment elements
     *
     * @constructor
     *
     */
    HijinksGroupIndex: (function () {
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
      }())
}, window.hijinks));
