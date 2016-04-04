(window.hijinks = (window.hijinks || [])).push(function ($) {
    /**
     * Hijinks Body component add listeners to the document body
     */
    return {
        tagName: "body",
        mount: function (el) {
            if (el.addEventListener) {
                el.addEventListener('click', $.documentClick, false);
                el.addEventListener('submit', $.onSubmit, false);
            } else if (el.attachEvent) {
                el.attachEvent('onclick', $.documentClick);
                el.attachEvent('onsubmit', $.onSubmit);
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
            window.onpopstate = $.onPopState;
        },
        unmount: function (el) {
            if (el.removeEventListener) {
                el.removeEventListener('click', $.documentClick);
                el.removeEventListener('submit', $.onSubmit);
            } else if (el.detachEvent) {
                el.detachEvent('onclick', $.documentClick);
                el.detachEvent('onsubmit', $.onSubmit);
            }
            if(window.onpopstate === $.onPopState) {
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
    documentClick: function (evt) {
        var e = evt || window.event;
        var elm = e.target || e.srcElement;
        while (elm.tagName.toUpperCase() !== "A") {
            if (elm.parentElement) {
                elm = elm.parentElement;
            } else {
                return; // this is not an anchor click
            }
        }
        var browsingContext = elm.target.toLowerCase();
        if (elm.href && ["_hj_partial_page", "_hj_partial"].indexOf(browsingContext) > -1) {
            e.preventDefault();
            window.hijinks.request("GET", elm.href);
            if ("_hj_partial_page" === browsingContext && window.history) {
                window.history.pushState({
                    hijinks_url: url,
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
    onSubmit: function (evt) {
        var e = evt || window.event;
        // body...
    },

    /**
     * document history pop state event handler
     *
     * @param {PopStateEvent} e
     */
    onPopState: function(e) {
        if (e.state && e.state.hijinks_url) {
            if (e.state.partial) {
                window.hijinks.request("GET", e.state.hijinks_url);
            } else {
                window.location.href = e.state.hijinks_url;
            }
        }
    }
}));