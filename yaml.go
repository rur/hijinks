package hijinks

import (
	"gopkg.in/yaml.v2"
)

type yamlDef struct {
	Extends  string
	Name     string
	File     string
	Children []yamlDef
}

func YAML(data []byte) ConfigFunc {
	return func(config Configure) error {
		var defs map[string]yamlDef
		if err := yaml.Unmarshal(data, &defs); err != nil {
			return err
		}
		pages := make(Pages)
		for name, def := range defs {
			def.Name = name
			pages[name] = *def.mapToTemplate()
		}

		config.AddPages(pages)
		return nil
	}
}

func (y *yamlDef) mapToTemplate() *Template {
	t := Template{
		Name:     y.Name,
		Extends:  y.Extends,
		File:     y.File,
		Children: make(map[string]Template),
	}
	for _, def := range y.Children {
		t.Children[def.Name] = *def.mapToTemplate()
	}
	return &t
}
