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
	// copy parent template
	old := base.parent.Template
	newp := Template{
		Extends:  old.Extends,
		Name:     old.Name,
		File:     old.File,
		Handler:  old.Handler,
		Children: make([]Template, len(old.Children)),
	}
	// copy child templates list, replacing base with child node
	var ch *Template
	for i, _ := range old.Children {
		ch = &old.Children[i]
		if ch.Name == base.Template.Name {
			ch = n.Template
		}
		newp.Children[i] = *ch
	}
	if base.parent.parent != nil {
		// keep copying templates until you reach the root
		return base.parent.exportRootTemplate()
	} else {
		return &newp
	}
}

// index template node by their path eg. "a > b > c"

type templateIndex map[string]*templNode

func (ti templateIndex) addTemplate(path string, t *Template) *templNode {
	var (
		extends *templNode
		parent  *templNode
	)
	if t.Extends != "" {
		if extends, ok := ti[t.Extends]; ok {
			oldp := extends.parent
			if oldp == nil {
				panic(fmt.Sprintf("Hinjinks Template '%s' cannot extend a root template '%s'", path, t.Extends))
			}
			// copy the extended parent node
			parent = &templNode{oldp.Template, oldp.extends, oldp.parent}
		} else {
			panic(fmt.Sprintf("Hijinks Template '%s' cannot extend '%s', template not found", path, t.Extends))
		}
	}
	// create new node with back reference to parent template node
	nt := templNode{t, extends, parent}
	for i, _ := range t.Children {
		cld := &t.Children[i]
		ct := ti.addTemplate(path+" > "+cld.Name, cld)
		ct.parent = &nt
	}
	ti[path] = &nt
	return ti[path]
}
