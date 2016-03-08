# Hijinks

### Fine grained server-side templating

Web applications that are implemented primarily on the server-side can have a hard time incorporating interactive features. When AJAX is employed to drive dynamic interface logic it can lead to a dual HTML and data APIs. Major maintenance and flexibility issues arise when business logic is dispersed like this (and often duplicated). Hijinks is a personal project which aims to allow server-side applications to localize data rendering logic while facilitating interactive components.

### Conventional approach

Hijinks is a set of simple but strict conventions that outline how existing HTTP routing and template rendering libraries can be composed to gain a very specific advantage, loading elements within a web page without requiring either a page reload or embedded client-side logic.

This is achieved using a fairly uncomplicated library to define a hierarchy of request handlers paired with render configuration. The setup is designed to take advantage of the template inheritance features of the Go standard library `(>=1.6)`.