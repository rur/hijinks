window.hijinks = (function ($, config) {
    'use strict';
    var onLoad = $.simpleSignal();

    /**
     * Hijinks API Constructor
     *
     * @constructor
     * @param {Array|Hijinks} setup GA style initialization
     */
    function Hijinks(setup) {
        var field;
        if (setup instanceof Hijinks) {
            this._setup = setup._setup;
        } else if (setup instanceof Array) {
            this._setup = setup;
        }
        this._setup = (this._setup || []).slice();
        $.bindComponentsAsync(this._setup);
    }

    // setup inheritance for extensions
    function HijinksProto() {}
    HijinksProto.prototype = $.extensions;
    Hijinks.prototype = new HijinksProto();

    /**
     * Add a component definition
     * @param  {Object} def Dict containing component
     */
    Hijinks.prototype.push = function (def) {
        if (def) this._setup.push(def);
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
        req.open(method.toUpperCase(), url, true);
        req.setRequestHeader("Accept", $.HJ_CONTENT_TYPE);
        if (data) {
            req.setRequestHeader("Content-Type", encoding || "application/x-www-form-urlencoded");
        }
        req.onload = function () {
            $.ajaxSuccess(req);
            onLoad.trigger();
        };
        req.send(data || null);
    };

    Hijinks.prototype.onLoad = onLoad.add;

    // api
    return new Hijinks(config);
}({
    //
    // Private
    //
    /**
     * Store the component definitions by tagName
     * @type {DefaultDict}
     */
    bindTagName: null,

    /**
     * Store the component definitions by attrName
     * @type {DefaultDict}
     */
    bindAttrName: null,

    /**
     * Hijinks library extensions, object attached to the
     * prototype chain of the main Hijinks library
     * @type {Object}
     */
    extensions: {},

    /**
     * White-list of request methods types
     * @type {Array}
     */
    METHODS: ['POST', 'GET', 'PUT', 'PATCH', 'DELETE'],

    /**
     * List of HTML element for which there can be only one
     * @type {Array}
     */
    SINGLETONS: ['TITLE'],

    /**
     * Content-Type for Hijinks partials
     *
     * This will be set as the `Accept` header for Hijinks mediated XHR requests. The
     * server must respond with the same value as `Content-Type` or a client error result.
     *
     * With respect to the media type value, we are taking advantage of the unregistered 'x.' tree while
     * Hijinks is a proof-of-concept project. Should a stable API emerge at a later point, then registering a personal
     * or vendor MEME-type would be considered. See https://tools.ietf.org/html/rfc6838#section-3.4
     *
     * @type {String}
     */
    HJ_CONTENT_TYPE: "application/x.hijinks-html-partial+xml",

    /**
     * XHR onload handler
     *
     * This will convert the response HTML into nodes and
     * figure out how to attached them to the DOM
     *
     * @param {XMLHttpRequest} xhr The xhr instance used to make the request
     */
    ajaxSuccess: function (xhr) {
        'use strict';
        var $ = this;
        var i, len, j, temp, child, old, nodes, groupIndex, groupName, group, gfrag;
        if (xhr.getResponseHeader("content-type") !== $.HJ_CONTENT_TYPE) {
            throw Error("Content-Type is not supported by Hijinks '" + xhr.getResponseHeader("content-type") + "'")
        }
        temp = document.createElement("div");
        temp.innerHTML = xhr.responseText;
        nodes = new Array(len);
        for (i = 0, len = temp.children.length; i < len; i++) {
            nodes[i] = temp.children[i];
        }
        node_loop:
            for (i = 0, len = nodes.length; i < len; i++) {
                child = nodes[i];
                if (child.nodeName.toUpperCase() === "SCRIPT") {
                    $.insertScript(child);
                    continue node_loop;
                }
                if ($.SINGLETONS.indexOf(child.nodeName.toUpperCase()) > -1) {
                    old = document.getElementsByTagName(child.nodeName)[0];
                    if (old) {
                        old.parentNode.replaceChild(child, old);
                        $.unmount(old);
                        $.mount(child);
                        continue node_loop;
                    }
                }
                if (child.id) {
                    old = document.getElementById(child.id);
                    if (old) {
                        old.parentNode.replaceChild(child, old);
                        $.unmount(old);
                        $.mount(child);
                        continue node_loop;
                    }
                }
                if (child.hasAttribute("data-hijinks-group")) {
                    groupIndex = groupIndex || $.createGroupIndex(document.body);
                    groupName = child.getAttribute("data-hijinks-group");
                    if (groupIndex.has(groupName)) {
                        group = groupIndex.get(groupName);
                        gfrag = document.createDocumentFragment();
                        lookahead_loop:
                            for (j = i; j < len; j++) {
                                // look ahead and consume all adjacent members of this group into a fragment
                                child = nodes[j];
                                if (child && child.getAttribute("data-hijinks-group") === groupName) {
                                    // group members with a matched id will be inserted to the DOM before the
                                    // fragment is added to the end of the group
                                    old = document.getElementById(child.id);
                                    if (old) {
                                        old.parentNode.replaceElement(child, old);
                                        $.unmount(old);
                                        $.mount(child);
                                    } else {
                                        gfrag.appendChild(child);
                                    }
                                    // an element has been consumed, bump the outer loop index
                                    i = j;
                                } else {
                                    break lookahead_loop;
                                }
                            }
                            // take aggregated group and add elements to the list
                        $.insertToGroup(gfrag, group);
                        continue node_loop;
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
        'use strict';
        var $ = this;
        var i, len, j, name, comps, comp, attr;
        if (el.nodeType !== 1 && el.nodeType !== 10) {
            return;
        }
        // TODO: do this with a stack not recursion
        for (i = 0; i < el.children.length; i++) {
            $.mount(el.children[i]);
        }
        el._hijinksComponents = (el._hijinksComponents || []);
        comps = $.bindTagName.get(el.tagName);
        len = comps.length;
        for (i = 0; i < len; i++) {
            comp = comps[i];
            if (comp && typeof comp.mount === "function" &&
                (!(el._hijinksComponents instanceof Array) || el._hijinksComponents.indexOf(comp) === -1)
            ) {
                comp.mount(el);
                (el._hijinksComponents = (el._hijinksComponents || [])).push(comp);
            }
        }
        for (j = el.attributes.length - 1; j >= 0; j--) {
            attr = el.attributes[j];
            comps = $.bindAttrName.get(attr.name);
            len = comps.length;
            for (i = 0; i < len; i++) {
                comp = comps[i];
                if (comp && typeof comp.mount === "function" &&
                    (!(el._hijinksComponents instanceof Array) || el._hijinksComponents.indexOf(comp) === -1)
                ) {
                    comp.mount(el);
                    (el._hijinksComponents = (el._hijinksComponents || [])).push(comp);
                }
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
        'use strict';
        var $ = this;
        var i, comp;
        // TODO: do this with a stack not recursion
        for (i = 0; i < el.children.length; i++) {
            $.unmount(el.children[i]);
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
        'use strict';
        var $ = this;
        var def, i, len = setup.length;
        $.bindTagName = $.defaultDict(Array, true);
        $.bindAttrName = $.defaultDict(Array, true);
        for (i = 0; i < len; i++) {
            def = setup[i];
            if (def.extensionName && def.hasOwnProperty('extension')) {
                $.extensions[def.extensionName] = def.extension;
            }
            if (def.tagName) {
                $.bindTagName.get(def.tagName.toUpperCase()).push(def);
            }
            if (def.attrName) {
                $.bindAttrName.get(def.attrName.toUpperCase()).push(def);
            }
        }
        $.mount(document.body);
    },

    /**
     * index all component definitions some time before the next rendering frame
     *
     * @param  {Array} setup List of component definitions
     */
    bindComponentsAsync: (function () {
        'use strict';
        var id = null;
        return function (setup) {
            var $ = this;
            $.cancelAnimationFrame(id);
            id = $.requestAnimationFrame(function () {
                $.bindComponents(setup);
            });
        };
    }()),

    /**
     * take an element or document fragment and inserts into the tail end of
     * the supplied group
     *
     * @param  {HTMLElement|DocumentFragment} el
     * @param  {Object} group The group definition taken from the HijinksGroupIndex
     */
    insertToGroup: function (el, group) {
        'use strict';
        var $ = this;
        var toMount, len, i;
        var parent = group && (group.element.parentElement || group.element.parentNode);
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

        var last = group.element;
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
            $.mount(toMount[i]);
        }
    },

    /**
     * Execute the contents of a loaded script element
     * @param  {HTMLScriptElement} el A script element that was loaded by never attached to the DOM
     */
    insertScript: function (el) {
        'use strict';
        var script = document.createElement("script");
        script.innerHTML = el.innerHTML;
        if (el.type) {
            script.type = el.type;
        }
        if (el.src) {
            script.src = el.src;
        }
        document.head.appendChild(script);
    },

    /**
     * x-browser requestAnimationFrame shim
     *
     * see: https://gist.github.com/paulirish/1579671
     */
    requestAnimationFrame: (function () {
        'use strict';
        var requestAnimationFrame = window.requestAnimationFrame;
        var lastTime = 0;
        var vendors = ['ms', 'moz', 'webkit', 'o'];
        for (var i = 0; i < vendors.length && !requestAnimationFrame; ++i) {
            requestAnimationFrame = window[vendors[i] + 'RequestAnimationFrame'];
        }

        if (!requestAnimationFrame) {
            requestAnimationFrame = function (callback, element) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function () {
                        callback(currTime + timeToCall);
                    },
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
        'use strict';
        var cancelAnimationFrame = window.cancelAnimationFrame;
        var vendors = ['ms', 'moz', 'webkit', 'o'];
        for (var i = 0; i < vendors.length && !cancelAnimationFrame; ++i) {
            cancelAnimationFrame = window[vendors[i] + 'CancelAnimationFrame'] || window[vendors[i] + 'CancelRequestAnimationFrame'];
        }

        if (!cancelAnimationFrame) {
            cancelAnimationFrame = function (id) {
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
        'use strict';
        var args = [].slice.call(arguments, 2);
        if (typeof fn.bind === "function") {
            return fn.bind.apply(fn, [self].concat(args));
        }
        return function () {
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
        'use strict';
        window.location.href = url;
    },

    /**
     * Search a provided context for hijinks group comment elements
     *
     * stack search adapted from http://stackoverflow.com/a/25388984/81962
     *
     * @param {HTMLElement} context The DOM Element to search for comment nodes
     * @returns {DefaultDict} Dictionary construct containing HijinksGroup defs key by name
     */
    createGroupIndex: (function () {
        'use strict';
        /**
         * @private
         * @constructor
         */
       function HijinksGroup() {
           this.name = null;
           this.element = null;
           this.prepend = false;
       }
       return function (context) {
            var $ = this;
            var HJ_GROUP_REG = /^\s*hijinks-group: ([a-zA-Z][\w-\d]*)( prepend)?\s*$/;
            var index = $.defaultDict(HijinksGroup);
            var conf, el, i, node, group,
                elementPath = [context];
            while (elementPath.length > 0) {
                el = elementPath.pop();
                for (i = 0; i < el.childNodes.length; i++) {
                    node = el.childNodes[i];
                    if (node.nodeType === 8) {
                        conf = node.nodeValue.match(HJ_GROUP_REG);
                        if (conf) {
                            group = index.get(conf[1]);
                            group.name = conf[1];
                            group.element = node;
                            group.prepend = conf[2] === " prepend";
                        }
                    } else {
                        elementPath.push(node);
                    }
                }
            }
            return index;
        };
    }()),

    /**
     * Create a dictionary that will construct values for missing keys
     *
     * @param   {function}    Cons            Constructor for missing values, invoked using 'new' operator
     * @param   {boolean}     caseInsensitive If true, the case of the keys will be normalized
     * @returns {DefaultDict} Object implementing { get(string)Cons, has(string)bool } interface
     */
    defaultDict: function (Cons, caseInsensitive) {
        'use strict';
        /**
         * @private
         * @constructor
         */
        function DefaultDict() {
            this._store = {};
        }
        DefaultDict.prototype.get = function (key) {
            if (typeof key != 'string' || key === '') {
                throw new Error("DefaultDict: invalid key (" + key + ")");
            }
            // underscore used to avoid collisions with Object prototype
            var _key = "_" + key;
            if (caseInsensitive) {
                _key = _key.toUpperCase();
            }
            if (this._store.hasOwnProperty(_key)) {
                return this._store[_key];
            } else {
                return (this._store[_key] = new Cons());
            }
        };
        DefaultDict.prototype.has = function (key) {
            if (typeof key != 'string' || key === '') {
                throw new Error("DefaultDict: invalid key (" + key + ")");
            }
            var _key = "_" + key;
            if (caseInsensitive) {
                _key = _key.toUpperCase();
            }
            return this._store.hasOwnProperty(_key);
        };
        return new DefaultDict();
    },

    /**
     * The dumbest event dispatcher I can think of
     *
     * @return {Object} Object implementing the { add(Function)Function, trigger() } interface
     */
    simpleSignal: function () {
        var listeners = [];
        return {
            add: function (f) {
                var i = listeners.indexOf(f);
                if (i === -1) {
                    i = listeners.push(f) - 1;
                }
                return function remove() {
                    listeners[i] = null;
                };
            },
            trigger: function () {
                for (var i = 0; i < listeners.length; i++) {
                    if (typeof listeners[i] === "function") {
                        listeners[i]();
                    }
                }
            }
        };
    }
}, window.hijinks));