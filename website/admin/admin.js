/* Little Millennium · Admin panel (browser-only storage) */
(function () {
'use strict';
var KEY = 'lm-admin-v1';
var $ = function (s, c) { return (c || document).querySelector(s); };
var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
var num = function (v) { var n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : 0; };
var inr = function (n) { return '₹' + Math.round(num(n)).toLocaleString('en-IN'); };
var today = function () { return new Date().toISOString().slice(0, 10); };
var fdate = function (d) { if (!d) return '—'; var x = new Date(d + (d.length === 10 ? 'T00:00:00' : '')); return isNaN(x) ? d : x.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };
var fmonth = function (ym) { if (!ym) return ''; var x = new Date(ym + '-01T00:00:00'); return x.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); };
var addMonths = function (ym, k) { var p = ym.split('-'), d = new Date(+p[0], +p[1] - 1 + k, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };

/* ---------- data ---------- */
function inst(a, b, c) { return [{ label: '1st Installment', due: '2027-04-05', amount: a }, { label: '2nd Installment', due: '2027-07-05', amount: b }, { label: '3rd Installment', due: '2027-10-05', amount: c }]; }
function pkg(code, name, age, yearly, i) { return { id: uid(), year: '2027-28', code: code, name: name, age: age, yearly: yearly, inst: i, half: ['2027-04-05', '2027-10-05'] }; }
function defaults() {
  var rows = [[3, 5000, 6000, 5000], [4, 6000, 7000, 6500], [5, 7000, 8000, 7000], [6, 8000, 9000, 8000], [7, 9000, 10000, 9000], [8, 10000, 11000, 10000], [9, 11000, 12000, 12000], [10, 12000, 14000, 13000], [11, 11500, 15000, 14000], [12, 12500, 16000, 15000]];
  return {
    v: 1, pin: null,
    settings: { school: 'Little Millennium Preschool', branch: 'Saiyed Vasna (Vasna–Bhayli)', address: 'No 6, Behind Panchmukhi Hanuman Temple, Saiyed Vasna, Vadodara, Gujarat 390015', phone: '080 7126 5192', email: '', gstin: '', prefix: 'LM', next: 1, footer: 'Fees once paid are non-refundable. Please keep this receipt for your records.' },
    roles: ['Centre Head', 'Class Teacher', 'Assistant Teacher', 'Day Care Caretaker', 'Admin / Accounts', 'Driver', 'Housekeeping', 'Security'],
    packages: [pkg('DR', 'Developing Roots', '2–3 yrs', 56800, inst(20000, 20000, 16800)), pkg('EW', 'Emerging Wings', '3–4 yrs', 60200, inst(25000, 20000, 15200)), pkg('RTF1', 'Ready To Fly I', '4–5 yrs', 62500, inst(25000, 20000, 17500)), pkg('RTF2', 'Ready To Fly II', '5–6 yrs', 65000, inst(25000, 20000, 20000))],
    daycare: { cats: [{ id: 'ot', name: 'Old toddlers' }, { id: 'i1', name: 'Infants (6–12 months)' }, { id: 'i2', name: 'Infants (12–24 months)' }], rows: rows.map(function (r) { return { hours: r[0], fees: { ot: r[1], i1: r[2], i2: r[3] } }; }) },
    students: [], staff: [], invoices: []
  };
}
var db;
try { db = JSON.parse(localStorage.getItem(KEY)) || defaults(); } catch (e) { db = defaults(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Could not save — browser storage is full or blocked'); } }
var byId = function (list, id) { return list.find(function (x) { return x.id === id; }); };

/* ---------- PIN lock (keeps casual visitors out; data never leaves this browser) ---------- */
function hash(s) { var h = 2166136261; s = 'lm#' + s + '#vasna'; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
function setupLock() {
  var first = !db.pin;
  if (sessionStorage.getItem('lm-admin-ok') === '1' && !first) return unlock();
  if (first) { $('#lock-title').textContent = 'Create your admin PIN'; $('#lock-sub').textContent = 'Choose a 4–8 digit PIN. You will need it every time you open the admin panel.'; $('#pin2').classList.remove('hide'); $('#lock-form button').textContent = 'Create PIN'; }
  $('#pin').focus();
  $('#lock-form').onsubmit = function (e) {
    e.preventDefault();
    var p = $('#pin').value.trim(), err = $('#lock-err');
    if (!/^\d{4,8}$/.test(p)) { err.textContent = 'PIN must be 4–8 digits'; return; }
    if (first) { if (p !== $('#pin2').value.trim()) { err.textContent = 'PINs do not match'; return; } db.pin = hash(p); save(); }
    else if (hash(p) !== db.pin) { err.textContent = 'Wrong PIN'; $('#pin').value = ''; return; }
    sessionStorage.setItem('lm-admin-ok', '1'); unlock();
  };
}
function unlock() { $('#lock').classList.add('hide'); $('#app').classList.remove('hide'); route(); }

/* ---------- UI helpers ---------- */
function toast(msg) { var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2400); }
function modal(title, body, foot, mw) {
  var m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = '<div class="modal-c" style="--mw:' + (mw || 640) + 'px"><div class="modal-h"><h2>' + esc(title) + '</h2><button class="btn g ic" data-x type="button" aria-label="Close">✕</button></div><div class="modal-b">' + body + '</div><div class="modal-f">' + (foot || '') + '</div></div>';
  $('#modals').appendChild(m);
  m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-x]')) m.remove(); });
  var f = m.querySelector('input:not([type=hidden]),select,textarea'); f && setTimeout(function () { f.focus(); }, 50);
  return m;
}
function field(f, v) {
  var val = v == null ? (f.def == null ? '' : f.def) : v, req = f.req ? ' required' : '', cls = f.full ? ' class="full"' : '';
  var ctl;
  if (f.type === 'select') ctl = '<select class="in" name="' + f.n + '"' + req + '>' + (f.ph ? '<option value="">' + esc(f.ph) + '</option>' : '') + f.opts.map(function (o) { var ov = typeof o === 'object' ? o.v : o, ol = typeof o === 'object' ? o.l : o; return '<option value="' + esc(ov) + '"' + (String(ov) === String(val) ? ' selected' : '') + '>' + esc(ol) + '</option>'; }).join('') + '</select>';
  else if (f.type === 'textarea') ctl = '<textarea class="in" name="' + f.n + '">' + esc(val) + '</textarea>';
  else ctl = '<input class="in" name="' + f.n + '" type="' + (f.type || 'text') + '" value="' + esc(val) + '"' + req + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + (f.type === 'tel' ? ' inputmode="numeric" maxlength="10"' : '') + '>';
  if (f.sec) return '<div class="sec-t">' + esc(f.sec) + '</div>';
  return '<label' + cls + '>' + esc(f.l) + (f.req ? ' *' : '') + ctl + '</label>';
}
function readForm(root) { var o = {}; $$('[name]', root).forEach(function (el) { o[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim(); }); return o; }
function confirmDel(what, fn) { var m = modal('Delete ' + what + '?', '<p>This cannot be undone.</p>', '<button class="btn g" data-x>Cancel</button><button class="btn r" id="yes">Delete</button>', 420); $('#yes', m).onclick = function () { fn(); m.remove(); }; }
function badge(st) { return '<span class="badge b-' + st + '">' + ({ paid: 'Paid', unpaid: 'Unpaid', partial: 'Part paid' }[st] || st) + '</span>'; }
function words(n) {
  n = Math.round(n); if (!n) return 'Zero';
  var a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'], b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  var two = function (x) { return x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : ''); };
  var three = function (x) { return (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : ''); };
  var out = [], cr = Math.floor(n / 1e7), l = Math.floor(n / 1e5) % 100, th = Math.floor(n / 1e3) % 100, r = n % 1000;
  if (cr) out.push(three(cr) + ' Crore'); if (l) out.push(two(l) + ' Lakh'); if (th) out.push(two(th) + ' Thousand'); if (r) out.push(three(r));
  return out.join(' ');
}

/* ---------- derived ---------- */
function invTotal(i) { return num(i.total); }
function invPaid(i) { return num(i.received); }
function studentLabel(s) { var p = byId(db.packages, s.pkgId); var t = []; if (s.type !== 'daycare' && p) t.push(p.name); if (s.type !== 'preschool' && s.dcCat) { var c = byId(db.daycare.cats, s.dcCat); t.push('Day Care' + (c ? ' · ' + c.name : '') + (s.dcHours ? ' · ' + s.dcHours + 'h' : '')); } return t.join(' + ') || '—'; }
function pkgAccount(s) {
  var p = byId(db.packages, s.pkgId); if (!p || s.type === 'daycare') return null;
  var invs = db.invoices.filter(function (i) { return i.studentId === s.id && i.pkg && i.pkg.id === p.id; });
  var paid = invs.reduce(function (t, i) { return t + (i.pkg.amount ? Math.min(invPaid(i), i.pkg.amount) : 0); }, 0);
  return { pkg: p, fee: p.yearly, paid: paid, bal: Math.max(0, p.yearly - paid) };
}
function invoicedParts(studentId, pkgId) { // {plan:{idx:invoiceNo}}
  var map = { full: {}, half: {}, inst: {} };
  db.invoices.forEach(function (i) { if (i.studentId === studentId && i.pkg && i.pkg.id === pkgId) i.pkg.parts.forEach(function (k) { map[i.pkg.plan][k] = i.no; }); });
  return map;
}
function dcFee(cat, hours) { var r = db.daycare.rows.find(function (x) { return String(x.hours) === String(hours); }); return r ? num(r.fees[cat]) : 0; }

/* ---------- router ---------- */
var IC = {
  dashboard: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
  students: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 11a3 3 0 1 0 0-6M22 21c0-3-2-5-4-5.6"/>',
  staff: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  packages: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  daycare: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  invoices: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h7M9 17h7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
};
var VIEWS = { dashboard: ['Dashboard', vDash], students: ['Students', vStudents], staff: ['Staff & roles', vStaff], packages: ['Fee packages', vPackages], daycare: ['Day care fees', vDaycare], invoices: ['Invoices', vInvoices], settings: ['Settings', vSettings] };
$('#nav').innerHTML = Object.keys(VIEWS).map(function (k) { return '<a href="#' + k + '" data-v="' + k + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + IC[k] + '</svg>' + VIEWS[k][0] + '</a>'; }).join('');
var q = {}; // per-view search state
function route() {
  var v = (location.hash || '#dashboard').slice(1); if (!VIEWS[v]) v = 'dashboard';
  $$('#nav a').forEach(function (a) { a.classList.toggle('on', a.dataset.v === v); });
  $('#title').textContent = VIEWS[v][0]; $('#top-acts').innerHTML = ''; $('#side').classList.remove('open');
  VIEWS[v][1]($('#view'));
}
function rerender() { route(); }
addEventListener('hashchange', route);
$('#menu').onclick = function () { $('#side').classList.toggle('open'); };
$('#lock-btn').onclick = function () { sessionStorage.removeItem('lm-admin-ok'); location.reload(); };
document.addEventListener('click', function (e) { var b = e.target.closest('[data-act="new-invoice"]'); if (b) invoiceForm(b.dataset.sid); });

/* ---------- Dashboard ---------- */
function vDash(el) {
  var act = db.students.filter(function (s) { return s.status !== 'Left'; });
  var billed = 0, got = 0; db.invoices.forEach(function (i) { billed += invTotal(i); got += invPaid(i); });
  var byPkg = db.packages.map(function (p) { return { p: p, n: act.filter(function (s) { return s.type !== 'daycare' && s.pkgId === p.id; }).length }; });
  var dcN = act.filter(function (s) { return s.type !== 'preschool'; }).length;
  var dues = act.map(function (s) { return { s: s, a: pkgAccount(s) }; }).filter(function (x) { return x.a && x.a.bal > 0; }).sort(function (a, b) { return b.a.bal - a.a.bal; }).slice(0, 8);
  var recent = db.invoices.slice().reverse().slice(0, 6);
  el.innerHTML =
    '<div class="grid g4" style="margin-bottom:16px">' +
    '<div class="card stat p"><small>Active students</small><b>' + act.length + '</b></div>' +
    '<div class="card stat"><small>Staff members</small><b>' + db.staff.filter(function (s) { return s.status !== 'Left'; }).length + '</b></div>' +
    '<div class="card stat y"><small>Collected</small><b>' + inr(got) + '</b></div>' +
    '<div class="card stat"><small>Pending on invoices</small><b>' + inr(billed - got) + '</b></div></div>' +
    '<div class="grid g2">' +
    '<div class="card"><h3>Students by program</h3>' + byPkg.map(function (x) { return '<div class="row" style="padding:7px 0;border-bottom:1px dashed var(--line)"><span>' + esc(x.p.name) + ' <span class="muted">' + esc(x.p.age) + '</span></span><span class="sp"></span><b>' + x.n + '</b></div>'; }).join('') + '<div class="row" style="padding:7px 0"><span>Day Care</span><span class="sp"></span><b>' + dcN + '</b></div></div>' +
    '<div class="card"><h3>Package fee balances</h3>' + (dues.length ? dues.map(function (x) { return '<div class="row" style="padding:7px 0;border-bottom:1px dashed var(--line)"><span><b>' + esc(x.s.name) + '</b> <span class="muted">' + esc(x.a.pkg.name) + '</span></span><span class="sp"></span><span>' + inr(x.a.bal) + '</span><button class="btn sm" data-act="new-invoice" data-sid="' + x.s.id + '">Invoice</button></div>'; }).join('') : '<div class="empty"><b>All clear</b>No outstanding package fees.</div>') + '</div>' +
    '</div><div class="card" style="margin-top:16px"><div class="row" style="margin-bottom:10px"><h3 style="margin:0">Recent invoices</h3><span class="sp"></span><a class="btn g sm" href="#invoices">See all</a></div>' + invTable(recent) + '</div>';
  bindInvTable(el);
}

/* ---------- Students ---------- */
function studentFields() {
  return [
    { n: 'name', l: "Child's full name", req: 1 }, { n: 'dob', l: 'Date of birth', type: 'date' },
    { n: 'gender', l: 'Gender', type: 'select', ph: 'Select', opts: ['Girl', 'Boy'] }, { n: 'admission', l: 'Admission date', type: 'date', def: today() },
    { sec: 'Parent / guardian' }, { n: 'parent', l: 'Parent name', req: 1 }, { n: 'phone', l: 'Mobile', type: 'tel', req: 1, ph: '10-digit number' },
    { n: 'email', l: 'Email', type: 'email' }, { n: 'address', l: 'Address', full: 1 },
    { sec: 'Enrolment' }, { n: 'type', l: 'Enrolled for', type: 'select', opts: [{ v: 'preschool', l: 'Preschool program' }, { v: 'daycare', l: 'Day care only' }, { v: 'both', l: 'Preschool + Day care' }], def: 'preschool' },
    { n: 'pkgId', l: 'Program / package', type: 'select', ph: 'Select program', opts: db.packages.map(function (p) { return { v: p.id, l: p.name + ' · ' + p.year + ' · ' + inr(p.yearly) }; }) },
    { n: 'dcCat', l: 'Day care category', type: 'select', ph: 'Select', opts: db.daycare.cats.map(function (c) { return { v: c.id, l: c.name }; }) },
    { n: 'dcHours', l: 'Day care hours / day', type: 'select', ph: 'Select', opts: db.daycare.rows.map(function (r) { return { v: r.hours, l: r.hours + ' hours' }; }) },
    { n: 'status', l: 'Status', type: 'select', opts: ['Active', 'Left'], def: 'Active' }, { n: 'notes', l: 'Notes', type: 'textarea', full: 1 }
  ];
}
function toggleEnrol(root) { var t = $('[name=type]', root).value; $('[name=pkgId]', root).closest('label').style.display = t === 'daycare' ? 'none' : ''; ['dcCat', 'dcHours'].forEach(function (n) { $('[name=' + n + ']', root).closest('label').style.display = t === 'preschool' ? 'none' : ''; }); }
function studentForm(s, done) {
  var m = modal(s ? 'Edit student' : 'Add student', '<form class="form" id="sf">' + studentFields().map(function (f) { return field(f, s && s[f.n]); }).join('') + '</form>', '<button class="btn g" data-x>Cancel</button><button class="btn" id="sv">Save student</button>', 720);
  var f = $('#sf', m); toggleEnrol(f); $('[name=type]', f).onchange = function () { toggleEnrol(f); };
  $('#sv', m).onclick = function () {
    var d = readForm(f);
    if (!d.name || !d.parent || !/^[6-9]\d{9}$/.test(d.phone)) { toast(!d.name || !d.parent ? 'Name and parent name are required' : 'Enter a valid 10-digit mobile number'); return; }
    if (d.type !== 'daycare' && !d.pkgId) { toast('Select a program'); return; }
    if (d.type !== 'preschool' && (!d.dcCat || !d.dcHours)) { toast('Select day care category and hours'); return; }
    if (s) Object.assign(s, d); else { s = Object.assign({ id: uid(), created: today() }, d); db.students.push(s); }
    save(); m.remove(); toast('Student saved'); done ? done(s) : rerender();
  };
}
function vStudents(el) {
  $('#top-acts').innerHTML = '<button class="btn" id="add">+ Add student</button>'; $('#add').onclick = function () { studentForm(); };
  var st = q.students || (q.students = { t: '', f: 'all' });
  var list = db.students.filter(function (s) {
    var t = st.t.toLowerCase(); if (t && (s.name + ' ' + s.parent + ' ' + s.phone).toLowerCase().indexOf(t) < 0) return false;
    if (st.f === 'all') return true; if (st.f === 'left') return s.status === 'Left'; if (st.f === 'daycare') return s.type !== 'preschool' && s.status !== 'Left';
    return s.pkgId === st.f && s.type !== 'daycare' && s.status !== 'Left';
  });
  el.innerHTML = '<div class="toolbar"><input class="in" id="q" placeholder="Search name, parent or mobile…" value="' + esc(st.t) + '"><select class="in" id="fl" style="max-width:240px"><option value="all">All students</option>' + db.packages.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('') + '<option value="daycare">Day care</option><option value="left">Left</option></select></div>' +
    (db.students.length ? '<div class="tbl-w"><table class="tbl"><thead><tr><th>Student</th><th>Parent</th><th>Enrolled for</th><th class="num">Package fee</th><th class="num">Paid</th><th class="num">Balance</th><th></th></tr></thead><tbody>' +
      (list.map(function (s) { var a = pkgAccount(s); return '<tr><td><b>' + esc(s.name) + '</b>' + (s.status === 'Left' ? ' <span class="badge b-n">Left</span>' : '') + '<div class="muted">' + (s.dob ? 'DOB ' + fdate(s.dob) : '') + '</div></td><td>' + esc(s.parent) + '<div class="muted">' + esc(s.phone) + '</div></td><td>' + esc(studentLabel(s)) + '</td><td class="num">' + (a ? inr(a.fee) : '—') + '</td><td class="num">' + (a ? inr(a.paid) : '—') + '</td><td class="num">' + (a ? (a.bal ? '<b style="color:var(--bad)">' + inr(a.bal) + '</b>' : '<span class="badge b-paid">Cleared</span>') : '—') + '</td><td><div class="acts"><button class="btn sm" data-act="new-invoice" data-sid="' + s.id + '">Invoice</button><button class="btn g sm" data-e="' + s.id + '">Edit</button><button class="btn r sm" data-d="' + s.id + '">✕</button></div></td></tr>'; }).join('') || '<tr><td colspan="7" class="empty">No students match.</td></tr>') +
      '</tbody></table></div>' : '<div class="card empty"><b>No students yet</b>Add your first student, or create an invoice and save the student from there.<br><br><button class="btn" id="add2">+ Add student</button></div>');
  $('#fl', el).value = st.f;
  $('#q', el).oninput = function (e) { st.t = e.target.value; var p = e.target.selectionStart; vStudents(el); var i = $('#q', el); i.focus(); i.setSelectionRange(p, p); };
  $('#fl', el).onchange = function (e) { st.f = e.target.value; vStudents(el); };
  var a2 = $('#add2', el); a2 && (a2.onclick = function () { studentForm(); });
  $$('[data-e]', el).forEach(function (b) { b.onclick = function () { studentForm(byId(db.students, b.dataset.e)); }; });
  $$('[data-d]', el).forEach(function (b) { b.onclick = function () { confirmDel('student', function () { db.students = db.students.filter(function (x) { return x.id !== b.dataset.d; }); save(); rerender(); }); }; });
}

/* ---------- Staff & roles ---------- */
function vStaff(el) {
  $('#top-acts').innerHTML = '<button class="btn" id="add">+ Add staff</button>'; $('#add').onclick = function () { staffForm(); };
  el.innerHTML = '<div class="grid" style="grid-template-columns:minmax(0,1fr) 300px;align-items:start" id="sg"><div>' +
    (db.staff.length ? '<div class="tbl-w"><table class="tbl"><thead><tr><th>Name</th><th>Role</th><th>Contact</th><th>Joined</th><th class="num">Salary / month</th><th></th></tr></thead><tbody>' + db.staff.map(function (s) { return '<tr><td><b>' + esc(s.name) + '</b>' + (s.status === 'Left' ? ' <span class="badge b-n">Left</span>' : '') + '</td><td><span class="badge b-p">' + esc(s.role) + '</span></td><td>' + esc(s.phone) + '<div class="muted">' + esc(s.email) + '</div></td><td>' + fdate(s.joined) + '</td><td class="num">' + (s.salary ? inr(s.salary) : '—') + '</td><td><div class="acts"><button class="btn g sm" data-e="' + s.id + '">Edit</button><button class="btn r sm" data-d="' + s.id + '">✕</button></div></td></tr>'; }).join('') + '</tbody></table></div>'
      : '<div class="card empty"><b>No staff yet</b>Add teachers, caretakers and other staff with their roles.</div>') +
    '</div><div class="card"><h3>Roles</h3>' + db.roles.map(function (r, i) { var n = db.staff.filter(function (s) { return s.role === r; }).length; return '<div class="row" style="padding:6px 0;border-bottom:1px dashed var(--line)"><span>' + esc(r) + '</span><span class="sp"></span><span class="badge b-n">' + n + '</span><button class="btn g sm" data-rd="' + i + '" title="Remove role">✕</button></div>'; }).join('') +
    '<form class="row" id="rf" style="margin-top:12px"><input class="in" id="rn" placeholder="New role" style="flex:1"><button class="btn sm">Add</button></form></div></div>';
  if (innerWidth < 900) $('#sg', el).style.gridTemplateColumns = '1fr';
  $('#rf', el).onsubmit = function (e) { e.preventDefault(); var v = $('#rn', el).value.trim(); if (v && db.roles.indexOf(v) < 0) { db.roles.push(v); save(); rerender(); } };
  $$('[data-rd]', el).forEach(function (b) { b.onclick = function () { var r = db.roles[+b.dataset.rd]; if (db.staff.some(function (s) { return s.role === r; })) return toast('Role is in use — change those staff first'); db.roles.splice(+b.dataset.rd, 1); save(); rerender(); }; });
  $$('[data-e]', el).forEach(function (b) { b.onclick = function () { staffForm(byId(db.staff, b.dataset.e)); }; });
  $$('[data-d]', el).forEach(function (b) { b.onclick = function () { confirmDel('staff member', function () { db.staff = db.staff.filter(function (x) { return x.id !== b.dataset.d; }); save(); rerender(); }); }; });
}
function staffForm(s) {
  var F = [{ n: 'name', l: 'Full name', req: 1 }, { n: 'role', l: 'Role', type: 'select', req: 1, ph: 'Select role', opts: db.roles }, { n: 'phone', l: 'Mobile', type: 'tel' }, { n: 'email', l: 'Email', type: 'email' }, { n: 'joined', l: 'Joining date', type: 'date', def: today() }, { n: 'salary', l: 'Salary / month (₹)', type: 'number' }, { n: 'qual', l: 'Qualification' }, { n: 'status', l: 'Status', type: 'select', opts: ['Active', 'Left'], def: 'Active' }, { n: 'notes', l: 'Notes', type: 'textarea', full: 1 }];
  var m = modal(s ? 'Edit staff' : 'Add staff', '<form class="form" id="ff">' + F.map(function (f) { return field(f, s && s[f.n]); }).join('') + '</form>', '<button class="btn g" data-x>Cancel</button><button class="btn" id="sv">Save</button>');
  $('#sv', m).onclick = function () { var d = readForm($('#ff', m)); if (!d.name || !d.role) return toast('Name and role are required'); if (s) Object.assign(s, d); else db.staff.push(Object.assign({ id: uid() }, d)); save(); m.remove(); toast('Staff saved'); rerender(); };
}

/* ---------- Packages ---------- */
function vPackages(el) {
  $('#top-acts').innerHTML = '<button class="btn" id="add">+ Add package</button>';
  $('#add').onclick = function () { db.packages.push(pkg('NEW', 'New package', '', 0, inst(0, 0, 0))); save(); rerender(); };
  el.innerHTML = '<p class="muted" style="margin-top:-8px">Edit any value and it saves automatically. Invoices already created keep the fees they were made with.</p><div class="grid g2">' + db.packages.map(function (p, pi) {
    var sum = p.inst.reduce(function (t, i) { return t + num(i.amount); }, 0);
    return '<div class="card" data-p="' + pi + '"><div class="form" style="margin-bottom:12px">' +
      field({ n: 'name', l: 'Program name' }, p.name) + field({ n: 'code', l: 'Short code' }, p.code) + field({ n: 'age', l: 'Age group' }, p.age) + field({ n: 'year', l: 'Academic year' }, p.year) +
      field({ n: 'yearly', l: 'Yearly fee (₹)', type: 'number' }, p.yearly) + '<label>Half payments (due dates)<div class="row" style="flex-wrap:nowrap"><input class="in" type="date" data-h="0" value="' + esc(p.half[0]) + '"><input class="in" type="date" data-h="1" value="' + esc(p.half[1]) + '"></div></label></div>' +
      '<div class="tbl-w"><table class="tbl" style="min-width:0"><thead><tr><th>Installment</th><th>Due date</th><th class="num">Amount</th><th></th></tr></thead><tbody>' +
      p.inst.map(function (it, ii) { return '<tr><td><input class="in" data-i="' + ii + '" data-k="label" value="' + esc(it.label) + '"></td><td><input class="in" type="date" data-i="' + ii + '" data-k="due" value="' + esc(it.due) + '"></td><td><input class="in" type="number" data-i="' + ii + '" data-k="amount" value="' + esc(it.amount) + '" style="text-align:right"></td><td><button class="btn g sm" data-ri="' + ii + '">✕</button></td></tr>'; }).join('') +
      '</tbody></table></div><div class="row" style="margin-top:10px"><button class="btn g sm" data-ai>+ Installment</button><span class="sp"></span><span class="badge ' + (sum === num(p.yearly) ? 'b-paid">Installments = yearly fee ✓' : 'b-unpaid">Installments total ' + inr(sum) + ' ≠ ' + inr(p.yearly)) + '</span><button class="btn r sm" data-dp>Delete</button></div></div>';
  }).join('') + '</div>';
  $$('[data-p]', el).forEach(function (card) {
    var p = db.packages[+card.dataset.p];
    $$('[name]', card).forEach(function (i) { i.onchange = function () { p[i.name] = i.name === 'yearly' ? num(i.value) : i.value; save(); rerender(); }; });
    $$('[data-h]', card).forEach(function (i) { i.onchange = function () { p.half[+i.dataset.h] = i.value; save(); }; });
    $$('[data-i]', card).forEach(function (i) { i.onchange = function () { p.inst[+i.dataset.i][i.dataset.k] = i.dataset.k === 'amount' ? num(i.value) : i.value; save(); rerender(); }; });
    $$('[data-ri]', card).forEach(function (b) { b.onclick = function () { p.inst.splice(+b.dataset.ri, 1); save(); rerender(); }; });
    $('[data-ai]', card).onclick = function () { p.inst.push({ label: (p.inst.length + 1) + 'th Installment', due: '', amount: 0 }); save(); rerender(); };
    $('[data-dp]', card).onclick = function () { if (db.students.some(function (s) { return s.pkgId === p.id; })) return toast('Students are using this package'); confirmDel('package', function () { db.packages.splice(db.packages.indexOf(p), 1); save(); rerender(); }); };
  });
}

/* ---------- Day care ---------- */
function vDaycare(el) {
  var D = db.daycare;
  el.innerHTML = '<p class="muted" style="margin-top:-8px">Monthly fee by hours per day. Edit any cell — it saves automatically.</p><div class="tbl-w"><table class="tbl"><thead><tr><th>Hours / day</th>' + D.cats.map(function (c, ci) { return '<th><div class="row" style="flex-wrap:nowrap"><input class="in" data-cn="' + ci + '" value="' + esc(c.name) + '" style="min-width:150px;text-transform:none;font-weight:800"><button class="btn g sm" data-cd="' + ci + '" title="Remove column">✕</button></div></th>'; }).join('') + '<th></th></tr></thead><tbody>' +
    D.rows.map(function (r, ri) { return '<tr><td><input class="in" type="number" data-rh="' + ri + '" value="' + esc(r.hours) + '" style="max-width:90px"></td>' + D.cats.map(function (c) { return '<td><input class="in" type="number" data-r="' + ri + '" data-c="' + c.id + '" value="' + esc(r.fees[c.id]) + '" style="text-align:right"></td>'; }).join('') + '<td><button class="btn g sm" data-rd="' + ri + '">✕</button></td></tr>'; }).join('') +
    '</tbody></table></div><div class="row" style="margin-top:12px"><button class="btn g" id="ar">+ Add hours row</button><button class="btn g" id="ac">+ Add category</button></div>';
  $$('[data-r]', el).forEach(function (i) { i.onchange = function () { D.rows[+i.dataset.r].fees[i.dataset.c] = num(i.value); save(); }; });
  $$('[data-rh]', el).forEach(function (i) { i.onchange = function () { D.rows[+i.dataset.rh].hours = num(i.value); D.rows.sort(function (a, b) { return a.hours - b.hours; }); save(); rerender(); }; });
  $$('[data-cn]', el).forEach(function (i) { i.onchange = function () { D.cats[+i.dataset.cn].name = i.value; save(); }; });
  $$('[data-rd]', el).forEach(function (b) { b.onclick = function () { D.rows.splice(+b.dataset.rd, 1); save(); rerender(); }; });
  $$('[data-cd]', el).forEach(function (b) { b.onclick = function () { var c = D.cats[+b.dataset.cd]; if (db.students.some(function (s) { return s.dcCat === c.id; })) return toast('Students are using this category'); confirmDel('category', function () { D.cats.splice(+b.dataset.cd, 1); save(); rerender(); }); }; });
  $('#ar', el).onclick = function () { var last = D.rows[D.rows.length - 1]; D.rows.push({ hours: last ? last.hours + 1 : 1, fees: {} }); save(); rerender(); };
  $('#ac', el).onclick = function () { D.cats.push({ id: uid(), name: 'New category' }); save(); rerender(); };
}

/* ---------- Invoices ---------- */
function invTable(list) {
  if (!list.length) return '<div class="empty"><b>No invoices yet</b>Click “+ New invoice” to create one.</div>';
  return '<div class="tbl-w"><table class="tbl"><thead><tr><th>Invoice</th><th>Date</th><th>Student</th><th>For</th><th class="num">Total</th><th class="num">Received</th><th>Status</th><th></th></tr></thead><tbody>' + list.map(function (i) {
    return '<tr><td><b>' + esc(i.no) + '</b></td><td>' + fdate(i.date) + '</td><td>' + esc(i.student.name) + '<div class="muted">' + esc(i.student.parent) + '</div></td><td>' + esc(i.forText) + '</td><td class="num">' + inr(i.total) + '</td><td class="num">' + inr(i.received) + '</td><td>' + badge(i.status) + '</td><td><div class="acts"><button class="btn sm" data-iv="' + i.id + '">View</button>' + (i.status !== 'paid' ? '<button class="btn y sm" data-ip="' + i.id + '">Payment</button>' : '') + '<button class="btn r sm" data-id="' + i.id + '">✕</button></div></td></tr>';
  }).join('') + '</tbody></table></div>';
}
function bindInvTable(el) {
  $$('[data-iv]', el).forEach(function (b) { b.onclick = function () { viewInvoice(byId(db.invoices, b.dataset.iv)); }; });
  $$('[data-ip]', el).forEach(function (b) { b.onclick = function () { payForm(byId(db.invoices, b.dataset.ip)); }; });
  $$('[data-id]', el).forEach(function (b) { b.onclick = function () { confirmDel('invoice', function () { db.invoices = db.invoices.filter(function (x) { return x.id !== b.dataset.id; }); save(); rerender(); }); }; });
}
function vInvoices(el) {
  var st = q.inv || (q.inv = { t: '', f: 'all' });
  var list = db.invoices.slice().reverse().filter(function (i) { var t = st.t.toLowerCase(); return (!t || (i.no + ' ' + i.student.name + ' ' + i.student.parent + ' ' + i.student.phone).toLowerCase().indexOf(t) >= 0) && (st.f === 'all' || i.status === st.f); });
  var tot = list.reduce(function (a, i) { a[0] += invTotal(i); a[1] += invPaid(i); return a; }, [0, 0]);
  el.innerHTML = '<div class="toolbar"><input class="in" id="q" placeholder="Search invoice no., student, parent…" value="' + esc(st.t) + '"><div class="seg" id="sf">' + [['all', 'All'], ['paid', 'Paid'], ['partial', 'Part paid'], ['unpaid', 'Unpaid']].map(function (x) { return '<button data-f="' + x[0] + '" class="' + (st.f === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
    '<div class="row muted" style="margin-bottom:10px">' + list.length + ' invoices · Billed ' + inr(tot[0]) + ' · Received ' + inr(tot[1]) + ' · Pending ' + inr(tot[0] - tot[1]) + '</div>' + invTable(list);
  $('#q', el).oninput = function (e) { st.t = e.target.value; var p = e.target.selectionStart; vInvoices(el); var i = $('#q', el); i.focus(); i.setSelectionRange(p, p); };
  $$('[data-f]', el).forEach(function (b) { b.onclick = function () { st.f = b.dataset.f; vInvoices(el); }; });
  bindInvTable(el);
}
function payForm(i) {
  var due = invTotal(i) - invPaid(i);
  var m = modal('Record payment · ' + i.no, '<div class="sum" style="margin-bottom:14px"><div><span>Invoice total</span><b>' + inr(i.total) + '</b></div><div><span>Received so far</span><b>' + inr(i.received) + '</b></div><div><span>Balance</span><b>' + inr(due) + '</b></div></div><div class="form">' +
    field({ n: 'amt', l: 'Amount received now (₹)', type: 'number' }, due) + field({ n: 'mode', l: 'Payment mode', type: 'select', opts: ['Cash', 'UPI', 'Bank transfer', 'Cheque', 'Card'] }, i.mode) + field({ n: 'ref', l: 'Reference / UTR / cheque no.' }, '') + '</div>', '<button class="btn g" data-x>Cancel</button><button class="btn" id="sv">Save payment</button>', 480);
  $('#sv', m).onclick = function () { var d = readForm(m), a = num(d.amt); if (a <= 0) return toast('Enter an amount'); i.received = Math.min(invTotal(i), invPaid(i) + a); i.mode = d.mode; if (d.ref) i.ref = (i.ref ? i.ref + ', ' : '') + d.ref; i.status = i.received >= invTotal(i) ? 'paid' : 'partial'; i.payments = (i.payments || []).concat([{ date: today(), amt: a, mode: d.mode, ref: d.ref }]); save(); m.remove(); toast('Payment recorded'); rerender(); };
}

/* invoice builder */
function invoiceForm(sid) {
  var s0 = sid ? byId(db.students, sid) : null;
  var f = { mode: s0 ? 'existing' : (db.students.length ? 'existing' : 'new'), sid: s0 ? s0.id : '', s: { name: '', parent: '', phone: '', email: '', address: '' }, saveStu: true,
    kind: 'package', pkgId: db.packages[0] && db.packages[0].id, plan: 'inst', parts: [], dcCat: db.daycare.cats[0] && db.daycare.cats[0].id, dcHours: db.daycare.rows[0] && db.daycare.rows[0].hours, dcMonths: 1, dcFrom: today().slice(0, 7),
    extras: [], discount: 0, date: today(), status: 'paid', received: '', pmode: 'Cash', ref: '', notes: '' };
  function fromStudent() {
    var s = byId(db.students, f.sid); if (!s) return;
    f.kind = s.type === 'daycare' ? 'daycare' : s.type === 'both' ? 'both' : 'package';
    if (s.pkgId) f.pkgId = s.pkgId; if (s.dcCat) f.dcCat = s.dcCat; if (s.dcHours) f.dcHours = s.dcHours;
    autoParts();
  }
  function autoParts() {
    var p = byId(db.packages, f.pkgId); f.parts = []; if (!p) return;
    var done = f.mode === 'existing' && f.sid ? invoicedParts(f.sid, p.id) : { full: {}, half: {}, inst: {} };
    if (f.plan === 'full') f.parts = done.full[0] ? [] : [0];
    else { var n = f.plan === 'half' ? 2 : p.inst.length; for (var k = 0; k < n; k++) if (!done[f.plan][k]) { f.parts = [k]; break; } }
  }
  if (s0) fromStudent(); else autoParts();

  function build() {
    var lines = [], p = byId(db.packages, f.pkgId), pk = null, sched = null;
    if ((f.kind === 'package' || f.kind === 'both') && p) {
      var head = p.name + (p.age ? ' (' + p.age + ')' : '') + ' — ' + p.year;
      var amt = 0, parts = f.parts.slice().sort();
      if (f.plan === 'full') { if (parts.length) { lines.push({ desc: head + ' · Yearly fee (full payment)', qty: 1, rate: p.yearly }); amt = p.yearly; } }
      else if (f.plan === 'half') { var h1 = Math.ceil(p.yearly / 2), hv = [h1, p.yearly - h1]; parts.forEach(function (k) { lines.push({ desc: head + ' · Half payment ' + (k + 1) + ' of 2 (due ' + fdate(p.half[k]) + ')', qty: 1, rate: hv[k] }); amt += hv[k]; }); sched = hv.map(function (v, k) { return { label: 'Half payment ' + (k + 1), due: p.half[k], amount: v, k: k }; }); }
      else { parts.forEach(function (k) { var it = p.inst[k]; lines.push({ desc: head + ' · ' + it.label + (it.due ? ' (due ' + fdate(it.due) + ')' : ''), qty: 1, rate: num(it.amount) }); amt += num(it.amount); }); sched = p.inst.map(function (it, k) { return { label: it.label, due: it.due, amount: num(it.amount), k: k }; }); }
      pk = { id: p.id, name: p.name, year: p.year, yearly: p.yearly, plan: f.plan, parts: parts, amount: amt, sched: sched };
    }
    if (f.kind === 'daycare' || f.kind === 'both') {
      var c = byId(db.daycare.cats, f.dcCat), fee = dcFee(f.dcCat, f.dcHours), mo = Math.max(1, Math.round(num(f.dcMonths)));
      var period = fmonth(f.dcFrom) + (mo > 1 ? ' – ' + fmonth(addMonths(f.dcFrom, mo - 1)) : '');
      lines.push({ desc: 'Day Care — ' + (c ? c.name : '') + ', ' + f.dcHours + ' hrs/day · ' + period, qty: mo, rate: fee, unit: 'month' });
    }
    f.extras.forEach(function (x) { if (x.desc || num(x.amt)) lines.push({ desc: x.desc || 'Other charge', qty: 1, rate: num(x.amt) }); });
    lines.forEach(function (l) { l.amt = num(l.qty) * num(l.rate); });
    var sub = lines.reduce(function (t, l) { return t + l.amt; }, 0), disc = Math.min(sub, Math.max(0, num(f.discount)));
    return { lines: lines, pkg: pk, sub: sub, disc: disc, total: sub - disc };
  }

  var m = modal('New invoice', '<div id="ib"></div>', '<button class="btn g" data-x>Cancel</button><button class="btn" id="mk">Create invoice</button>', 860);
  var box = $('#ib', m);
  function seg(key, opts) { return '<div class="seg" data-seg="' + key + '">' + opts.map(function (o) { return '<button type="button" data-val="' + o[0] + '" class="' + (f[key] === o[0] ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
  function draw() {
    var p = byId(db.packages, f.pkgId), done = f.mode === 'existing' && f.sid && p ? invoicedParts(f.sid, p.id) : { full: {}, half: {}, inst: {} };
    var h = '<div class="form">';
    h += '<div class="sec-t" style="border:none;margin:0;padding:0">1 · Student</div><div class="full">' + seg('mode', [['existing', 'Existing student'], ['new', 'New / walk-in']]) + '</div>';
    if (f.mode === 'existing') h += '<label class="full">Select student<select class="in" data-k="sid"><option value="">— Choose a student —</option>' + db.students.filter(function (s) { return s.status !== 'Left'; }).map(function (s) { return '<option value="' + s.id + '"' + (s.id === f.sid ? ' selected' : '') + '>' + esc(s.name) + ' · ' + esc(s.parent) + ' · ' + esc(studentLabel(s)) + '</option>'; }).join('') + '</select></label>';
    else h += ['name|Child\'s name *', 'parent|Parent name *', 'phone|Mobile *', 'email|Email', 'address|Address'].map(function (x) { var a = x.split('|'); return '<label' + (a[0] === 'address' ? ' class="full"' : '') + '>' + a[1] + '<input class="in" data-s="' + a[0] + '" value="' + esc(f.s[a[0]]) + '"' + (a[0] === 'phone' ? ' inputmode="numeric" maxlength="10"' : '') + '></label>'; }).join('') + '<label class="chk full' + (f.saveStu ? ' on' : '') + '"><input type="checkbox" data-k="saveStu"' + (f.saveStu ? ' checked' : '') + '> Also save to Students list</label>';
    h += '<div class="sec-t">2 · Fees</div><div class="full">' + seg('kind', [['package', 'Preschool package'], ['daycare', 'Day care only'], ['both', 'Package + Day care'], ['other', 'Other charges']]) + '</div>';
    if ((f.kind === 'package' || f.kind === 'both') && p) {
      h += '<label>Program<select class="in" data-k="pkgId">' + db.packages.map(function (x) { return '<option value="' + x.id + '"' + (x.id === f.pkgId ? ' selected' : '') + '>' + esc(x.name) + ' · ' + esc(x.year) + ' · ' + inr(x.yearly) + '/yr</option>'; }).join('') + '</select></label><div class="fl">Payment plan' + seg('plan', [['full', 'Full'], ['half', 'Half (2 parts)'], ['inst', 'Installments']]) + '</div>';
      var opts = f.plan === 'full' ? [{ k: 0, t: 'Full yearly fee', a: p.yearly }] : f.plan === 'half' ? [0, 1].map(function (k) { var h1 = Math.ceil(p.yearly / 2); return { k: k, t: 'Half ' + (k + 1) + ' · due ' + fdate(p.half[k]), a: k ? p.yearly - h1 : h1 }; }) : p.inst.map(function (it, k) { return { k: k, t: it.label + ' · due ' + fdate(it.due), a: it.amount }; });
      h += '<div class="full fl">This invoice covers<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px">' + opts.map(function (o) { var on = f.parts.indexOf(o.k) >= 0, d = done[f.plan][o.k]; return '<label class="chk' + (on ? ' on' : '') + '"><input type="checkbox" data-part="' + o.k + '"' + (on ? ' checked' : '') + '><span style="flex:1">' + esc(o.t) + (d ? '<br><span class="muted">Already invoiced · ' + esc(d) + '</span>' : '') + '</span><b>' + inr(o.a) + '</b></label>'; }).join('') + '</div></div>';
    }
    if (f.kind === 'daycare' || f.kind === 'both') {
      h += '<label>Day care category<select class="in" data-k="dcCat">' + db.daycare.cats.map(function (c) { return '<option value="' + c.id + '"' + (c.id === f.dcCat ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label>' +
        '<label>Hours per day<select class="in" data-k="dcHours">' + db.daycare.rows.map(function (r) { return '<option value="' + r.hours + '"' + (String(r.hours) === String(f.dcHours) ? ' selected' : '') + '>' + r.hours + ' hours · ' + inr(r.fees[f.dcCat]) + '/month</option>'; }).join('') + '</select></label>' +
        '<label>From month<input class="in" type="month" data-k="dcFrom" value="' + esc(f.dcFrom) + '"></label><label>Number of months<input class="in" type="number" min="1" max="12" data-k="dcMonths" value="' + esc(f.dcMonths) + '"></label>';
    }
    h += '<div class="full fl">Other charges (admission, uniform, books, transport…)' + f.extras.map(function (x, i) { return '<div class="row" style="flex-wrap:nowrap"><input class="in" data-x-d="' + i + '" placeholder="Description" value="' + esc(x.desc) + '"><input class="in" type="number" data-x-a="' + i + '" placeholder="₹" value="' + esc(x.amt) + '" style="max-width:140px"><button type="button" class="btn g ic" data-x-r="' + i + '">✕</button></div>'; }).join('') + '<div><button type="button" class="btn g sm" data-x-add>+ Add charge</button></div></div>';
    h += '<label>Discount (₹)<input class="in" type="number" data-k="discount" value="' + esc(f.discount || '') + '" placeholder="0"></label><label>Invoice date<input class="in" type="date" data-k="date" value="' + esc(f.date) + '"></label>';
    h += '<div class="sec-t">3 · Payment</div><div class="full">' + seg('status', [['paid', 'Paid in full'], ['partial', 'Part paid'], ['unpaid', 'Not paid yet']]) + '</div>';
    if (f.status !== 'unpaid') h += '<label>Payment mode<select class="in" data-k="pmode">' + ['Cash', 'UPI', 'Bank transfer', 'Cheque', 'Card'].map(function (x) { return '<option' + (x === f.pmode ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label><label>Reference / UTR / cheque no.<input class="in" data-k="ref" value="' + esc(f.ref) + '"></label>' + (f.status === 'partial' ? '<label>Amount received (₹)<input class="in" type="number" data-k="received" value="' + esc(f.received) + '"></label>' : '');
    h += '<label class="full">Notes on invoice<input class="in" data-k="notes" value="' + esc(f.notes) + '"></label>';
    h += '<div class="full sum" id="sum"></div></div>';
    box.innerHTML = h; summary();
  }
  function summary() {
    var b = build();
    $('#sum', box).innerHTML = (b.lines.length ? b.lines.map(function (l) { return '<div><span>' + esc(l.desc) + (l.qty > 1 ? ' × ' + l.qty : '') + '</span><span>' + inr(l.amt) + '</span></div>'; }).join('') : '<div class="muted">Nothing selected yet</div>') + (b.disc ? '<div><span>Discount</span><span>− ' + inr(b.disc) + '</span></div>' : '') + '<div class="tot"><span>Total</span><span>' + inr(b.total) + '</span></div>';
  }
  box.addEventListener('click', function (e) {
    var sb = e.target.closest('[data-seg] button'); if (sb) { var k = sb.parentNode.dataset.seg; f[k] = sb.dataset.val; if (k === 'plan' || k === 'kind') autoParts(); if (k === 'mode' && f.mode === 'new') f.sid = ''; draw(); return; }
    if (e.target.closest('[data-x-add]')) { f.extras.push({ desc: '', amt: '' }); draw(); return; }
    var xr = e.target.closest('[data-x-r]'); if (xr) { f.extras.splice(+xr.dataset.xR, 1); draw(); }
  });
  box.addEventListener('change', function (e) {
    var t = e.target, k = t.dataset.k;
    if (t.dataset.part != null) { var n = +t.dataset.part, i = f.parts.indexOf(n); if (t.checked && i < 0) f.parts.push(n); if (!t.checked && i >= 0) f.parts.splice(i, 1); draw(); return; }
    if (k === 'saveStu') { f.saveStu = t.checked; draw(); return; }
    if (k) { f[k] = t.value; if (k === 'sid') fromStudent(); if (k === 'pkgId') autoParts(); if (['sid', 'pkgId', 'dcCat'].indexOf(k) >= 0) draw(); else summary(); }
  });
  box.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset.s) { f.s[t.dataset.s] = t.dataset.s === 'phone' ? (t.value = t.value.replace(/\D/g, '').slice(0, 10)) : t.value; return; }
    if (t.dataset.xD != null) f.extras[+t.dataset.xD].desc = t.value; else if (t.dataset.xA != null) f.extras[+t.dataset.xA].amt = t.value; else if (t.dataset.k && t.type !== 'checkbox') f[t.dataset.k] = t.value;
    summary();
  });
  draw();

  $('#mk', m).onclick = function () {
    var stu;
    if (f.mode === 'existing') { stu = byId(db.students, f.sid); if (!stu) return toast('Choose a student'); }
    else {
      if (!f.s.name || !f.s.parent) return toast("Enter child's name and parent name"); if (!/^[6-9]\d{9}$/.test(f.s.phone)) return toast('Enter a valid 10-digit mobile number');
      stu = Object.assign({ id: uid(), created: today(), status: 'Active', admission: f.date, type: f.kind === 'daycare' ? 'daycare' : f.kind === 'both' ? 'both' : 'preschool' }, f.s);
      if (f.kind !== 'daycare') stu.pkgId = f.pkgId; if (f.kind === 'daycare' || f.kind === 'both') { stu.dcCat = f.dcCat; stu.dcHours = f.dcHours; }
      if (f.saveStu) db.students.push(stu);
    }
    var b = build(); if (!b.lines.length || b.total <= 0) return toast('Add at least one fee to the invoice');
    var dup = b.pkg && f.mode === 'existing' ? b.pkg.parts.filter(function (k) { return invoicedParts(stu.id, b.pkg.id)[b.pkg.plan][k]; }) : [];
    if (dup.length && !m.dataset.ok) { m.dataset.ok = 1; return toast('Some selected parts were already invoiced — click Create again to continue'); }
    var rec = f.status === 'paid' ? b.total : f.status === 'partial' ? Math.min(b.total, num(f.received)) : 0;
    if (f.status === 'partial' && rec <= 0) return toast('Enter the amount received');
    var S = db.settings, inv = {
      id: uid(), no: S.prefix + '-' + String(S.next).padStart(4, '0'), date: f.date, studentId: f.saveStu || f.mode === 'existing' ? stu.id : null,
      student: { name: stu.name, parent: stu.parent, phone: stu.phone, email: stu.email || '', address: stu.address || '' },
      lines: b.lines, pkg: b.pkg, sub: b.sub, discount: b.disc, total: b.total, received: rec, status: rec >= b.total ? 'paid' : rec > 0 ? 'partial' : 'unpaid',
      mode: f.status === 'unpaid' ? '' : f.pmode, ref: f.status === 'unpaid' ? '' : f.ref, notes: f.notes,
      forText: [b.pkg ? b.pkg.name + ' · ' + ({ full: 'Full', half: 'Half', inst: 'Installment' }[b.pkg.plan]) : '', f.kind === 'daycare' || f.kind === 'both' ? 'Day care' : '', f.extras.length ? 'Other' : ''].filter(Boolean).join(' + ')
    };
    if (rec) inv.payments = [{ date: f.date, amt: rec, mode: inv.mode, ref: inv.ref }];
    S.next++; db.invoices.push(inv); save(); m.remove(); toast('Invoice ' + inv.no + ' created'); viewInvoice(inv);
    if ((location.hash || '#dashboard') !== '#invoices') location.hash = '#invoices'; else rerender();
  };
}

function invoiceHTML(i) {
  var S = db.settings, P = i.pkg;
  var sched = P && P.sched ? '<table class="sched"><thead><tr><th>' + esc(P.name) + ' · ' + esc(P.year) + ' payment schedule (' + (P.plan === 'half' ? 'Half' : 'Installments') + ')</th><th>Due date</th><th class="r">Amount</th><th>Status</th></tr></thead><tbody>' + P.sched.map(function (r) {
    var paidBefore = i.studentId && db.invoices.some(function (o) { return o !== i && o.studentId === i.studentId && o.pkg && o.pkg.id === P.id && o.pkg.plan === P.plan && o.pkg.parts.indexOf(r.k) >= 0 && o.status === 'paid'; });
    var st = P.parts.indexOf(r.k) >= 0 ? 'This invoice' : paidBefore ? 'Paid earlier' : 'Upcoming';
    return '<tr><td>' + esc(r.label) + '</td><td>' + fdate(r.due) + '</td><td class="r">' + inr(r.amount) + '</td><td>' + st + '</td></tr>';
  }).join('') + '<tr><td colspan="2"><b>Total yearly fee</b></td><td class="r"><b>' + inr(P.yearly) + '</b></td><td></td></tr></tbody></table>' : '';
  var color = { paid: '#1E9E61', partial: '#B7791F', unpaid: '#D23B3B' }[i.status];
  return '<div class="inv"><div class="inv-h"><div class="row" style="align-items:flex-start;gap:14px"><img src="../assets/logo.png" alt=""><div class="sch"><b>' + esc(S.school) + '</b><br>' + esc(S.branch) + '<br>' + esc(S.address) + '<br>' + esc(S.phone) + (S.email ? ' · ' + esc(S.email) : '') + (S.gstin ? '<br>GSTIN: ' + esc(S.gstin) : '') + '</div></div>' +
    '<div class="inv-t"><h2>' + (i.status === 'paid' ? 'RECEIPT' : 'INVOICE') + '</h2><div><b>' + esc(i.no) + '</b></div><div>Date: ' + fdate(i.date) + '</div><div style="margin-top:8px;color:' + color + '"><span class="stamp">' + ({ paid: 'PAID', partial: 'PART PAID', unpaid: 'UNPAID' }[i.status]) + '</span></div></div></div>' +
    '<div class="inv-meta"><div class="bx"><small>Billed to</small><b>' + esc(i.student.parent) + '</b><br>Parent of <b>' + esc(i.student.name) + '</b><br>' + esc(i.student.phone) + (i.student.email ? '<br>' + esc(i.student.email) : '') + (i.student.address ? '<br>' + esc(i.student.address) : '') + '</div>' +
    '<div class="bx"><small>Payment</small>Status: <b>' + ({ paid: 'Paid', partial: 'Part paid', unpaid: 'Unpaid' }[i.status]) + '</b><br>Received: <b>' + inr(i.received) + '</b><br>Balance: <b>' + inr(i.total - i.received) + '</b>' + (i.mode ? '<br>Mode: ' + esc(i.mode) : '') + (i.ref ? '<br>Ref: ' + esc(i.ref) : '') + '</div></div>' +
    '<table><thead><tr><th>#</th><th>Description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>' + i.lines.map(function (l, k) { return '<tr><td>' + (k + 1) + '</td><td>' + esc(l.desc) + '</td><td class="r">' + l.qty + (l.unit ? ' ' + l.unit + (l.qty > 1 ? 's' : '') : '') + '</td><td class="r">' + inr(l.rate) + '</td><td class="r">' + inr(l.amt) + '</td></tr>'; }).join('') + '</tbody></table>' +
    '<div class="totals"><div><span>Subtotal</span><span>' + inr(i.sub) + '</span></div>' + (i.discount ? '<div><span>Discount</span><span>− ' + inr(i.discount) + '</span></div>' : '') + '<div class="gt"><span>Total</span><span>' + inr(i.total) + '</span></div><div><span>Received</span><span>' + inr(i.received) + '</span></div><div><span><b>Balance due</b></span><span><b>' + inr(i.total - i.received) + '</b></span></div></div>' +
    '<div class="words">Amount: Rupees ' + words(i.total) + ' only</div>' + sched + (i.notes ? '<p><b>Note:</b> ' + esc(i.notes) + '</p>' : '') +
    '<div class="inv-f"><div>' + esc(S.footer) + '<br>This is a computer-generated document.</div><div class="sig">Authorised signatory</div></div></div>';
}
function viewInvoice(i) {
  var m = modal(i.no, invoiceHTML(i), '<button class="btn g" data-x>Close</button>' + (i.status !== 'paid' ? '<button class="btn y" id="pay">Record payment</button>' : '') + '<button class="btn" id="pr">🖨 Print / Save PDF</button>', 880);
  $('#pr', m).onclick = function () { $('#print-root').innerHTML = invoiceHTML(i); document.title = i.no + ' - ' + i.student.name; window.print(); };
  var p = $('#pay', m); p && (p.onclick = function () { m.remove(); payForm(i); });
}
addEventListener('afterprint', function () { document.title = 'Admin · Little Millennium Saiyed Vasna'; });

/* ---------- Settings ---------- */
function vSettings(el) {
  var S = db.settings, F = [{ n: 'school', l: 'School name' }, { n: 'branch', l: 'Branch' }, { n: 'address', l: 'Address', full: 1 }, { n: 'phone', l: 'Phone' }, { n: 'email', l: 'Email' }, { n: 'gstin', l: 'GSTIN (optional)' }, { n: 'prefix', l: 'Invoice prefix' }, { n: 'next', l: 'Next invoice number', type: 'number' }, { n: 'footer', l: 'Invoice footer note', full: 1 }];
  el.innerHTML = '<div class="grid g2" style="align-items:start"><div class="card"><h3>School & invoice details</h3><form class="form" id="sf">' + F.map(function (f) { return field(f, S[f.n]); }).join('') + '</form><div class="modal-f"><button class="btn" id="ss">Save details</button></div></div>' +
    '<div class="grid"><div class="card"><h3>Backup</h3><p class="muted">All data is stored only in this browser. Download a backup regularly, and use it to move data to another computer.</p><div class="row"><button class="btn" id="ex">⬇ Download backup</button><label class="btn g">⬆ Restore backup<input type="file" accept=".json" id="im" hidden></label></div></div>' +
    '<div class="card"><h3>Change PIN</h3><form class="row" id="pf"><input class="in pin" id="np" type="password" inputmode="numeric" maxlength="8" placeholder="New PIN" style="flex:1;font-size:16px!important;letter-spacing:.3em"><button class="btn">Update</button></form></div>' +
    '<div class="card"><h3>Reset</h3><p class="muted">Delete all students, staff and invoices and restore the default fee tables.</p><button class="btn r" id="rs">Reset everything</button></div></div></div>';
  $('#ss', el).onclick = function () { var d = readForm($('#sf', el)); d.next = Math.max(1, Math.round(num(d.next))); Object.assign(S, d); save(); toast('Details saved'); };
  $('#ex', el).onclick = function () { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' })); a.download = 'little-millennium-backup-' + today() + '.json'; a.click(); };
  $('#im', el).onchange = function (e) { var file = e.target.files[0]; if (!file) return; var r = new FileReader(); r.onload = function () { try { var d = JSON.parse(r.result); if (!d.packages || !d.invoices) throw 0; d.pin = db.pin; db = d; save(); toast('Backup restored'); rerender(); } catch (x) { toast('That file is not a valid backup'); } }; r.readAsText(file); };
  $('#pf', el).onsubmit = function (e) { e.preventDefault(); var v = $('#np', el).value.trim(); if (!/^\d{4,8}$/.test(v)) return toast('PIN must be 4–8 digits'); db.pin = hash(v); save(); $('#np', el).value = ''; toast('PIN updated'); };
  $('#rs', el).onclick = function () { confirmDel('ALL data', function () { var pin = db.pin; db = defaults(); db.pin = pin; save(); toast('Reset done'); rerender(); }); };
}

setupLock();
})();
