(window.hijinks = (window.hijinks || [])).push(function ($) {
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
     * Hijinks Body component add listeners to the document body
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
            $.processFormData(elm, $.serializedFormHandler(pagePartial));
            return false;
        }
    },

    /**
     * document history pop state event handler
     *
     * @param {PopStateEvent} e
     */
    browserPopState: function(evt, elm) {
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
     * @return {function}            A FormRequestData.onRequestReady callback
     */
    serializedFormHandler: function (pagePartial) {
        return function(form) {
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
    processFormData: (function() {
        'use strict';
        /**
         * adapted from: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Submitting_forms_and_uploading_files
         *
         * @private
         * @constructor
         */
        function FormRequestData(oTarget, callback) {
            var self = this;
            self.onRequestReady = callback;
            var nFile, sFieldType, oField, oSegmReq, oFile, bIsPost = oTarget.method.toLowerCase() === "post";
            this.contentType = bIsPost && oTarget.enctype ? oTarget.enctype : "application\/x-www-form-urlencoded";
            this.technique = bIsPost ? this.contentType === "multipart\/form-data" ? 3 : this.contentType === "text\/plain" ? 2 : 1 : 0;
            this.receiver = oTarget.action;
            this.status = 0;
            this.segments = [];
            var fFilter = this.technique === 2 ? _plainEscape : window.escape;
            for (var nItem = 0; nItem < oTarget.elements.length; nItem++) {
                oField = oTarget.elements[nItem];
                if (!oField.hasAttribute("name")) { continue; }
                sFieldType = oField.nodeName.toUpperCase() === "INPUT" ? oField.getAttribute("type").toUpperCase() : "TEXT";
                if (sFieldType === "FILE" && oField.files.length > 0) {
                    if (this.technique === 3) {
                        if (!window.FileReader) {
                            throw new Error("Operation not supported: cannot upload a document via AJAX if FileReader is not supported");
                        }
                        /* enctype is multipart/form-data */
                        for (nFile = 0; nFile < oField.files.length; nFile++) {
                            oFile = oField.files[nFile];
                            oSegmReq = new window.FileReader();
                            oSegmReq.onload = this.fileReadHandler();
                            this.segments.push("Content-Disposition: form-data; name=\"" + oField.name + "\"; filename=\""+ oFile.name + "\"\r\nContent-Type: " + oFile.type + "\r\n\r\n");
                            this.status++;
                            oSegmReq.readAsBinaryString(oFile);
                        }
                    } else {
                        /* enctype is application/x-www-form-urlencoded or text/plain or method is GET: files will not be sent! */
                        for (nFile = 0; nFile < oField.files.length; this.segments.push(fFilter(oField.name) + "=" + fFilter(oField.files[nFile++].name)));
                    }
                } else if ((sFieldType !== "RADIO" && sFieldType !== "CHECKBOX") || oField.checked) {
                    /* field type is not FILE or is FILE but is empty */
                    this.segments.push(
                        this.technique === 3 ? /* enctype is multipart/form-data */
                            "Content-Disposition: form-data; name=\"" + oField.name + "\"\r\n\r\n" + oField.value + "\r\n"
                        : /* enctype is application/x-www-form-urlencoded or text/plain or method is GET */
                            fFilter(oField.name) + "=" + fFilter(oField.value)
                    );
                }
            }
            this.processStatus(this);
        }

        FormRequestData.prototype = {
            /**
             * Create FileReader onload handler
             *
             * @return {function}
             */
            fileReadHandler: function () {
                var fdata = this,
                    index = this.segments.length;
                return function (oFREvt) {
                    fdata.segments[index] += oFREvt.target.result + "\r\n";
                    fdata.status--;
                    fdata.processStatus();
                };
            },

            /**
             * Is called when a pass of serialization has completed.
             *
             * It will be called asynchronously if file reading is taking place.
             */
            processStatus: function() {
                if (this.status > 0) { return; }
                /* the form is now totally serialized! prepare the data to be sent to the server... */
                var sBoundary, method, url, hash, data, enctype;
                if (this.technique === 0) {
                    /* method is GET */
                    method = "GET";
                    url = this.receiver.split("#");
                    hash = url.length > 1 ? "#" + url.splice(1).join("#") : "";  // preserve the hash
                    url = url[0].replace(/(?:\?.*)?$/, this.segments.length > 0 ? "?" + this.segments.join("&") : "") + hash;
                    data = null;
                    enctype = null;
                } else {
                    /* method is POST|... */
                    method = "POST";
                    url = this.receiver;
                    if (this.technique === 3) {
                        /* enctype is multipart/form-data */
                        sBoundary = "---------------------------" + Date.now().toString(16);
                        enctype = "multipart\/form-data; boundary=" + sBoundary;
                        data = "--" + sBoundary + "\r\n" + this.segments.join("--" + sBoundary + "\r\n") + "--" + sBoundary + "--\r\n";
                        if (window.Uint8Array) {
                            data = _createArrayBuffer(data);
                        }
                    } else {
                        /* enctype is application/x-www-form-urlencoded or text/plain */
                        enctype =  this.contentType;
                        data  = this.segments.join(this.technique === 2 ? "\r\n" : "&");
                    }
                }
                this.onRequestReady({
                    method: method,
                    action: url,
                    data: data,
                    enctype: enctype
                });
            },
        };

        function _plainEscape(sText) {
            /* "4\3\7 - Einstein said E=mc2" ----> "4\\3\\7\ -\ Einstein\ said\ E\=mc2" */
            return sText.replace(/[\s\=\\]/g, "\\$&");
        }

        function _createArrayBuffer(sData) {
            var nBytes = sData.length, ui8Data = new window.Uint8Array(nBytes);
            for (var nIdx = 0; nIdx < nBytes; nIdx++) {
                ui8Data[nIdx] = sData.charCodeAt(nIdx) & 0xff;
            }
            return ui8Data;
        }

        return function (formElement, callback) {
            return new FormRequestData(formElement, callback);
        };
    }())
}));