import {
  expect
} from 'chai';
import path from 'path';
import assert from 'assert';
import feathers from 'feathers';
import NeDB from 'nedb';
import {
  base,
  example
} from 'feathers-service-tests';
import errors from 'feathers-errors';

import server from './test-app';
import service from '../src';

function createService (name, options) {
  // NeDB ids do not seem to be generated sequentially but sorted lexigraphically
  // if no other sort order is given. This means that items can not be returned in the
  // same order they have been created so this counter is used for sorting instead.
  let counter = 0;

  const filename = path.join('db-data', name);
  const db = new NeDB({
    filename,
    autoload: true
  });

  return service(Object.assign({
    Model: db
  }, options)).extend({
    _find (params) {
      params.query = params.query || {};
      if (!params.query.$sort) {
        params.query.$sort = {
          counter: 1
        };
      }

      return this._super.apply(this, arguments);
    },

    create (raw, params) {
      const convert = item => Object.assign({}, item, {
        counter: ++counter
      });
      const items = Array.isArray(raw) ? raw.map(convert) : convert(raw);

      return this._super(items, params);
    }
  });
}

describe('NeDB Service', function () {
  const app = feathers()
    .use('/people', createService('people', {
      events: ['testing']
    })).use('/people-customid', createService('people-customid', {
      id: 'customid',
      events: ['testing']
    }));

  describe('Initialization', () => {
    it('throws an error when missing options', () =>
      expect(service.bind(null)).to
      .throw('NeDB options have to be provided')
    );

    it('throws an error when missing a Model', () =>
      expect(service.bind(null, {})).to
      .throw('NeDB datastore `Model` needs to be provided')
    );
  });

  describe('Common functionality', () => {
    it('is CommonJS compatible', () =>
      assert.ok(typeof require('../lib') === 'function')
    );

    base(app, errors, 'people', '_id');
    base(app, errors, 'people-customid', 'customid');
  });

  describe('nedb params', () => {
    it('allows to set params.nedb to upsert', () => {
      return app.service('people').update('testing', {
        name: 'Upsert tester'
      }, {
        nedb: {
          upsert: true
        }
      }).then(person => assert.deepEqual(person, {
        _id: 'testing',
        name: 'Upsert tester'
      }));
    });

    it('$select excludes id field if not explicitly selected (#66)', () => {
      const service = app.service('people');

      return service.create({
        name: 'Modifier',
        age: 222
      }).then(() => {
        service.find({
          query: {
            age: 222,
            $select: [ 'name' ]
          }
        }).then(data => assert.ok(!data[0]._id));
      });
    });

    it('allows NeDB modifiers (#59)', () => {
      const service = app.service('people');

      return service.create({
        name: 'Modifier',
        data: [ 'first' ]
      }).then(person =>
        service.update(person._id, { $push: { data: 'second' } })
      ).then(updated =>
        assert.deepEqual(updated.data, ['first', 'second'])
      );
    });

    it('allows NeDB modifiers in patch (#65)', () => {
      const service = app.service('people');

      return service.create({
        name: 'Modifier',
        data: [ 'first' ]
      }).then(person =>
        service.patch(person._id, { $push: { data: 'second' } })
      ).then(updated =>
        assert.deepEqual(updated.data, ['first', 'second'])
      );
    });
  });
});

describe('NeDB service example test', () => {
  after(done => server.close(() => done()));

  example('_id');
});
