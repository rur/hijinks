# Hijinks

### Fine grained server-side templating

Server-side web applications have a hard time implementing dynamic interface features. Where interactivity is required AJAX is often employed to drive interface code. This is heavy handed in many situations and can lead to difficult maintenance and flexibility issues over time. Hijinks is a personal project which aims to allow server-side applications to localize data rendering while facilitating interactivity.

### Conventional approach

Hijinks is a set of conventions for composing HTTP routing and template rendering libraries to gain a very specific advantage, the ability to load elements within a web page without requiring either a page reload or embedded client-side logic.

This is achieved by defining a hierarchy of request handlers paired with render configuration. This setup takes advantage of the template inheritance features of the Go standard library `(>=1.6)`.


	TODO: Add more docs as things are flesh out

