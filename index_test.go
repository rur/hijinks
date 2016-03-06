package hijinks

import (
	"testing"
)

func TestAddTemplate(t *testing.T) {
	ind := make(templateIndex)
	t1 := Template{
		Name: "root",
		Children: map[string]*Template{
			"sub": &Template{
				Name: "sub",
			},
		},
	}
	ind.addTemplate("root", &t1)

	if ind["root"].Name != "root" {
		t.Fatalf("Did not add template %v", ind)
	}

	if ind["root > sub"].Name != "sub" {
		t.Fatalf("Did not add template %v", *ind["root > sub"].Template)
	}

	t2 := Template{Name: "sub2", Extends: "root > sub"}
	ind.addTemplate("sub2", &t2)

	if ind["sub2"].Extends != "root > sub" {
		t.Fatalf("Did capture the extends field %v", *ind["sub2"].Template)
	}
}

func TestSubstitueTemplate(t *testing.T) {
	ind := make(templateIndex)
	t1 := Template{
		Name: "root",
		Children: map[string]*Template{
			"sub": &Template{
				Name: "sub",
			},
		},
	}
	node := ind.addTemplate("root", &t1)

	t2 := Template{Name: "sub2", Extends: "root > sub"}

	nt := node.substitueTemplate("sub", &t2)

	if nt.Name != "root" {
		t.Fatalf("Did not return the root template %v", nt)
	}

	if nt.Children["sub"].Name != "sub2" {
		t.Fatalf("Did not substitute the child template %v", nt.Children["sub"])
	}

	if node.Template.Children["sub"].Name != "sub" {
		t.Fatalf("Mutated the main root template %v", node.Template.Children["sub"])
	}
}

func TestLinkTemplates(t *testing.T) {
	ind := make(templateIndex)
	t1 := Template{
		Name: "root",
		Children: map[string]*Template{
			"sub": &Template{
				Name: "sub",
			},
		},
	}
	t2 := Template{Name: "sub2", Extends: "root > sub"}

	ind.addTemplate("root", &t1)
	ind.addTemplate("sub2", &t2)

	ind.linkTemplates()

	if ind["sub2"].extends.Name != "sub" {
		t.Fatalf("Invalid parent of extending template '%s'", ind["sub2"].parent.Name)
	}

	if ind["root > sub"].parent.Name != "root" {
		t.Fatalf("Invalid parent of child template '%s'", ind["child > sub"].parent.Name)
	}

	if ind["root > sub"].extends != nil {
		t.Fatal("Child node should not have an extended template prop")
	}

	if ind["root"].parent != nil {
		t.Fatal("Root node should not have a parent")
	}
}

func TestExportRootTemplate(t *testing.T) {
	var (
		node *templNode
		tpl  *Template
	)
	ind := make(templateIndex)
	t1 := Template{
		Name: "root",
		Children: map[string]*Template{
			"sub": &Template{
				Name: "sub",
			},
		},
	}
	t2 := Template{Name: "sub2", Extends: "root > sub"}

	ind.addTemplate("sub2", &t2)
	ind.addTemplate("root", &t1)
	ind.linkTemplates()

	node = ind["root"]
	tpl = node.exportRootTemplate()
	if tpl.Name != "root" {
		t.Fatalf("'root' node did not export the correct template, %v", tpl)
	}

	node = ind["root > sub"]
	tpl = node.exportRootTemplate()
	if tpl.Children["sub"].Name != "sub" {
		t.Fatalf("'root > sub' node did not export the correct template, %v", tpl)
	}

	node = ind["sub2"]
	tpl = node.exportRootTemplate()
	if tpl.Children["sub"].Name != "sub2" {
		t.Fatalf("'sub2' node did not return the correct template, %v", tpl)
	}
}

func TestExportRootTemplateMutiExtend(t *testing.T) {
	var (
		node *templNode
		tpl  *Template
	)
	ind := make(templateIndex)
	t1 := Template{
		Name: "root",
		Children: map[string]*Template{
			"sub": &Template{
				Name: "sub",
			},
		},
	}
	t2 := Template{
		Name:    "sub2",
		Extends: "root > sub",
		Children: map[string]*Template{
			"sub_sub": &Template{
				Name: "sub_sub",
			},
		},
	}
	t3 := Template{
		Name:    "sub3",
		Extends: "sub2 > sub_sub",
	}

	ind.addTemplate("sub2", &t2)
	ind.addTemplate("sub3", &t3)
	ind.addTemplate("root", &t1)
	ind.linkTemplates()

	node = ind["sub3"]
	tpl = node.exportRootTemplate()

	if tpl.Name != "root" {
		t.Fatalf("'sub3' node did not export the root template, %v", tpl)
	}

	if tpl.Children["sub"].Name != "sub2" {
		t.Fatalf("'sub3' node did not export the middle template, %v", tpl)
	}

	if tpl.Children["sub"].Children["sub_sub"].Name != "sub3" {
		t.Fatalf("'sub3' node did not export the sub3 template, %v", tpl)
	}
}
