package hijinks

import "net/http"

type hjResponseWriter struct {
	http.ResponseWriter
	template Template
}

func (w *hjResponseWriter) Data(d interface{}) {
	// this should call the template files to be loaded and
	// the output to be sent
}

func (w *hjResponseWriter) Delegate(n string) interface{} {
	// this is called by the handler, it should seek
	// child template handlers to load data
	return 123
}
