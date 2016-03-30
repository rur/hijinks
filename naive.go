package hijinks

import (
	"net/http"
)

// Most stupid thing that might work
// implements both the Renderer and Configure interfaces
type naiveImpl struct {
	index *templateIndex
	pages map[string]*Template
}

func (n *naiveImpl) Handler(path string) http.HandlerFunc {
	node := n.index.getNode(path)
	document := node.exportRootTemplate()
	partial := node.Template

	return func(w http.ResponseWriter, r *http.Request) {
		var templ *Template
		loadPartial := r.Header.Get("X-Hijinks") == "partial"
		if loadPartial {
			templ = partial
		} else {
			templ = document
		}
		hw := hjResponseWriter{ResponseWriter: w, template: templ, partial: loadPartial}
		model, ok := hw.loadData(r)
		if ok {
			hw.executeTemplate(model)
		}
	}
}

func (n *naiveImpl) Sub(cfgs ...ConfigFunc) (Renderer, error) {
	sub := n.dup()
	err := sub.configure(cfgs...)
	if err != nil {
		return nil, err
	}
	return sub, nil
}

func (n *naiveImpl) AddHandler(path string, handler HandlerFunc) {
	n.index.getTemplate(path).Handler = handler
}

func (n *naiveImpl) AddPages(p Pages) {
	for name, _ := range p {
		n.index.addTemplate(name, p[name])
		t := n.index.getTemplate(name)
		n.pages[name] = t
	}
	n.index.linkTemplates()
}

func NewRenderer(c ...ConfigFunc) (Renderer, error) {
	r := naiveImpl{newTemplateIndex(), make(map[string]*Template)}
	err := r.configure(c...)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (n *naiveImpl) dup() *naiveImpl {
	d := naiveImpl{newTemplateIndex(), make(map[string]*Template)}
	pages := make(Pages)
	for name, templ := range n.pages {
		pages[name] = *templ
	}
	d.AddPages(pages)
	return &d
}

func (n *naiveImpl) configure(cfgs ...ConfigFunc) error {
	var err error
	for _, cfn := range cfgs {
		if err = cfn(n); err != nil {
			return err
		}
	}
	return nil
}
