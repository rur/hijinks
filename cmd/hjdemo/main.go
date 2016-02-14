package main

import (
	"github.com/rur/hijinks/server"
	"log"
	"net/http"
)

var config = server.Config{
	// SessionKey should be a 32 byte random key
	SessionKey: "12345678901234567890123456789012",
	Port:       "8080",
}

func main() {
	handler := server.NewRootHandler(".", []byte(config.SessionKey))
	log.Fatal(http.ListenAndServe(":"+config.Port, handler))
}
