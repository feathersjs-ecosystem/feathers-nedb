feathers-nedb
================

[![Build Status](https://travis-ci.org/feathersjs/feathers-nedb.png?branch=master)](https://travis-ci.org/feathersjs/feathers-nedb)
[![Code Climate](https://codeclimate.com/github/feathersjs/feathers-nedb.png)](https://codeclimate.com/github/feathersjs/feathers-nedb)

> Create an [NeDB](https://github.com/louischatriot/nedb) Service for [FeatherJS](https://github.com/feathersjs).


## Installation

```bash
npm install nedb feathers-nedb --save
```


## Documentation

Please refer to the [Feathers database adapter documentation](http://docs.feathersjs.com/databases/readme.html) for more details or directly at:

- [NeDB](http://docs.feathersjs.com/databases/nedb.html) - The detailed documentation for this adapter
- [Extending](http://docs.feathersjs.com/databases/extending.html) - How to extend a database adapter
- [Pagination and Sorting](http://docs.feathersjs.com/databases/pagination.html) - How to use pagination and sorting for the database adapter
- [Querying](http://docs.feathersjs.com/databases/querying.html) - The common adapter querying mechanism


## Complete Example

Here's an example of a Feathers server with a `todos` nedb-service.

```js
import NeDB from 'nedb';
import feathers from 'feathers';
import bodyParser from 'body-parser';
import service from '../lib';

const db = new NeDB({
  filename: './db-data/todos',
  autoload: true
});

// Create a feathers instance.
var app = feathers()
  // Enable REST services
  .configure(rest())
  // Turn on JSON parser for REST services
  .use(bodyParser.json())
  // Turn on URL-encoded parser for REST services
  .use(bodyParser.urlencoded({extended: true}));

// Connect to the db, create and register a Feathers service.
app.use('todos', service({
  Model: db,
  paginate: {
    default: 2,
    max: 4
  }
}));

// Start the server.
var port = 3030;
app.listen(port, function() {
  console.log(`Feathers server listening on port ${port}`);
});
```

You can run this example by using `node examples/app` and going to [localhost:3030/todos](http://localhost:3030/todos). You should see an empty array. That's because you don't have any Todos yet but you now have full CRUD for your new todos service.

## Changelog

__2.0.0__

- Remove NeDB dependency
- Migration to ES6 and latest service test suite
- Changing the way that NeDB services are initialized to be compliant with Feathers 2.0.

__1.2.0__

- Migration to shared service test suite ([#4](https://github.com/feathersjs/feathers-nedb/pull/4))

__1.0.0__

- First final release

__0.1.1__

- Minor license and documentation updates

__0.1.0__

- Initial release.


## License

Copyright (c) 2015

Licensed under the [MIT license](LICENSE).


## Author

[Marshall Thompson](https://github.com/marshallswain)
