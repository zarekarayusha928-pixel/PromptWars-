// Input sanitization middleware to prevent XSS in text inputs (e.g. notes, bio, questions)

function sanitizeValue(value) {
  if (typeof value === 'string') {
    // Strip HTML script tags and dangerous event handlers
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const sanitizedObj = {};
    for (const [k, v] of Object.entries(value)) {
      sanitizedObj[k] = sanitizeValue(v);
    }
    return sanitizedObj;
  }
  return value;
}

export function sanitizeInputs(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
}
