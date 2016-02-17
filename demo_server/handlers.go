package demo_server

import (
	"html/template"
	"log"
	"net/http"
)

type Cons struct {
	Data int
	Next *Cons
}

func fullPage(ctx server, w http.ResponseWriter, req *http.Request) {
	t, err := template.ParseFiles(
		ctx.fsRoot+"/assets/base.templ.html",
		ctx.fsRoot+"/assets/sub.templ.html",
	)
	if err != nil {
		log.Fatal(err)
	}

	d := Cons{1, &Cons{Data: 2}}

	if err := t.Execute(w, d); err != nil {
		log.Fatal(err)
	}
}

func pagePartial(ctx server, w http.ResponseWriter, req *http.Request) {
	t, err := template.ParseFiles(
		ctx.fsRoot + "/assets/sub.templ.html",
	)
	if err != nil {
		log.Fatal(err)
	}

	d := Cons{1, &Cons{Data: 2}}

	if err := t.Execute(w, d); err != nil {
		log.Fatal(err)
	}
}
