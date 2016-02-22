package hijinks

import (
	"net/http"
)

// Most stupid thing that might work
// implements both the Renderer and Configure interfaces
type naiveImpl struct {
	templates Templates
}

func (n *naiveImpl) Handler(name string) http.HandlerFunc {
	// this should create two template instances,
	// one for the template root and one for the partial
	templ, ok := n.templates[name]
	if !ok {
		panic("no templates found here!")
	}
	return func(w http.ResponseWriter, r *http.Request) {
		hw := hjResponseWriter{ResponseWriter: w, template: templ}
		model, ok := hw.loadData(r)
		if ok {
			hw.executeTemplate(model)
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
