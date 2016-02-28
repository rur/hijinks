package hijinks

import (
	"strings"
)

// internal representation of the template hierarchy

type templNode struct {
	Template
	parent *Template
	children []*templNode
}

func (t *templNode) root() *templNode {
	p := t
	for p.parent != nil {
		p = p.parent
	}
	return p
}

func (t *templNode) aggregate() []*Template {
	// collects a list inlcude this template and all of its decendents
	tpls := []*Template{t.Template}
	// TODO: consider how this list of templates should be ordered,
	//       because this isn't right
	for i := 0; i < len(t.Children); i++ {
		tpls = append(tpls, t.children[i].aggregate()...)
	}
	return tpls
}

func (t *templNode) exportTemplate() *Template {

}

// index template node by their path eg. "a > b > c"

type templateIndex map[string]templNode 

// 1. iterate over list of pages
// 2. create a new template node from Template
// 3. add template to the templ index
// 4. recursively iterate through childs and repeat 2 + 3
// 5. for root templ get extended node
// 6. copy its parent rebuild children swaping extended with new node


func (t *templateIndex) addPages(p *Pages) {
	for name, templ := range p {
		nt := t.addTemplate(name, templ)
		// now handle extend
		// a. for root templ get extended node
		if ex, ok := t[templ.Extends]; if ok {
			prt := ex.parent
			// b. copy its parent rebuild children swaping extended with new node
			pcopy := templNode{
				Template: prt.Template,
				parent: prt.parent,
				children: make([]*templNode, len(prt.children)),
			}
			for i, ch := range prt.children {
				if ch == ex {
					pcopy.children[i] = nt
				} else {
					pcopy.children[i] = ch
				}
			}
			nt.parent = pcopy
		}
	}

}

func (ti *templateIndex) addTemplate(path string, t *Template) *templNode {
	// create a node for the template and add it to the index,
	// repeat for children
	nt = templNode{
		Template: t,
		children: make([]*templNode, len(t.Children))
	}
	for i, _ := range t.Children {
		cld := &t.Children[i]
		ct := ti.addTemplate(path + " > " + cld.Name, cld)
		ct.parent = &nt
	}
	ti[path] = &nt
	return ti[path]
}
