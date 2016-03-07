(function () {

  function hijinksResponse() {
    var content = this.responseText;
    var el = document.createElement("div");
    var id, child, old, i;
    // assign HTML response to a temporary container
    el.innerHTML = content;
    for (i = 0; i < el.children.length; i++) {
      child = el.children[i];
      id = child.getAttribute("id");
      if (id) {
        old = document.getElementById(id);
      } else if (child.tagname) {}

      if (old) {
        old.parentElement.replaceChild(child, old);
      }
    }
  }

  function documentClick(e) {
    e = e || event;
    var from = findParent('a',e.target || e.srcElement);
    if (from && from.hasAttribute("hijinks")){
      var url = from.getAttribute('href');
      if (history) {
        history.pushState({}, null, url);
      }

      var oReq = new XMLHttpRequest();
      oReq.addEventListener("load", hijinksResponse);
      oReq.open("GET", url);
      oReq.setRequestHeader("X-Hijinks", "partial", false);
      oReq.send();

      event.preventDefault();
    }
  }

  //find first parent with tagName [tagname]
  function findParent(tagname,el){
    if ((el.nodeName || el.tagName).toLowerCase()===tagname.toLowerCase()){
      return el;
    }
    while (el = el.parentNode){
      if ((el.nodeName || el.tagName).toLowerCase()===tagname.toLowerCase()){
        return el;
      }
    }
    return null;
  }


  var el = document;

  if (el.addEventListener) {
    el.addEventListener('click', documentClick, false);
  } else if (el.attachEvent)  {
    el.attachEvent('onclick', documentClick);
  }
}())