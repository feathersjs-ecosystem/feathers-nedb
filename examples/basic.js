// server.js
var NeDB = require('nedb');
var feathers = require('feathers');
var bodyParser = require('body-parser');
var service = require('../lib');
var db = new NeDB({
  filename: './db-data/todos',
  autoload: true
});

// NeDB ids do not seem to be generated sequentially but sorted lexigraphically
// if no other sort order is given. This means that items can not be returned in the
// same order they have been created so this counter is used for sorting instead.
var counter = 0;

var todoService = service({
  db: db,
  paginate: {
    default: 2,
    max: 4
  }
}).extend({
  find(params) {
    params.query = params.query || {};
    if(!params.query.$sort) {
      params.query.$sort = { counter: 1 };
    }

    return this._super(params);
  },

  create(data, params) {
    data.counter = ++counter;
    return this._super(data, params);
  }
});

// Create a feathers instance.
var app = feathers()
  // Setup the public folder.
  .use(feathers.static(__dirname + '/public'))
  // Enable Socket.io
  .configure(feathers.socketio())
  // Enable REST services
  .configure(feathers.rest())
  // Turn on JSON parser for REST services
  .use(bodyParser.json())
  // Turn on URL-encoded parser for REST services
  .use(bodyParser.urlencoded({extended: true}))
  .use('/todos', todoService);

// A basic error handler, just like Express
app.use(function(error, req, res, next){
  res.json(error);
});

// Start the server
module.exports = app.listen(3030);

console.log('Feathers Todo NeDB service running on 127.0.0.1:3030');
