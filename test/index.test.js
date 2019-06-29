const path = require('path');
const assert = require('assert');
const NeDB = require('nedb');
const feathers = require('@feathersjs/feathers');
const errors = require('@feathersjs/errors');
const adapterTests = require('@feathersjs/adapter-tests');

const { Service } = require('../lib');
const testSuite = adapterTests([
  '.options',
  '.events',
  '._get',
  '._find',
  '._create',
  '._update',
  '._patch',
  '._remove',
  '.get',
  '.get + $select',
  '.get + id + query',
  '.get + NotFound',
  '.find',
  '.remove',
  '.remove + $select',
  '.remove + id + query',
  '.remove + multi',
  '.update',
  '.update + $select',
  '.update + id + query',
  '.update + NotFound',
  '.patch',
  '.patch + $select',
  '.patch + id + query',
  '.patch multiple',
  '.patch multi query',
  '.patch + NotFound',
  '.create',
  '.create + $select',
  '.create multi',
  'internal .find',
  'internal .get',
  'internal .create',
  'internal .update',
  'internal .patch',
  'internal .remove',
  '.find + equal',
  '.find + equal multiple',
  '.find + $sort',
  '.find + $sort + string',
  '.find + $limit',
  '.find + $limit 0',
  '.find + $skip',
  '.find + $select',
  '.find + $or',
  '.find + $in',
  '.find + $nin',
  '.find + $lt',
  '.find + $lte',
  '.find + $gt',
  '.find + $gte',
  '.find + $ne',
  '.find + $gt + $lt + $sort',
  '.find + $or nested + $sort',
  '.find + paginate',
  '.find + paginate + $limit + $skip',
  '.find + paginate + $limit 0',
  '.find + paginate + params',
  '.get + id + query id',
  '.remove + id + query id',
  '.update + id + query id',
  '.patch + id + query id'
]);

// NeDB ids do not seem to be generated sequentially but sorted lexigraphically
// if no other sort order is given. This means that items can not be returned in the
// same order they have been created so this counter is used for sorting instead.
class SequentialService extends Service {
  constructor (options) {
    super(options);
    this._counter = 0;
  }

  _find (params) {
    params.query = params.query || {};
    if (!params.query.$sort) {
      params.query.$sort = {
        counter: 1
      };
    }

    return super._find(params);
  }

  create (raw, params) {
    const convert = item => Object.assign({}, item, {
      counter: ++this._counter
    });
    const items = Array.isArray(raw) ? raw.map(convert) : convert(raw);

    return super.create(items, params);
  }
}

const createService = (name, options) => {
  const filename = path.join('db-data', name);
  const db = new NeDB({
    filename,
    autoload: true
  });

  return new SequentialService(Object.assign({
    Model: db,
    events: [ 'testing' ]
  }, options));
};

describe('NeDB Service', () => {
  const app = feathers()
    .use('/people', createService('people', {
      whitelist: [ '$regex' ]
    })).use('/people-customid', createService('people-customid', {
      id: 'customid'
    }));
  const service = app.service('people');

  describe('nedb params', () => {
    it('throws error when model is missing', () => {
      try {
        const s = new Service();
        throw new Error('Should never get here', s);
      } catch (error) {
        assert.strictEqual(error.message, 'NeDB datastore `Model` needs to be provided');
      }
    });

    it('allows to set params.nedb to upsert', async () => {
      const person = await service.update('testing', {
        name: 'Upsert tester'
      }, {
        nedb: {
          upsert: true
        }
      });

      assert.deepStrictEqual(person, {
        _id: 'testing',
        name: 'Upsert tester'
      });

      await service.remove(person._id);
    });

    it('$select excludes id field if not explicitly selected (#66)', async () => {
      const mod = await service.create({
        name: 'Modifier',
        age: 222
      });
      const data = await service.find({
        query: {
          age: 222,
          $select: [ 'name' ]
        }
      });

      assert.ok(!data[0]._id);

      await service.remove(mod._id);
    });

    it('allows NeDB modifiers (#59)', async () => {
      const person = await service.create({
        name: 'Modifier',
        data: [ 'first' ]
      });
      const updated = await service.update(person._id, {
        $push: { data: 'second' }
      });

      assert.deepStrictEqual(updated.data, ['first', 'second']);

      await service.remove(person._id);
    });

    it('allows NeDB modifiers in patch (#65)', async () => {
      const service = app.service('people');

      const person = await service.create({
        name: 'Modifier',
        data: [ 'first' ]
      });
      const updated = await service.patch(person._id, {
        $push: { data: 'second' }
      });

      assert.deepStrictEqual(updated.data, ['first', 'second']);

      await service.remove(person._id);
    });

    it('allows whitelisted parameters in query', async () => {
      const person = await service.create({
        name: 'Param test'
      });

      const data = await service.find({
        query: {
          name: { $regex: /haha/ }
        }
      });

      assert.strictEqual(data.length, 0);

      await service.remove(person._id);
    });

    it('_patch sets default params', async () => {
      const person = await service.create({
        name: 'Param test'
      });

      const patchedPerson = await service._patch(person._id, {
        name: 'Updated'
      });

      assert.strictEqual(patchedPerson.name, 'Updated');

      await service.remove(person._id);
    });
  });

  testSuite(app, errors, 'people', '_id');
  testSuite(app, errors, 'people-customid', 'customid');
});
