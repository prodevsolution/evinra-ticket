/* ============================================================
   EVINRA — dataset for the Ticket admin (window.EVINRA)
   ------------------------------------------------------------
   Loads REAL data from the shared DB (:4000) when reachable and maps it
   into the canonical shape the pages expect:
       EVINRA.production ← shared TENANT (operator org)
       EVINRA.show       ← shared PRODUCTION
       EVINRA.event      ← shared SHOW (a city/run), dates ← shared EVENTS
   Revenue / tickets sold are derived from REAL orders; logistics that the
   shared DB doesn't carry yet (sessions, seats, scans, payouts) are
   synthesized deterministically. Falls back to the built-in demo seed when
   the DB is unreachable (e.g. opened offline).
   ============================================================ */
(function (global) {
  'use strict';

  var SESSIONS = ['1:00 PM', '3:00 PM', '7:00 PM'];
  var SESSION_END = { '1:00 PM': '3:00 PM', '3:00 PM': '5:00 PM', '7:00 PM': '9:00 PM' };
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function iso(y,m,d){ return y + '-' + pad(m+1) + '-' + pad(d); }   // m is 0-based
  function us(y,m,d){ return pad(m+1) + '/' + pad(d) + '/' + y; }
  function shortDate(m,d){ return MONTHS_SHORT[m] + ' ' + d; }       // "Aug 25"
  function weekday(y,m,d){ return DAYS_SHORT[new Date(y,m,d).getDay()]; }
  function fmtTime(hh,mm){ var h=+hh, ap=h>=12?'PM':'AM', h12=(h%12)||12; return h12 + ':' + (mm||'00') + ' ' + ap; } // "19","00" → "7:00 PM"
  function oid(n){ return (('00000' + n.toString(16)).slice(-6) + 'a1b2c3d4e5f60718293a4b5c').slice(0,24); }

  /* ── Synthesis palettes (for fields the shared DB doesn't carry) ── */
  var PALETTE = [
    { type:'Fair',        color:'#2A9B85', token:'--p',      priceFrom:25 },
    { type:'Circus',      color:'#8B6BD4', token:'--violet', priceFrom:35 },
    { type:'Motorsports', color:'#D4884A', token:'--amber',  priceFrom:45 },
    { type:'Festival',    color:'#6BA3E0', token:'--blue',   priceFrom:30 },
    { type:'Live Show',   color:'#EAB044', token:'--gold',   priceFrom:40 }
  ];
  var CITYMETA = [
    { city:'Miami',           state:'FL', venue:'Miami-Dade Fairgrounds'  },
    { city:'Tampa',           state:'FL', venue:'Tampa Expo Hall'         },
    { city:'Orlando',         state:'FL', venue:'Orlando Motor Stadium'   },
    { city:'West Palm Beach', state:'FL', venue:'WPB Outdoor Arena'       },
    { city:'Jacksonville',    state:'FL', venue:"Daily's Place"           },
    { city:'Sarasota',        state:'FL', venue:'Robarts Arena'           },
    { city:'Naples',          state:'FL', venue:'Paradise Coast Complex'  }
  ];
  var SEATSET = [8000, 5000, 12000, 9000, 6000, 7000];

  /* ── Shared DB access (synchronous so pages render unchanged) ── */
  var RAILWAY_URL = 'https://web-production-93df6.up.railway.app';
  var host = (global.location && global.location.hostname) || '';
  var isFile = (global.location && global.location.protocol === 'file:') || false;
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '' || isFile;
  var DB_BASE = (global.EVINRA_DB_URL ? String(global.EVINRA_DB_URL).replace(/\/+$/, '')
                : (isLocal ? 'http://localhost:4000' : RAILWAY_URL)) + '/api/db';

  // The Ticket System runs as ONE company: scope everything to the signed-in
  // tenant (chosen at login, stored by evinra_login.html). Null → no scoping
  // (e.g. opened without logging in) keeps the legacy aggregated behaviour.
  var CURRENT_TENANT = (typeof localStorage !== 'undefined' ? localStorage.getItem('evinra-tenant-id') : null);
  var CURRENT_TENANT_NAME = (typeof localStorage !== 'undefined' ? (localStorage.getItem('evinra-tenant-name') || '') : '');

  // Logout = clear the company and return to login.
  global.evinraLogout = function () {
    try { localStorage.removeItem('evinra-tenant-id'); localStorage.removeItem('evinra-tenant-name'); } catch (e) {}
    if (global.location) global.location.replace('evinra_login.html');
  };
  // Auth gate: every page that loads data.js requires a signed-in company.
  if (!CURRENT_TENANT) {
    if (global.location) global.location.replace('evinra_login.html');
    return; // skip building EVINRA — we're navigating to login
  }

  function dbGet(table) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', DB_BASE + '/' + table, false); // synchronous
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        var j = JSON.parse(xhr.responseText);
        return Array.isArray(j) ? j : null;
      }
    } catch (e) { /* offline → fallback */ }
    return null;
  }

  /* ── Built-in demo seed (fallback when the DB is unreachable) ── */
  function seedBase() {
    var productions = [
      { id:'evinra-productions', name:'Evinra Productions', contact:'ops@evinra.com', email:'ops@evinra.com', status:'active' },
      { id:'prodev-productions', name:'ProDev Productions', contact:'ops@prodev.com', email:'ops@prodev.com', status:'active' }
    ];
    var shows = [
      { id:'evinra-fairs-2026',   productionId:'evinra-productions', name:'Evinra Fairs 2026',         type:'Fair',        color:'#2A9B85', token:'--p',      priceFrom:25 },
      { id:'evinra-circus-2026',  productionId:'evinra-productions', name:'Evinra Circus 2026',        type:'Circus',      color:'#8B6BD4', token:'--violet', priceFrom:35 },
      { id:'prodev-monster-2026', productionId:'prodev-productions', name:'ProDev Monster Truck 2026', type:'Motorsports', color:'#D4884A', token:'--amber',  priceFrom:45 }
    ];
    var EV = [
      { id:'ev-fairs-miami',     showId:'evinra-fairs-2026',   city:'Miami',           state:'FL', venue:'Miami-Dade Fairgrounds',  year:2026, month:7, days:[25,27,29], seats:8000,  soldPct:62, status:'On Sale'     },
      { id:'ev-fairs-cape',      showId:'evinra-fairs-2026',   city:'Cape Coral',      state:'FL', venue:'Cape Coral Event Grounds', year:2026, month:9, days:[25,27,29], seats:6000,  soldPct:24, status:'On Sale'     },
      { id:'ev-circus-tampa-a',  showId:'evinra-circus-2026',  city:'Tampa',           state:'FL', venue:'Tampa Expo Hall',          year:2026, month:7, days:[25,27,29], seats:5000,  soldPct:78, status:'On Sale'     },
      { id:'ev-circus-tampa-o',  showId:'evinra-circus-2026',  city:'Tampa',           state:'FL', venue:'Tampa Expo Hall',          year:2026, month:9, days:[25,27,29], seats:5000,  soldPct:0,  status:'Coming Soon' },
      { id:'ev-monster-orlando', showId:'prodev-monster-2026', city:'Orlando',         state:'FL', venue:'Orlando Motor Stadium',    year:2026, month:7, days:[25,27,29], seats:12000, soldPct:88, status:'On Sale'     },
      { id:'ev-monster-wpb',     showId:'prodev-monster-2026', city:'West Palm Beach', state:'FL', venue:'WPB Outdoor Arena',        year:2026, month:9, days:[25,27,29], seats:9000,  soldPct:12, status:'On Sale'     }
    ];
    var EV_HIST = [
      { id:'ev-circus-sarasota', showId:'evinra-circus-2026',  city:'Sarasota',        state:'FL', venue:'Robarts Arena',          year:2026, month:4, days:[20,27,29], seats:5000, soldPct:97, status:'Completed' },
      { id:'ev-monster-jax',     showId:'prodev-monster-2026', city:'Jacksonville',    state:'FL', venue:"Daily's Place",          year:2026, month:4, days:[6,8,10],   seats:9000, soldPct:93, status:'Completed' },
      { id:'ev-fairs-ftlaud',    showId:'evinra-fairs-2026',   city:'Fort Lauderdale', state:'FL', venue:'War Memorial Auditorium', year:2026, month:2, days:[13,14,15], seats:8000, soldPct:90, status:'Completed' },
      { id:'ev-circus-naples',   showId:'evinra-circus-2026',  city:'Naples',          state:'FL', venue:'Paradise Coast Complex',  year:2026, month:1, days:[7,8,9],    seats:5000, soldPct:85, status:'Completed' }
    ];
    return { productions:productions, shows:shows, EV:EV.concat(EV_HIST), realOrders:null, usingDB:false };
  }

  /* ── DB base: map shared entities into the EVINRA shape ── */
  function dbBase() {
    var tenants = dbGet('tenants'), prods = dbGet('productions'), shows = dbGet('shows'), evs = dbGet('events'), ords = dbGet('orders');
    if (!tenants || !prods || !shows || !evs) return null;
    if (!tenants.length || !prods.length || !shows.length) return null;

    // Scope to the signed-in company (tenant). Filters the whole hierarchy
    // tenant→production→show→event→order so every page sees only this company.
    if (CURRENT_TENANT) {
      tenants = tenants.filter(function (t) { return String(t.id || t._id) === CURRENT_TENANT; });
      prods   = prods.filter(function (p) { return String(p.tenant_id) === CURRENT_TENANT; });
      var prodIds = {}; prods.forEach(function (p) { prodIds[p.id] = 1; });
      shows   = shows.filter(function (s) { return prodIds[s.production_id]; });
      var showIds = {}; shows.forEach(function (s) { showIds[s.id] = 1; });
      evs     = evs.filter(function (e) { return showIds[e.show_id]; });
      var evIds = {}; evs.forEach(function (e) { evIds[e.id] = 1; });
      ords    = (ords || []).filter(function (o) { return evIds[o.event_id]; });
    }

    // EVINRA.production ← shared tenant (operator org)
    var productions = tenants.map(function (t) {
      return { id:t.id, name:t.name, contact:t.email || '', email:t.email || '',
               status:(String(t.status||'').toLowerCase()==='active' ? 'active' : 'active') };
    });
    // EVINRA.show ← shared production
    var showsArr = prods.map(function (p, i) {
      var pal = PALETTE[i % PALETTE.length];
      return { id:p.id, productionId:p.tenant_id, name:p.name, type:pal.type, color:pal.color, token:pal.token, priceFrom:pal.priceFrom };
    });
    // Group shared events by their show, to derive dates per EVINRA event.
    var evByShow = {};
    evs.forEach(function (e) { if (e.show_id) { (evByShow[e.show_id] = evByShow[e.show_id] || []).push(e); } });

    // EVINRA.event ← shared show (a run). Dates ← its shared events.
    var EV = shows.map(function (sh, i) {
      var cm = CITYMETA[i % CITYMETA.length];
      var kids = evByShow[sh.id] || [];
      var parsed = kids.map(function (e) {
        var m = String(e.start_at || '').match(/(\d{4})-(\d{2})-(\d{2})/);
        return m ? { y:+m[1], mo:+m[2]-1, d:+m[3] } : null;
      }).filter(Boolean).sort(function (a, b) { return (a.y*12+a.mo) - (b.y*12+b.mo); });
      var year = 2026, month = i % 12, days = [15,17,19];
      if (parsed.length) {
        year = parsed[0].y; month = parsed[0].mo;
        days = parsed.slice(0, 3).map(function (x) { return x.d; });
        if (!days.length) days = [15,17,19];
      }
      // Manual events (created from the Ticket System) carry real venue/city/seats.
      var manualKid = kids.filter(function (k) { return k.venue; })[0];
      return {
        id:sh.id, showId:sh.production_id,
        city:(manualKid && manualKid.city) || cm.city,
        state:cm.state,
        venue:(manualKid && manualKid.venue) || cm.venue,
        year:year, month:month, days:days,
        seats:(manualKid && manualKid.seats) || SEATSET[i % SEATSET.length],
        soldPct:0, status:'On Sale',
        _eventIds:kids.map(function (e) { return e.id; }),
        _kids:kids
      };
    });

    return { productions:productions, shows:showsArr, EV:EV, realOrders:(ords || []), sharedEvents:evs, usingDB:true };
  }

  /* ── Build the full window.EVINRA from a base (DB or seed) ── */
  function build(base) {
    var productions = base.productions, shows = base.shows, usingDB = base.usingDB;

    function getShow(id){ return shows.filter(function (s) { return s.id === id; })[0]; }

    /* Real GMV / tickets per EVINRA event (= shared show), from real orders. */
    var realByEvent = {}; // EVINRA event id → {gmv, tickets}
    if (usingDB) {
      var evShow = {}; (base.sharedEvents || []).forEach(function (e) { if (e.show_id) evShow[String(e.id)] = String(e.show_id); });
      (base.realOrders || []).forEach(function (o) {
        var evId = evShow[String(o.event_id)]; // shared show id == EVINRA event id
        if (!evId) return;
        var r = realByEvent[evId] || (realByEvent[evId] = { gmv:0, tickets:0 });
        r.gmv += Number(o.total) || 0;
        r.tickets += 1;
      });
    }

    /* enrich events with derived fields */
    var events = base.EV.map(function (e, idx) {
      var show = getShow(e.showId) || PALETTE[0];
      var dates = e.days.map(function (d) {
        return {
          day:d, iso:iso(e.year,e.month,d), us:us(e.year,e.month,d),
          short:shortDate(e.month,d), weekday:weekday(e.year,e.month,d),
          sessions: SESSIONS.map(function (t) { return { start:t, end:SESSION_END[t] }; })
        };
      });
      var sessionsCount = dates.length * SESSIONS.length;
      var capacityTotal = e.seats * sessionsCount;
      var avgPrice      = Math.round((show.priceFrom || 30) * 1.35);
      var ticketsSold, revenue, soldPct;
      var real = usingDB && realByEvent[e.id];
      if (real && real.gmv > 0) {
        revenue     = Math.round(real.gmv);
        ticketsSold = Math.max(real.tickets, Math.round(revenue / avgPrice));
        soldPct     = Math.max(1, Math.min(100, Math.round(ticketsSold / Math.max(1, capacityTotal) * 100)));
      } else {
        soldPct     = e.soldPct || 0;
        ticketsSold = Math.round(capacityTotal * soldPct / 100);
        revenue     = ticketsSold * avgPrice;
      }
      var status = e.status;
      if (usingDB) status = (revenue > 0 ? 'On Sale' : 'Coming Soon');
      return {
        id:e.id, idx:idx, showId:e.showId, showName:show.name, productionId:show.productionId,
        city:e.city, state:e.state, cityState:e.city + ', ' + e.state, venue:e.venue,
        year:e.year, month:e.month, monthName:MONTHS[e.month], monthShort:MONTHS_SHORT[e.month],
        dates:dates, firstDate:dates[0], lastDate:dates[dates.length-1],
        dateRangeUS: dates[0].us + ' – ' + dates[dates.length-1].us,
        dateRangeShort: MONTHS_SHORT[e.month] + ' ' + e.days[0] + '–' + e.days[e.days.length-1] + ', ' + e.year,
        seats:e.seats, soldPct:soldPct, status:status,
        sessionsCount:sessionsCount, capacityTotal:capacityTotal,
        ticketsSold:ticketsSold, avgPrice:avgPrice, revenue:revenue,
        priceFrom:show.priceFrom, color:show.color, token:show.token, type:show.type,
        _kids:e._kids || null
      };
    });
    var eventById = {}; events.forEach(function (e) { eventById[e.id] = e; });

    /* play dates (flattened) */
    var playDates = [];
    events.forEach(function (e) {
      // Manual events: use the REAL DB event rows (date/time/function name/venue).
      var realKids = (e._kids || []).filter(function (k) { return k.venue && k.start_at; });
      if (realKids.length) {
        realKids.forEach(function (k) {
          var m = String(k.start_at).match(/(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
          if (!m) return;
          var y=+m[1], mo=+m[2]-1, dd=+m[3];
          var startT = (m[4] != null) ? fmtTime(m[4], m[5]) : '7:00 PM';
          var em = String(k.end_at || '').match(/[T ](\d{2}):(\d{2})/);
          var endT = em ? fmtTime(em[1], em[2]) : '';
          var fn = k.function_name || k.name || (us(y,mo,dd));
          playDates.push({
            eventId:e.id, idx:e.idx, show:e.showName, production:e.productionId,
            city:k.city || e.city, state:e.state, place:k.venue, venue:k.venue,
            date:us(y,mo,dd), iso:iso(y,mo,dd), day:dd, weekday:weekday(y,mo,dd),
            start:startT, end:endT, event:fn, label:fn,
            seats:k.seats || e.seats, sale:(String(k.status||'').toLowerCase().indexOf('sale')>=0 || String(k.status||'').toLowerCase()==='on sale'), status:(k.status||e.status)
          });
        });
        return;
      }
      e.dates.forEach(function (d) {
        d.sessions.forEach(function (s) {
          var label = e.city + ' — ' + d.short + ' · ' + s.start;
          playDates.push({
            eventId:e.id, idx:e.idx, show:e.showName, production:e.productionId,
            city:e.city, state:e.state, place:e.venue, venue:e.venue,
            date:d.us, iso:d.iso, day:d.day, weekday:d.weekday,
            start:s.start, end:s.end, event:label, label:label,
            seats:e.seats, sale:(e.status === 'On Sale'), status:e.status
          });
        });
      });
    });

    /* ORDERS */
    var TICKET_DEFS = [
      {name:'General Admission', add:0,  type:'ga'},
      {name:'VIP Admission',     add:30, type:'vip'},
      {name:'Reserved Seating',  add:15, type:'reserved'},
      {name:'Family 4-Pack',     add:55, type:'family'}
    ];
    var ORDER_CHANNELS = ['Box Office', 'Storefront', 'Third Party'];
    var ORDER_PAYS = ['Credit Card', 'Square', 'Cash'];
    var orders;

    if (usingDB && base.realOrders && base.realOrders.length) {
      // Map REAL orders → EVINRA order shape (synthesize one ticket line from total).
      var evShow2 = {}; (base.sharedEvents || []).forEach(function (e) { if (e.show_id) evShow2[String(e.id)] = String(e.show_id); });
      var n = 0;
      orders = base.realOrders.map(function (o) {
        n++;
        var evId = evShow2[String(o.event_id)];
        var ev = evId && eventById[evId];
        var show = ev ? getShow(ev.showId) : null;
        var prod = show ? productions.filter(function (p) { return p.id === show.productionId; })[0] : null;
        var total = Number(o.total) || 0;
        var def = TICKET_DEFS[n % TICKET_DEFS.length];
        var refunded = (n % 11 === 0);
        var dateStr = String(o.order_date || '').replace(/^(\d{4})-(\d{2})-(\d{2}).*/, '$2/$3/$1') || '';
        var ch = (o.channel || '').toLowerCase();
        var channel = ch.indexOf('box') >= 0 ? 'Box Office' : ch.indexOf('store') >= 0 ? 'Storefront' : ch.indexOf('third') >= 0 ? 'Third Party' : ch.indexOf('onsite') >= 0 ? 'Box Office' : 'Storefront';
        return {
          id:(o.id || oid(n)), orderNum: o.order_num || ('ORD-' + ('000' + n).slice(-4)),
          date: dateStr, time: (((n % 9) + 9) + ':' + ('0' + ((n * 7) % 60)).slice(-2) + 'am'),
          production: prod ? prod.name : '', productionId: prod ? prod.id : '',
          show: show ? show.name : (o.show_name || ''), showId: show ? show.id : '',
          event: ev ? (ev.cityState + ' — ' + ev.monthShort) : (o.event_label || ''), eventId: ev ? ev.id : '',
          channel: channel,
          customer: o.customer_name || 'Guest', email: o.customer_email || '',
          payMethod: ORDER_PAYS[n % ORDER_PAYS.length],
          tickets: [{
            ticketId: oid(n * 13), name: def.name,
            seat: (100 + (ev ? ev.idx : 0)) + '-' + String.fromCharCode(65 + (n % 6)) + '-' + ((n % 20) + 1),
            type: def.type, status: refunded ? 'Refunded' : 'Active', qty: 1,
            grossVal: total, fee: +(total * 0.05).toFixed(2),
            discount: +(o.discount || 0), tips: +(o.tips || 0), price: total
          }]
        };
      });
    } else {
      // Synthetic orders (demo / fallback).
      var ORDER_CUSTOMERS = [
        {name:'Maria L.', email:'maria.l@email.com'},  {name:'James R.', email:'james.r@email.com'},
        {name:'Elena V.', email:'elena.v@email.com'},  {name:'David K.', email:'david.k@email.com'},
        {name:'Sofia P.', email:'sofia.p@email.com'},  {name:'Marcus T.', email:'marcus.t@email.com'},
        {name:'Aisha N.', email:'aisha.n@email.com'},  {name:'Liam O.', email:'liam.o@email.com'}
      ];
      var ORDER_DATES = ['05/28/2026','05/26/2026','05/22/2026','05/18/2026','05/12/2026','05/06/2026','04/29/2026','04/20/2026','04/08/2026','03/24/2026','03/11/2026','02/19/2026'];
      var ORDER_TIMES = ['9:14am','10:31am','11:02am','1:48pm','2:14pm','3:31pm','4:05pm','5:22pm','6:40pm','7:12pm'];
      orders = (function () {
        var list = [], n = 0;
        events.forEach(function (e, ei) {
          var show = getShow(e.showId);
          var prod = (productions.filter(function (p) { return p.id === show.productionId; })[0] || {});
          var cnt = e.status === 'Completed' ? 5 : (e.status === 'On Sale' ? 3 : 0);
          for (var k = 0; k < cnt; k++) {
            n++;
            var cust = ORDER_CUSTOMERS[(ei * 3 + k) % ORDER_CUSTOMERS.length];
            var lines = 1 + ((ei + k) % 3);
            var tickets = [];
            for (var ti = 0; ti < lines; ti++) {
              var def = TICKET_DEFS[(k + ti) % TICKET_DEFS.length];
              var price = (show.priceFrom || 30) + def.add;
              var refunded = ((ei * 7 + k * 3 + ti) % 11 === 0);
              tickets.push({
                ticketId: oid(n * 13 + ti), name: def.name,
                seat: (100 + e.idx) + '-' + String.fromCharCode(65 + (ti % 6)) + '-' + (k + ti + 1),
                type: def.type, status: refunded ? 'Refunded' : 'Active', qty: 1,
                grossVal: price, fee: +(price * 0.05).toFixed(2),
                discount: ((k + ti) % 4 === 0) ? 5.00 : 0.00,
                tips: (ti % 2 === 0) ? 2.00 : 0.00, price: price
              });
            }
            list.push({
              id: oid(n), orderNum: 'ORD-' + ('000' + n).slice(-4),
              date: ORDER_DATES[n % ORDER_DATES.length], time: ORDER_TIMES[n % ORDER_TIMES.length],
              production: prod.name || '', productionId: show.productionId,
              show: show.name, showId: show.id,
              event: e.cityState + ' — ' + e.monthShort, eventId: e.id,
              channel: ORDER_CHANNELS[n % ORDER_CHANNELS.length],
              customer: cust.name, email: cust.email,
              payMethod: ORDER_PAYS[n % ORDER_PAYS.length],
              tickets: tickets
            });
          }
        });
        return list;
      })();
    }

    /* REFUNDS (derived from refunded tickets in orders) */
    var REFUND_REASONS  = ['Customer Request','Duplicate Purchase','Wrong Ticket','Technical Error','No-Show Policy','Cancelled Event'];
    var REFUND_METHODS  = ['Original Card','Store Credit','Cash','Digital Wallet'];
    var REFUND_STATUSES = ['Completed','Completed','Completed','Pending','Denied','Partial'];
    var REFUND_LOCS     = ['Gate A','Gate B','Gate C','Box Office'];
    var REFUND_DEVICES  = ['POS-01','POS-02','POS-03','MOB-01','MOB-02'];
    var REFUND_AGENTS   = ['Maria Lopez','James Ruiz','Carlos Vega','Sara Mendez'];
    var refunds = (function () {
      var list = [], n = 0;
      orders.forEach(function (o) {
        o.tickets.forEach(function (tk) {
          if (tk.status !== 'Refunded') return;
          n++;
          list.push({
            id:n, date:o.date, time:o.time, eventName:o.event, order:o.orderNum,
            ticket:tk.name, amount:+(tk.price + tk.fee).toFixed(2),
            reason:REFUND_REASONS[n % REFUND_REASONS.length],
            method:REFUND_METHODS[n % REFUND_METHODS.length],
            location:REFUND_LOCS[n % REFUND_LOCS.length],
            device:REFUND_DEVICES[n % REFUND_DEVICES.length],
            agent:REFUND_AGENTS[n % REFUND_AGENTS.length],
            status:REFUND_STATUSES[n % REFUND_STATUSES.length],
            eventId:o.eventId, showId:o.showId, production:o.production
          });
        });
      });
      return list;
    })();

    /* SALES ROWS (per-session lines for the sales report) */
    var SALES_CHANNELS = ['Box Office','Storefront','Third Party','Vendor'];
    var salesRows = (function () {
      var rows = [], id = 0;
      events.forEach(function (e) {
        if (e.soldPct <= 0) return;
        var prod = (productions.filter(function (p) { return p.id === e.productionId; })[0] || {});
        e.dates.forEach(function (d) {
          d.sessions.forEach(function (sess) {
            id++;
            var pct      = Math.max(8, Math.min(100, e.soldPct + ((id * 7) % 21) - 10));
            var tickets  = Math.max(10, Math.round(e.seats * pct / 100));
            var paid     = +(tickets * e.avgPrice).toFixed(2);
            var fees     = +(paid * 0.06).toFixed(2);
            var discount = +((id % 4 === 0) ? tickets * 1.5 : 0).toFixed(2);
            var tips     = +(tickets * 0.12).toFixed(2);
            var refundsV = +((id % 5 === 0) ? e.avgPrice * ((id % 3) + 1) : 0).toFixed(2);
            rows.push({
              id:id, production:prod.name || '', venue:e.venue, city:e.cityState, color:e.color,
              capacity:e.seats, date:d.us, time:sess.start,
              day:DAYS_FULL[new Date(d.iso + 'T12:00:00').getDay()],
              channel:SALES_CHANNELS[id % SALES_CHANNELS.length],
              event:e.city + ' — ' + d.short + ' ' + sess.start,
              tickets:tickets, fees:fees, discount:discount, tips:tips, paid:paid, refunds:refundsV
            });
          });
        });
      });
      return rows;
    })();

    /* SCANS (derived from non-refunded tickets) */
    var SCAN_GATES    = ['Gate A','Gate B','Gate C'];
    var SCAN_SCANNERS = ['SCN-01','SCN-02','SCN-03','SCN-04','SCN-05'];
    var SCAN_STATUSES = ['Valid','Valid','Valid','Valid','Valid','Late Entry','Double Scan','Invalid','Not Scanned'];
    var SCAN_TYPECODE = { ga:'ap', vip:'av', reserved:'cv', family:'vf' };
    var scans = (function () {
      var list = [], id = 0;
      orders.forEach(function (o) {
        o.tickets.forEach(function (tk) {
          if (tk.status === 'Refunded') return;
          id++;
          var st = SCAN_STATUSES[id % SCAN_STATUSES.length];
          var ns = (st === 'Not Scanned');
          list.push({
            id:id, time: ns ? '—' : (((id % 9) + 1) + ':' + ('0' + ((id * 7) % 60)).slice(-2) + 'pm'),
            date: ns ? '—' : o.date, seat: tk.seat,
            ticketId: tk.ticketId.slice(0,8) + '…' + tk.ticketId.slice(-4),
            name: tk.name, type: (SCAN_TYPECODE[tk.type] || 'ap'),
            gate: ns ? '—' : SCAN_GATES[id % SCAN_GATES.length],
            scanner: ns ? '—' : SCAN_SCANNERS[id % SCAN_SCANNERS.length],
            status: st, order: o.orderNum, section: 'Section ' + tk.seat.split('-')[0],
            mo: ns ? null : (id % 45)
          });
        });
      });
      return list;
    })();

    /* PAYOUTS (weekly net payouts per show, derived) */
    var PAYOUT_PERIODS = ['May 16–22, 2026','May 09–15, 2026','May 02–08, 2026','Apr 25–May 01, 2026','Apr 18–24, 2026','Apr 11–17, 2026','Apr 04–10, 2026','Mar 28–Apr 03, 2026','Mar 21–27, 2026','Mar 14–20, 2026','Mar 07–13, 2026','Feb 28–Mar 06, 2026','Feb 21–27, 2026','Feb 14–20, 2026','Feb 07–13, 2026'];
    var PAYOUT_DATES   = ['—','Jun 1, 2026','May 26, 2026','May 19, 2026','May 12, 2026','May 5, 2026','Apr 28, 2026','Apr 21, 2026','Apr 14, 2026','Apr 7, 2026','Mar 31, 2026','Mar 24, 2026','Mar 17, 2026','Mar 10, 2026','Mar 3, 2026'];
    var payouts = PAYOUT_PERIODS.map(function (period, i) {
      var show    = shows[i % shows.length];
      var tickets = 180 + ((i * 53) % 320);
      var gross   = +(tickets * ((show.priceFrom || 30) * 1.6)).toFixed(2);
      var fee     = +(gross * 0.05).toFixed(2);
      var net     = +(gross - fee).toFixed(2);
      var status  = i === 0 ? 'Pending' : (i === 1 ? 'Processing' : 'Paid');
      return { period:period, show:show.name, gross:gross, fee:fee, net:net, tickets:tickets, status:status, payoutDate:PAYOUT_DATES[i] };
    });

    /* DERIVED ADAPTERS */
    var showsList = shows.map(function (s, i) {
      var sev = events.filter(function (e) { return e.showId === s.id; });
      var prod = productions.filter(function (p) { return p.id === s.productionId; })[0] || {};
      var isos = sev.map(function (e) { return e.firstDate.iso; })
                    .concat(sev.map(function (e) { return e.lastDate.iso; })).sort();
      return {
        id:'SH' + pad(i+1), production:prod.name || '', name:s.name, desc:s.type + ' production',
        seats: sev[0] ? sev[0].seats : 0, source:'manual', status:'active',
        dateFrom: isos[0] || '', dateTo: isos[isos.length-1] || '',
        type:s.type, showId:s.id
      };
    });
    var eventsList = events.map(function (e) {
      return { city:e.city, place:e.venue, show:e.showName, dates:e.dateRangeUS, seats:e.seats, idx:e.idx, status:e.status };
    });
    var productionsList = productions.map(function (p, i) {
      var ps = shows.filter(function (s) { return s.productionId === p.id; });
      var pe = events.filter(function (e) { return e.productionId === p.id; });
      return {
        id:'PR' + pad(i+1), name:p.name, contact:p.contact, email:p.email,
        desc:ps.length + ' show' + (ps.length===1?'':'s'),
        shows:ps.length, events:pe.length, status:'active', source:'manual', productionId:p.id
      };
    });

    /* TOTALS / KPIs */
    var totals = {
      productions: productions.length,
      shows: shows.length,
      events: events.length,
      sessions: playDates.length,
      revenue: events.reduce(function (a,e) { return a + e.revenue; }, 0),
      ticketsSold: events.reduce(function (a,e) { return a + e.ticketsSold; }, 0),
      capacity: events.reduce(function (a,e) { return a + e.capacityTotal; }, 0),
      activeShows: shows.length
    };

    function getProduction(id){ return productions.filter(function (p) { return p.id === id; })[0]; }
    function eventsForShow(id){ return events.filter(function (e) { return e.showId === id; }); }
    function showsForProduction(id){ return shows.filter(function (s) { return s.productionId === id; }); }
    function fmtMoney(n){ return '$' + Math.round(n).toLocaleString('en-US'); }

    return {
      SESSIONS:SESSIONS, MONTHS:MONTHS, MONTHS_SHORT:MONTHS_SHORT,
      productions:productions, shows:shows, events:events, playDates:playDates,
      orders:orders, refunds:refunds, salesRows:salesRows, scans:scans, payouts:payouts,
      showsList:showsList, eventsList:eventsList, productionsList:productionsList,
      totals:totals, source: usingDB ? 'shared-db' : 'demo',
      tenantId: CURRENT_TENANT || null, tenantName: CURRENT_TENANT_NAME || '',
      getShow:getShow, getProduction:getProduction,
      eventsForShow:eventsForShow, showsForProduction:showsForProduction,
      fmtMoney:fmtMoney
    };
  }

  var base = dbBase() || seedBase();
  global.EVINRA = build(base);
  if (global.console && console.info) console.info('EVINRA dataset source:', global.EVINRA.source);

  // ── Mount a company chip + Logout into the page header (all admin pages
  //    share .header-actions). Lets you sign out and switch tenant. ──
  (function mountAuthBar() {
    function inject() {
      if (document.getElementById('evinra-auth-bar')) return;
      var actions = document.querySelector('.header-actions');
      var name = CURRENT_TENANT_NAME || (global.EVINRA && global.EVINRA.tenantName) || 'Company';
      var frag = document.createElement('span');
      frag.id = 'evinra-auth-bar';
      if (actions) {
        frag.style.cssText = 'display:inline-flex;align-items:center;gap:8px;margin-right:4px';
        frag.innerHTML =
          '<span title="Signed-in company" style="display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3,rgba(0,0,0,.04));color:var(--text);font-size:11px;font-weight:600"><i class="bi bi-building" style="font-size:11px;opacity:.7"></i>' + name + '</span>' +
          '<button onclick="evinraLogout()" title="Sign out / switch company" style="display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg3,rgba(0,0,0,.04));color:var(--text);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit"><i class="bi bi-box-arrow-right" style="font-size:12px"></i>Logout</button>';
        actions.insertBefore(frag, actions.firstChild);
      } else {
        // Fallback: floating top-right (pages without a standard header).
        frag.style.cssText = 'position:fixed;top:10px;right:14px;z-index:99999;display:flex;align-items:center;gap:8px';
        frag.innerHTML =
          '<span style="height:30px;padding:0 10px;border-radius:8px;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:11px;font-weight:600;display:inline-flex;align-items:center">' + name + '</span>' +
          '<button onclick="evinraLogout()" style="height:30px;padding:0 12px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.55);backdrop-filter:blur(8px);color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Logout</button>';
        document.body.appendChild(frag);
      }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
    else inject();
  })();
})(window);
