package hijinks

import (
	"log"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNaiveRenderer_NilCase(t *testing.T) {
	r, err := NewNaiveRenderer()
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
}
