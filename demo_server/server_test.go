package demo_server

import (
	"io/ioutil"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"os"
	"testing"
)

// server integration tests
func TestServer(t *testing.T) {
	f, err := ioutil.TempFile("/tmp", "hijinks")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(f.Name())

	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	handler := NewRootHandler(wd+"/..", []byte("12345678901234567890123456789012"))

	server := httptest.NewUnstartedServer(handler)
	server.Start()
	defer server.Close()

	*handler.URL = server.URL
	url := server.URL

	client := newClient(t, url)
	read(t, client, url)
}

func newClient(t *testing.T, host string) *http.Client {
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatal(err)
	}
	transport := http.DefaultTransport.(*http.Transport)
	c := &http.Client{Jar: jar, Transport: transport}

	return c
}

func read(t *testing.T, client *http.Client, url string) []byte {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		t.Fatal(err)
	}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	if len(body) == 0 {
		t.Error("empty response")
	}
	return body
}
