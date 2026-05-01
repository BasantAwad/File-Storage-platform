const { v4: uuidv4 } = require('uuid');

const success = (data, meta = {}) => ({
  success: true,
  data,
  meta: {
    service: 'upload-session',
    request_id: meta.request_id || uuidv4(),
    ...meta,
  },
});

const error = (code, message, details = {}, meta = {}) => ({
  success: false,
  error: { code, message, details },
  meta: {
    service: 'upload-session',
    request_id: meta.request_id || uuidv4(),
    ...meta,
  },
});

module.exports = { success, error };
