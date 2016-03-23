package hijinks

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"
)

var (
	groupName *regexp.Regexp
)

func init() {
	groupName = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9-_]*$`)
}

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
	var (
		templ *Template
		ok    bool
	)
	templ = w.template
	names := strings.Split(strings.TrimSpace(n), " > ")
	for _, name := range names {
		if templ, ok = templ.Children[name]; !ok {
			panic(fmt.Sprintf("Hijinks Delegate call did not match any template children '%s'", n))
		}
	}
	dw := hjResponseWriter{
		ResponseWriter: w.ResponseWriter,
		template:       templ,
	}
	return dw.loadData(r)
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

	funcMap := template.FuncMap{
		"hijinksGroup": func(name string, prepend bool) template.HTML {
			prep := ""
			if prepend {
				prep = " prepend"
			}
			if ok := groupName.MatchString(name); !ok {
				log.Fatalf("Invalid hijinks group name: '%s'", name)
			}
			return template.HTML(fmt.Sprintf("<!-- hijinks-group: %s%s -->", name, prep))
		},
	}

	t, err := template.New("__init__").Funcs(funcMap).ParseFiles(files...)
	if err != nil {
		log.Fatal("Error parsing files: ", err)
	}

	if err := t.ExecuteTemplate(w, filepath.Base(files[0]), data); err != nil {
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
		tpls = append(tpls, aggregateTemplateFiles(tpl)...)
	}
	return tpls
}
