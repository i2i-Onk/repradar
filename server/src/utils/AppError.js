// An error that carries an HTTP status code. Services throw these,
// and the error handler turns them into responses.
class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = AppError;