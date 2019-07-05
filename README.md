# feathers-nedb

[![Greenkeeper badge](https://badges.greenkeeper.io/feathersjs-ecosystem/feathers-nedb.svg)](https://greenkeeper.io/)

[![Build Status](https://travis-ci.org/feathersjs-ecosystem/feathers-nedb.png?branch=master)](https://travis-ci.org/feathersjs-ecosystem/feathers-nedb)
[![Dependency Status](https://img.shields.io/david/feathersjs-ecosystem/feathers-nedb.svg?style=flat-square)](https://david-dm.org/feathersjs-ecosystem/feathers-nedb)
[![Download Status](https://img.shields.io/npm/dm/feathers-nedb.svg?style=flat-square)](https://www.npmjs.com/package/feathers-nedb)

[feathers-nedb](https://github.com/feathersjs-ecosystem/feathers-nedb/) is a database service adapter for [NeDB](https://github.com/louischatriot/nedb), an embedded datastore with a [MongoDB](https://www.mongodb.org/) like API. NeDB can store data in-memory or on the filesystem which makes it useful as a persistent storage without a separate database server.

```bash
$ npm install --save nedb feathers-nedb
```

> __Important:__ `feathers-nedb` implements the [Feathers Common database adapter API](https://docs.feathersjs.com/api/databases/common.html) and [querying syntax](https://docs.feathersjs.com/api/databases/querying.html).

## API

### `service(options)`

Returns a new service instance initialized with the given options. `Model` has to be an NeDB database instance.

```js
const NeDB = require('nedb');
const service = require('feathers-nedb');

// Create a NeDB instance
const Model = new NeDB({
  filename: './data/messages.db',
  autoload: true
});

app.use('/messages', service({ Model }));
app.use('/messages', service({ Model, id, events, paginate }));
```

__Options:__

- `Model` (**required**) - The NeDB database instance. See the [NeDB API](https://github.com/louischatriot/nedb#api) for more information.
- `id` (*optional*, default: `'_id'`) - The name of the id field property. By design, NeDB will always add an `_id` property.
- `events` (*optional*) - A list of [custom service events](https://docs.feathersjs.com/api/events.html#custom-events) sent by this service
- `paginate` (*optional*) - A [pagination object](https://docs.feathersjs.com/api/databases/common.html#pagination) containing a `default` and `max` page size
- `whitelist` (*optional*) - A list of additional query parameters to allow (e.g. `[ '$regex' ]`)
- `multi` (*optional*) - Allow `create` with arrays and `update` and `remove` with `id` null to change multiple items. Can be `true` for all methods or an array of multi methods (e.g. `[ 'remove', 'create' ]`)

### params.nedb

When making a [service method](https://docs.feathersjs.com/api/services.html) call, `params` can contain an `nedb` property which allows to pass additional [NeDB options](https://github.com/louischatriot/nedb#updating-documents), for example to allow `upsert`:

```js
app.service('messages').update('someid', {
  text: 'This message will be either created or updated'
}, {
  nedb: { upsert: true }
});
```

### use of params on client
On client you can't pass anything other than a query as the parameter. So you need to do it like this.

```js
// client side
app.service('messages').update('someid', {
  text: 'This message will be either created or updated'
}, {
  query: {nedb: { upsert: true }}
});
```
then add a hook to the service to move the nedb options to the params object
```js
ctx => {
  const nedb = ctx.params.query.nedb;
  if (nedb) {
    ctx.params.nedb = nedb;
    delete ctx.params.query.nedb;
  }
  return ctx;
}
```

## Example

Here is an example of a Feathers server with a `messages` NeDB service that supports pagination and persists to `db-data/messages`:

```
$ npm install @feathersjs/feathers @feathersjs/errors @feathersjs/express @feathersjs/socketio feathers-nedb nedb
```

In `app.js`:

```js
const feathers = require('@feathersjs/feathers');
const express = require('@feathersjs/express');
const socketio = require('@feathersjs/socketio');

const NeDB = require('nedb');
const service = require('feathers-nedb');

const db = new NeDB({
  filename: './db-data/messages',
  autoload: true
});

// Create an Express compatible Feathers application instance.
const app = express(feathers());
// Turn on JSON parser for REST services
app.use(express.json());
// Turn on URL-encoded parser for REST services
app.use(express.urlencoded({extended: true}));
// Enable REST services
app.configure(express.rest());
// Enable Socket.io services
app.configure(socketio());
// Connect to the db, create and register a Feathers service.
app.use('/messages', service({
  Model: db,
  paginate: {
    default: 2,
    max: 4
  }
}));
// Set up default error handler
app.use(express.errorHandler());

// Create a dummy Message
app.service('messages').create({
  text: 'Message created on server'
}).then(message => console.log('Created message', message));

// Start the server.
const port = 3030;

app.listen(port, () => {
  console.log(`Feathers server listening on port ${port}`);
});
```

Run the example with `node app` and go to [localhost:3030/messages](http://localhost:3030/messages).

## License

Copyright (c) 2019

Licensed under the [MIT license](LICENSE).
