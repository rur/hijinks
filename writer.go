package hijinks

import "net/http"

type hjResponseWriter struct {
	http.ResponseWriter
	template   Template
	data       interface{}
	dataCalled bool
}

func (w *hjResponseWriter) Data(d interface{}) {
	w.data = d
	w.dataCalled = true
}

func (w *hjResponseWriter) Delegate(n string) interface{} {
	// this is called by the handler, it should seek
	// child template handlers to load data
	return 123
}
