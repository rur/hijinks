package hijinks

import (
	"gopkg.in/yaml.v2"
	"path"
)

type yamlDef struct {
	Extends  string
	Name     string
	File     string
	Children []yamlDef
}

func YAML(data []byte, base string) ConfigFunc {
	return func(config Configure) error {
		var defs map[string]yamlDef
		if err := yaml.Unmarshal(data, &defs); err != nil {
			return err
		}
		pages := make(Pages)
		for name, def := range defs {
			def.Name = name
			pages[name] = *def.mapToTemplate(base)
		}

		config.AddPages(pages)
		return nil
	}
}

func (y *yamlDef) mapToTemplate(base string) *Template {
	t := Template{
		Name:     y.Name,
		Extends:  y.Extends,
		Children: make(map[string]*Template),
	}
	if y.File != "" {
		t.File = path.Join(base, y.File)
	}
	for _, def := range y.Children {
		t.Children[def.Name] = def.mapToTemplate(base)
	}
	return &t
}
