// Standardized API response utilities

/**
 * Success response wrapper
 */
const success = (data, message = 'Success') => ({
  success: true,
  message,
  data
});

/**
 * List response with pagination
 */
const list = (data, pagination = {}) => ({
  success: true,
  data,
  pagination
});

/**
 * Error response wrapper
 */
const error = (message, status = 500) => ({
  success: false,
  error: message,
  status
});

module.exports = {
  success,
  list,
  error
};