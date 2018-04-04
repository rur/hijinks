package hijinks

import (
	"net/http"
)

func NewHandler(template string, handlerFunc HandlerFunc) Handler {
	rootBlock := blockInternal{name: "root"}
	handler := handlerInternal{
		template: template,
		handlerFunc:     handlerFunc,
		extends:  &rootBlock,
		includes: make(map[Block]Handler),
		blocks: make(map[string]Block),
	}
	rootBlock.defaultHandler = &handler
	return &handler
}

type handlerInternal struct {
	template    string
	handlerFunc HandlerFunc
	// private:
	blocks   map[string]Block
	includes map[Block]Handler
	extends  Block
}

func (h *handlerInternal) Func() HandlerFunc {
	return h.handlerFunc
}
func (h *handlerInternal) Template() string {
	return h.template
}
func (h *handlerInternal) Extends() Block {
	return h.extends
}
func (h *handlerInternal) DefineBlock(name string) Block {
	block := blockInternal{
		name:      name,
		container: h,
	}
	h.blocks[name] = &block
	return &block
}
func (h *handlerInternal) GetBlocks() map[string]Block {
	return h.blocks
}
func (h *handlerInternal) Includes(includes ...Handler) Handler {
	newHandler := handlerInternal{
		template: h.template,
		handlerFunc:     h.handlerFunc,
		extends:  h.extends,
		includes: make(map[Block]Handler),
		blocks: make(map[string]Block),
	}
	for block, handler := range h.includes {
		newHandler.includes[block] = handler
	}
	for name, block := range h.blocks {
		newHandler.blocks[name] = block
	}
	for _, handler := range includes {
		newHandler.includes[handler.Extends()] = handler
	}
	return &newHandler
}
func (h *handlerInternal) GetIncludes() map[Block]Handler {
	return h.includes
}

// Allow the use of hijinks Hander as a HTTP handler
func (h *handlerInternal) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	isHj := r.Header.Get("Accept") == ContentType

	root := h.extends
	if !isHj {
		// full page load, execute from the base handler up
		for root.Container() != nil {
			root = root.Container().Extends()
		}
	}

	blockMap, templates := resolveTemplatesForHandler(root, h)
	if success := executeTemplate(isHj, templates, root, blockMap, w, r); !success {
		return
	}

	if isHj {
		for block, handler := range h.GetIncludes() {
			if _, found := blockMap[block]; !found {
				partialBlockMap, partialTempl := resolveTemplatesForHandler(block, handler)
				if success := executeTemplate(isHj, partialTempl, block, partialBlockMap, w, r); !success {
					return
				}
			}
		}
	}
}
