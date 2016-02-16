package hijinks

import "net/http"

type Template struct {
	Name     string
	Template string
	Handler  HijinksHandler
	Children []Template
}

type Templates map[string]Template

type Configure interface {
	// set the handler associated with a template
	AddHandler(string, *HijinksHandler)
	// add a new template definition
	AddTemplates(Templates)
}

type ResponseWriter interface {
	http.ResponseWriter
	// render the template with the supplied data
	Data(interface{})
	// load data from specified child handler
	Delegate(string) interface{}
}

type HijinksHandler func(ResponseWriter, *http.Request)

type ConfigFunc func(Configure) error

type Renderer interface {
	// generate a hander from a defined template
	Handler(string) http.HandlerFunc
	// create a sub renderer with a new configuration
	Sub(*ConfigFunc) (Renderer, error)
}
