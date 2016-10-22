import omit from 'lodash.omit';
import Proto from 'uberproto';
import filter from 'feathers-query-filters';
import errors from 'feathers-errors';
import crypto from 'crypto';
import { nfcall, getSelect, multiOptions } from './utils';

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

  _find (params, count, getFilter = filter) {
    // Start with finding all, and limit when necessary.
    let { filters, query } = getFilter(params.query || {});

    let q = this.Model.find(query);

    // $select uses a specific find syntax, so it has to come first.
    if (filters.$select) {
      q = this.Model.find(query, getSelect(filters.$select));
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

    const runQuery = total => {
      return nfcall(q, 'exec').then(data => {
        return {
          total,
          limit: filters.$limit,
          skip: filters.$skip || 0,
          data
        };
      });
    };

    if (count) {
      return nfcall(this.Model, 'count', query).then(runQuery);
    }

    return runQuery();
  }

  find (params) {
    const paginate = (params && typeof params.paginate !== 'undefined') ? params.paginate : this.paginate;
    const result = this._find(params, !!paginate.default,
      query => filter(query, paginate));

    if (!paginate.default) {
      return result.then(page => page.data);
    }

    return result;
  }

  _get (id) {
    return nfcall(this.Model, 'findOne', { [this.id]: id }).then(doc => {
      if (!doc) {
        throw new errors.NotFound(`No record found for id '${id}'`);
      }

      return doc;
    });
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

  create (raw) {
    const addId = item => {
      if (this.id !== '_id' && item[this.id] === undefined) {
        return Object.assign({
          [this.id]: crypto.randomBytes(8).toString('hex')
        }, item);
      }

      return item;
    };
    const data = Array.isArray(raw) ? raw.map(addId) : addId(raw);

    return nfcall(this.Model, 'insert', data);
  }

  patch (id, data, params) {
    const { query, options } = multiOptions(id, this.id, params);
    const patchQuery = {};

    // Account for potentially modified data
    Object.keys(query).forEach(key => {
      if (query[key] !== undefined && data[key] !== undefined &&
          typeof data[key] !== 'object') {
        patchQuery[key] = data[key];
      } else {
        patchQuery[key] = query[key];
      }
    });

    const patchParams = Object.assign({}, params, {
      query: patchQuery
    });

    // Run the query
    return nfcall(this.Model, 'update', query, {
      $set: omit(data, this.id, '_id')
    }, options).then(() => this._findOrGet(id, patchParams));
  }

  update (id, data, params) {
    if (Array.isArray(data) || id === null) {
      return Promise.reject('Not replacing multiple records. Did you mean `patch`?');
    }

    const { query, options } = multiOptions(id, this.id, params);
    const entry = omit(data, '_id');

    if (this.id !== '_id') {
      entry[this.id] = id;
    }

    return nfcall(this.Model, 'update', query, entry, options)
      .then(() => this._findOrGet(id));
  }

  remove (id, params) {
    let { query, options } = multiOptions(id, this.id, params);

    return this._findOrGet(id, params).then(items =>
      nfcall(this.Model, 'remove', query, options)
        .then(() => items)
    );
  }
}

export default function init (options) {
  return new Service(options);
}

init.Service = Service;
