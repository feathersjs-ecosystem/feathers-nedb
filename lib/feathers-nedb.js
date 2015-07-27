// Functions for modifying data / params
var Proto = require('uberproto');
var prepareSpecials = require('./filters/prepare-specials');
var Datastore = require('nedb');
var errors = require('feathers-errors').types;


// Create the service.
var NedbService = Proto.extend({
	init: function(name, options){
		options = options || {};
		
		var path = options.path || 'db-data/';

		if (!name){
			throw new SyntaxError('Please pass a String as the name of the collection.');
		}

		// Make sure there's a trailing slash.
		if (path[path.length - 1] !== '/') {
			path = path + '/';
		}

		this.filename = path + name;
		this.type = 'nedb';
		this.db = new Datastore({ filename: this.filename, autoload: true });

		// Compact the data file every 5 seconds.
		this.db.persistence.setAutocompactionInterval(5000);
	},

	find: function(params, callback) {

		// Start with finding all, and limit when necessary.
		var query = this.db.find({});

		// Prepare the special query params.
		if (params.query) {
			var specials = prepareSpecials(params.query);

			// $select uses a specific find syntax, so it has to come first.
			if (specials.$select) {
				query = this.db.find(params.query, specials.$select);
			} else {
				query = this.db.find(params.query);
			}

			// Handle $sort
			if (specials.$sort){
				query.sort(specials.$sort);
			}

			// Handle $limit
			if (specials.$limit){
				query.limit(specials.$limit);
			}

			// Handle $skip
			if (specials.$skip){
				query.skip(specials.$skip);
			}
		}

		// Execute the query
		query.exec(function(err, docs) {
			if (err) {
				return callback(err);
			}
			return callback(err, docs);
		});
	},

	// TODO: Maybe make it an option to findOne by another attribute.
	get: function(id, params, callback) {
		if (typeof id === 'function') {
			return callback(new errors.BadRequest('An id is required for GET operations'));
		}

		this.db.findOne({_id: id}, function(err, doc) {

			if (err) {
				return callback(err);
			}

			if(!doc) {
        return callback(new errors.NotFound('No record found for id ' + id));
      }

			return callback(err, doc);
		});
	},

	create: function(data, params, callback) {
		this.db.insert(data, function (err, doc) {
		  if (err) {
		  	return callback(err);
		  }
			return callback(null, doc);
		});
	},

	patch: function(id, data, params, callback) {
		var self = this;

		// Remove id and/or _id.
		delete data.id;
		delete data._id;

		// Run the query
		this.db.update({'_id':id}, {$set:data}, {}, function(err, count) {

			if (err) {
				return callback(err);
			}

			if (!count) {
	      return callback(new errors.NotFound('No record found for id ' + id));
			}

			self.db.findOne({_id: id}, function(err, doc) {
				if (err) {
					return callback(err);
				}
				// Send response.
				callback(err, doc);
			});
		});
	},

	update: function(id, data, params, callback) {
		var self = this;

		// Remove id and/or _id.
		delete data.id;
		delete data._id;

		// Run the query
		this.db.update({'_id':id}, data, {}, function(err, count) {
			if (err) {
				return callback(err);
			}

			if (!count) {
	      return callback(new errors.NotFound('No record found for id ' + id));
			}

			self.db.findOne({_id: id}, function(err, doc) {
				if (err) {
					return callback(err);
				}
				// Send response.
				callback(err, doc);
			});
		});
	},

	remove: function(id, params, callback) {
		var self = this;

		this.db.findOne({_id: id}, function(err, doc) {
			self.db.remove({_id: id}, function(err) {
				if (err) {
					return callback(err);
				}
				// Send response.
				return callback(err, doc);
			});
		});

	},

	setup: function(app) {
		this.app = app;
		this.service = app.service.bind(app);
	}
});

module.exports = function(name, path) {
  return Proto.create.call(NedbService, name, path);
};

module.exports.Service = NedbService;
