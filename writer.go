package hijinks

import (
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
	for _, c := range w.template.Children {
		if c.Name == n {
			dw := hjResponseWriter{
				ResponseWriter: w.ResponseWriter,
				template:       &c,
			}
			return dw.loadData(r)
		}
	}
	panic("no matching template was found")
}

func (w *hjResponseWriter) loadData(r *http.Request) (interface{}, bool) {
	w.template.Handler(w, r)

	if w.dataCalled {
		return w.data, true
	} else {
		return nil, false
	}
}

func (w *hjResponseWriter) executeTemplate(data interface{}) {
	files := aggregateTemplateFiles(w.template)

	t, err := template.ParseFiles(files...)
	if err != nil {
		log.Fatal(err)
	}

	if err := t.Execute(w, data); err != nil {
		log.Fatal(err)
	}
}

func aggregateTemplateFiles(t *Template) []string {
	// collects a list inlcude this template and all of its decendents
	tpls := []string{t.File}
	// TODO: consider how this list of templates should be ordered,
	//       because this isn't right
	for i := 0; i < len(t.Children); i++ {
		tpls = append(tpls, aggregateTemplateFiles(&t.Children[i])...)
	}
	return tpls
}
