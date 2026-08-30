/* Build with Baker - Mortgage / Affordability Calculator
   CSP-safe: external file, no inline handlers, no injected inline style attributes.
   Element styles are set via the CSSOM (.style.x), which CSP permits. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var money = function (n) { return '$' + Math.round(n).toLocaleString(); };
  /* Read a number field defensively. The min= attributes in the markup never run:
     there is no form submit, so the browser never validates. A blank, non-numeric or
     negative box has to read as 0 here or it propagates into the arithmetic - a blank
     term divided by zero and printed $Infinity, and a negative rate printed negative
     total interest. */
  var nn = function (id) { var v = parseFloat($(id).value); return isFinite(v) && v > 0 ? v : 0; };
  var STORE = 'bwb-mortgage-v1';
  var taxEdited = false;

  /* ---------- localStorage defaults ---------- */
  function loadDefaults() {
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function saveDefaults(d) {
    try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {}
  }
  function applyDefaults(d) {
    if (!d) return;
    if (d.price)  { $('price').value = d.price; $('priceR').value = d.price; }
    if (d.income) { $('income').value = d.income; }
    if (d.rate)   { $('rate').value = d.rate; }
    if (d.downPct != null && d.price) { $('down').value = Math.round(d.price * d.downPct / 100); }
    syncFromDollars();
  }

  /* ---------- down payment $/% sync (dollars are source of truth) ---------- */
  function syncFromDollars() {
    var d = +$('down').value, price = +$('price').value;
    $('downR').value = Math.min(d, +$('downR').max);
    $('downP').value = price > 0 ? (d / price * 100).toFixed(1) : '0';
  }

  /* ---------- charts (inline SVG, no dependencies, CSP-safe) ----------
     No colours here on purpose. Every mark carries a class and the palette lives
     in css/mortgage-calculator.css, so the chart follows the theme; a fill or
     stroke attribute written here would be a light value frozen into dark mode. */
  function polar(cx, cy, r, deg) { var a = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function slice(cx, cy, r, start, end, cls) {
    var p1 = polar(cx, cy, r, start), p2 = polar(cx, cy, r, end);
    var large = (end - start) > 180 ? 1 : 0;
    return '<path d="M' + cx + ',' + cy + ' L' + p1[0].toFixed(2) + ',' + p1[1].toFixed(2) +
      ' A' + r + ',' + r + ' 0 ' + large + ' 1 ' + p2[0].toFixed(2) + ',' + p2[1].toFixed(2) + ' Z" class="' + cls + '"/>';
  }
  function drawDonut(items) {
    var tot = items.reduce(function (s, i) { return s + i.value; }, 0) || 1;
    var a = 0, paths = '';
    items.forEach(function (it) {
      if (it.value <= 0) return;
      var ang = it.value / tot * 360; if (ang >= 359.999) ang = 359.999;
      paths += slice(60, 60, 54, a, a + ang, it.cls); a += ang;
    });
    paths += '<circle cx="60" cy="60" r="34" class="mc-hole"/>';
    var svg = '<svg viewBox="0 0 120 120" width="118" height="118" role="img" aria-label="Monthly payment breakdown">' + paths + '</svg>';
    var legend = items.filter(function (i) { return i.value > 0; }).map(function (it) {
      return '<li><span class="sw"><svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true"><rect width="11" height="11" rx="2" class="' + it.cls + '"/></svg></span>' +
        it.label + '<span class="lv">' + money(it.value) + '</span></li>';
    }).join('');
    return { svg: svg, legend: legend };
  }
  function fmtK(v) { return v >= 1000 ? '$' + Math.round(v / 1000) + 'k' : '$' + Math.round(v); }
  function drawBalance(yr, loan, pmiDropMo) {
    var W = 340, H = 180, L = 46, B = 26, T = 10, R = 10;
    var n = Math.max(yr.length - 1, 1);
    var px = function (i) { return L + (i / n) * (W - L - R); };
    var py = function (v) { return T + (1 - v / (loan || 1)) * (H - T - B); };
    var grid = '', ylab = '', xlab = '', k, Y, val;
    for (k = 0; k <= 4; k++) {
      val = loan * k / 4; Y = py(val);
      grid += '<line x1="' + L + '" y1="' + Y.toFixed(1) + '" x2="' + (W - R) + '" y2="' + Y.toFixed(1) + '" class="mc-gridline"/>';
      ylab += '<text x="' + (L - 6) + '" y="' + (Y + 3).toFixed(1) + '" text-anchor="end" font-size="9" class="mc-axis">' + fmtK(val) + '</text>';
    }
    var step = Math.max(1, Math.round(n / 6)), i;
    for (i = 0; i <= n; i += step) { xlab += '<text x="' + px(i).toFixed(1) + '" y="' + (H - B + 14) + '" text-anchor="middle" font-size="9" class="mc-axis">' + i + '</text>'; }
    var line = yr.map(function (b, idx) { return px(idx).toFixed(1) + ',' + py(b).toFixed(1); }).join(' ');
    var area = px(0).toFixed(1) + ',' + py(0).toFixed(1) + ' ' + line + ' ' + px(n).toFixed(1) + ',' + py(0).toFixed(1);
    var marker = '';
    if (pmiDropMo !== null && pmiDropMo > 0) {
      var X = px(pmiDropMo / 12);
      marker = '<line x1="' + X.toFixed(1) + '" y1="' + T + '" x2="' + X.toFixed(1) + '" y2="' + (H - B) + '" class="mc-marker" stroke-width="1.5" stroke-dasharray="3 3"/>' +
        '<text x="' + (X + 3).toFixed(1) + '" y="' + (T + 10) + '" font-size="8.5" class="mc-axis">PMI ends</text>';
    }
    /* No height attribute: "auto" is not a valid SVG length and throws a console
       error. With viewBox + width="100%", height resolves from the intrinsic
       aspect ratio, which is what "auto" was reaching for anyway. */
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Loan balance over time">' +
      grid + '<polygon points="' + area + '" class="mc-area"/>' +
      '<polyline points="' + line + '" class="mc-line" stroke-width="2"/>' +
      marker + ylab + xlab +
      '<text x="' + (L + (W - L - R) / 2).toFixed(1) + '" y="' + (H - 1) + '" text-anchor="middle" font-size="9" class="mc-axis">Years</text></svg>';
  }

  /* ---------- amortization simulation ---------- */
  function simulate(loan, mRate, basePmt, extraMo, oneTime, price) {
    var bal = loan - oneTime; if (bal < 0) bal = 0;
    var totInt = 0, m = 0, pmiDrop = null;
    var drop = price * 0.80, yearly = [bal];
    if (bal <= drop) pmiDrop = 0;
    while (bal > 0.005 && m < 1200) {
      m++;
      var interest = bal * mRate;
      var principal = basePmt - interest + extraMo;
      if (principal <= 0) { totInt += interest; break; }
      if (principal > bal) principal = bal;
      totInt += interest; bal -= principal;
      if (pmiDrop === null && bal <= drop) pmiDrop = m;
      if (m % 12 === 0) yearly.push(bal);
    }
    if (m % 12 !== 0) yearly.push(bal);
    return { months: m, totalInterest: totInt, pmiDrop: pmiDrop, yearly: yearly };
  }
  function ym(months) {
    var y = Math.floor(months / 12), mo = months % 12;
    if (months <= 0) return 'now';
    return ((y ? y + ' yr ' : '') + (mo ? mo + ' mo' : '')).trim() || '0 mo';
  }
  function addMonths(months) { var d = new Date(); d.setMonth(d.getMonth() + months); return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); }

  /* pct === null means the ratio is undefined, not zero. Without this branch a blank
     income scored 0% on both gauges, turned both pills green and printed the best
     possible verdict - the most misleading output on the page. */
  function setGauge(fillId, pillId, pctId, pct, t1, t2) {
    if (pct === null) {
      $(pctId).textContent = '-';
      $(fillId).style.width = '0%';
      var np = $(pillId); np.textContent = 'NO INCOME'; np.className = 'pill pn';
      return -1;
    }
    $(pctId).textContent = pct.toFixed(0) + '%';
    var fill = $(fillId), pill = $(pillId), cls, col;
    fill.style.width = Math.min(pct, 100) + '%';
    if (pct <= t1) { cls = 'pg'; col = 'var(--ok-bar)'; pill.textContent = 'OK'; }
    else if (pct <= t2) { cls = 'pa'; col = 'var(--tight-bar)'; pill.textContent = 'TIGHT'; }
    else { cls = 'pr'; col = 'var(--high-bar)'; pill.textContent = 'HIGH'; }
    fill.style.background = col; pill.className = 'pill ' + cls;
    return pct <= t1 ? 0 : (pct <= t2 ? 1 : 2);
  }

  /* ---------- main calc ---------- */
  function calc() {
    var price = nn('price'), down = nn('down');
    var rate = nn('rate') / 100, term = nn('term');
    var income = nn('income'), debt = nn('debt'), cash = nn('cash');
    var extraMo = nn('extraMo'), extraOnce = nn('extraOnce');
    var ins = nn('ins'), pmiR = nn('pmiR') / 100, maintR = nn('maintR') / 100;
    var util = nn('uElec') + nn('uHeat') + nn('uWater') + nn('uTrash') + nn('uNet');

    if (!taxEdited) { $('taxYr').value = Math.round(price * 0.018); }
    var taxYr = nn('taxYr');

    var loan = Math.max(price - down, 0);
    var gMonthly = income / 12;
    var r = rate / 12, n = Math.round(term * 12);
    /* n === 0 is the blank-term case. Math.pow(1+r,0)-1 is exactly 0, so the standard
       formula divides by zero and renders $Infinity. Guard before dividing, not after. */
    var pi = n > 0 ? (r > 0 ? loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loan / n) : 0;
    var tax = taxYr / 12, insM = ins / 12;
    var downPct = price > 0 ? down / price * 100 : 0;
    var hasPMI = downPct < 20;
    var pmi = hasPMI ? loan * pmiR / 12 : 0;
    var piti = pi + tax + insM + pmi;
    var allin = piti + util + (price * maintR / 12);

    $('pi').textContent = money(pi);
    $('tax').textContent = money(tax);
    $('insM').textContent = money(insM);
    $('pmi').textContent = money(pmi);
    $('pmiNote').textContent = hasPMI ? '' : '(none - 20%+ down)';
    $('utilM').textContent = money(util);
    $('maintM').textContent = money(price * maintR / 12);
    $('piti').textContent = money(piti);
    $('allin').textContent = money(allin);

    var d = drawDonut([
      { label: 'Principal & interest', value: pi, cls: 'mc-s1' },
      { label: 'Property tax', value: tax, cls: 'mc-s2' },
      { label: 'Insurance', value: insM, cls: 'mc-s3' },
      { label: 'PMI', value: pmi, cls: 'mc-s4' }
    ]);
    $('donut').innerHTML = d.svg; $('donutLegend').innerHTML = d.legend;

    /* No income means the ratios are undefined, not zero. Passing null makes both gauges
       say so instead of scoring a blank box as the best possible result. */
    var fe = gMonthly > 0 ? piti / gMonthly * 100 : null, be = gMonthly > 0 ? (piti + debt) / gMonthly * 100 : null;
    var feL = setGauge('feFill', 'fePill', 'fePct', fe, 28, 33);
    var beL = setGauge('beFill', 'bePill', 'bePct', be, 36, 43);
    var worst = Math.max(feL, beL), v = $('verdict');
    if (worst < 0) { v.className = 'verdict va'; v.textContent = 'Enter your gross annual income to see whether this payment fits.'; }
    else if (worst === 0) { v.className = 'verdict vg'; v.textContent = 'Comfortable - both ratios are within standard guidelines.'; }
    else if (worst === 1) { v.className = 'verdict va'; v.textContent = 'Tight - approvable, but little slack. Watch utilities and savings.'; }
    else { v.className = 'verdict vr'; v.textContent = 'High - over the comfortable line. Lower price, raise down payment, or cut debt.'; }

    /* An amortisation schedule needs a loan, a term and a payment. Without all three the
       simulation bails on its first iteration and reports a one-month payoff, which reads
       as a spectacular result rather than as missing input. */
    var ev = $('extraVerdict');
    if (loan > 0 && n > 0 && pi > 0) {
      var base = simulate(loan, r, pi, 0, 0, price);
      var cur = simulate(loan, r, pi, extraMo, extraOnce, price);
      $('payoffDate').textContent = addMonths(cur.months);
      $('payoffTime').textContent = ym(cur.months);
      $('totInt').textContent = money(cur.totalInterest);
      $('totPaid').textContent = money(loan + cur.totalInterest);
      $('pmiDrop').textContent = hasPMI ? (cur.pmiDrop === null ? '-' : addMonths(cur.pmiDrop) + ' (' + ym(cur.pmiDrop) + ')') : 'No PMI';
      var intSaved = base.totalInterest - cur.totalInterest, moSaved = base.months - cur.months;
      $('intSaved').textContent = money(intSaved);
      $('timeSaved').textContent = moSaved > 0 ? ym(moSaved) : 'none';
      $('amortChart').innerHTML = drawBalance(cur.yearly, loan, hasPMI ? cur.pmiDrop : null);
      if (extraMo > 0 || extraOnce > 0) { ev.hidden = false; ev.textContent = 'With these extra payments you pay off ' + ym(moSaved) + ' sooner and save ' + money(intSaved) + ' in interest.'; }
      else { ev.hidden = true; }
    } else {
      ['payoffDate', 'payoffTime', 'totInt', 'totPaid', 'intSaved', 'timeSaved'].forEach(function (id) { $(id).textContent = '-'; });
      $('pmiDrop').textContent = hasPMI ? '-' : 'No PMI';
      $('amortChart').innerHTML = '';
      ev.hidden = true;
    }

    var ccOrig = loan * 0.0075, ccApp = 500, ccProc = 400, ccRec = 300, ccTitle = price * 0.0055, ccEsc = (tax * 3) + ins;
    var ccTotal = ccOrig + ccApp + ccProc + ccTitle + ccRec + ccEsc;
    $('ccOrig').textContent = money(ccOrig);
    $('ccTitle').textContent = money(ccTitle);
    $('ccEsc').textContent = money(ccEsc);
    $('ccTotal').textContent = money(ccTotal);

    /* A one-time extra payment is applied against the balance at closing (see simulate),
       so it is cash out of pocket on the same day. Leaving it out of "cash needed" credited
       the principal reduction while reporting the cushion unchanged - the two panels
       contradicted each other. */
    var extraRow = $('ccExtraRow');
    if (extraRow) { extraRow.hidden = extraOnce <= 0; $('ccExtra').textContent = money(extraOnce); }
    var need = down + ccTotal + extraOnce, cushion = cash - need;
    $('loan').textContent = money(loan);
    $('downPct').textContent = downPct.toFixed(1) + '%';
    $('close').textContent = money(ccTotal);
    $('need').textContent = money(need);
    $('avail').textContent = money(cash);
    $('cushion').textContent = money(cushion);
    var cv = $('cushVerdict');
    if (cushion < 0) { cv.className = 'verdict vr'; cv.textContent = 'Short by ' + money(-cushion) + ' - not enough cash to cover down payment + closing.'; }
    else if (cushion < 3000) { cv.className = 'verdict va'; cv.textContent = 'Only ' + money(cushion) + ' left after closing - thin emergency cushion.'; }
    else { cv.className = 'verdict vg'; cv.textContent = money(cushion) + ' left after closing as a cushion.'; }
  }

  /* ---------- wiring ---------- */
  $('price').addEventListener('input', function () { $('priceR').value = $('price').value; syncFromDollars(); calc(); });
  $('priceR').addEventListener('input', function () { $('price').value = $('priceR').value; syncFromDollars(); calc(); });
  $('down').addEventListener('input', function () { syncFromDollars(); calc(); });
  $('downR').addEventListener('input', function () { $('down').value = $('downR').value; syncFromDollars(); calc(); });
  $('downP').addEventListener('input', function () {
    var price = +$('price').value, p = +$('downP').value;
    $('down').value = Math.ceil(price * p / 100);
    $('downR').value = Math.min(+$('down').value, +$('downR').max);
    calc();
  });
  // Only the down-payment quick-percent chips carry data-pct. Scoping the
  // selector to [data-pct] prevents the toolbar buttons (Print, Download),
  // which share the .qbtn style class, from zeroing the down payment on click.
  Array.prototype.forEach.call(document.querySelectorAll('.qbtn[data-pct]'), function (b) {
    b.addEventListener('click', function () {
      var price = +$('price').value, p = +b.getAttribute('data-pct');
      /* Ceil, not round. On a price that is not divisible by 5, rounding down landed a
         hair under the target - the 20% chip gave 19.999882%, which displays as "20.0%"
         and charges PMI at the same time. A chip labelled 20% has to give at least 20%. */
      $('down').value = Math.ceil(price * p / 100); syncFromDollars(); calc();
    });
  });
  ['rate', 'term', 'income', 'debt', 'cash', 'extraMo', 'extraOnce', 'ins', 'pmiR', 'maintR',
    'uElec', 'uHeat', 'uWater', 'uTrash', 'uNet'].forEach(function (id) { $(id).addEventListener('input', calc); });
  $('taxYr').addEventListener('input', function () { taxEdited = true; calc(); });
  $('taxReset').addEventListener('click', function () { taxEdited = false; calc(); });
  $('printBtn').addEventListener('click', function () { window.print(); });

  /* ---------- download a plain-text summary (dependency-free, CSP-safe) ---------- */
  function txt(id) { var el = $(id); return el ? el.textContent.trim() : ''; }
  function val(id) { var el = $(id); return el ? el.value : ''; }
  function pad(label, value) { return (label + ':').padEnd(24, ' ') + value; }
  function buildSummary() {
    var now = new Date();
    var stamp = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    var price = +val('price'), down = +val('down');
    var downPct = price > 0 ? (down / price * 100).toFixed(1) : '0';
    var L = [];
    L.push('BUILD WITH BAKER - HOME AFFORDABILITY SUMMARY');
    L.push('Generated ' + stamp);
    L.push('');
    L.push('INPUTS');
    L.push(pad('Home price', money(price)));
    L.push(pad('Down payment', money(down) + '  (' + downPct + '%)'));
    L.push(pad('Loan amount', txt('loan')));
    L.push(pad('Interest rate', val('rate') + '% APR'));
    L.push(pad('Loan term', val('term') + ' years'));
    L.push(pad('Gross income', money(+val('income')) + ' / yr'));
    L.push(pad('Other monthly debt', money(+val('debt')) + ' / mo'));
    L.push(pad('Cash available', money(+val('cash'))));
    if (+val('extraMo') > 0) L.push(pad('Extra principal/mo', money(+val('extraMo'))));
    if (+val('extraOnce') > 0) L.push(pad('One-time extra', money(+val('extraOnce'))));
    L.push('');
    L.push('MONTHLY PAYMENT');
    L.push(pad('Principal & interest', txt('pi')));
    L.push(pad('Property tax', txt('tax')));
    L.push(pad('Insurance', txt('insM')));
    L.push(pad('PMI', txt('pmi') + ' ' + txt('pmiNote')));
    L.push(pad('PITI', txt('piti')));
    L.push(pad('Utilities', txt('utilM')));
    L.push(pad('Maintenance reserve', txt('maintM')));
    L.push(pad('All-in monthly', txt('allin')));
    L.push('');
    L.push('AFFORDABILITY');
    L.push(pad('Front-end DTI', txt('fePct') + '  (' + txt('fePill') + ')'));
    L.push(pad('Back-end DTI', txt('bePct') + '  (' + txt('bePill') + ')'));
    L.push('Verdict: ' + txt('verdict'));
    L.push('');
    L.push('PAYOFF');
    L.push(pad('Payoff date', txt('payoffDate') + '  (' + txt('payoffTime') + ')'));
    L.push(pad('Total interest', txt('totInt')));
    L.push(pad('Total paid (P+I)', txt('totPaid')));
    L.push(pad('PMI drops off', txt('pmiDrop')));
    if (+val('extraMo') > 0 || +val('extraOnce') > 0) {
      L.push(pad('Interest saved', txt('intSaved')));
      L.push(pad('Time saved', txt('timeSaved')));
    }
    L.push('');
    L.push('CLOSING & CASH');
    L.push(pad('Est. closing costs', txt('close')));
    L.push(pad('Down + closing needed', txt('need')));
    L.push(pad('Cash cushion after', txt('cushion')));
    L.push('');
    L.push('----------------------------------------');
    L.push('Estimates only - not financial advice.');
    L.push('buildwithbaker.io/mortgage-calculator');
    return L.join('\n');
  }
  $('downloadBtn').addEventListener('click', function () {
    var blob = new Blob([buildSummary()], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'affordability-summary.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  });
  window.addEventListener('beforeprint', function () { Array.prototype.forEach.call(document.querySelectorAll('details'), function (d) { d.dataset.wo = d.open ? '1' : ''; d.open = true; }); });
  window.addEventListener('afterprint', function () { Array.prototype.forEach.call(document.querySelectorAll('details'), function (d) { d.open = d.dataset.wo === '1'; }); });

  /* ---------- onboarding dialog ---------- */
  var dlg = $('onboard');
  $('resetDefaults').addEventListener('click', function () {
    try { localStorage.removeItem(STORE); } catch (e) {}
    if (dlg && dlg.showModal) dlg.showModal();
  });
  if (dlg) {
    $('obForm').addEventListener('submit', function (e) {
      // method="dialog" closes the dialog; capture + persist first
      var def = {
        income: +$('obIncome').value || +$('income').value,
        price: +$('obPrice').value || +$('price').value,
        downPct: +$('obDownPct').value || 0,
        rate: +$('obRate').value || +$('rate').value
      };
      saveDefaults(def); applyDefaults(def); calc();
    });
    $('obSkip').addEventListener('click', function () { dlg.close(); });
  }

  /* ---------- init ---------- */
  var stored = loadDefaults();
  if (stored) { applyDefaults(stored); }
  calc();
  if (!stored && dlg && dlg.showModal) {
    // prefill the dialog with the current generic values as a starting point
    $('obIncome').value = $('income').value;
    $('obPrice').value = $('price').value;
    $('obDownPct').value = $('downP').value;
    $('obRate').value = $('rate').value;
    dlg.showModal();
  }
})();
