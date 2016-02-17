package demo_server

import (
	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	"net/http"
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

// adds server context to handlers.
func (s server) handler(f func(server, http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		f(s, w, req)
	}
}

// create and configure a new gorilla mux router
func NewRootHandler(fsRoot string, sessionKey []byte) *RootHandler {
	r := mux.NewRouter()
	handler := &RootHandler{Router: r, URL: new(string), FSRoot: fsRoot}
	store := sessions.NewCookieStore(sessionKey)
	server := server{router: r, url: handler.URL, fsRoot: fsRoot, store: store}

	r.HandleFunc("/", server.handler(aboutPage)).
		Methods("GET")

	r.HandleFunc("/about", server.handler(aboutPartial)).
		Methods("GET")

	r.HandleFunc("/about/user", server.handler(aboutUserPage)).
		Methods("GET")

	return handler
}
