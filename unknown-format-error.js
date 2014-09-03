'use strict';

//====================================================================

// Error cannot be derived like others.
// https://github.com/petkaantonov/bluebird/blob/master/API.md#catchfunction-errorclassfunction-predicate-function-handler---promise
function UnknownFormatError(message) {
  this.message = message;
  this.name = 'UnknownFormatError';
  Error.captureStackTrace(this, UnknownFormatError);
}
UnknownFormatError.prototype = Object.create(Error.prototype);
UnknownFormatError.prototype.constructor = UnknownFormatError;

//====================================================================

exports = module.exports = UnknownFormatError;
