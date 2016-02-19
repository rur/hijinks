package hijinks

import (
	"html/template"
	"log"
	"net/http"
)

// most stupid thing that might work
type naiveImpl struct {
	templates Templates
}

func (n *naiveImpl) Handler(name string) http.HandlerFunc {
	templ, ok := n.templates[name]
	if !ok {
		panic("no templates found here!")
	}
	return func(w http.ResponseWriter, r *http.Request) {
		hw := hjResponseWriter{ResponseWriter: w, template: templ}
		t, err := template.ParseFiles(templ.Template)
		if err != nil {
			log.Fatal(err)
		}

		templ.Handler(&hw, r)

		if hw.dataCalled {
			if err := t.Execute(w, hw.data); err != nil {
				log.Fatal(err)
			}
		}
	}
}

func (n *naiveImpl) Sub(cfgs ...ConfigFunc) (Renderer, error) {
	sub := naiveImpl{n.templates}
	for _, cfn := range cfgs {
		err := cfn(&sub)
		if err != nil {
			return nil, err
		}
	}
	return &sub, nil
}

func (n *naiveImpl) AddHandler(name string, handler HijinksHandler) {
	templ, ok := n.templates[name]
	if ok != true {
		panic("no templates found here!")
	}
	templ.Handler = handler
}

func (n *naiveImpl) AddTemplates(tls Templates) {
	n.templates = tls
}

func NewNaiveRenderer(c ...ConfigFunc) (Renderer, error) {
	r := naiveImpl{}
	return r.Sub(c...)
}
