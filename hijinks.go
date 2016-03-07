package hijinks

import "net/http"

type Template struct {
	Extends  string
	Name     string
	File     string
	Handler  HandlerFunc
	Children map[string]*Template
}

type Pages map[string]Template

type Configure interface {
	// set the handler associated with a template
	AddHandler(string, HandlerFunc)
	// add a new template definition
	AddPages(Pages)
}

type ResponseWriter interface {
	http.ResponseWriter
	// render the template with the supplied data
	Data(interface{})
	// load data from specified child handler
	Delegate(string, *http.Request) (interface{}, bool)
}

type HandlerFunc func(ResponseWriter, *http.Request)

type ConfigFunc func(Configure) error

type Renderer interface {
	// generate a hander from a defined template
	Handler(string) http.HandlerFunc
	// create a sub renderer with a new configuration
	Sub(...ConfigFunc) (Renderer, error)
}
