/**
 * GET /api/books — JSON list for the site (local books.json, or Cloudinary raw fallback).
 * POST /api/books — save books.json (local fs + optional Cloudinary raw upload for production).
 */

const fs = require('fs');
const path = require('path');

const RAW_PUBLIC_ID = 'sigaram/site-books';

function resolveBooksPath() {
  var a = path.join(__dirname, '..', 'books.json');
  try {
    if (fs.existsSync(a)) return a;
  } catch (e) {}
  return path.join(process.cwd(), 'books.json');
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

function validateBooks(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.books)) return false;
  for (var i = 0; i < data.books.length; i++) {
    var b = data.books[i];
    if (!b || typeof b !== 'object') return false;
    if (typeof b.id !== 'string' || !b.id.trim()) return false;
    if (typeof b.titleTa !== 'string' || typeof b.coverUrl !== 'string' || typeof b.driveUrl !== 'string') {
      return false;
    }
    if (typeof b.authorTa !== 'string') b.authorTa = '';
    if (typeof b.descriptionEn !== 'string') b.descriptionEn = '';
  }
  return true;
}

function readLocalBooks() {
  try {
    var raw = fs.readFileSync(resolveBooksPath(), 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function readBooksFromCloudinary() {
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

async function uploadBooksRawJson(obj) {
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
        var fromCloud = await readBooksFromCloudinary();
        if (fromCloud && fromCloud.books && fromCloud.books.length) {
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('Content-Type', 'application/json');
          return res.status(200).send(JSON.stringify(fromCloud));
        }
      } catch (e) {}
    }
    var local = readLocalBooks();
    if (local && local.books) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(JSON.stringify(local));
    }
    if (!process.env.VERCEL) {
      try {
        var c2 = await readBooksFromCloudinary();
        if (c2 && c2.books) {
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('Content-Type', 'application/json');
          return res.status(200).send(JSON.stringify(c2));
        }
      } catch (e2) {}
    }
    return res.status(404).json({ error: 'books.json not found' });
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

  if (!validateBooks(body)) {
    return res.status(400).json({ error: 'Invalid books payload' });
  }

  var out = JSON.stringify(body, null, 2);

  try {
    fs.writeFileSync(resolveBooksPath(), out, 'utf8');
  } catch (e) {
    /* read-only FS (e.g. some serverless) */
  }

  var up = await uploadBooksRawJson(body);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    cloudinary: up.ok ? 'synced' : up.reason || 'skipped',
  });
};
