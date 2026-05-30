/* ============================================================
   EVINRA — Canonical demo dataset (single source of truth)
   Productions → Shows → Events → Play dates → Sessions
   Everything else (KPIs, tables, seat maps, orders) derives from here.
   Exposed as window.EVINRA.
   ============================================================ */
(function (global) {
  'use strict';

  var SESSIONS = ['1:00 PM', '3:00 PM', '7:00 PM'];
  var SESSION_END = { '1:00 PM': '3:00 PM', '3:00 PM': '5:00 PM', '7:00 PM': '9:00 PM' };
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function iso(y,m,d){ return y + '-' + pad(m+1) + '-' + pad(d); }   // m is 0-based
  function us(y,m,d){ return pad(m+1) + '/' + pad(d) + '/' + y; }
  function shortDate(m,d){ return MONTHS_SHORT[m] + ' ' + d; }       // "Aug 25"
  function weekday(y,m,d){ return DAYS_SHORT[new Date(y,m,d).getDay()]; }

  /* ── PRODUCTIONS ─────────────────────────────────────────── */
  var productions = [
    { id:'evinra-productions', name:'Evinra Productions', contact:'ops@evinra.com', email:'ops@evinra.com', status:'active' },
    { id:'prodev-productions', name:'ProDev Productions', contact:'ops@prodev.com', email:'ops@prodev.com', status:'active' }
  ];

  /* ── SHOWS ───────────────────────────────────────────────── */
  var shows = [
    { id:'evinra-fairs-2026',   productionId:'evinra-productions', name:'Evinra Fairs 2026',         type:'Fair',        color:'#2A9B85', token:'--p',      priceFrom:25 },
    { id:'evinra-circus-2026',  productionId:'evinra-productions', name:'Evinra Circus 2026',        type:'Circus',      color:'#8B6BD4', token:'--violet', priceFrom:35 },
    { id:'prodev-monster-2026', productionId:'prodev-productions', name:'ProDev Monster Truck 2026', type:'Motorsports', color:'#D4884A', token:'--amber',  priceFrom:45 }
  ];

  /* ── EVENTS (a show in a city; each has 3 play dates × 3 sessions) ── */
  var EV = [
    { id:'ev-fairs-miami',     showId:'evinra-fairs-2026',   city:'Miami',           state:'FL', venue:'Miami-Dade Fairgrounds',  year:2026, month:7, days:[25,27,29], seats:8000,  soldPct:62, status:'On Sale'     },
    { id:'ev-fairs-cape',      showId:'evinra-fairs-2026',   city:'Cape Coral',      state:'FL', venue:'Cape Coral Event Grounds', year:2026, month:9, days:[25,27,29], seats:6000,  soldPct:24, status:'On Sale'     },
    { id:'ev-circus-tampa-a',  showId:'evinra-circus-2026',  city:'Tampa',           state:'FL', venue:'Tampa Expo Hall',          year:2026, month:7, days:[25,27,29], seats:5000,  soldPct:78, status:'On Sale'     },
    { id:'ev-circus-tampa-o',  showId:'evinra-circus-2026',  city:'Tampa',           state:'FL', venue:'Tampa Expo Hall',          year:2026, month:9, days:[25,27,29], seats:5000,  soldPct:0,  status:'Coming Soon' },
    { id:'ev-monster-orlando', showId:'prodev-monster-2026', city:'Orlando',         state:'FL', venue:'Orlando Motor Stadium',    year:2026, month:7, days:[25,27,29], seats:12000, soldPct:88, status:'On Sale'     },
    { id:'ev-monster-wpb',     showId:'prodev-monster-2026', city:'West Palm Beach', state:'FL', venue:'WPB Outdoor Arena',        year:2026, month:9, days:[25,27,29], seats:9000,  soldPct:12, status:'On Sale'     }
  ];

  /* ── HISTORY (past runs of the same shows — powers completed/flow views) ──
     Dates are relative to "today" (May 29, 2026): current week, last week,
     last month, and older completed runs. status:'Completed'. */
  var EV_HIST = [
    { id:'ev-circus-sarasota', showId:'evinra-circus-2026',  city:'Sarasota',        state:'FL', venue:'Robarts Arena',          year:2026, month:4, days:[20,27,29], seats:5000,  soldPct:97, status:'Completed' }, // last week + current week
    { id:'ev-monster-jax',     showId:'prodev-monster-2026', city:'Jacksonville',    state:'FL', venue:"Daily's Place",          year:2026, month:4, days:[6,8,10],   seats:9000,  soldPct:93, status:'Completed' }, // last month
    { id:'ev-fairs-ftlaud',    showId:'evinra-fairs-2026',   city:'Fort Lauderdale', state:'FL', venue:'War Memorial Auditorium', year:2026, month:2, days:[13,14,15], seats:8000,  soldPct:90, status:'Completed' }, // March
    { id:'ev-circus-naples',   showId:'evinra-circus-2026',  city:'Naples',          state:'FL', venue:'Paradise Coast Complex',  year:2026, month:1, days:[7,8,9],    seats:5000,  soldPct:85, status:'Completed' }  // February
  ];

  /* enrich events with derived fields (canonical upcoming + history) */
  var events = EV.concat(EV_HIST).map(function (e, idx) {
    var show = shows.filter(function (s) { return s.id === e.showId; })[0];
    var dates = e.days.map(function (d) {
      return {
        day:d, iso:iso(e.year,e.month,d), us:us(e.year,e.month,d),
        short:shortDate(e.month,d), weekday:weekday(e.year,e.month,d),
        sessions: SESSIONS.map(function (t) { return { start:t, end:SESSION_END[t] }; })
      };
    });
    var sessionsCount = dates.length * SESSIONS.length;   // 9
    var capacityTotal = e.seats * sessionsCount;
    var ticketsSold   = Math.round(capacityTotal * e.soldPct / 100);
    var avgPrice      = Math.round(show.priceFrom * 1.35);
    var revenue       = ticketsSold * avgPrice;
    return {
      id:e.id, idx:idx, showId:e.showId, showName:show.name, productionId:show.productionId,
      city:e.city, state:e.state, cityState:e.city + ', ' + e.state, venue:e.venue,
      year:e.year, month:e.month, monthName:MONTHS[e.month], monthShort:MONTHS_SHORT[e.month],
      dates:dates, firstDate:dates[0], lastDate:dates[dates.length-1],
      dateRangeUS: dates[0].us + ' – ' + dates[dates.length-1].us,
      dateRangeShort: MONTHS_SHORT[e.month] + ' ' + e.days[0] + '–' + e.days[e.days.length-1] + ', ' + e.year,
      seats:e.seats, soldPct:e.soldPct, status:e.status,
      sessionsCount:sessionsCount, capacityTotal:capacityTotal,
      ticketsSold:ticketsSold, avgPrice:avgPrice, revenue:revenue,
      priceFrom:show.priceFrom, color:show.color, token:show.token, type:show.type
    };
  });

  /* ── PLAY DATES (flattened: 6 events × 3 days × 3 sessions = 54) ── */
  var playDates = [];
  events.forEach(function (e) {
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

  /* ── ORDERS (generated demo transactions tied to the events) ── */
  var ORDER_CUSTOMERS = [
    {name:'Maria L.', email:'maria.l@email.com'},  {name:'James R.', email:'james.r@email.com'},
    {name:'Elena V.', email:'elena.v@email.com'},  {name:'David K.', email:'david.k@email.com'},
    {name:'Sofia P.', email:'sofia.p@email.com'},  {name:'Marcus T.', email:'marcus.t@email.com'},
    {name:'Aisha N.', email:'aisha.n@email.com'},  {name:'Liam O.', email:'liam.o@email.com'},
    {name:'Carmen D.', email:'carmen.d@email.com'}, {name:'Noah B.', email:'noah.b@email.com'},
    {name:'Priya S.', email:'priya.s@email.com'},  {name:'Hugo M.', email:'hugo.m@email.com'}
  ];
  var ORDER_CHANNELS = ['Box Office', 'Storefront', 'Third Party'];
  var ORDER_PAYS = ['Credit Card', 'Square', 'Cash'];
  var ORDER_DATES = ['05/28/2026','05/26/2026','05/22/2026','05/18/2026','05/12/2026','05/06/2026','04/29/2026','04/20/2026','04/08/2026','03/24/2026','03/11/2026','02/19/2026'];
  var ORDER_TIMES = ['9:14am','10:31am','11:02am','1:48pm','2:14pm','3:31pm','4:05pm','5:22pm','6:40pm','7:12pm'];
  var TICKET_DEFS = [
    {name:'General Admission', add:0,  type:'ga'},
    {name:'VIP Admission',     add:30, type:'vip'},
    {name:'Reserved Seating',  add:15, type:'reserved'},
    {name:'Family 4-Pack',     add:55, type:'family'}
  ];
  function oid(n){ return (('00000' + n.toString(16)).slice(-6) + 'a1b2c3d4e5f60718293a4b5c').slice(0,24); }

  var orders = (function () {
    var list = [], n = 0;
    events.forEach(function (e, ei) {
      var show = shows.filter(function (s) { return s.id === e.showId; })[0];
      var prodName = (productions.filter(function (p) { return p.id === show.productionId; })[0] || {}).name || '';
      var cnt = e.status === 'Completed' ? 5 : (e.status === 'On Sale' ? 3 : 0);
      for (var k = 0; k < cnt; k++) {
        n++;
        var cust = ORDER_CUSTOMERS[(ei * 3 + k) % ORDER_CUSTOMERS.length];
        var lines = 1 + ((ei + k) % 3);
        var tickets = [];
        for (var ti = 0; ti < lines; ti++) {
          var def = TICKET_DEFS[(k + ti) % TICKET_DEFS.length];
          var price = show.priceFrom + def.add;
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
          production: prodName, productionId: show.productionId,
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

  /* ── REFUNDS (derived from refunded tickets in orders) ── */
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

  /* ── SALES ROWS (per-session sales lines for the sales report) ── */
  var SALES_CHANNELS = ['Box Office','Storefront','Third Party','Vendor'];
  var DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var salesRows = (function () {
    var rows = [], id = 0;
    events.forEach(function (e) {
      if (e.soldPct <= 0) return;   // skip not-yet-on-sale
      var prodName = (productions.filter(function (p) { return p.id === e.productionId; })[0] || {}).name || '';
      e.dates.forEach(function (d) {
        d.sessions.forEach(function (sess) {
          id++;
          var pct      = Math.max(8, Math.min(100, e.soldPct + ((id * 7) % 21) - 10));
          var tickets  = Math.max(10, Math.round(e.seats * pct / 100));
          var paid     = +(tickets * e.avgPrice).toFixed(2);
          var fees     = +(paid * 0.06).toFixed(2);
          var discount = +((id % 4 === 0) ? tickets * 1.5 : 0).toFixed(2);
          var tips     = +(tickets * 0.12).toFixed(2);
          var refunds  = +((id % 5 === 0) ? e.avgPrice * ((id % 3) + 1) : 0).toFixed(2);
          rows.push({
            id:id, production:prodName, venue:e.venue, city:e.cityState, color:e.color,
            capacity:e.seats, date:d.us, time:sess.start,
            day:DAYS_FULL[new Date(d.iso + 'T12:00:00').getDay()],
            channel:SALES_CHANNELS[id % SALES_CHANNELS.length],
            event:e.city + ' — ' + d.short + ' ' + sess.start,
            tickets:tickets, fees:fees, discount:discount, tips:tips, paid:paid, refunds:refunds
          });
        });
      });
    });
    return rows;
  })();

  /* ── SCANS (gate/attendance scans derived from non-refunded tickets) ── */
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

  /* ── PAYOUTS (weekly net payouts per show, derived) ── */
  var PAYOUT_PERIODS = ['May 16–22, 2026','May 09–15, 2026','May 02–08, 2026','Apr 25–May 01, 2026','Apr 18–24, 2026','Apr 11–17, 2026','Apr 04–10, 2026','Mar 28–Apr 03, 2026','Mar 21–27, 2026','Mar 14–20, 2026','Mar 07–13, 2026','Feb 28–Mar 06, 2026','Feb 21–27, 2026','Feb 14–20, 2026','Feb 07–13, 2026'];
  var PAYOUT_DATES   = ['—','Jun 1, 2026','May 26, 2026','May 19, 2026','May 12, 2026','May 5, 2026','Apr 28, 2026','Apr 21, 2026','Apr 14, 2026','Apr 7, 2026','Mar 31, 2026','Mar 24, 2026','Mar 17, 2026','Mar 10, 2026','Mar 3, 2026'];
  var payouts = PAYOUT_PERIODS.map(function (period, i) {
    var show    = shows[i % shows.length];
    var tickets = 180 + ((i * 53) % 320);
    var gross   = +(tickets * (show.priceFrom * 1.6)).toFixed(2);
    var fee     = +(gross * 0.05).toFixed(2);
    var net     = +(gross - fee).toFixed(2);
    var status  = i === 0 ? 'Pending' : (i === 1 ? 'Processing' : 'Paid');
    return { period:period, show:show.name, gross:gross, fee:fee, net:net, tickets:tickets, status:status, payoutDate:PAYOUT_DATES[i] };
  });

  /* ── DERIVED ADAPTERS (match existing page shapes) ───────── */

  // shows page (SHOWS)
  var showsList = shows.map(function (s, i) {
    var sev = events.filter(function (e) { return e.showId === s.id; });
    var prod = productions.filter(function (p) { return p.id === s.productionId; })[0];
    var isos = sev.map(function (e) { return e.firstDate.iso; })
                  .concat(sev.map(function (e) { return e.lastDate.iso; })).sort();
    return {
      id:'SH' + pad(i+1), production:prod.name, name:s.name, desc:s.type + ' production',
      seats: sev[0] ? sev[0].seats : 0, source:'manual', status:'active',
      dateFrom: isos[0] || '', dateTo: isos[isos.length-1] || '',
      type:s.type, showId:s.id
    };
  });

  // events page (EVENTS)
  var eventsList = events.map(function (e) {
    return { city:e.city, place:e.venue, show:e.showName, dates:e.dateRangeUS, seats:e.seats, idx:e.idx, status:e.status };
  });

  // productions page (PRODUCTIONS) — rich enough for a table
  var productionsList = productions.map(function (p, i) {
    var ps = shows.filter(function (s) { return s.productionId === p.id; });
    var pe = events.filter(function (e) { return e.productionId === p.id; });
    return {
      id:'PR' + pad(i+1), name:p.name, contact:p.contact, email:p.email,
      desc:ps.length + ' show' + (ps.length===1?'':'s'),
      shows:ps.length, events:pe.length, status:'active', source:'manual', productionId:p.id
    };
  });

  /* ── TOTALS / KPIs ───────────────────────────────────────── */
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

  /* ── HELPERS ─────────────────────────────────────────────── */
  function getShow(id){ return shows.filter(function (s) { return s.id === id; })[0]; }
  function getProduction(id){ return productions.filter(function (p) { return p.id === id; })[0]; }
  function eventsForShow(id){ return events.filter(function (e) { return e.showId === id; }); }
  function showsForProduction(id){ return shows.filter(function (s) { return s.productionId === id; }); }
  function fmtMoney(n){ return '$' + Math.round(n).toLocaleString('en-US'); }

  global.EVINRA = {
    SESSIONS:SESSIONS, MONTHS:MONTHS, MONTHS_SHORT:MONTHS_SHORT,
    productions:productions, shows:shows, events:events, playDates:playDates,
    orders:orders, refunds:refunds, salesRows:salesRows, scans:scans, payouts:payouts,
    showsList:showsList, eventsList:eventsList, productionsList:productionsList,
    totals:totals,
    getShow:getShow, getProduction:getProduction,
    eventsForShow:eventsForShow, showsForProduction:showsForProduction,
    fmtMoney:fmtMoney
  };
})(window);
