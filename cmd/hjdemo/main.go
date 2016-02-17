package main

import (
	"github.com/rur/hijinks/demo_server"
	"log"
	"net/http"
)

var config = demo_server.Config{
	// SessionKey should be a 32 byte random key
	SessionKey: "12345678901234567890123456789012",
	Port:       "8080",
}

func main() {
	handler := demo_server.NewRootHandler(".", []byte(config.SessionKey))
	log.Fatal(http.ListenAndServe(":"+config.Port, handler))
}
