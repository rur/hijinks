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
            }
        },
        unmount: function (el) {
            if (el.removeEventListener) {
                el.removeEventListener('click', $.documentClick);
                el.removeEventListener('submit', $.onSubmit);
            } else if (el.dettachEvent) {
                el.dettachEvent('onclick', $.documentClick);
                el.dettachEvent('onsubmit', $.onSubmit);
            }
        }
    };
}({
    //
    // Private
    //
    /**
     * document submit event handler
     */
    documentClick: function (evt) {
        var e = evt || window.event;
        var target = e.target || e.srcElement;
        while (target.tagName.toUpperCase() !== "A") {
            if (target.parentElement) {
                target = target.parentElement;
            } else {
                return; // this is not an anchor click
            }
        }
        if (target.href && target.target.toLowerCase() === "_hijinks_partial") {
            e.preventDefault();
            window.hijinks.request("GET", target.href);
            return false;
        }
    },

    /**
     * document submit event handler
     */
    onSubmit: function (evt) {
        var e = evt || window.event;
        // body...
    },

}));