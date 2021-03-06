package hijinks

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"path/filepath"
	"regexp"
	"io"
)

var (
	groupName *regexp.Regexp
)

func init() {
	groupName = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9-_]*$`)
}

func executeTemplate(isPartial bool, templates []string, root Block, handlerMap map[Block]Handler, resp http.ResponseWriter, r *http.Request, w io.Writer) bool {
	rootHandler, ok := handlerMap[root]
	if !ok {
		// TODO: make sure this level of error handling is correct!
		http.Error(resp, "Root handler was not found!", 500)
		return false
	}
	hw := responseData{
		ResponseWriter: resp,
		handler: rootHandler,
		handlerMap: handlerMap,
	}

	f := rootHandler.Func()
	f(&hw, r)

	if hw.wroteHeader {
		// response headers have already been written in one of the handlers, do not proceed
		return false
	}

	funcMap := template.FuncMap{
		"hijinksGroup": func(name string, prepend bool) template.HTML {
			prep := ""
			if prepend {
				prep = " prepend"
			}
			if ok := groupName.MatchString(name); !ok {
				log.Fatalf("Invalid hijinks group name: '%s'", name)
			}
			return template.HTML(fmt.Sprintf("<!-- hijinks-group: %s%s -->", name, prep))
		},
	}

	t, err := template.New("__init__").Funcs(funcMap).ParseFiles(templates...)
	if err != nil {
		log.Fatal("Error parsing files: ", err)
	}

	if isPartial {
		// true if "application/x.hijinks-html-partial+xml" is set as the value of
		// the `Accept` request header. To fulfill the content negotiation we must now indicate to
		// the client that the body does indeed contain a hijinks partial as requested.
		resp.Header().Set("Content-Type", ContentType)
	}
	// Since we are modulating the representation based upon a header value, it is
	// necessary to inform the caches. See https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html#sec13.6
	resp.Header().Set("Vary", "Accept")

	if err := t.ExecuteTemplate(w, filepath.Base(templates[0]), hw.data); err != nil {
		log.Fatal(err)
	}
	return true
}

// implements hijinks.go:ResponseData interface
type responseData struct {
	http.ResponseWriter
	handler     Handler
	handlerMap  map[Block]Handler
	data        interface{}
	dataCalled  bool
	partial     bool
	wroteHeader bool
}

func (dw *responseData) Write(b []byte) (int, error) {
	dw.wroteHeader = true
	return dw.ResponseWriter.Write(b)
}

func (dw *responseData) WriteHeader(code int) {
	dw.wroteHeader = true
	dw.ResponseWriter.WriteHeader(code)
}

func (dw *responseData) Data(d interface{}) {
	dw.data = d
	dw.dataCalled = true
}

func (dw *responseData) Delegate(name string, r *http.Request) (interface{}, bool) {
	if dw.wroteHeader {
		// response has already been written, nothing to do
		return nil, false
	}

	block, ok := dw.handler.GetBlocks()[name]
	if !ok {
		// TODO: Add better error logging/handling and make sure this wont cause issues elsewhere!!!
		http.Error(dw, fmt.Sprintf("Unable to delegate to a handler that has not been defined '%s'", name), 500)
		return nil, false
	}

	handler, ok := dw.handlerMap[block]
	if !ok {
		// TODO: Add better error logging/handling and make sure this wont cause issues elsewhere!!!
		http.Error(
			dw,
			fmt.Sprintf("No handler was matched to block '%s', but delegate WAS called....", name),
			500,
		)
		return nil, false
	}

	dw2 := responseData{
		ResponseWriter: dw.ResponseWriter,
		handler: handler,
		handlerMap: dw.handlerMap,
	}

	f := handler.Func()
	f(&dw2, r)

	if dw2.wroteHeader {
		dw.wroteHeader = true
		return nil, false
	}

	if dw2.dataCalled {
		return dw2.data, true
	} else {
		return nil, false
	}
}
