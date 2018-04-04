package demo_server

import (
	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	"github.com/rur/hijinks"
	"net/http"
	"path"
)

// http listener struct
type RootHandler struct {
	*mux.Router
	URL    *string
	FSRoot string
}

// holds server state for handlers
type server struct {
	router *mux.Router
	url    *string
	fsRoot string
	store  *sessions.CookieStore
}

// adds server context to hijinks handlers.
func (s server) hjHandler(f func(server, hijinks.ResponseData, *http.Request)) hijinks.HandlerFunc {
	return func(w hijinks.ResponseData, req *http.Request) {
		f(s, w, req)
	}
}

// adds server context to handlers.
func (s server) handler(f func(server, http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		f(s, w, req)
	}
}

type templatePath struct {
	fsRoot string
	folder string
}
func (t *templatePath) path(file string) string {
	return path.Join(t.fsRoot, t.folder, file)
}

// create and configure a new gorilla mux router
func NewRootHandler(fsRoot string, sessionKey []byte) *RootHandler {
	r := mux.NewRouter()
	handler := &RootHandler{Router: r, URL: new(string), FSRoot: fsRoot}
	store := sessions.NewCookieStore(sessionKey)
	server := server{router: r, url: handler.URL, fsRoot: fsRoot, store: store}
	templ := &templatePath{fsRoot, "demo"}

	base := hijinks.NewHandler(
		templ.path("base.templ.html"),
		server.hjHandler(baseHandler),
	)
	content := base.DefineBlock("content").
		WithDefault(
			templ.path("content.templ.html"),
			server.hjHandler(baseSubHandler),
		)

	list := content.Default().DefineBlock("list").WithDefault("", server.hjHandler(listHandler))

	listPage := list.Extend(templ.path("list.templ.html"), server.hjHandler(listHandler))
	listItem := listPage.DefineBlock("list-item")
	listItemPage := listItem.Extend(templ.path("item.templ.html"), server.hjHandler(listItemHandler))

	r.Handle("/", content.Default()).
		Methods("GET")

	r.Handle("/list", listPage).
		Methods("GET")

	r.HandleFunc("/list", server.handler(listCreateHandler)).
		Methods("POST")

	r.Handle("/item/{item_id}", listItemPage).
		Methods("GET")

	r.PathPrefix("/").Handler(http.FileServer(http.Dir(path.Join(fsRoot, "js"))))
	return handler
}
