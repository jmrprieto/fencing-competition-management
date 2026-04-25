class AppError extends Error {
  constructor(code, status = 500, details = null) {
    super(code);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

module.exports = AppError;