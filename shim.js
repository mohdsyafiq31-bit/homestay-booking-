// Connects the calendar page to Supabase using plain fetch calls (no libraries).
(function () {
  var C = window.HS_CONFIG || {};
  var base = String(C.supabaseUrl || '').replace(/\/$/, ''), key = C.supabaseAnonKey || '';
  var PK = 'hs-pass', cbs = {}, polled = {}, timer = null;
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
  var SEL = { nights: 'id,data', agents: 'name,rate', expenses: 'id,spent_on,category,description,amount' }, ORD = { nights: 'id', agents: 'name', expenses: 'spent_on' };
  async function poll(table) {
    if (!cbs[table] || (document.hidden && polled[table])) return;
    try {
      var rows = [], from = 0;
      for (;;) {
        var h = headers(); h['Range-Unit'] = 'items'; h.Range = from + '-' + (from + 999);
        var r = await fetch(base + '/rest/v1/' + table + '?select=' + SEL[table] + '&order=' + ORD[table], { headers: h });
        if (!r.ok) return;
        var a = await r.json(); rows = rows.concat(a);
        if (a.length < 1000) break;
        from += 1000;
      }
      polled[table] = true;
      cbs[table]({ docs: rows.map(function (x) {
        if (table === 'agents') return { id: x.name, data: function () { return { rate: x.rate }; } };
        if (table === 'expenses') return { id: x.id, data: function () { return { date: x.spent_on, category: x.category, description: x.description, amount: x.amount }; } };
        return { id: x.id, data: function () { return x.data; } };
      }) });
    } catch (e) {}
  }
  function pollAll() { poll('nights'); poll('agents'); poll('expenses'); }
  function ref(table, id) {
    if (table === 'expenses') return {
      set: async function (d) { await rpc('add_expense', { p_date: d.date, p_category: d.category, p_description: d.description, p_amount: d.amount }); pollAll(); },
      delete: async function () { await rpc('delete_expense', { p_id: id }); pollAll(); }
    };
    if (table === 'agents') return {
      set: async function (d) { await rpc('save_agent', { p_name: id, p_rate: d.rate }); pollAll(); },
      delete: async function () { await rpc('delete_agent', { p_name: id }); pollAll(); }
    };
    return {
      acquire: async function () { return { acquired: true }; },
      get: async function () { return { exists: false, data: function () {} }; },
      set: async function (d) { await rpc('book_night', { p_id: id, p_data: d }); pollAll(); },
      update: async function (d) {
        if (d.name !== undefined) await rpc('edit_booking', { p_id: id, p_patch: d });
        else if (d.agent !== undefined) await rpc('set_commission', { p_id: id, p_agent: d.agent, p_rate: d.rate });
        else await rpc('update_income', { p_id: id, p_income: d.income });
        pollAll();
      },
      delete: async function () { await rpc('cancel_night', { p_id: id }); pollAll(); }
    };
  }
  var db = { collection: function (name) {
    return { doc: function (id) { return ref(name, id); }, onSnapshot: function (next) {
      cbs[name] = next; poll(name);
      if (!timer) timer = setInterval(pollAll, 8000);
      return function () {};
    } };
  } };
  window.claude = { use: async function () { return db; } };
})();
