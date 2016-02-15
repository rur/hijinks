package server

import (
	"html/template"
	"log"
	"net/http"
)

func aboutPage(ctx server, w http.ResponseWriter, req *http.Request) {
	t, err := template.ParseFiles(
		ctx.fsRoot+"/assets/base.templ.html",
		ctx.fsRoot+"/assets/about.templ.html",
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
		ctx.fsRoot + "/assets/about.templ.html",
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
		ctx.fsRoot+"/assets/base.templ.html",
		ctx.fsRoot+"/assets/about.templ.html",
		ctx.fsRoot+"/assets/about-user.templ.html",
	)
	if err != nil {
		log.Fatal(err)
	}

	if err := t.Execute(w, nil); err != nil {
		log.Fatal(err)
	}
}
