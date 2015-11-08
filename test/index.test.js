var feathers = require('feathers'),
  nedbService = require('../lib');
var baseTests = require('feathers-service-tests');
var path = require('path');
var fs = require('fs');
var app = feathers()
  .configure(feathers.errors())
  .use('people', nedbService('people'));
var people = app.service('people');
var _ids = {};

describe('NeDB Service', function() {
  var clean = function(done) {
    fs.unlink(path.join('db-data', 'people'), function() {
      done();
    });
  };

  before(clean);
  after(clean);

  beforeEach(function(done) {
    people.create({
      name: 'Doug',
      age: 32
    }, function(error, data) {
      _ids.Doug = data._id;
      done();
    });
  });

  afterEach(function(done) {
    people.remove(_ids.Doug, done);
  });

  baseTests(people, _ids, feathers.errors.types, '_id');
});
