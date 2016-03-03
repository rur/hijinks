package hijinks

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
)

type hjResponseWriter struct {
	http.ResponseWriter
	template   *Template
	data       interface{}
	dataCalled bool
}

func (w *hjResponseWriter) Data(d interface{}) {
	w.data = d
	w.dataCalled = true
}

func (w *hjResponseWriter) Delegate(n string, r *http.Request) (interface{}, bool) {
	// TODO: this should support delegating to children of children using '>' syntax
	if templ, ok := w.template.Children[n]; ok {
		dw := hjResponseWriter{
			ResponseWriter: w.ResponseWriter,
			template:       &templ,
		}
		return dw.loadData(r)
	} else {
		panic(fmt.Sprintf("Hijinks Delegate call did not match any template children '%s'", n))
	}
}

func (w *hjResponseWriter) loadData(r *http.Request) (interface{}, bool) {
	if w.template.Handler != nil {
		w.template.Handler(w, r)

		if w.dataCalled {
			return w.data, true
		}
	}
	return nil, false
}

func (w *hjResponseWriter) executeTemplate(data interface{}) {
	files := aggregateTemplateFiles(w.template)

	t, err := template.ParseFiles(files...)
	if err != nil {
		log.Fatal("Error parsing files: ", err)
	}

	if err := t.Execute(w, data); err != nil {
		log.Fatal(err)
	}
}

func aggregateTemplateFiles(t *Template) []string {
	// collects a list include this template and all of its descendants
	var tpls []string

	if t.File != "" {
		tpls = append(tpls, t.File)
	}
	// TODO: consider how this list of templates should be ordered,
	//       because this isn't right
	for _, tpl := range t.Children {
		tpls = append(tpls, aggregateTemplateFiles(&tpl)...)
	}
	return tpls
}
