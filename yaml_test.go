package hijinks

import (
	"io/ioutil"
	"testing"
)

func TestRenderYaml(t *testing.T) {
	data, err := ioutil.ReadFile("./test/example.yaml")
	if err != nil {
		t.Fatal(err)
	}

	c := testConf{}
	err = YAML(data, "/path/to/templates")(&c)
	if err != nil {
		t.Fatal(err)
	}

	if c.pages == nil {
		t.Error("No pages parsed")
	}

	if c.pages["settings"].Extends != "base > content" {
		t.Error("Failed to parse 'extends' field")
	}

	if c.pages["base"].Name != "base" {
		t.Errorf("Base Name not defined: %v", c.pages["base"].Name)
	}

	if c.pages["base"].File != "/path/to/templates/base.templ.html" {
		t.Errorf("Base file not defined: %v", c.pages["base"].File)
	}

	if len(c.pages["base"].Children) == 0 {
		t.Errorf("Failed to parse children %#v", c.pages["base"].Children)
	}
}

type testConf struct {
	pages Pages
}

func (t *testConf) AddHandler(name string, fn HandlerFunc) {
	// do nothing for now!
}

func (t *testConf) AddPages(p Pages) {
	t.pages = p
}
