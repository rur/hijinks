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
	err = YAML(data)(&c)
	if err != nil {
		t.Fatal(err)
	}

	if c.templates == nil {
		t.Error("No templates parsed")
	}
}

type testConf struct {
	templates Templates
}

func (t *testConf) AddHandler(name string, fn HijinksHandler) {
	// do nothing for now!
}

func (t *testConf) AddTemplates(tmpl Templates) {
	t.templates = tmpl
}
