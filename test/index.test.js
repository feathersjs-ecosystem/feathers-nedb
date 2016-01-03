import path from 'path';
import fs from 'fs';
import assert from 'assert';
import feathers from 'feathers';
import NeDB from 'nedb';
import { base, example } from 'feathers-service-tests';
import errors from 'feathers-errors';

import server from '../examples/basic';
import service from '../src';

// NeDB ids do not seem to be generated sequentially but sorted lexigraphically
// if no other sort order is given. This means that items can not be returned in the
// same order they have been created so this counter is used for sorting instead.
let counter = 0;

const filename = path.join('db-data', 'people');
const db = new NeDB({ filename, autoload: true });
const nedbService = service({ db }).extend({
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
const app = feathers().use('/people', nedbService);
const people = app.service('people');

let _ids = {};

describe('NeDB Service', function() {
  var clean = done => fs.unlink(filename, () => done());

  before(clean);
  after(clean);

  beforeEach(function(done) {
    db.insert({
      name: 'Doug',
      age: 32
    }, function(error, data) {
      if(error) {
        return done(error);
      }

      _ids.Doug = data._id;
      done();
    });
  });

  afterEach(done => db.remove({ _id: _ids.Doug }, () => done()));

  it('is CommonJS compatible', () => {
    assert.ok(typeof require('../lib') === 'function');
  });

  base(people, _ids, errors, '_id');
});

describe('NeDB service example test', () => {
  after(done => server.close(() => done()));

  example('_id');
});
