package hijinks

import (
	"gopkg.in/yaml.v2"
)

func YAML(data []byte) ConfigFunc {
	return func(config Configure) error {
		t := Templates{}
		if err := yaml.Unmarshal(data, t); err != nil {
			return err
		}
		for name, tpl := range t {
			tpl.Name = name
		}
		config.AddTemplates(t)
		return nil
	}
}
