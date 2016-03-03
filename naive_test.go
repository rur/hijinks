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
	List []int
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
			w.Data(cons{Data: 1, Next: &cons{Data: 2}})
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
			w.Data(cons{Data: 1, Next: &sub})
		},
		Children: map[string]Template{
			"sub": Template{
				Name: "sub",
				File: pth + "sub.templ.html",
				Handler: func(w ResponseWriter, r *http.Request) {
					w.Data(cons{Data: 2})
				},
			},
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
			d, loaded := w.Delegate("content", r)
			if !loaded {
				// no model was loaded, do nothing
				return
			}
			if sub, ok := d.(cons); ok {
				w.Data(cons{Data: 1, Next: &sub})
			} else {
				log.Fatalf("Handler delegate did not output a 'cons' type")
			}
		},
		Children: map[string]Template{
			"content": Template{
				Name: "content",
			},
		},
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

	expected = "<div>sub_other data = 1</div>"
	if !strings.Contains(w.Body.String(), expected) {
		t.Fatalf(
			"Body does not contain expected: '%s', Got: '%s'",
			expected,
			w.Body.String(),
		)
	}
}

func TestNaiveRendererMultipleExtendedPages(t *testing.T) {
	// test rendering a page that extends another which already extends another!
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
			d, ok := w.Delegate("content", r)
			if !ok {
				// no model was loaded, do nothing
				return
			}
			sub, ok := d.(cons)
			if !ok {
				log.Fatalf("Handler delegate did not output a 'cons' type")
			}
			w.Data(cons{Data: 1, Next: &sub})
		},
		Children: map[string]Template{
			"content": Template{
				Name: "content",
			},
		},
	}
	pages["sub"] = Template{
		Extends: "base > content",
		Name:    "sub",
		File:    pth + "sub.templ.html",
		Handler: func(w ResponseWriter, r *http.Request) {
			d := cons{Data: 2}
			if lst, ok := w.Delegate("content", r); ok {
				d.List = lst.([]int)
			} else {
				d.List = []int{1, 2, 3}
			}
			w.Data(d)
		},
		Children: map[string]Template{
			"content": Template{
				Name: "content",
			},
		},
	}
	pages["sub2"] = Template{
		Extends: "sub > content",
		Name:    "sub",
		File:    pth + "sub_list.templ.html",
		Handler: func(w ResponseWriter, r *http.Request) {
			w.Data([]int{9, 8, 7, 6})
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
	r.Handler("sub2")(w, req)

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

	expected = "<div>sub_other data = 1</div>"
	if !strings.Contains(w.Body.String(), expected) {
		t.Fatalf(
			"Body does not contain expected: '%s', Got: '%s'",
			expected,
			w.Body.String(),
		)
	}

	expected = "<li> <h4>The Key: 0</h4><p>Sub item = 9</p></li>"
	if !strings.Contains(w.Body.String(), expected) {
		t.Fatalf(
			"Body does not contain expected: '%s', Got: '%s'",
			expected,
			w.Body.String(),
		)
	}
}
