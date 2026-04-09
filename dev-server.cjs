/**
 * Local dev: static files + /api/list-by-folder (same handler as Vercel).
 * live-server cannot run serverless routes — use this instead of live-server for admin + folder API.
 *
 * Binds to an OS-assigned free port by default (no EADDRINUSE). Set PORT=5173 to prefer that
 * port; if it is busy, we fall back to another free port and print the real URL.
 */
'use strict';

require('dotenv').config();

const http = require('http');
const net = require('net');
const express = require('express');
const listByFolder = require('./api/list-by-folder.js');
const deleteResource = require('./api/delete-resource.js');
const booksApi = require('./api/books.js');
const galleryOrderApi = require('./api/gallery-order.js');

const ROOT = __dirname;

const app = express();
app.use(express.json({ limit: '64kb' }));

app.get('/api/list-by-folder', function (req, res) {
  return listByFolder(req, res);
});

app.post('/api/delete-resource', function (req, res) {
  return deleteResource(req, res);
});

app.get('/api/books', function (req, res) {
  return booksApi(req, res);
});

app.post('/api/books', function (req, res) {
  return booksApi(req, res);
});

app.get('/api/gallery-order', function (req, res) {
  return galleryOrderApi(req, res);
});

app.post('/api/gallery-order', function (req, res) {
  return galleryOrderApi(req, res);
});

app.use(express.static(ROOT, { index: ['index.html'] }));

function tryBindTcp(port) {
  return new Promise(function (resolve, reject) {
    const s = net.createServer();
    const done = function (err, freePort) {
      s.removeListener('error', onErr);
      if (err) reject(err);
      else resolve(freePort);
    };
    function onErr(err) {
      s.close(function () {
        done(err);
      });
    }
    s.once('error', onErr);
    s.listen(port, '127.0.0.1', function () {
      var a = s.address();
      var p = a && a.port;
      s.close(function () {
        done(null, p);
      });
    });
  });
}

async function pickPort() {
  if (process.env.PORT !== undefined && String(process.env.PORT).trim() !== '') {
    var n = Number(process.env.PORT);
    if (n === 0 || Number.isNaN(n)) {
      return 0;
    }
    try {
      await tryBindTcp(n);
      return n;
    } catch (e) {
      if (e && e.code === 'EADDRINUSE') {
        console.warn('PORT ' + n + ' in use; using a free port.');
        return 0;
      }
      throw e;
    }
  }
  try {
    await tryBindTcp(5173);
    return 5173;
  } catch (e) {
    if (e && e.code === 'EADDRINUSE') {
      console.warn('Port 5173 in use; using a free port.');
      return 0;
    }
    throw e;
  }
}

pickPort()
  .then(function (port) {
    const server = http.createServer(app);
    server.on('error', function (err) {
      console.error(err);
      process.exit(1);
    });
    server.listen(port, '127.0.0.1', function () {
      var p = server.address().port;
      console.log('Dev server (static + /api): http://127.0.0.1:' + p);
      console.log('Admin: http://127.0.0.1:' + p + '/admin/');
      if (p !== 5173) {
        console.warn(
          'Port is not 5173 — close old tabs on 5173 (live-server) and use the Admin URL above for /api (delete, folder list).'
        );
      }
    });
  })
  .catch(function (err) {
    console.error(err);
    process.exit(1);
  });
