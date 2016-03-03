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
		Children: make(map[string]Template),
	}
	// swap out the extended child
	for n, ch := range old.Children {
		if n == name {
			nue.Children[n] = *child
		} else {
			nue.Children[n] = ch
		}
	}
	return &nue
}

// index template node by their path eg. "a > b > c"

type templateIndex map[string]*templNode

func (ti templateIndex) addTemplate(path string, t *Template) *templNode {
	// create new node with back reference to parent template node
	nt := templNode{t, nil, nil}
	for name, cld := range t.Children {
		ct := ti.addTemplate(path+" > "+name, &cld)
		ct.parent = &nt
	}
	ti[path] = &nt
	return &nt
}

func (ti templateIndex) linkTemplates() {
	// populate .extends property of page templNodes (those wo a parent)
	// this is a separate step from adding template nodes so that the order
	// they are added wont matter
	for path, _ := range ti {
		node := ti[path]
		t := node.Template
		if node.parent == nil && t.Extends != "" {
			if extends, ok := ti[t.Extends]; ok {
				node.extends = extends
				if extends.parent == nil {
					panic(fmt.Sprintf("Hinjinks Template '%s' cannot extend a page template '%s'", path, t.Extends))
				}
			} else {
				panic(fmt.Sprintf("Hijinks Template '%s' cannot extend '%s', template not found", path, t.Extends))
			}
		}
	}
}
