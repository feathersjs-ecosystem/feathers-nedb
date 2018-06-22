const crypto = require('crypto');
const omit = require('lodash.omit');
const Proto = require('uberproto');
const errors = require('@feathersjs/errors');
const { select, filterQuery } = require('@feathersjs/commons');

const { nfcall, getSelect, multiOptions } = require('./utils');

// Create the service.
class Service {
  constructor (options) {
    if (!options) {
      throw new Error('NeDB options have to be provided');
    }

    if (!options.Model) {
      throw new Error('NeDB datastore `Model` needs to be provided');
    }

    this.Model = options.Model;
    this.events = options.events || [];
    this.id = options.id || '_id';
    this.paginate = options.paginate || {};
  }

  extend (obj) {
    return Proto.extend(obj, this);
  }

  getModel (params) {
    return this.Model;
  }

  _find (params, count, getFilter = filterQuery) {
    // Start with finding all, and limit when necessary.
    let { filters, query } = getFilter(params.query || {});

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

    let runQuery = total => {
      return nfcall(q, 'exec').then(data => {
        return {
          total,
          limit: filters.$limit,
          skip: filters.$skip || 0,
          data
        };
      });
    };

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

    if (count) {
      return nfcall(this.getModel(params), 'count', query).then(runQuery);
    }

    return runQuery();
  }

  find (params) {
    const paginate = (params && typeof params.paginate !== 'undefined') ? params.paginate : this.paginate;
    const result = this._find(params, !!paginate.default,
      query => filterQuery(query, paginate));

    if (!paginate.default) {
      return result.then(page => page.data);
    }

    return result;
  }

  _get (id, params) {
    return nfcall(this.getModel(params), 'findOne', { [this.id]: id })
      .then(doc => {
        if (!doc) {
          throw new errors.NotFound(`No record found for id '${id}'`);
        }

        return doc;
      })
      .then(select(params, this.id));
  }

  get (id, params) {
    return this._get(id, params);
  }

  _findOrGet (id, params) {
    if (id === null) {
      return this._find(params).then(page => page.data);
    }

    return this._get(id, params);
  }

  create (raw, params) {
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

  patch (id, data, params) {
    const { query, options } = multiOptions(id, this.id, params);
    const mapIds = page => page.data.map(current => current[this.id]);

    // By default we will just query for the one id. For multi patch
    // we create a list of the ids of all items that will be changed
    // to re-query them after the update
    const ids = id === null ? this._find(params)
      .then(mapIds) : Promise.resolve([ id ]);

    // Run the query
    return ids
      .then(idList => {
        // Create a new query that re-queries all ids that
        // were originally changed
        const findParams = Object.assign({}, params, {
          query: {
            [this.id]: { $in: idList }
          }
        });
        const updateData = { $set: {} };

        Object.keys(data).forEach(key => {
          if (key.indexOf('$') === 0) {
            updateData[key] = data[key];
          } else if (key !== '_id' && key !== this.id) {
            updateData.$set[key] = data[key];
          }
        });

        return nfcall(this.getModel(params), 'update', query, updateData, options)
          .then(() => this._findOrGet(id, findParams));
      })
      .then(select(params, this.id));
  }

  update (id, data, params) {
    if (Array.isArray(data) || id === null) {
      return Promise.reject(new errors.BadRequest('Not replacing multiple records. Did you mean `patch`?'));
    }

    const { query, options } = multiOptions(id, this.id, params);
    const entry = omit(data, '_id');

    if (this.id !== '_id' || (params.nedb && params.nedb.upsert)) {
      entry[this.id] = id;
    }

    return nfcall(this.getModel(params), 'update', query, entry, options)
      .then(() => this._findOrGet(id))
      .then(select(params, this.id));
  }

  remove (id, params) {
    const { query, options } = multiOptions(id, this.id, params);

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
