const crypto = require('crypto');
const errors = require('@feathersjs/errors');
const { _ } = require('@feathersjs/commons');
const { select, AdapterService } = require('@feathersjs/adapter-commons');

const { nfcall, getSelect } = require('./utils');

// Create the service.
class Service extends AdapterService {
  constructor (options) {
    if (!options || !options.Model) {
      throw new Error('NeDB datastore `Model` needs to be provided');
    }

    super(Object.assign({ id: '_id' }, options));
  }

  getModel (params) {
    return this.options.Model;
  }

  multiOptions (id, params) {
    const { query } = this.filterQuery(params);
    const options = Object.assign({ multi: true }, params.nedb || params.options);

    if (id !== null) {
      options.multi = false;
      query[this.id] = id;
    }

    return { query, options };
  }

  async _find (params = {}) {
    // Start with finding all, and limit when necessary.
    const { filters, query, paginate } = this.filterQuery(params);
    let q = this.getModel(params).find(query);

    // $select uses a specific find syntax, so it has to come first.
    if (filters.$select) {
      q = this.getModel(params).find(query, getSelect(filters.$select));
    }

    // Handle $sort
    if (filters.$sort) {
      q.sort(filters.$sort);
    }

    // Handle $limit
    if (filters.$limit) {
      q.limit(filters.$limit);
    }

    // Handle $skip
    if (filters.$skip) {
      q.skip(filters.$skip);
    }

    let runQuery = total => nfcall(q, 'exec').then(data => {
      return {
        total,
        limit: filters.$limit,
        skip: filters.$skip || 0,
        data: data.map(select(params, this.id))
      };
    });

    if (filters.$limit === 0) {
      runQuery = total => {
        return Promise.resolve({
          total,
          limit: filters.$limit,
          skip: filters.$skip || 0,
          data: []
        });
      };
    }

    if (paginate && paginate.default) {
      return nfcall(this.getModel(params), 'count', query).then(runQuery);
    }

    return runQuery().then(page => page.data);
  }

  async _get (id, params = {}) {
    const { query } = this.filterQuery(params);
    const findOptions = Object.assign({ $and: [{ [this.id]: id }, query] });

    return nfcall(this.getModel(params), 'findOne', findOptions)
      .then(doc => {
        if (!doc) {
          throw new errors.NotFound(`No record found for id '${id}'`);
        }

        return doc;
      })
      .then(select(params, this.id));
  }

  async _findOrGet (id, params = {}) {
    if (id === null) {
      return this._find(_.extend({}, params, {
        paginate: false
      }));
    }

    return this._get(id, params);
  }

  _create (raw, params = {}) {
    const addId = item => {
      if (this.id !== '_id' && item[this.id] === undefined) {
        return Object.assign({
          [this.id]: crypto.randomBytes(8).toString('hex')
        }, item);
      }

      return item;
    };
    const data = Array.isArray(raw) ? raw.map(addId) : addId(raw);

    return nfcall(this.getModel(params), 'insert', data)
      .then(select(params, this.id));
  }

  _patch (id, data, params = {}) {
    const { query, options } = this.multiOptions(id, params);
    const mapIds = data => data.map(current => current[this.id]);

    // By default we will just query for the one id. For multi patch
    // we create a list of the ids of all items that will be changed
    // to re-query them after the update
    const ids = this._findOrGet(id, Object.assign({}, params, {
      paginate: false
    })).then(result => Array.isArray(result) ? result : [result]).then(mapIds);

    // Run the query
    return ids.then(idList => {
      // Create a new query that re-queries all ids that
      // were originally changed
      const findParams = Object.assign({}, params, {
        query: Object.assign({
          [this.id]: { $in: idList }
        }, query)
      });
      const updateData = Object.keys(data).reduce((result, key) => {
        if (key.indexOf('$') === 0) {
          result[key] = data[key];
        } else if (key !== '_id' && key !== this.id) {
          result.$set[key] = data[key];
        }
        return result;
      }, { $set: {} });

      return nfcall(this.getModel(params), 'update', query, updateData, options)
        .then(() => this._findOrGet(id, findParams));
    }).then(select(params, this.id));
  }

  _update (id, data, params = {}) {
    const { query, options } = this.multiOptions(id, params);
    const entry = _.omit(data, '_id');

    if (this.id !== '_id' || (params.nedb && params.nedb.upsert)) {
      entry[this.id] = id;
    }

    return nfcall(this.getModel(params), 'update', query, entry, options)
      .then(() => this._findOrGet(id, params))
      .then(select(params, this.id));
  }

  _remove (id, params = {}) {
    const { query, options } = this.multiOptions(id, params);

    return this._findOrGet(id, params).then(items =>
      nfcall(this.getModel(params), 'remove', query, options)
        .then(() => items)
    ).then(select(params, this.id));
  }
}

module.exports = function init (options) {
  return new Service(options);
};

module.exports.Service = Service;
