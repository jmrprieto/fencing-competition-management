const AppError = require('../utils/appError');

function getBoundary(contentType) {
  const match = /boundary=(.*)$/i.exec(contentType);
  if (!match) return null;
  return match[1].trim();
}

function parseMultipartFormData(rawBuffer, contentType) {
  const boundary = getBoundary(contentType);
  if (!boundary) {
    throw new AppError('INVALID_MULTIPART_PAYLOAD', 400);
  }

  const body = rawBuffer.toString('latin1');
  const parts = body.split(`--${boundary}`);
  const result = {
    files: [],
    fields: {}
  };

  for (let part of parts) {
    part = part.trim();
    if (!part || part === '--') continue;

    const [headerSection, ...bodyParts] = part.split('\r\n\r\n');
    if (!headerSection || bodyParts.length === 0) continue;

    const rawHeaders = headerSection.split('\r\n');
    const headers = rawHeaders.reduce((acc, line) => {
      const [name, value] = line.split(':');
      if (!name || !value) return acc;
      acc[name.trim().toLowerCase()] = value.trim();
      return acc;
    }, {});

    const contentDisposition = headers['content-disposition'];
    if (!contentDisposition) continue;

    const nameMatch = /name="([^\"]+)"/.exec(contentDisposition);
    const filenameMatch = /filename="([^\"]*)"/.exec(contentDisposition);
    const fieldName = nameMatch ? nameMatch[1] : null;
    const filename = filenameMatch ? filenameMatch[1] : null;

    const content = bodyParts.join('\r\n\r\n');
    const cleanedContent = content.replace(/\r\n$/, '');

    if (filename) {
      result.files.push({
        fieldname: fieldName,
        originalname: filename,
        encoding: '7bit',
        mimetype: headers['content-type'] || 'application/octet-stream',
        buffer: Buffer.from(cleanedContent, 'latin1')
      });
    } else if (fieldName) {
      result.fields[fieldName] = cleanedContent;
    }
  }

  return result;
}

function multipartHandler(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.startsWith('multipart/form-data')) {
    return next();
  }

  if (!Buffer.isBuffer(req.body)) {
    return next(new AppError('INVALID_MULTIPART_PAYLOAD', 400));
  }

  try {
    const parsed = parseMultipartFormData(req.body, contentType);
    if (parsed.files.length > 0) {
      req.file = parsed.files[0];
    }
    req.body = {
      ...parsed.fields
    };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = multipartHandler;
