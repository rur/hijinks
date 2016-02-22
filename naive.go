package hijinks

import (
	"net/http"
	"strings"
)

// Most stupid thing that might work
// implements both the Renderer and Configure interfaces
type naiveImpl struct {
	pages Pages
}

func (n *naiveImpl) Handler(name string) http.HandlerFunc {
	// this should create two template instances,
	// one for the template root and one for the partial
	page, ok := n.pages[name]
	if page.Extends != "" {
		strings.Split(page.Extends, " > ")
	}
	templ := page.Template
	if !ok {
		panic("no pages found here!")
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
	sub := naiveImpl{n.pages}
	for _, cfn := range cfgs {
		err := cfn(&sub)
		if err != nil {
			return nil, err
		}
	}
	return &sub, nil
}

func (n *naiveImpl) AddHandler(name string, handler HijinksHandler) {
	templ, ok := n.pages[name]
	if ok != true {
		panic("no pages found here!")
	}
	templ.Handler = handler
}

func (n *naiveImpl) AddPages(tls Pages) {
	n.pages = tls
}

func NewNaiveRenderer(c ...ConfigFunc) (Renderer, error) {
	r := naiveImpl{}
	return r.Sub(c...)
}

func expandTemplates(page *Page, path string) *[]Template {
	var (
		pages    []*Page
		template []Template
	)

	strings.Split(path, " > ")
}
