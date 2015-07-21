feathers-nedb Service
=========================

[![NPM](https://nodei.co/npm/feathers-nedb.png?downloads=true&stars=true)](https://nodei.co/npm/feathers-nedb/)


> Create an [NeDB](https://github.com/louischatriot/nedb) Service for [FeatherJS](https://github.com/feathersjs).

## Installation

```bash
npm install feathers-nedb --save
```

## Getting Started

Creating an NeDB service is this simple:

```
var nedb = require('feathers-nedb');
app.use('todos', new nedb('todos'));
// new nedb('todos', 'path-to-db')
```

This will create a `todos` datastore file in the `db-data` directory and automatically load it.  If you delete that file, the data will be deleted.

Here's an example of a Feathers server with a `todos` nedb-service.

```js
// server.js
var feathers = require('feathers'),
  bodyParser = require('body-parser'),
  nedbService = require('feathers-nedb');

// Create a feathers instance.
var app = feathers()
  // Setup the public folder.
  .use(feathers.static(__dirname + '/public'));
  // Enable Socket.io
  .configure(feathers.socketio())
  // Enable REST services
  .configure(feathers.rest());
  // Turn on JSON parser for REST services
  .use(bodyParser.json())
  // Turn on URL-encoded parser for REST services
  .use(bodyParser.urlencoded({extended: true}))

// Connect to the db, create and register a Feathers service.
app.use('todos', new nedbService('todos'));

// Start the server.
var port = 8080;
app.listen(port, function() {
	console.log('Feathers server listening on port ' + port);
});
```


Now, you can use the todos example from [feathersjs.com](http://feathersjs.com) and place it in the public directory.  Fire up the server and your todos will persist in the database.


### Optimized for Client-side Frameworks

To work better, out of the box, with client-side frameworks, such as [CanJS](www.canjs.com), `feathers-nedb` allows you to use query options such as limit, skip, sort, and select by using `'$limit'`, `'$skip'`, `'$sort'`, and `'$select'` directly in the query object.

Although it probably works well with most client-side frameworks, `feathers-nedb` was built with CanJS in mind.  If you're making a CanJS app, consider using the [canjs-feathers plugin](https://github.com/feathersjs/canjs-feathers).

### Special Query Params
The `find` API allows the use of `$limit`, `$skip`, `$sort`, and `$select` in the query.  These special parameters can be passed directly inside the query object:

```js
// Find all recipes that include salt, limit to 10, only include name field.
{"ingredients":"salt", "$limit":10, "$select":"name:1"} // JSON
GET /?ingredients=salt&%24limit=10&%24select=name%3A1 // HTTP
```

As a result of allowing these to be put directly into the query string, you won't want to use `$limit`, `$skip`, `$sort`, or `$select` as the name of fields in your document schema.

### `$limit`

`$limit` will return only the number of results you specify:

```
// Retrieves the first two records found where age is 37.
query: {
  age: 37,
  $limit: 2
}
```


### `$skip`

`$skip` will skip the specified number of results:

```
// Retrieves all except the first two records found where age is 37.
query: {
  age: 37,
  $skip: 2
}
```


### `$sort`

`$sort` will sort based on the object you provide:

```
// Retrieves all where age is 37, sorted ascending alphabetically by name.
query: {
  age: 37,
  $sort: {'name': 1}
}

// Retrieves all where age is 37, sorted descending alphabetically by name.
query: {
  age: 37,
  $sort: {'name': -1}
}
```


### `$select`
`$select` support in a query allows you to pick which fields to include or exclude in the results.  Note: you can use the include syntax or the exclude syntax, not both together.  See the section on [`Projections`](https://github.com/louischatriot/nedb#projections) in the NeDB docs.
```
// Only retrieve name.
query: {
  name: 'Alice',
  $select: {'name': 1}
}

// Retrieve everything except age.
query: {
  name: 'Alice',
  $select: {'age': 0}
}
```


## API

`feathers-nedb` services comply with the standard [FeathersJS API](http://feathersjs.com/api/#).


## Changelog
### 0.1.0
* Initial release.

## License

[MIT](LICENSE)

## Author

[Marshall Thompson](https://github.com/marshallswain)
