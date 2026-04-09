/**
 * Deletes a Cloudinary asset by public_id (Admin API). Only allows paths under gallery/*.
 * Env: CLOUDINARY_CLOUD_NAME (or VITE_CLOUDINARY_CLOUD_NAME), CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

const ALLOWED_PREFIXES = [
  'gallery/pattimandram',
  'gallery/motivational-speech',
  'gallery/memory-lane',
  'gallery/abroad-events',
  'gallery/videos',
];

function isAllowedPublicId(publicId) {
  const pid = typeof publicId === 'string' ? publicId.trim() : '';
  if (!pid || pid.indexOf('..') !== -1) return false;
  for (var i = 0; i < ALLOWED_PREFIXES.length; i++) {
    var p = ALLOWED_PREFIXES[i];
    if (pid === p || pid.indexOf(p + '/') === 0) return true;
  }
  return false;
}

function getJsonBody(req) {
  if (req.body != null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body);
  }
  if (typeof req.body === 'string') {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch (e) {
      return Promise.resolve({});
    }
  }
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (c) {
      chunks.push(c);
    });
    req.on('end', function () {
      try {
        var s = Buffer.concat(chunks).toString('utf8');
        resolve(s ? JSON.parse(s) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  var body;
  try {
    body = await getJsonBody(req);
  } catch (e) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  var publicId = body && body.public_id;

  if (!isAllowedPublicId(publicId)) {
    res.status(400).json({ error: 'Invalid or disallowed public_id' });
    return;
  }

  var cloudName =
    process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || '';
  var apiKey = process.env.CLOUDINARY_API_KEY || '';
  var apiSecret = process.env.CLOUDINARY_API_SECRET || '';

  if (!cloudName || !apiKey || !apiSecret) {
    res.status(503).json({
      error: 'Delete API not configured',
      missing: true,
      hint: 'Set CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET (e.g. on Vercel or .env for dev-server).',
    });
    return;
  }

  var auth = Buffer.from(apiKey + ':' + apiSecret).toString('base64');
  var formBody = new URLSearchParams({ public_id: publicId }).toString();
  var resourceTypes = ['image', 'video', 'raw'];

  try {
    var lastErr = '';
    var lastData = null;
    for (var t = 0; t < resourceTypes.length; t++) {
      var rt = resourceTypes[t];
      var url = 'https://api.cloudinary.com/v1_1/' + cloudName + '/' + rt + '/destroy';
      var r = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + auth,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
      });

      var text = await r.text();
      var data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        res.status(r.status || 500).json({
          error: 'Unexpected response from Cloudinary',
          detail: text.slice(0, 300),
        });
        return;
      }

      lastData = data;

      if (r.ok) {
        if (data.result === 'not found') {
          lastErr = 'Resource not found as ' + rt;
          continue;
        }
        if (data.result === 'ok') {
          res.setHeader('Cache-Control', 'no-store');
          res.status(200).json({ ok: true, result: data, resource_type: rt });
          return;
        }
      }

      var msg = '';
      if (data.error && data.error.message) msg = String(data.error.message);
      else if (data.error && typeof data.error === 'string') msg = data.error;
      else if (data.message) msg = String(data.message);
      if (msg) lastErr = msg;
      if (r.status === 404 || (msg && msg.indexOf('not found') !== -1)) {
        continue;
      }
      if (!r.ok) {
        res.status(r.status).json({ error: String(msg || 'Cloudinary error'), detail: data });
        return;
      }
    }

    res.status(404).json({
      error: lastErr || 'Resource not found in Cloudinary (tried image, video, raw)',
      detail: lastData,
    });
  } catch (err) {
    res.status(500).json({ error: err && err.message ? err.message : 'Delete request failed' });
  }
};
