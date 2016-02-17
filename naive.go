package hijinks

import (
	"fmt"
	"net/http"
)

// most stupid thing that might work
type naiveImpl struct {
	templates Templates
}

func (n *naiveImpl) Handler(name string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hijinks Handler (%s)!", name)
	}
}

func (n *naiveImpl) Sub(cfgs ...ConfigFunc) (Renderer, error) {
	sub := naiveImpl{n.templates}
	for _, cfn := range cfgs {
		err := cfn(sub)
		if err != nil {
			return nil, err
		}
	}
	return &sub, nil
}

func (n naiveImpl) AddHandler(name string, handler *HijinksHandler) {
	templ, ok := n.templates[name]
	if ok != true {
		panic("no templates found here!")
	}
	templ.Handler = handler
}

func (n naiveImpl) AddTemplates(tls Templates) {
	n.templates = tls
}

func NewNaiveRenderer(c ...ConfigFunc) (Renderer, error) {
	r := naiveImpl{}
	return r.Sub(c...)
}
