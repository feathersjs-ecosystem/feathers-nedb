const NeDB = require('nedb');
const feathers = require('feathers');
const rest = require('feathers-rest');
const socketio = require('feathers-socketio');
const bodyParser = require('body-parser');
const errors = require('feathers-errors');
const service = require('../lib');

const db = new NeDB({
  filename: './db-data/messages',
  autoload: true
});

// Create a feathers instance.
var app = feathers()
  // Enable REST services
  .configure(rest())
  // Enable Socket.io services
  .configure(socketio())
  // Turn on JSON parser for REST services
  .use(bodyParser.json())
  // Turn on URL-encoded parser for REST services
  .use(bodyParser.urlencoded({extended: true}));

// Connect to the db, create and register a Feathers service.
app.use('/messages', service({
  Model: db,
  paginate: {
    default: 2,
    max: 4
  }
}));

// Create a dummy Message
app.service('messages').create({
  text: 'Oh hai!'
}).then(function (message) {
  console.log('Created message', message);
});

app.use(errors.handler());

// Start the server.
const port = 3030;

app.listen(port, function () {
  console.log(`Feathers server listening on port ${port}`);
});
