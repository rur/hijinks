package hijinks

import (
	"fmt"
)

// node in a bottom up representation of the template hierarchy
// used to manage template configuration inheritance

type templNode struct {
	*Template
	parent  *templNode
	extends *templNode
}

func (n *templNode) exportRootTemplate() *Template {
	// export the root ancestor of the current node
	// according to declared inheritance.
	node := n
	templ := n.Template
	name := templ.Name

	for node.parent != nil || node.extends != nil {
		if node.extends != nil {
			name = node.extends.Template.Name
			node = node.extends.parent
		} else {
			name = node.Template.Name
			node = node.parent
		}
		templ = node.substitueTemplate(name, templ)
	}

	return templ
}

func (t *templNode) substitueTemplate(name string, child *Template) *Template {
	// Create a copy of the node template and swap a specified child
	old := t.Template

	// make a copy of the old template
	nue := Template{
		Extends:  old.Extends,
		Name:     old.Name,
		File:     old.File,
		Handler:  old.Handler,
		Children: make(map[string]*Template),
	}
	// swap out the extended child
	for n, ch := range old.Children {
		if n == name {
			nue.Children[n] = child
		} else {
			nue.Children[n] = ch
		}
	}
	return &nue
}

// index template node by their path eg. "a > b > c"

type templateIndex struct {
	index map[string]*templNode
}

func (t *templateIndex) getTemplate(path string) *Template {
	return t.getNode(path).Template
}

func (t *templateIndex) getNode(path string) *templNode {
	node, ok := t.index[path]
	if !ok {
		panic(fmt.Sprintf("Hijinks: No template found with path '%s'", path))
	}
	return node
}

func (ti *templateIndex) addTemplate(path string, t Template) *templNode {
	// create new node with back reference to parent template node
	// shallow copy the config so it cannot be changed by the client holding
	nt := &templNode{&t, nil, nil}
	ch := make(map[string]*Template)

	for name, cld := range t.Children {
		ct := ti.addTemplate(path+" > "+name, *cld)
		ct.parent = nt
		ch[name] = ct.Template
	}
	nt.Template.Children = ch

	ti.index[path] = nt
	return nt
}

func (ti *templateIndex) linkTemplates() {
	// populate .extends property of page templNodes (those without a parent)
	// this is a separate step from adding template nodes so that the order
	// they are added wont matter
	for _, node := range ti.index {
		t := node.Template
		if node.parent == nil && t.Extends != "" {
			node.extends = ti.getNode(t.Extends)
		}
	}
}

func newTemplateIndex() *templateIndex {
	return &templateIndex{
		make(map[string]*templNode),
	}
}
