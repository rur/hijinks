package demo_server

import (
	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	"github.com/rur/hijinks"
	"io/ioutil"
	"log"
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

// adds server context to handlers.
func (s server) handler(f func(server, hijinks.ResponseWriter, *http.Request)) hijinks.HandlerFunc {
	return func(w hijinks.ResponseWriter, req *http.Request) {
		f(s, w, req)
	}
}

// create and configure a new gorilla mux router
func NewRootHandler(fsRoot string, sessionKey []byte) *RootHandler {
	r := mux.NewRouter()
	handler := &RootHandler{Router: r, URL: new(string), FSRoot: fsRoot}
	store := sessions.NewCookieStore(sessionKey)
	server := server{router: r, url: handler.URL, fsRoot: fsRoot, store: store}

	data, err := ioutil.ReadFile(fsRoot + "/demo/config.yaml")
	if err != nil {
		log.Fatalf("Error loading YAML config: %v", err)
	}
	renderer, err := hijinks.NewRenderer(hijinks.YAML(data, path.Join(fsRoot, "demo")), func(c hijinks.Configure) error {
		c.AddHandler("base", server.handler(baseHandler))
		c.AddHandler("base > content", server.handler(baseSubHandler))
		c.AddHandler("list", server.handler(listHandler))
		return nil
	})

	if err != nil {
		log.Fatalf("Error configuring renderer: %v", err)
	}

	r.HandleFunc("/", renderer.Handler("base")).
		Methods("GET")

	r.HandleFunc("/list", renderer.Handler("list")).
		Methods("GET")

	r.PathPrefix("/").Handler(http.FileServer(http.Dir(path.Join(fsRoot, "demo", "static"))))
	return handler
}
