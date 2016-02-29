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

	pages := make(Pages)
	page := Template{
		Name: "test",
		File: pth,
		Handler: func(w ResponseWriter, r *http.Request) {
			w.Data(cons{1, &cons{Data: 2}})
		},
	}
	pages["test"] = page

	r, err := NewNaiveRenderer(func(c Configure) error {
		c.AddPages(pages)
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
	// test rendering a page that has a child template defined
	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	pth := wd + "/assets/"

	pages := Pages{}
	page := Template{
		Name: "test",
		File: pth + "base.templ.html",
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
			Name: "sub",
			File: pth + "sub.templ.html",
			Handler: func(w ResponseWriter, r *http.Request) {
				w.Data(cons{Data: 2})
			},
		}},
	}
	pages["test"] = page

	r, err := NewNaiveRenderer(func(c Configure) error {
		c.AddPages(pages)
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

func TestNaiveRendererExtendedPages(t *testing.T) {
	// test rendering a page that extends another
	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	pth := wd + "/assets/"

	pages := Pages{}
	pages["base"] = Template{
		Name: "base",
		File: pth + "base.templ.html",
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
			Name: "content",
		}},
	}
	pages["sub"] = Template{
		Extends: "base > content",
		Name:    "sub",
		File:    pth + "sub.templ.html",
		Handler: func(w ResponseWriter, r *http.Request) {
			w.Data(cons{Data: 2})
		},
	}

	r, err := NewNaiveRenderer(func(c Configure) error {
		c.AddPages(pages)
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
	r.Handler("sub")(w, req)

	if len(w.Body.String()) == 0 {
		t.Fatal("Response has no body!")
	}

	expected := "<!DOCTYPE html>"
	if !strings.Contains(w.Body.String(), expected) {
		t.Fatalf(
			"Body does not contain expected: '%s', Got: '%s'",
			expected,
			w.Body.String(),
		)
	}
}
