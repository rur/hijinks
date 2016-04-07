// extend the hijinks library with navigation and form handling capabilities
window.hijinks = (window.hijinks || []);

/**
 * FormSerialize Hijinks extension is used to serialize form input data for XHR
 *
 * The aim is to handle the widest possible variety of methods and browser capabilities.
 * However AJAX file upload will not work without either FileReader or FormData.
 *
 * adapted from: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Submitting_forms_and_uploading_files
 */
window.hijinks.push(function ($, hijinks) {
    'use strict';
    /**
     * techniques:
     */
    var URLEN_GET = 0;   // GET method
    var URLEN_POST = 1;  // POST method, enctype is application/x-www-form-urlencoded (default)
    var PLAIN_POST = 2;  // POST method, enctype is text/plain
    var MULTI_POST = 3;  // POST method, enctype is multipart/form-data

    /**
     * @private
     * @constructor
     * @param {FormElement}   elm       The form to be serialized
     * @param {Function}      callback  Called when the serialization is complete (may be sync or async)
     */
    function FormSerialize(elm, callback) {
        var nFile, sFieldType, oField, oSegmReq, oFile;
        var bIsPost = elm.method.toLowerCase() === "post";
        var fFilter = window.escape;

        this.onRequestReady = callback;
        this.receiver = elm.action;
        this.status = 0;
        this.segments = [];

        if (bIsPost) {
            this.contentType = elm.enctype ? elm.enctype : "application\/x-www-form-urlencoded";
            switch (this.contentType) {
                case "multipart\/form-data":
                    this.technique = MULTI_POST;

                    try {
                        // ...to let FormData do all the work
                        this.data = new window.FormData(elm);
                    } catch (e) {}

                    if (this.data) {
                        this.processStatus();
                        return;
                    }
                    break;

                case "text\/plain":
                    this.technique = PLAIN_POST;
                    fFilter = $.plainEscape;
                    break;

                default:
                    this.technique = URLEN_POST;
            }
        } else {
            this.technique = URLEN_GET;
        }

        for (var i = 0, len = elm.elements.length; i < len; i++) {
            oField = elm.elements[i];
            if (!oField.hasAttribute("name")) { continue; }
            sFieldType = oField.nodeName.toUpperCase() === "INPUT" ? oField.getAttribute("type").toUpperCase() : "TEXT";
            if (sFieldType === "FILE" && oField.files.length > 0) {
                if (this.technique === MULTI_POST) {
                    if (!window.FileReader) {
                        throw new Error("Operation not supported: cannot upload a document via AJAX if FileReader is not supported");
                    }
                    /* enctype is multipart/form-data */
                    for (nFile = 0; nFile < oField.files.length; nFile++) {
                        oFile = oField.files[nFile];
                        oSegmReq = new window.FileReader();
                        oSegmReq.onload = this.fileReadHandler(oField, oFile);
                        oSegmReq.readAsBinaryString(oFile);
                    }
                } else {
                    /* enctype is application/x-www-form-urlencoded or text/plain or method is GET: files will not be sent! */
                    for (nFile = 0; nFile < oField.files.length; this.segments.push(fFilter(oField.name) + "=" + fFilter(oField.files[nFile++].name)));
                }
            } else if ((sFieldType !== "RADIO" && sFieldType !== "CHECKBOX") || oField.checked) {
                /* field type is not FILE or is FILE but is empty */
                this.segments.push(
                    this.technique === MULTI_POST ? /* enctype is multipart/form-data */
                        "Content-Disposition: form-data; name=\"" + oField.name + "\"\r\n\r\n" + oField.value + "\r\n"
                    : /* enctype is application/x-www-form-urlencoded or text/plain or method is GET */
                        fFilter(oField.name) + "=" + fFilter(oField.value)
                );
            }
        }
        this.processStatus();
    }

    /**
     * Create FileReader onload handler
     *
     * @return {function}
     */
    FormSerialize.prototype.fileReadHandler = function (field, file) {
        var self = this;
        var index = self.segments.length;
        self.segments.push(
            "Content-Disposition: form-data; name=\"" + field.name + "\"; " +
            "filename=\""+ file.name + "\"\r\n" +
            "Content-Type: " + file.type + "\r\n\r\n");
        self.status++;
        return function (oFREvt) {
            self.segments[index] += oFREvt.target.result + "\r\n";
            self.status--;
            self.processStatus();
        };
    };

    /**
     * Is called when a pass of serialization has completed.
     *
     * It will be called asynchronously if file reading is taking place.
     */
    FormSerialize.prototype.processStatus = function () {
        if (this.status > 0) { return; }
        /* the form is now totally serialized! prepare the data to be sent to the server... */
        var sBoundary, method, url, hash, data, enctype;

        switch (this.technique) {
            case URLEN_GET:
                method = "GET";
                url = this.receiver.split("#");
                hash = url.length > 1 ? "#" + url.splice(1).join("#") : "";  // preserve the hash
                url = url[0].replace(/(?:\?.*)?$/, this.segments.length > 0 ? "?" + this.segments.join("&") : "") + hash;
                data = null;
                enctype = null;
                break;

            case URLEN_POST:
            case PLAIN_POST:
                method = "POST";
                url = this.receiver;
                enctype =  this.contentType;
                data  = this.segments.join(this.technique === PLAIN_POST ? "\r\n" : "&");
                break;

            case MULTI_POST:
                method = "POST";
                url = this.receiver;
                if (this.data) {
                    // use native FormData multipart data
                    data = this.data;
                    enctype = null;
                } else {
                    // construct serialized multipart data manually
                    sBoundary = "---------------------------" + Date.now().toString(16);
                    enctype = "multipart\/form-data; boundary=" + sBoundary;
                    data = "--" + sBoundary + "\r\n" + this.segments.join("--" + sBoundary + "\r\n") + "--" + sBoundary + "--\r\n";
                    if (window.Uint8Array) {
                        data = $.createArrayBuffer(data);
                    }
                }
                break;
        }

        this.onRequestReady({
            method: method,
            action: url,
            data: data,
            enctype: enctype
        });
    };

    return {
        extensionName: "FormSerialize",
        extension: FormSerialize
    };
}({
    //
    // private
    //
    /**
     * Used to escape strings for encoding text/plain
     *
     * eg. "4\3\7 - Einstein said E=mc2" ----> "4\\3\\7\ -\ Einstein\ said\ E\=mc2"
     *
     * @param  {stirng} sText
     * @return {string}
     */
    plainEscape: function (sText) {
        return sText.replace(/[\s\=\\]/g, "\\$&");
    },

    /**
     * @param  {string} str
     * @return {ArrayBuffer}
     */
    createArrayBuffer: function (str) {
        var nBytes = str.length;
        var ui8Data = new window.Uint8Array(nBytes);
        for (var i = 0; i < nBytes; i++) {
            ui8Data[i] = str.charCodeAt(i) & 0xff;
        }
        return ui8Data;
    },
}, window.hijinks));


/**
 * Register hijinks delegation event handlers on the document.body
 */
window.hijinks.push(function ($, hijinks) {
    'use strict';

    // handlers:
    function documentClick(_evt) {
        var evt = _evt || window.event;
        var elm = _evt.target || _evt.srcElement;
        while (elm.tagName.toUpperCase() !== "A") {
            if (elm.parentElement) {
                elm = elm.parentElement;
            } else {
                return; // this is not an anchor click
            }
        }
        $.anchorClicked(evt, elm);
    }

    function onSubmit(_evt) {
        var evt = _evt || window.event;
        var elm = _evt.target || _evt.srcElement;
        $.formSubmit(evt, elm);
    }

    function onPopState(_evt) {
        var evt = _evt || window.event;
        $.browserPopState(evt);
    }

    /**
     * hijinks event delegation component definition
     */
    return {
        tagName: "body",
        mount: function (el) {
            if (el.addEventListener) {
                el.addEventListener('click', documentClick, false);
                el.addEventListener('submit', onSubmit, false);
            } else if (el.attachEvent) {
                el.attachEvent('onclick', documentClick);
                el.attachEvent('onsubmit', onSubmit);
            } else {
                throw new Error("Hijink Events: Event delegation is not supported in this browser!");
            }
            if (window.history) {
                // set the state so that back button will work properly
                var url = window.location.toLocaleString();
                window.history.replaceState({
                    hijinks_url: url,
                    partial: false
                }, document.title);
            }
            window.onpopstate = onPopState;
        },
        unmount: function (el) {
            if (el.removeEventListener) {
                el.removeEventListener('click', documentClick);
                el.removeEventListener('submit', onSubmit);
            } else if (el.detachEvent) {
                el.detachEvent('onclick', documentClick);
                el.detachEvent('onsubmit', onSubmit);
            }
            if(window.onpopstate === onPopState) {
                window.onpopstate = null;
            }
        }
    };
}({
    //
    // Private
    //
    /**
     * document submit event handler
     *
     * @param {Event} evt
     */
    anchorClicked: function (evt, elm) {
        'use strict';
        var $ = this;
        var browsingContext = elm.target.toLowerCase();
        var pagePartial = elm.hasAttribute("hijinks-page");
        var partial = pagePartial || elm.hasAttribute("hijinks");
        if (elm.href && partial) {
            evt.preventDefault();
            window.hijinks.request("GET", elm.href);
            if (pagePartial && window.history) {
                window.history.pushState({
                    hijinks_url: elm.href,
                    partial: true
                }, "", elm.href);
            }
            return false;
        }
    },

    /**
     * document submit event handler
     *
     * @param {Event} evt
     */
    formSubmit: function (evt, elm) {
        'use strict';
        var $ = this;
        var browsingContext = elm.target.toLowerCase();
        var pagePartial = elm.hasAttribute("hijinks-page");
        var partial = pagePartial || elm.hasAttribute("hijinks");
        if (elm.action && partial) {
            evt.preventDefault();
            // TODO: If there is an error serializing the form, allow event propagation to continue.
            $.processFormData(elm, $.serializedFormHandler(pagePartial));
            return false;
        }
    },

    /**
     * document history pop state event handler
     *
     * @param {PopStateEvent} e
     */
    browserPopState: function (evt, elm) {
        'use strict';
        var $ = this;
        if (evt.state && evt.state.hijinks_url) {
            if (evt.state.partial) {
                window.hijinks.request("GET", evt.state.hijinks_url);
            } else {
                window.location.href = evt.state.hijinks_url;
            }
        }
    },

    /**
     * Create a callback that will pass a request to hijinks
     *
     * @param  {boolean} pagePartial Flag if this form should be added to browser history
     * @return {function}            A FormSerialize.onRequestReady callback
     */
    serializedFormHandler: function (pagePartial) {
        return function (form) {
            window.hijinks.request(
                form.method,
                form.action,
                form.data,
                form.enctype
            );

            if (pagePartial && window.history) {
                window.history.pushState({
                    hijinks_url: form.action,
                    partial: true
                }, "", form.action);
            }
        };
    },

    /**
     * Serialize a form data for use in an AJAX request
     */
    processFormData: function (formElement, callback) {
        return window.hijinks.FormSerialize(formElement, callback);
    }
}, window.hijinks));
