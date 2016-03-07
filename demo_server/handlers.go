package demo_server

import (
	"github.com/rur/hijinks"
	"net/http"
)

type Cons struct {
	Data int
	List []int
	Next *Cons
}

func baseHandler(ctx server, w hijinks.ResponseWriter, req *http.Request) {
	d := Cons{Data: 1}
	if sub, ok := w.Delegate("sub", req); ok {
		d.Next = sub.(*Cons)
	}
	w.Data(&d)
}

func baseSubHandler(ctx server, w hijinks.ResponseWriter, req *http.Request) {
	d := Cons{Data: 2}
	if d2, ok := w.Delegate("list", req); ok {
		if list, ok := d2.([]int); ok {
			d.List = list
		}
	}
	w.Data(&d)
}

func listHandler(ctx server, w hijinks.ResponseWriter, req *http.Request) {
	w.Data([]int{1, 2, 3})
}
