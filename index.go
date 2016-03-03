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
	// create a copy of all inherited template definitions
	// return the root
	base := n
	for base.extends != nil {
		base = base.extends
	}
	if base.parent == nil {
		// this *is* a root template
		return n.Template
	}
	// copy parent template
	old := base.parent.Template
	newp := Template{
		Extends:  old.Extends,
		Name:     old.Name,
		File:     old.File,
		Handler:  old.Handler,
		Children: make(map[string]Template),
	}
	// copy child templates list, replacing base with child node
	for name, ch := range old.Children {
		if ch.Name == base.Template.Name {
			ch = *n.Template
		}
		newp.Children[name] = ch
	}
	if n.parent.parent != nil {
		// keep copying templates until you reach the root
		return n.parent.exportRootTemplate()
	} else {
		return &newp
	}
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
	for path, _ := range ti {
		node := ti[path]
		t := node.Template
		if t.Extends != "" {
			if extends, ok := ti[t.Extends]; ok {
				node.extends = extends
				oldp := extends.parent
				if oldp == nil {
					panic(fmt.Sprintf("Hinjinks Template '%s' cannot extend a root template '%s'", path, t.Extends))
				}
				// copy the extended parent node
				node.parent = &templNode{oldp.Template, oldp.extends, oldp.parent}
			} else {
				panic(fmt.Sprintf("Hijinks Template '%s' cannot extend '%s', template not found", path, t.Extends))
			}
		}
	}
}
