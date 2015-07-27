/**
 * prepareSpecials - query modifier
 * 	Sets up the query properly if $limit, $skip, $sort, or $select is passed in params.
 * 	Those same parameters are then removed from _conditions so that we aren't searching
 * 	for data with a $limit parameter.
 */
module.exports = function(query){

	var specials = {};

	specials.$sort = query.$sort;
	specials.$limit = query.$limit;
	specials.$skip = query.$skip;
	specials.$select = query.$select;

	// Remove the params from the query's _conditions.
	delete query.$sort;
	delete query.$limit;
	delete query.$skip;
	delete query.$select;

	return specials;
};
