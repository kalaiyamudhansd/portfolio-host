/**
 * GET /api/gallery-order — custom photo order per gallery category (public_id[]).
 * POST — save gallery-order.json (local fs + optional Cloudinary raw for production).
 */

const fs = require('fs');
const path = require('path');

const RAW_PUBLIC_ID = 'sigaram/site-gallery-order';

function resolvePath() {
  var a = path.join(__dirname, '..', 'gallery-order.json');
  try {
    if (fs.existsSync(a)) return a;
  } catch (e) {}
  return path.join(process.cwd(), 'gallery-order.json');
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

function validateOrders(data) {
  if (!data || typeof data !== 'object' || !data.orders || typeof data.orders !== 'object') {
    return false;
  }
  var keys = Object.keys(data.orders);
  for (var k = 0; k < keys.length; k++) {
    var arr = data.orders[keys[k]];
    if (!Array.isArray(arr)) return false;
    for (var i = 0; i < arr.length; i++) {
      if (typeof arr[i] !== 'string') return false;
    }
  }
  return true;
}

function readLocal() {
  try {
    var raw = fs.readFileSync(resolvePath(), 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function readFromCloudinary() {
  var cloud =
    process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || '';
  var apiKey = process.env.CLOUDINARY_API_KEY || '';
  var apiSecret = process.env.CLOUDINARY_API_SECRET || '';
  if (!cloud || !apiKey || !apiSecret) return null;

  var auth = Buffer.from(apiKey + ':' + apiSecret).toString('base64');
  var listUrl =
    'https://api.cloudinary.com/v1_1/' +
    cloud +
    '/resources/raw?public_ids[]=' +
    encodeURIComponent(RAW_PUBLIC_ID);

  var r = await fetch(listUrl, { headers: { Authorization: 'Basic ' + auth } });
  if (!r.ok) return null;
  var d = await r.json();
  var res = d.resources && d.resources[0];
  if (!res || !res.secure_url) return null;
  var jr = await fetch(res.secure_url, { cache: 'no-store' });
  if (!jr.ok) return null;
  return jr.json();
}

async function uploadRawJson(obj) {
  var cloud =
    process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || '';
  var apiKey = process.env.CLOUDINARY_API_KEY || '';
  var apiSecret = process.env.CLOUDINARY_API_SECRET || '';
  if (!cloud || !apiKey || !apiSecret) return { ok: false, reason: 'no_credentials' };

  var payload = JSON.stringify(obj);
  var b64 = Buffer.from(payload, 'utf8').toString('base64');
  var file = 'data:application/json;base64,' + b64;
  var auth = Buffer.from(apiKey + ':' + apiSecret).toString('base64');
  var url = 'https://api.cloudinary.com/v1_1/' + cloud + '/raw/upload';

  var up = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + auth,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      file: file,
      public_id: RAW_PUBLIC_ID,
      overwrite: 'true',
    }).toString(),
  });

  if (!up.ok) {
    var t = await up.text();
    return { ok: false, reason: t.slice(0, 200) };
  }
  return { ok: true };
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    if (process.env.VERCEL) {
      try {
        var fromCloud = await readFromCloudinary();
        if (fromCloud && fromCloud.orders && typeof fromCloud.orders === 'object') {
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('Content-Type', 'application/json');
          return res.status(200).send(JSON.stringify(fromCloud));
        }
      } catch (e) {}
    }
    var local = readLocal();
    if (local && local.orders && typeof local.orders === 'object') {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(JSON.stringify(local));
    }
    if (!process.env.VERCEL) {
      try {
        var c2 = await readFromCloudinary();
        if (c2 && c2.orders) {
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('Content-Type', 'application/json');
          return res.status(200).send(JSON.stringify(c2));
        }
      } catch (e2) {}
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify({ orders: {} }));
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var body;
  try {
    body = await getJsonBody(req);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  if (!validateOrders(body)) {
    return res.status(400).json({ error: 'Invalid gallery order payload' });
  }

  var out = JSON.stringify(body, null, 2);

  try {
    fs.writeFileSync(resolvePath(), out, 'utf8');
  } catch (e) {
    /* read-only FS */
  }

  var up = await uploadRawJson(body);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    cloudinary: up.ok ? 'synced' : up.reason || 'skipped',
  });
};
