/* ============================================================
 * Evinra Shared DB — browser client
 * ------------------------------------------------------------
 * Drop this file into any Evinra ecosystem (Ticket System,
 * Onsite Sales, Storefront) and load it in the page <head>:
 *
 *   <script src="evinra-db.js"></script>
 *
 * It exposes a Supabase-compatible client that talks to the
 * SHARED DB SERVICE (http://localhost:4000), so all three
 * ecosystems read and write the SAME database.
 *
 *   const db = EvinraDB.createClient();           // shared service
 *   const { data } = await db.from('events').select('*');
 *
 * It also defines a global `supabase` shim, so existing code
 * using supabase.createClient(URL, KEY).from(...) works with
 * no changes (the URL/KEY args are ignored — everything local).
 *
 * Rich orders helper (box office / onsite / storefront sales):
 *   await EvinraDB.saveOrder(orderObj);           // POST /api/orders
 *   const list = await EvinraDB.getOrders('box_office');
 *
 * To point at a different host/port, set before loading:
 *   <script>window.EVINRA_DB_URL = 'http://192.168.1.10:4000';</script>
 * ============================================================ */
(function (global) {
  // Auto-detect: explicit override → Railway (production) → localhost (dev).
  // file:// (opened from disk) has an empty hostname → treat as local so the
  // dashboard still talks to the local DB service on :4000 instead of Railway.
  const RAILWAY_URL = 'https://web-production-93df6.up.railway.app';
  const host = (typeof window !== 'undefined' && window.location) ? window.location.hostname : '';
  const isFile = (typeof window !== 'undefined' && window.location) ? window.location.protocol === 'file:' : false;
  const isLocal = typeof window === 'undefined'
    ? true
    : (host === 'localhost' || host === '127.0.0.1' || host === '' || isFile);
  const SERVICE =
    (global.EVINRA_DB_URL && String(global.EVINRA_DB_URL).replace(/\/+$/, '')) ||
    (isLocal ? 'http://localhost:4000' : RAILWAY_URL);
  const DB_BASE = SERVICE + '/api/db';

  class QueryBuilder {
    constructor(base, table) {
      this._base = base;
      this._table = table;
      this._filters = [];
      this._order = null;
      this._limit = null;
      this._single = false;
      this._method = 'GET';
      this._body = null;
    }

    _addFilter(col, op, value) {
      this._filters.push([col, `${op}.${value}`]);
      return this;
    }
    eq(c, v)    { return this._addFilter(c, 'eq', v); }
    neq(c, v)   { return this._addFilter(c, 'neq', v); }
    gt(c, v)    { return this._addFilter(c, 'gt', v); }
    gte(c, v)   { return this._addFilter(c, 'gte', v); }
    lt(c, v)    { return this._addFilter(c, 'lt', v); }
    lte(c, v)   { return this._addFilter(c, 'lte', v); }
    like(c, v)  { return this._addFilter(c, 'like', v); }
    ilike(c, v) { return this._addFilter(c, 'ilike', v); }

    order(col, opts) {
      const asc = !opts || opts.ascending !== false;
      this._order = `${col}.${asc ? 'asc' : 'desc'}`;
      return this;
    }
    limit(n) { this._limit = n; return this; }
    single() { this._single = true; return this; }

    select() { this._method = 'GET'; return this; }
    insert(rows) { this._method = 'POST'; this._body = rows; return this; }
    update(values) { this._method = 'PATCH'; this._body = values; return this; }
    delete() { this._method = 'DELETE'; return this; }

    _url() {
      const params = new URLSearchParams();
      for (const [col, expr] of this._filters) params.append(col, expr);
      if (this._order) params.append('order', this._order);
      if (this._limit != null) params.append('limit', this._limit);
      const qs = params.toString();
      return `${this._base}/${this._table}${qs ? '?' + qs : ''}`;
    }

    async _run() {
      try {
        const opts = { method: this._method, headers: {} };
        if (this._body != null) {
          opts.headers['Content-Type'] = 'application/json';
          opts.body = JSON.stringify(this._body);
        }
        const res = await fetch(this._url(), opts);
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          return { data: null, error: (json && json.error) ? new Error(json.error) : new Error('Request failed') };
        }
        let data = json;
        if (this._single) data = Array.isArray(json) ? (json[0] || null) : json;
        return { data, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    }

    then(onFulfilled, onRejected) { return this._run().then(onFulfilled, onRejected); }
    catch(onRejected) { return this._run().catch(onRejected); }
  }

  class EvinraClient {
    constructor(base) { this._base = base || DB_BASE; }
    from(table) { return new QueryBuilder(this._base, table); }
  }

  const EvinraDB = {
    SERVICE,
    createClient(base) { return new EvinraClient(base); },

    // Rich orders helpers (shared by box office / onsite / storefront)
    async saveOrder(order) {
      const res = await fetch(SERVICE + '/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      if (!res.ok) throw new Error('saveOrder failed: ' + res.status);
      return res.json();
    },
    async getOrders(channel) {
      const url = SERVICE + '/api/orders' + (channel ? '?channel=' + encodeURIComponent(channel) : '');
      const res = await fetch(url);
      if (!res.ok) throw new Error('getOrders failed: ' + res.status);
      return res.json();
    },

    // Upload an image (base64 data URL) to bunny.net via the shared service and
    // get back a public CDN URL to store in the document (instead of base64).
    // `folder` groups assets (e.g. 'events', 'products', 'logos'). `app` selects
    // the bunny zone; defaults to window.EVINRA_APP, else the server default.
    // If `dataUrl` is already an http(s) URL it is returned unchanged.
    async uploadImage(dataUrl, folder, app) {
      if (!dataUrl) return '';
      if (/^https?:\/\//i.test(dataUrl)) return dataUrl;
      const res = await fetch(SERVICE + '/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: dataUrl,
          folder: folder || 'misc',
          app: app || global.EVINRA_APP || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error((json && json.error) || ('upload failed: ' + res.status));
      return json.url;
    },
  };

  global.EvinraDB = EvinraDB;
  // Convenience global mirroring gdbPost/gdbPatch style helpers used in the apps.
  global.gdbUploadImage = function (dataUrl, folder, app) {
    return EvinraDB.uploadImage(dataUrl, folder, app);
  };

  // Supabase compatibility shim (only if a real client isn't already loaded).
  if (!global.supabase || typeof global.supabase.createClient !== 'function') {
    global.supabase = { createClient() { return new EvinraClient(); } };
  }
})(typeof window !== 'undefined' ? window : this);
