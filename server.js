require('dotenv').config();

const express = require('express');
const path    = require('path');
const fs      = require('fs');

// ─── Shared database ──────────────────────────────────────────────────────────
// This app does NOT own the database. The shared SQLite DB lives in the
// standalone service "evinra-shared-db" (http://localhost:4000) and is used by
// all three ecosystems. The browser pages reach it through evinra-db.js.

// ─── Config ──────────────────────────────────────────────────────────────────
const SQ_ENV   = (process.env.SQUARE_ENV || 'sandbox').toLowerCase();
const SQ_BASE  = SQ_ENV === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';
const SQ_TOKEN = process.env.SQUARE_ACCESS_TOKEN || '';
const SQ_LOC   = process.env.SQUARE_LOCATION_ID  || '';
const SQ_VER   = '2024-01-18';
const PORT     = parseInt(process.env.PORT || '5500', 10);

// ─── Express ─────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname)));   // serve the HTML files + evinra-db.js

// ─── Square helper ───────────────────────────────────────────────────────────
function sqHeaders() {
  return {
    'Authorization': `Bearer ${SQ_TOKEN}`,
    'Content-Type':  'application/json',
    'Square-Version': SQ_VER,
  };
}

async function sqFetch(endpoint, opts = {}) {
  const res  = await fetch(SQ_BASE + endpoint, { ...opts, headers: sqHeaders() });
  const json = await res.json();
  return { status: res.status, body: json };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Healthcheck / env info (no secrets sent to client)
app.get('/api/square/status', (req, res) => {
  res.json({
    env:        SQ_ENV,
    configured: !!(SQ_TOKEN && SQ_LOC),
    location:   SQ_LOC || null,
  });
});

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'evinra-ticket-system', sharedDb: 'http://localhost:4000' });
});

// List devices
app.get('/api/square/devices', async (req, res) => {
  try {
    const { status, body } = await sqFetch('/v2/devices');
    res.status(status).json(body);
  } catch (e) {
    res.status(500).json({ errors: [{ detail: e.message }] });
  }
});

// Create Terminal checkout
app.post('/api/square/checkout', async (req, res) => {
  try {
    const payload = req.body;
    // Inject location_id from server env if not provided by client
    if (SQ_LOC && payload.checkout && !payload.checkout.location_id) {
      payload.checkout.location_id = SQ_LOC;
    }
    const { status, body } = await sqFetch('/v2/terminals/checkouts', {
      method: 'POST',
      body:   JSON.stringify(payload),
    });
    res.status(status).json(body);
  } catch (e) {
    res.status(500).json({ errors: [{ detail: e.message }] });
  }
});

// Poll checkout status
app.get('/api/square/checkout/:id', async (req, res) => {
  try {
    const { status, body } = await sqFetch(`/v2/terminals/checkouts/${req.params.id}`);
    res.status(status).json(body);
  } catch (e) {
    res.status(500).json({ errors: [{ detail: e.message }] });
  }
});

// Cancel checkout
app.post('/api/square/checkout/:id/cancel', async (req, res) => {
  try {
    const { status, body } = await sqFetch(
      `/v2/terminals/checkouts/${req.params.id}/cancel`,
      { method: 'POST' }
    );
    res.status(status).json(body);
  } catch (e) {
    res.status(500).json({ errors: [{ detail: e.message }] });
  }
});

// Create a device pairing code (enter on the physical Terminal)
app.post('/api/square/device-codes', async (req, res) => {
  try {
    const { status, body } = await sqFetch('/v2/devices/codes', {
      method: 'POST',
      body: JSON.stringify({
        idempotency_key: 'pair-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        device_code: {
          name:         req.body.name || 'Box Office Terminal',
          product_type: 'TERMINAL_API',
          location_id:  SQ_LOC,
        },
      }),
    });
    res.status(status).json(body);
  } catch (e) {
    res.status(500).json({ errors: [{ detail: e.message }] });
  }
});

// Poll pairing code status
app.get('/api/square/device-codes/:id', async (req, res) => {
  try {
    const { status, body } = await sqFetch(`/v2/devices/codes/${req.params.id}`);
    res.status(status).json(body);
  } catch (e) {
    res.status(500).json({ errors: [{ detail: e.message }] });
  }
});

// Fetch payment details (card brand + last 4)
app.get('/api/square/payment/:id', async (req, res) => {
  try {
    const { status, body } = await sqFetch(`/v2/payments/${req.params.id}`);
    res.status(status).json(body);
  } catch (e) {
    res.status(500).json({ errors: [{ detail: e.message }] });
  }
});

// ─── Location → Device config ────────────────────────────────────────────────
const LOC_FILE = path.join(__dirname, 'locations.json');

function readLocCfg() {
  try { return JSON.parse(fs.readFileSync(LOC_FILE, 'utf8')); } catch { return {}; }
}
function writeLocCfg(data) {
  fs.writeFileSync(LOC_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/config/locations', (req, res) => {
  res.json(readLocCfg());
});

app.post('/api/config/locations', (req, res) => {
  try {
    writeLocCfg(req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const bar = '─'.repeat(42);
  console.log(`\n  ${bar}`);
  console.log(`  Evinra Ticket System`);
  console.log(`  ${bar}`);
  console.log(`  URL       →  http://localhost:${PORT}`);
  console.log(`  Shared DB →  http://localhost:4000  (evinra-shared-db)`);
  console.log(`  Square    →  ${SQ_ENV.toUpperCase()}`);
  console.log(`  ${bar}\n`);
});
