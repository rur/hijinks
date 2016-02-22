package hijinks

import (
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

type cons struct {
	Data int
	Next *cons
}

func TestNaiveRenderer_NilCase(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Fatal("r.Handler should panic since template is not defined")
		}
	}()

	r, err := NewNaiveRenderer()
	if err != nil {
		log.Fatal(err)
	}
	r.Handler("not_defined")
}

func TestNaiveRenderer(t *testing.T) {
	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	pth := wd + "/assets/base.templ.html"

	tmpls := Templates{}
	tmpl := Template{
		Name:     "test",
		Template: pth,
		Handler: func(w ResponseWriter, r *http.Request) {
			w.Data(cons{1, &cons{Data: 2}})
		},
	}
	tmpls["test"] = tmpl

	r, err := NewNaiveRenderer(func(c Configure) error {
		c.AddTemplates(tmpls)
		return nil
	})

	if err != nil {
		log.Fatal(err)
	}

	req, err := http.NewRequest("GET", "http://example.com/foo", nil)
	if err != nil {
		log.Fatal(err)
	}

	w := httptest.NewRecorder()
	r.Handler("test")(w, req)

	if len(w.Body.String()) == 0 {
		t.Fatal("Response has no body!")
	}

	expected := "Cons 1 data = 1"
	if !strings.Contains(w.Body.String(), expected) {
		t.Fatalf(
			"Body does not contain expected: '%s', Got: '%s'",
			expected,
			w.Body.String(),
		)
	}
}

func TestNaiveRendererWithChildren(t *testing.T) {
	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	pth := wd + "/assets/"

	tmpls := Templates{}
	tmpl := Template{
		Name:     "test",
		Template: pth + "base.templ.html",
		Handler: func(w ResponseWriter, r *http.Request) {
			d, loaded := w.Delegate("sub", r)
			if !loaded {
				// no model was loaded, do nothing
				return
			}
			sub, ok := d.(cons)
			if !ok {
				log.Fatalf("Handler delegate did not output a 'cons' type")
			}
			w.Data(cons{1, &sub})
		},
		Children: []Template{Template{
			Name:     "sub",
			Template: pth + "sub.templ.html",
			Handler: func(w ResponseWriter, r *http.Request) {
				w.Data(cons{Data: 2})
			},
		}},
	}
	tmpls["test"] = tmpl

	r, err := NewNaiveRenderer(func(c Configure) error {
		c.AddTemplates(tmpls)
		return nil
	})

	if err != nil {
		log.Fatal(err)
	}

	req, err := http.NewRequest("GET", "http://example.com/foo", nil)
	if err != nil {
		log.Fatal(err)
	}

	w := httptest.NewRecorder()
	r.Handler("test")(w, req)

	if len(w.Body.String()) == 0 {
		t.Fatal("Response has no body!")
	}

	expected := "Test value = 2"
	if !strings.Contains(w.Body.String(), expected) {
		t.Fatalf(
			"Body does not contain expected: '%s', Got: '%s'",
			expected,
			w.Body.String(),
		)
	}
}
