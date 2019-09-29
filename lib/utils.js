exports.getSelect = function getSelect (select) {
  if (Array.isArray(select)) {
    const result = { _id: 0 };

    select.forEach(name => (result[name] = 1));

    return result;
  }

  return select;
};

exports.nfcall = function nfcall (ctx, method) {
  const args = Array.prototype.slice.call(arguments, 2);

  return new Promise((resolve, reject) => {
    args.push(function (error, data) {
      if (error) {
        return reject(error);
      }

      resolve(data);
    });

    ctx[method].apply(ctx, args);
  });
};
