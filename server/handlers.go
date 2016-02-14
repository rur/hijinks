package server

import (
	"fmt"
	"net/http"
)

func helloWorld(ctx server, w http.ResponseWriter, req *http.Request) {
	fmt.Fprintf(w, "Hi there %s!", req.URL.Path)
}
