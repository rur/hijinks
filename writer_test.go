package hijinks

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func TestDataWriter(t *testing.T) {
	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	pth := wd + "/assets/base.templ.html"
	w := hjResponseWriter{
		ResponseWriter: httptest.NewRecorder(),
		template: &Template{
			Name: "test",
			File: pth,
			Handler: func(w ResponseWriter, r *http.Request) {
				w.Data(cons{Data: 1, Next: &cons{Data: 2}})
			},
		},
	}

	w.Data(123)
	if !w.dataCalled {
		t.Fatal("data called flag was not set")
	}
	if _, ok := w.data.(int); !ok {
		t.Fatalf("Data value is not a valid type: %v", w.data)
	}
}

func TestDataDelegateWriter(t *testing.T) {
	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	pth := wd + "/assets/"
	w := hjResponseWriter{
		ResponseWriter: httptest.NewRecorder(),
		template: &Template{
			Name: "test",
			File: pth + "base.templ.html",
			Handler: func(w ResponseWriter, r *http.Request) {
				w.Data(1)
			},
			Children: map[string]Template{
				"sub": Template{
					Name: "sub",
					File: pth + "sub.templ.html",
					Handler: func(w ResponseWriter, r *http.Request) {
						w.Data(2)
					},
					Children: map[string]Template{
						"sub": Template{
							Name: "sub",
							File: pth + "sub_sub.templ.html",
							Handler: func(w ResponseWriter, r *http.Request) {
								w.Data(3)
							},
						},
					},
				},
			},
		},
	}

	req, err := http.NewRequest("GET", "http://example.com/foo", nil)

	if data, ok := w.Delegate("sub", req); !ok || data != 2 {
		t.Fatalf("Delegate did not load the correct data, expected 2 got %v", data)
	}

	if data, ok := w.Delegate("sub > sub", req); !ok || data != 3 {
		t.Fatalf("Delegate did not load the correct data, expected 3 got %v", data)
	}
}
