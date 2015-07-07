var chai = require('chai'),
  expect = chai.expect,
  feathers = require('feathers'),
  async = require('async'),
  nedbService = require('../lib/feathers-nedb');


var app = feathers()
  .configure(feathers.errors())
  .use('people', nedbService('people'));
var people = app.service('people');

var _ids = {};

// Empty the datastore. Find all, loop, and delete each record.
function clean(done) {
  people.find({}, function(error, data) {

    var removeRecord = function(record, cb){
      people.remove(record._id, function() {
        cb();
      });
    };

    async.each(data, removeRecord, function(){
      done();
    });
  });
}

describe('NeDB Service', function() {

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
    people.remove(_ids.Doug, function() {
      done();
    });
  });

  describe('get', function() {
    it('should return an instance that exists', function(done) {
      people.get(_ids.Doug, function(error, data) {
        expect(error).to.be.null;
        expect(data._id.toString()).to.equal(_ids.Doug.toString());
        expect(data.name).to.equal('Doug');
        done();
      });
    });

    it('should return an error when no id is provided', function(done) {
      people.get(function(error, data) {
        expect(error).to.be.ok;
        expect(error.name === 'BadRequest').to.be.ok;
        expect(data).to.be.undefined;
        done();
      });
    });

    it('should return NotFound error for non-existing id', function(done) {
      people.get('abc', function(error) {
        expect(error).to.be.ok;
        expect(error.name === 'NotFound').to.be.ok;
        expect(error.message).to.equal('No record found for id abc');
        done();
      });
    });
  });

  describe('remove', function() {
    it('should delete an existing instance and return the deleted instance', function(done) {
      people.remove(_ids.Doug, function(error, data) {
        expect(error).to.be.null;
        expect(data).to.be.ok;
        expect(data.name).to.equal('Doug');
        done();
      });
    });
  });

  describe('find', function() {
    beforeEach(function(done) {
      people.create({
        name: 'Bob',
        age: 25
      }, function(err, bob) {

        _ids.Bob = bob._id;

        people.create({
          name: 'Alice',
          age: 19
        }, function(err, alice) {
          _ids.Alice = alice._id;

          done();
        });
      });
    });

    afterEach(function(done) {
      people.remove(_ids.Bob, function() {
        people.remove(_ids.Alice, function() {
          done();
        });
      });
    });

    it('should return all items', function(done) {
      people.find({}, function(error, data) {
        expect(error).to.be.null;
        expect(data).to.be.instanceof(Array);
        expect(data.length).to.equal(3);
        done();
      });
    });

    it('query filters by parameter', function(done) {
      people.find({ query: { name: 'Alice' } }, function(error, data) {
        expect(error).to.be.null;
        expect(data).to.be.instanceof(Array);
        expect(data.length).to.equal(1);
        expect(data[0].name).to.equal('Alice');
        done();
      });
    });

    it('can $sort', function(done) {
      people.find({
        query: {
          $sort: {'name': 1}
        }
      }, function(error, data) {
        expect(error).to.be.null;
        expect(data.length).to.equal(3);
        expect(data[0].name).to.equal('Alice');
        expect(data[1].name).to.equal('Bob');
        expect(data[2].name).to.equal('Doug');
        done();
      });
    });

    it('can $limit', function(done) {
      people.find({
        query: {
          $sort: {'name': 1},
          $limit: 2
        }
      }, function(error, data) {
        expect(error).to.be.null;
        expect(data.length).to.equal(2);
        expect(data[0].name).to.equal('Alice');
        expect(data[1].name).to.equal('Bob');
        expect(data[2]).to.equal(undefined);
        done();
      });
    });

    it('can $skip', function(done) {
      people.find({
        query: {
          $sort: {'name': 1},
          $skip: 1
        }
      }, function(error, data) {
        expect(error).to.be.null;
        expect(data.length).to.equal(2);
        expect(data[0].name).to.equal('Bob');
        expect(data[1].name).to.equal('Doug');
        expect(data[2]).to.equal(undefined);
        done();
      });
    });

    it('can $select', function(done) {
      people.find({
        query: {
          name: 'Alice',
          $select: {'name': 1}
        }
      }, function(error, data) {
        expect(error).to.be.null;
        expect(data.length).to.equal(1);
        expect(data.age).to.equal(undefined);
        expect(data[0].name).to.equal('Alice');
        done();
      });
    });
  });

  describe('update', function() {
    it('should replace an existing instance', function(done) {
      people.update(_ids.Doug, { name: 'Dougler' }, function(error, data) {
        expect(error).to.be.null;
        expect(data._id.toString()).to.equal(_ids.Doug.toString());
        expect(data.name).to.equal('Dougler');
        expect(data.age).to.be.undefined;
        done();
      });
    });

    it('should throw an error when updating non-existent instances', function(done) {
      people.update('bla', { name: 'NotFound' }, function(error) {
        expect(error).to.be.ok;
        expect(error.name === 'NotFound').to.be.ok;
        expect(error.message).to.equal('No record found for id bla');
        done();
      });
    });
  });

  describe('patch', function() {
    it('should patch an existing instance', function(done) {
      people.patch(_ids.Doug, { name: 'PatchDoug' }, function(error, data) {
        expect(error).to.be.null;
        expect(data._id.toString()).to.equal(_ids.Doug.toString());
        expect(data.name).to.equal('PatchDoug');
        expect(data.age).to.equal(32);
        done();
      });
    });

    it('should throw an error when updating non-existent instances', function(done) {
      people.patch('bla', { name: 'NotFound' }, function(error) {
        expect(error).to.be.ok;
        expect(error.name === 'NotFound').to.be.ok;
        expect(error.message).to.equal('No record found for id bla');
        done();
      });
    });
  });

  describe('create', function() {
    it('should create a single new instance and call back with only one', function(done) {
      people.create({
        name: 'Bill'
      }, function(error, data) {
        expect(error).to.be.null;
        expect(data).to.be.instanceof(Object);
        expect(data).to.not.be.empty;
        expect(data.name).to.equal('Bill');
        done();
      });
    });

    it('should create multiple new instances', function(done) {
      var items = [
        {
          name: 'Gerald'
        },
        {
          name: 'Herald'
        }
      ];

      people.create(items, function(error, data) {
        expect(error).to.be.null;
        expect(data).to.be.instanceof(Array);
        expect(data).to.not.be.empty;
        expect(data[0].name).to.equal('Gerald');
        expect(data[1].name).to.equal('Herald');
        done();
      });
    });
  });
});