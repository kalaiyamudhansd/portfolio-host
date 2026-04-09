/**
 * Lists Cloudinary image resources by folder prefix (Admin API).
 * Used when assets exist in Media Library folders but lack the sigaram_* tags
 * required by the unsigned tag JSON list.
 *
 * Env (Vercel / server): CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * CLOUD_NAME falls back from VITE_CLOUDINARY_CLOUD_NAME if needed.
 */

const ALLOWED_PREFIXES = [
  'gallery/pattimandram',
  'gallery/motivational-speech',
  'gallery/memory-lane',
  'gallery/abroad-events',
  'gallery/videos',
];

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const prefix = typeof req.query.prefix === 'string' ? req.query.prefix.trim() : '';
  if (!ALLOWED_PREFIXES.includes(prefix)) {
    res.status(400).json({ error: 'Invalid prefix' });
    return;
  }

  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || '';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

  if (!cloudName || !apiKey || !apiSecret) {
    res.status(503).json({
      error: 'Folder listing not configured',
      missing: true,
      hint:
        'Set CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET on Vercel. Set CLOUDINARY_CLOUD_NAME ' +
        'or ensure VITE_CLOUDINARY_CLOUD_NAME is set (same cloud name). Redeploy after saving env.',
    });
    return;
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const collected = [];
  let nextCursor = null;
  let pages = 0;
  const maxPages = 10;

  while (pages < maxPages) {
    const u = new URL(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image`);
    u.searchParams.set('prefix', prefix);
    u.searchParams.set('max_results', '500');
    u.searchParams.set('type', 'upload');
    if (nextCursor) {
      u.searchParams.set('next_cursor', nextCursor);
    }

    const r = await fetch(u.toString(), {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!r.ok) {
      const text = await r.text();
      res.status(r.status).json({
        error: 'Cloudinary Admin API error',
        detail: text.slice(0, 400),
      });
      return;
    }

    const data = await r.json();
    const batch = data.resources || [];
    for (let i = 0; i < batch.length; i++) {
      collected.push({ public_id: batch[i].public_id });
    }
    nextCursor = data.next_cursor || null;
    pages++;
    if (!nextCursor) break;
  }

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ resources: collected });
}
