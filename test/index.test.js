/*jshint expr: true*/

import { expect } from 'chai';
import path from 'path';
import fs from 'fs';
import assert from 'assert';
import feathers from 'feathers';
import NeDB from 'nedb';
import { base, example } from 'feathers-service-tests';
import errors from 'feathers-errors';

import server from './test-app';
import service from '../src';

// NeDB ids do not seem to be generated sequentially but sorted lexigraphically
// if no other sort order is given. This means that items can not be returned in the
// same order they have been created so this counter is used for sorting instead.
let counter = 0;

const filename = path.join('db-data', 'people');
const db = new NeDB({ filename, autoload: true });
const nedbService = service({ Model: db }).extend({
  _find(params) {
    params.query = params.query || {};
    if(!params.query.$sort) {
      params.query.$sort = { counter: 1 };
    }

    return this._super.apply(this, arguments);
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

  describe('Initialization', () => {
    describe('when missing options', () => {
      it('throws an error', () => {
        expect(service.bind(null)).to.throw('NeDB options have to be provided');
      });
    });

    describe('when missing a Model', () => {
      it('throws an error', () => {
        expect(service.bind(null, {})).to.throw('NeDB datastore `Model` needs to be provided');
      });
    });

    describe('when missing the id option', () => {
      it('sets the default to be _id', () => {
        expect(people.id).to.equal('_id');
      });
    });

    describe('when missing the paginate option', () => {
      it('sets the default to be {}', () => {
        expect(people.paginate).to.deep.equal({});
      });
    });
  });

  describe('Common functionality', () => {
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
});

describe('NeDB service example test', () => {
  after(done => server.close(() => done()));

  example('_id');
});
