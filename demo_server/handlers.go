package demo_server

import (
	"fmt"
	"github.com/gorilla/mux"
	"github.com/rur/hijinks"
	"net/http"
	"strconv"
)

var (
	items []Item
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

func init() {
	items = []Item{
		{1, "this is item 1"},
		{2, "this is item 2"},
		{3, "this is item 3"},
	}
}

func baseHandler(ctx server, w hijinks.ResponseData, req *http.Request) {
	d := cons{Data: 1}
	if sub, ok := w.Delegate("content", req); ok {
		d.Next = sub.(*cons)
	}
	w.Data(&d)
}

func baseSubHandler(ctx server, w hijinks.ResponseData, req *http.Request) {
	d := cons{Data: 2}
	if d2, ok := w.Delegate("list", req); ok {
		if list, ok := d2.([]Item); ok {
			d.List = list
		}
	}
	w.Data(&d)
}

func listHandler(ctx server, w hijinks.ResponseData, req *http.Request) {
	w.Data(items)
}

func listCreateHandler(ctx server, w http.ResponseWriter, req *http.Request) {
	var next_id int

	if err := req.ParseForm(); err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	value := req.Form.Get("value")
	if value == "" {
		value = "[Empty Message!]"
	}

	for _, i := range items {
		if i.Key > next_id {
			next_id = i.Key
		}
	}
	next_id = next_id + 1

	items = append(items, Item{next_id, value})

	http.Redirect(
		w,
		req,
		fmt.Sprintf("/item/%d", next_id),
		http.StatusSeeOther,
	)
}

func listItemHandler(ctx server, w hijinks.ResponseData, req *http.Request) {
	vars := mux.Vars(req)
	item_id, err := strconv.Atoi(vars["item_id"])

	if err != nil {
		http.Error(w, fmt.Sprintf("couldn't parse item id %s: %s", vars["item_id"], err), 400)
		return
	}

	var item Item
	for _, i := range items {
		if i.Key == item_id {
			item = i
			break
		}
	}

	if item.Key == 0 {
		http.Error(w, fmt.Sprintf("Unable to find item with id '%v'", item_id), 400)
		return
	}

	w.Data(item)
}
