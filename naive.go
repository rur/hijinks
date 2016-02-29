package hijinks

import (
	"net/http"
)

// Most stupid thing that might work
// implements both the Renderer and Configure interfaces
type naiveImpl struct {
	index templateIndex
	pages Pages
}

func (n *naiveImpl) Handler(path string) http.HandlerFunc {
	node, ok := n.index[path]
	if !ok {
		panic("Unable to create hijinks handler, template not found: " + path)
	}
	// the following templates are used to render a full page
	// document := node.exportRootTemplate()
	// the following is used for only the specific partial
	partial := node.Template

	return func(w http.ResponseWriter, r *http.Request) {
		var templ *Template
		templ = partial
		hw := hjResponseWriter{ResponseWriter: w, template: templ}
		model, ok := hw.loadData(r)
		if ok {
			hw.executeTemplate(model)
		}
	}
}

func (n *naiveImpl) Sub(cfgs ...ConfigFunc) (Renderer, error) {
	sub := n.dup()
	var err error
	for _, cfn := range cfgs {
		if err = cfn(sub); err != nil {
			return nil, err
		}
	}
	return sub, nil
}

func (n *naiveImpl) AddHandler(name string, handler HijinksHandler) {
	templ, ok := n.pages[name]
	if ok != true {
		panic("no pages found here!")
	}
	templ.Handler = handler
}

func (n *naiveImpl) AddPages(p Pages) {
	var templ Template
	for name, _ := range p {
		templ = p[name]
		n.index.addTemplate(name, &templ)
		n.pages[name] = p[name]
	}
}

func (n *naiveImpl) dup() *naiveImpl {
	d := naiveImpl{make(templateIndex), make(Pages)}
	d.AddPages(n.pages)
	return &d
}

func NewNaiveRenderer(c ...ConfigFunc) (Renderer, error) {
	r := naiveImpl{}
	return r.Sub(c...)
}
