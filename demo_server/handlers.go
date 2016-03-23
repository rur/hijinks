package demo_server

import (
	"github.com/rur/hijinks"
	"net/http"
)

type Item struct {
	Key   int
	Value string
}

type cons struct {
	Data int
	List []Item
	Next *cons
}

func baseHandler(ctx server, w hijinks.ResponseWriter, req *http.Request) {
	d := cons{Data: 1}
	if sub, ok := w.Delegate("content", req); ok {
		d.Next = sub.(*cons)
	}
	w.Data(&d)
}

func baseSubHandler(ctx server, w hijinks.ResponseWriter, req *http.Request) {
	d := cons{Data: 2}
	if d2, ok := w.Delegate("list", req); ok {
		if list, ok := d2.([]Item); ok {
			d.List = list
		}
	}
	w.Data(&d)
}

func listHandler(ctx server, w hijinks.ResponseWriter, req *http.Request) {
	w.Data([]Item{
		{1, "this is item 1"},
		{2, "this is item 2"},
		{3, "this is item 3"},
	})
}
