// Catches every error thrown in a route. Express 5 forwards errors from
// async handlers here automatically. Express recognises an error handler
// by its four parameters, so `next` must stay even though it's unused.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;

  if (status === 500) {
    console.error(err);
  }

  res.status(status).json({
    message: status === 500 ? 'Something went wrong on our end' : err.message,
  });
}

module.exports = errorHandler;