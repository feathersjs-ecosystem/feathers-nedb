if(!global._babelPolyfill) { require('babel-polyfill'); }

import Proto from 'uberproto';
import filter from 'feathers-query-filters';
import errors from 'feathers-errors';
import { nfcall, getSelect, multiOptions, mapItems } from './utils';

// Create the service.
class Service {
	constructor(options) {
		if (!options) {
		  throw new Error('NeDB options have to be provided');
		}

		if (!options.Model) {
			throw new Error('NeDB datastore `Model` needs to be provided');
		}

		this.Model = options.Model;
		this.id = '_id';
		this.paginate = options.paginate || {};
	}

	extend(obj) {
		return Proto.extend(obj, this);
	}

	find(params) {
		params.query = params.query || {};

		// Start with finding all, and limit when necessary.
		let query = this.Model.find(params.query);
		let filters = filter(params.query, this.paginate);

		// $select uses a specific find syntax, so it has to come first.
		if (filters.$select) {
			query = this.Model.find(params.query, getSelect(filters.$select));
		}

		// Handle $sort
		if (filters.$sort){
			query.sort(filters.$sort);
		}

		// Handle $limit
		if (filters.$limit){
			query.limit(filters.$limit);
		}

		// Handle $skip
		if (filters.$skip){
			query.skip(filters.$skip);
		}

		if(this.paginate.default && params.paginate !== false) {
			return nfcall(this.Model, 'count', params.query).then(total => {
				return nfcall(query, 'exec').then(data => {
					return {
						total,
						limit: filters.$limit,
						skip: filters.$skip || 0,
						data
					};
				});
			});
		}

		// Execute the query
		return nfcall(query, 'exec');
	}

	get(_id) {
		return nfcall(this.Model, 'findOne', { _id }).then(doc => {
			if(!doc) {
				throw new errors.NotFound(`No record found for id '${_id}'`);
			}

			return doc;
		});
	}

	create(data) {
		return nfcall(this.Model, 'insert', data);
	}

	patch(id, data, params) {
		let { query, options } = multiOptions(id, params);

		// We can not update the id
		delete data[this.id];

		// Run the query
		return nfcall(this.Model, 'update', query, { $set: data }, options)
			.then(() => this.find({ query, paginate: false }).then(mapItems(id)));
	}

	update(id, data, params) {
		if(Array.isArray(data) || id === null) {
      return Promise.reject('Not replacing multiple records. Did you mean `patch`?');
    }

		let { query, options } = multiOptions(id, params);

		// We can not update the id
		delete data[this.id];

		return nfcall(this.Model, 'update', query, data, options)
			.then(() => this.get(id));
	}

	remove(id, params) {
		let { query, options } = multiOptions(id, params);

		return this.find({ query, paginate: false }).then(items =>
			nfcall(this.Model, 'remove', query, options)
				.then(() => mapItems(id)(items)
			)
		);
	}
}

export default function init(options) {
  return new Service(options);
}

init.Service = Service;
