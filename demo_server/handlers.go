package demo_server

import (
	"html/template"
	"log"
	"net/http"
)

func aboutPage(ctx server, w http.ResponseWriter, req *http.Request) {
	t, err := template.ParseFiles(
		"./assets/base.templ.html",
		"./assets/about.templ.html",
	)
	if err != nil {
		log.Fatal(err)
	}

	if err := t.Execute(w, nil); err != nil {
		log.Fatal(err)
	}
}

func aboutPartial(ctx server, w http.ResponseWriter, req *http.Request) {
	t, err := template.ParseFiles(
		"./assets/about.templ.html",
	)
	if err != nil {
		log.Fatal(err)
	}

	if err := t.Execute(w, nil); err != nil {
		log.Fatal(err)
	}
}

func aboutUserPage(ctx server, w http.ResponseWriter, req *http.Request) {
	t, err := template.ParseFiles(
		"./assets/base.templ.html",
		"./assets/about.templ.html",
		"./assets/about-user.templ.html",
	)
	if err != nil {
		log.Fatal(err)
	}

	if err := t.Execute(w, nil); err != nil {
		log.Fatal(err)
	}
}
