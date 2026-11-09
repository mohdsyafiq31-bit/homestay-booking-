// Connects the calendar page to Supabase using plain fetch calls (no libraries).
(function () {
  var C = window.HS_CONFIG || {};
  var base = String(C.supabaseUrl || '').replace(/\/$/, ''), key = C.supabaseAnonKey || '';
  var PK = 'hs-pass', cb = null, started = false;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
  if (!base || !key || base.indexOf('YOUR-') > -1 || key.indexOf('YOUR-') > -1) {
    window.claude = { use: async function () { return null; } };
    return;
  }
  function headers() {
    var h = { apikey: key, 'Content-Type': 'application/json' };
    if (key.indexOf('eyJ') === 0) h.Authorization = 'Bearer ' + key;
    return h;
  }
  function pass() { try { return localStorage.getItem(PK) || ''; } catch (e) { return ''; } }
  async function rpc(fn, args, retried) {
    args.p_pass = pass();
    var r = await fetch(base + '/rest/v1/rpc/' + fn, { method: 'POST', headers: headers(), body: JSON.stringify(args) });
    if (r.status === 401 && !retried) {
      var p = prompt('Staff passcode to edit bookings:');
      if (p) { try { localStorage.setItem(PK, p); } catch (e) {} return rpc(fn, args, true); }
    }
    if (r.status === 409) throw 'clash';
    if (!r.ok) throw new Error('HTTP ' + r.status);
  }
  async function poll() {
    if (document.hidden && started === 'done') return;
    try {
      var rows = [], from = 0;
      for (;;) {
        var h = headers(); h['Range-Unit'] = 'items'; h.Range = from + '-' + (from + 999);
        var r = await fetch(base + '/rest/v1/nights?select=id,data&order=id', { headers: h });
        if (!r.ok) return;
        var a = await r.json(); rows = rows.concat(a);
        if (a.length < 1000) break;
        from += 1000;
      }
      if (cb) cb({ docs: rows.map(function (x) { return { id: x.id, data: function () { return x.data; } }; }) });
    } catch (e) {}
  }
  function ref(id) {
    return {
      acquire: async function () { return { acquired: true }; },
      get: async function () { return { exists: false, data: function () {} }; },
      set: async function (d) { await rpc('book_night', { p_id: id, p_data: d }); poll(); },
      update: async function (d) { await rpc('update_income', { p_id: id, p_income: d.income }); poll(); },
      delete: async function () { await rpc('cancel_night', { p_id: id }); poll(); }
    };
  }
  var db = { collection: function () {
    return { doc: ref, onSnapshot: function (next) {
      cb = next; poll();
      if (!started) { started = true; setInterval(poll, 8000); }
      return function () {};
    } };
  } };
  window.claude = { use: async function () { return db; } };
})();
