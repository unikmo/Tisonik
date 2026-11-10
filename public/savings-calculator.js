
(function () {
  var F = [
    // group, id, label, default, step, unit. 'fixed' fields are held at our defaults and listed in the report.
    ['ship', 'guests', 'Guests per voyage', 3000, 1, ''],
    ['ship', 'cabins', 'Cabins', 1500, 1, ''],
    ['ship', 'nights', 'Nights per voyage', 7, 1, ''],
    ['ship', 'voyages', 'Voyages per ship per year', 45, 1, ''],
    ['ship', 'ships', 'Ships', 1, 1, ''],
    ['print', 'printCost', 'Printing cost per voyage, all-in', 3630, 100, 'whole ship, including delivery'],
    ['print', 'removed', 'Share of printing the card replaces', 70, 5, '%'],
    ['print', 'priceIn', 'Cost per guest per voyage', 5, 0.5, 'pilot pricing only'],
    ['print', 'spendPD', 'Onboard spend per guest per day', 95, 5, ''],
    ['print', 'bookProfit', 'Profit from one future booking', 600, 50, ''],
    ['print', 'crew', 'Crew on board', 1200, 10, ''],
    ['fixed', 'tipPD', 'Daily gratuity per guest on your ship', 18, 1, 'default: average of published standard rates on major lines'],
    ['fixed', 'sheetG', 'Weight of one printed sheet', 4.5, 0.5, 'grams (A4, 80gsm)'],
    ['fixed', 'cardG', 'Weight of one UNIKMO card and envelope', 9, 1, 'grams'],
    ['fixed', 'co2', 'Carbon per kilogram of paper', 1.2, 0.1, 'kg CO2e'],
    ['fixed', 'issueRate', 'Guests with a problem nobody hears about on board', 2, 0.5, '% of guests'],
    ['fixed', 'caught', 'Of those, caught and fixed before they leave', 50, 5, '%'],
    ['fixed', 'noRebook', 'Of those, who would not book again', 15, 1, '%'],
    ['fixed', 'rebookUp', 'Extra guests who book again because of the keepsake', 0.5, 0.1, 'percentage points of guests'],
    ['fixed', 'uplift', 'Extra onboard spend from better engagement', 0.5, 0.1, '%'],
    ['fixed', 'margin', 'Margin on extra onboard sales', 40, 5, '%'],
    ['fixed', 'revShare', 'Revenue share paid to TISONIK / UNIKMO after pilot', 0, 1, '% of extra sales'],
    ['fixed', 'recogPart', 'Guests who recognise a crew member', 30, 5, '% of guests'],
    ['fixed', 'recogEach', 'Recognitions per participating guest', 2, 1, ''],
    ['fixed', 'turnCut', 'Crew turnover reduction from recognition', 0.5, 0.1, 'percentage points per year'],
    ['fixed', 'replCost', 'Cost to replace one crew member', 5000, 250, ''],
    ['fixed', 'shareRate', 'Guests who share the keepsake', 5, 1, '% of guests'],
    ['fixed', 'shareEach', 'Shares per sharing guest', 2, 1, ''],
    ['fixed', 'reach', 'People reached per share', 300, 25, ''],
    ['fixed', 'cpm', 'What you pay for 1,000 ad impressions', 8, 1, 'sets the value of the exposure'],
    ['fixed', 'surveyPP', 'Post-cruise survey cost per passenger', 2, 0.25, 'per passenger invited'],
    ['fixed', 'surveyShare', 'Share of survey cost UNIKMO and TISONIK could replace', 20, 5, '%'],
    ['fixed', 'surveyRate', 'Guests who complete the post-cruise survey today', 10, 1, '% of guests'],
    ['fixed', 'tisRate', 'Guests expected to give feedback during the voyage', 30, 5, '% of guests']
  ];
  var cur = 'USD';

  function field(id, label, unit, control) {
    var d = document.createElement('div'); d.className = 'field';
    d.innerHTML = '<label for="' + id + '">' + label + '</label>' + control + (unit ? '<span class="unit">' + unit + '</span>' : '');
    return d;
  }
  function build() {
    F.forEach(function (f) {
      document.getElementById('g-' + f[0]).appendChild(field(f[1], f[2], f[5],
        '<input type="number" inputmode="decimal" id="' + f[1] + '" value="' + f[3] + '" step="' + f[4] + '" min="' + (f[1] === 'priceIn' ? 5 : 0) + '">'));
    });
    document.getElementById('g-ship').appendChild(field('cur', 'Currency', '', '<select id="cur"><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select>'));
    var gx = document.getElementById('g-fixed');
    gx.appendChild(field('comm', 'Commission on card sales', '', '<select id="comm"><option value="25" selected>Pilot: 25%</option><option value="30">After the pilot: 30%</option></select>'));
    gx.appendChild(field('attach', 'Guests who buy a card', '% of guests', '<input type="number" id="attach" value="8" step="1" min="0" max="100">'));
    gx.appendChild(field('basket', 'Average basket at list price', '', '<input type="number" id="basket" value="40" step="1" min="0">'));
    gx.appendChild(field('disc', 'Guest discount on cards', '%', '<input type="number" id="disc" value="10" step="1" min="0" max="10">'));
    document.getElementById('form').addEventListener('input', calc);
    document.getElementById('priceIn').addEventListener('change', function () { if (!(parseFloat(this.value) >= 5)) { this.value = 5; calc(); } });
  }
  function v(id) { var n = parseFloat(document.getElementById(id).value); return isFinite(n) && n > 0 ? n : 0; }
  function pc(id) { return Math.min(v(id), 100) / 100; }
  // The PDF uses only characters its built-in font can draw, so formatting switches while a report is built.
  var pdfMode = false;
  var M = null; // the latest results, read by the PDF report
  function clean(s) {
    return String(s).replace(/[   ]/g, ' ').replace(/−/g, '-')
      .replace(/[^\x20-\x7E¡-ÿ€–—‘’“”•]/g, '');
  }
  function minus() { return pdfMode ? '-' : '−'; }
  function money(n, dec) {
    var s = new Intl.NumberFormat(pdfMode ? 'en-US' : undefined, { style: 'currency', currency: cur, maximumFractionDigits: dec == null ? 0 : dec, minimumFractionDigits: dec == null ? 0 : dec }).format(n);
    return pdfMode ? clean(s) : s;
  }
  function num(n) { return new Intl.NumberFormat(pdfMode ? 'en-US' : undefined, { maximumFractionDigits: 0 }).format(n); }
  function signed(n) { return (n < 0 ? minus() : '+') + money(Math.abs(n)); }

  function calc() {
    cur = document.getElementById('cur').value;
    var guests = v('guests'), cabins = v('cabins'), nights = v('nights'), voy = v('voyages'), ships = v('ships') || 1;

    // printing today
    var today = v('printCost');
    var sheetsToday = today / 0.0864; // about 11.6 printed sheets per unit of all-in cost
    var removed = pc('removed');
    var saved = today * removed;

    // environment
    var kgRemoved = sheetsToday * removed * v('sheetG') / 1000;
    var kgAdded = guests * v('cardG') / 1000;
    var kgNet = kgRemoved - kgAdded;
    var co2 = kgNet * v('co2');

    // bundle and card sales
    var listPrice = Math.max(v('priceIn'), 5);
    var annualList = listPrice * guests * voy * ships;
    var cap = 0;
    var annualFee = cap > 0 ? Math.min(annualList, cap) : annualList;
    var fee = voy * ships ? annualFee / (voy * ships) : 0;
    var price = guests ? fee / guests : 0;
    var disc = Math.min(v('disc'), 10) / 100;
    var buyers = guests * pc('attach');
    var sales = buyers * v('basket') * (1 - disc);
    var comm = sales * parseFloat(document.getElementById('comm').value) / 100;

    // estimated value
    var issuesFixed = guests * pc('issueRate') * pc('caught');
    var issuesVal = issuesFixed * pc('noRebook') * v('bookProfit');
    var extraRev = guests * nights * v('spendPD') * v('uplift') / 100;
    var extraMargin = extraRev * pc('margin');
    var share = extraRev * pc('revShare');
    var recogs = guests * pc('recogPart') * v('recogEach');
    var crewVal = voy ? v('crew') * v('turnCut') / 100 * v('replCost') / voy : 0;
    var rebooks = guests * v('rebookUp') / 100;
    var keepVal = rebooks * v('bookProfit');
    var shares = guests * pc('shareRate') * v('shareEach');
    var reach = shares * v('reach');
    var mediaVal = reach / 1000 * v('cpm');
    var surveySpend = guests * v('surveyPP');
    var surveyVal = surveySpend * pc('surveyShare');
    var perResponse = pc('surveyRate') > 0 ? v('surveyPP') / pc('surveyRate') : 0;
    var voices = guests * Math.max(pc('tisRate') - pc('surveyRate'), 0);
    var value = issuesVal + extraMargin - share + crewVal + keepVal + mediaVal + surveyVal;

    var hard = saved - fee;
    var all = hard + value;
    var withSales = all + comm; // card sales sit on top of the ship's own benefits
    var mult = voy * ships;

    // top benefits
    function advList() { return [
      ['Lower printing and labour cost', 'Calculated', money(saved) + ' per voyage',
        'Daily programs, flyers and welcome packs replaced by the card and your app.'],
      ['Guests recognise your crew', 'Estimate, no extra charge', num(recogs) + ' recognitions, ' + money(crewVal) + ' retention value',
        'Included in the bundle. Guests thank crew in the moment, which supports retention and service quality from day one.'],
      ['Problems caught before they go public', 'Estimate', num(issuesFixed) + ' fixed, ' + money(issuesVal) + ' kept',
        'Guests tell TISONIK privately, so you can fix it before it reaches a review or social media.'],
      ['Feedback without the long survey', 'Estimate', num(voices) + ' more guests heard, ' + money(surveyVal) + ' survey cost reduced',
        'Each completed survey costs you ' + money(perResponse, 2) + ' today. Guests give a quick answer while still on board, with no extra cost beyond the bundle.'],
      ['More onboard revenue', 'Estimate', money(extraMargin - share) + ' per voyage',
        'Margin on extra onboard spending that relevant TISONIK offers drive. Checkout and payment stay with you.'],
      ['A real sustainability story', 'Calculated', num(kgNet) + ' kg paper, ' + num(co2) + ' kg CO2e',
        'Net of the card and envelope. Fewer printed pages, less ink, less to carry and dispose of.'],
      ['A keepsake that brings guests back', 'Estimate', num(rebooks) + ' extra bookings, ' + money(keepVal),
        'The voyage highlights stay with the guest and keep your brand in their home.'],
      ['Guests share the voyage', 'Estimate, lowest confidence', num(shares) + ' shares, ' + money(mediaVal) + ' exposure',
        'Valued at what you would pay to reach the same number of people with ads.'],
      ['Card sales, if you want them', 'Calculated, optional', money(comm) + ' commission per voyage',
        'Guests who want more can buy private cards in your shop. You keep a commission, calculated before taxes.']
    ]; }
    var ORDER = [4, 0, 2, 1, 6, 3, 5, 7, 8]; // most relevant first
    // On the page: text only. The figures sit in the results beside, and in the PDF.
    var SHORT = [
      ['Less printing, less labour', 'The card and your app replace the daily paper round.'],
      ['Crew who feel seen', 'Guests thank crew in the moment. Retention starts on board.'],
      ['Problems fixed in time', 'Guests tell you privately, before it reaches a review.'],
      ['Feedback without the survey', 'A quick answer on board beats a long form weeks later.'],
      ['More onboard revenue', 'Relevant offers at the right moment. Checkout stays yours.'],
      ['A real sustainability story', 'Fewer printed pages, less ink, less to carry and dispose of.'],
      ['A keepsake that brings guests back', 'The voyage stays in their home, with your brand on it.'],
      ['Guests share the voyage', 'Every shared keepsake reaches people you would pay to reach.'],
      ['Card sales, if you want them', 'Optional. Guests buy more cards in your shop, you earn a commission.']
    ];
    document.getElementById('adv').innerHTML = ORDER.map(function (i) { return SHORT[i]; }).map(function (a) {
      return '<div class="a"><span class="tick"></span><div><h3>' + a[0] + '</h3><p class="why">' + a[1] + '</p></div></div>';
    }).join('');

    // results
    var allEl = document.getElementById('r-all');
    allEl.textContent = signed(all * mult); allEl.className = 'big ' + (all >= 0 ? 'pos' : 'neg');
    document.getElementById('r-all-sub').textContent = 'after the bundle fee, across ' + ships + (ships === 1 ? ' ship' : ' ships') + ' and ' + voy + ' voyages each. That is ' + signed(all) + ' per voyage.';
    function beText() {
      var unitMargin = pc('margin') - pc('revShare');
      var gap = -hard - (value - extraMargin + share);
      var denom = guests * nights * v('spendPD') * unitMargin;
      if (hard >= 0 || gap <= 0) return 'The fee is covered even before any extra onboard spending.';
      if (denom > 0) return 'With the other estimates in place, extra onboard spending would need to rise by ' + (gap / denom * 100).toFixed(2) + '% to break even.';
      return '';
    }
    document.getElementById('r-be').textContent = beText();
    document.getElementById('r-sales').textContent = comm > 0
      ? 'Card sales are on top: if guests buy cards in your shop, your commission adds ' + money(comm) + ' per voyage, ' + signed(withSales * mult) + ' over the year in total.'
      : '';

    function ctxText() {
      var tip = v('tipPD'), perGD = nights ? price / nights : 0;
      var ctx = 'Guests on major lines already pay about ' + money(tip) + ' a day in gratuities, ' + money(tip * nights) + ' over ' + nights + (nights === 1 ? ' night' : ' nights') + '. The bundle is ' + money(price, 2) + ' per guest per voyage, about ' + money(perGD, 2) + ' a day. In return, your ship gets ' + signed(all * mult) + ' a year after the fee.';
      var surveyYear = surveySpend * voy * ships;
      if (surveyYear) ctx += ' Your post-cruise surveys cost about ' + money(surveyYear) + ' a year for the same ships.';
      return ctx;
    }
    var tipTotal = v('tipPD') * nights, fr = tipTotal > 0 ? price / tipTotal * 100 : 0;
    document.getElementById('s-price').textContent = money(price, 2);
    document.getElementById('s-frac').textContent = tipTotal > 0 ? (fr < 10 ? fr.toFixed(1) : Math.round(fr)) + '%' : '';
    document.getElementById('s-frac-cap').textContent = 'of the ' + money(tipTotal) + ' guests already pay in tips (about ' + money(v('tipPD')) + ' a day)';
    document.getElementById('s-benefit').textContent = signed(all * mult);

    var offset = saved + Math.max(value, 0) + comm;
    var max = Math.max(fee, offset, 1);
    document.getElementById('bar').innerHTML =
      '<div class="seg paper" style="width:' + saved / max * 100 + '%"></div>' +
      '<div class="seg value" style="width:' + Math.max(value, 0) / max * 100 + '%"></div>' +
      '<div class="seg comm" style="width:' + comm / max * 100 + '%"></div>' +
      '<div class="mark" style="left:' + Math.min(fee / max * 100, 99.5) + '%"></div>';

    function rowList() { return [
      ['head', 'Per voyage', ''],
      ['', 'Printing and delivery today', money(today)],
      ['', 'Printing removed (' + Math.round(removed * 100) + '%)', money(saved)],
      ['', 'TISONIK / UNIKMO bundle fee (' + money(price, 2) + ' per guest)', minus() + money(fee)],
      ['total', 'Net without estimates', signed(hard)],
      ['head', 'Estimated value', ''],
      ['', 'Problems fixed before guests leave (' + v('issueRate') + '% of guests, ' + v('caught') + '% caught in time)', money(issuesVal)],
      ['', 'Margin on extra onboard sales (' + v('uplift') + '% more spend, ' + v('margin') + '% margin)', money(extraMargin)],
      ['', 'Revenue share to TISONIK / UNIKMO (' + v('revShare') + '% of extra sales)', share ? minus() + money(share) : money(0)],
      ['', 'Lower crew turnover (' + v('turnCut') + ' pts a year)', money(crewVal)],
      ['', 'Survey cost reduced (' + v('surveyShare') + '% of ' + money(v('surveyPP'), 2) + ' per guest)', money(surveyVal)],
      ['', 'Guests who book again (' + v('rebookUp') + '% more)', money(keepVal)],
      ['', 'Value of guests sharing (' + v('shareRate') + '% share, ' + num(v('reach')) + ' people reached each)', money(mediaVal)],
      ['total', 'Net with estimates', signed(all)],
      ['head', 'Optional card sales', ''],
      ['', 'Card sales (' + v('attach') + '% of guests buy, ' + money(v('basket')) + ' basket, ' + Math.round(disc * 100) + '% discount)', money(sales)],
      ['', 'Your commission (' + document.getElementById('comm').value + '%)', money(comm)],
      ['total', 'Net including card sales', signed(withSales)],
      ['head', 'Your benefit over one year', ''],
      ['', 'Printing removed (' + ships + (ships === 1 ? ' ship' : ' ships') + ', ' + voy + ' voyages each)', money(saved * mult)],
      ['', 'Estimated guest value', money(value * mult)],
      ['total', 'Net benefit after the bundle fee', signed(all * mult)],
      ['', 'With card sales on top', signed(withSales * mult)]
    ]; }    function shortRows() { return [
      ['', 'Printing removed, per voyage', money(saved)],
      ['', 'TISONIK / UNIKMO bundle fee, per voyage (' + money(price, 2) + ' per guest)', minus() + money(fee)],
      ['total', 'Net per voyage, with estimates', signed(all)],
      ['total', 'Net benefit over one year, after the bundle fee', signed(all * mult)]
    ]; }
    document.getElementById('rows').innerHTML = shortRows().map(function (r) {
      return '<tr class="' + r[0] + '"><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>';
    }).join('');

    M = { adv: function () { var a = advList(); return ORDER.map(function (i) { return a[i]; }); }, rows: rowList, be: beText, ctx: ctxText,
      guests: guests, nights: nights, voy: voy, ships: ships, mult: mult, fee: fee, price: price,
      annualFee: annualFee, saved: saved, comm: comm, value: value, hard: hard, all: all, withSales: withSales, kgNet: kgNet, co2: co2 };
  }
  build(); calc();

  // ---- PDF report. Drawn in your browser with jsPDF, which is loaded only when you press Download. ----
  var JSPDF_URL = '/vendor/jspdf.umd.min.js';
  function loadJsPdf() {
    return new Promise(function (ok, no) {
      if (window.jspdf && window.jspdf.jsPDF) return ok(window.jspdf.jsPDF);
      var s = document.createElement('script');
      s.src = JSPDF_URL;
      s.onload = function () { window.jspdf && window.jspdf.jsPDF ? ok(window.jspdf.jsPDF) : no(new Error('The PDF library did not start')); };
      s.onerror = function () { no(new Error('Could not load the PDF library')); };
      document.head.appendChild(s);
    });
  }

  // Every figure you entered, with a flag for the ones you changed from our illustrative default.
  function collectInputs() {
    var MONEY = { printCost: 1, priceIn: 1, bookProfit: 1, spendPD: 1, replCost: 1, cpm: 1, surveyPP: 1, basket: 1 };
    var groups = [['ship', 'Your ship'], ['print', 'Your costs and value'], ['fixed', 'Assumptions held at our defaults']];
    var extra = {
      ship: [['cur', 'Currency', '']],
      fixed: [['comm', 'Commission on card sales', ''], ['attach', 'Guests who buy a card', '%'], ['basket', 'Average basket at list price', ''], ['disc', 'Guest discount on cards', '%']]
    };
    function read(id, unit) {
      var el = document.getElementById(id), val, changed;
      if (el.tagName === 'SELECT') {
        var d = el.querySelector('option[selected]') || el.options[0];
        changed = el.value !== d.value;
        val = clean(el.options[el.selectedIndex].text);
      } else {
        var n = parseFloat(el.value); if (!isFinite(n)) n = 0;
        changed = n !== parseFloat(el.defaultValue);
        if (MONEY[id]) val = money(n, n % 1 ? 2 : 0);
        else {
          val = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
          if (unit.indexOf('%') === 0) val += '%';
          else if (unit.indexOf('grams') === 0) val += ' g';
          else if (unit.indexOf('seconds') === 0) val += ' s';
          else if (unit.indexOf('percentage points') === 0) val += ' pts';
        }
      }
      return { val: val, changed: changed };
    }
    return groups.map(function (g) {
      var rows = [];
      F.filter(function (f) { return f[0] === g[0]; }).forEach(function (f) {
        var r = read(f[1], f[5]); rows.push({ label: f[2], val: r.val, changed: r.changed });
      });
      (extra[g[0]] || []).forEach(function (e) {
        var r = read(e[0], e[2]); rows.push({ label: e[1], val: r.val, changed: r.changed });
      });
      return { title: g[1], rows: rows };
    });
  }

  function buildPdf(JsPDF) {
    pdfMode = true;
    try {
      var m = M;
      var doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true });
      var W = 210, H = 297, L = 18, CW = 174, R = L + CW, TOP = 26, BOT = H - 22, y = 0;
      // The report uses the TISONIK palette: near-black ink, one bronze accent, warm paper greys.
      var C = { navy: [29, 28, 26], ink2: [60, 57, 52], teal: [128, 83, 49], tealLt: [200, 171, 146], green: [70, 100, 74], red: [156, 61, 42],
        soft: [240, 236, 229], paper: [250, 248, 244], line: [225, 221, 213], muted: [108, 104, 97], white: [255, 255, 255] };
      var who = clean(document.getElementById('org').value.trim());
      var by = clean(document.getElementById('by').value.trim());
      var dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      var pageNo = 1;

      function fillC(c) { doc.setFillColor(c[0], c[1], c[2]); }
      function drawC(c) { doc.setDrawColor(c[0], c[1], c[2]); }
      function T(s, x, yy, o) {
        o = o || {};
        doc.setFont('helvetica', o.b ? 'bold' : 'normal');
        doc.setFontSize(o.s || 9.5);
        var c = o.c || C.navy; doc.setTextColor(c[0], c[1], c[2]);
        var opt = { align: o.a || 'left' };
        if (o.cs) opt.charSpace = o.cs;
        doc.text(String(s), x, yy, opt);
      }
      function lines(s, w, size, bold) {
        doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
        return doc.splitTextToSize(String(s), w);
      }
      function P(s, x, yy, w, o) {
        o = o || {};
        var size = o.s || 9.5, lh = o.lh || size * 0.5, ls = lines(s, w, size, o.b);
        ls.forEach(function (l, i) { T(l, x, yy + i * lh, o); });
        return yy + ls.length * lh;
      }
      function LABEL(s, x, yy, c) { T(String(s).toUpperCase(), x, yy, { s: 7.2, b: 1, c: c || C.teal, cs: 0.35 }); }
      function sign(s) { return String(s).charAt(0) === '-' ? C.red : C.green; }
      function chrome() {
        T('UNIKMO  ×  TISONIK', L, 13, { s: 7, b: 1, c: C.teal, cs: 0.35 });
        var right = 'Cruise Value Assessment' + (who ? '   |   ' + lines(who, 70, 7.5)[0] : '');
        T(right, R, 13, { s: 7.5, c: C.muted, a: 'right' });
        drawC(C.line); doc.setLineWidth(0.2); doc.line(L, 16, R, 16);
      }
      function newPage() { doc.addPage(); pageNo++; chrome(); y = TOP; }
      function ensure(h) { if (y + h > BOT) newPage(); }
      function section(label, title, sub) {
        ensure(40);
        LABEL(label, L, y);
        T(title, L, y + 9, { s: 19, b: 1 });
        y += 9;
        if (sub) y = P(sub, L, y + 6.5, CW - 24, { s: 9.5, c: C.muted });
        y += 7;
      }

      var pct = m.fee > 0 ? Math.round(m.saved / m.fee * 100) : 0;

      // ---- Page 1: cover and executive summary ----
      fillC(C.navy); doc.rect(0, 0, W, 80, 'F');
      fillC(C.teal); doc.rect(0, 80, W, 1.6, 'F');
      T('UNIKMO  ×  TISONIK', L, 20, { s: 8, b: 1, c: C.tealLt, cs: 0.5 });
      fillC(C.tealLt); doc.rect(L, 25, 12, 0.8, 'F');
      T('Cruise Value Assessment', L, 45, { s: 29, b: 1, c: C.white });
      T(who ? 'Prepared for ' + lines(who, CW - 4, 13)[0] : 'Prepared for your ship', L, 57, { s: 13, c: [232, 224, 212] });
      T(dateStr + (by ? '     |     Prepared by ' + lines(by, 90, 9)[0] : ''), L, 67, { s: 9, c: [176, 168, 156] });

      y = 98;
      LABEL('Executive summary', L, y);
      y += 10;
      var headline = m.hard >= 0 ? 'The TISONIK / UNIKMO bundle pays for itself before any estimate.'
        : m.all >= 0 ? 'Your ship gains ' + money(m.all * m.mult) + ' a year after the bundle fee.'
        : 'Printing saved covers ' + pct + '% of the fee. At these figures the estimates do not close the gap.';
      y = P(headline, L, y, CW - 6, { s: 17, b: 1, lh: 8 });
      y += 4;
      var body = 'At ' + num(m.guests) + ' guests per voyage and ' + num(m.mult) + ' voyages a year across ' + m.ships + (m.ships === 1 ? ' ship' : ' ships') +
        ', printing saved is ' + money(m.saved) + ' per voyage against a bundle fee of ' + money(m.fee) + '. Estimated guest experience value adds ' + money(m.value) +
        ', which takes the net to ' + signed(m.all) + ' per voyage and ' + signed(m.all * m.mult) + ' over one year.' +
        (m.comm > 0 ? ' If guests also buy cards in your shop, your commission adds ' + money(m.comm * m.mult) + ' over the year on top.' : '');
      y = P(body, L, y, CW - 6, { s: 10.2, c: C.ink2, lh: 5.3 });
      y += 9;

      var tw = (CW - 12) / 3, tiles = [
        ['Net per year', 'with estimates', signed(m.all * m.mult), 'After the bundle fee, with guest value'],
        ['Printing saved', 'per year', signed(m.saved * m.mult), 'Card and app replace paper'],
        ['Net per voyage', 'with estimates', signed(m.all), num(m.mult) + ' voyages a year']
      ];
      tiles.forEach(function (t, i) {
        var x = L + i * (tw + 6);
        fillC(C.soft); doc.rect(x, y, tw, 32, 'F');
        fillC(sign(t[2])); doc.rect(x, y, 1.4, 32, 'F');
        T(t[0].toUpperCase(), x + 6, y + 8, { s: 6.6, b: 1, c: C.muted, cs: 0.25 });
        T(t[1], x + 6, y + 12.2, { s: 7.6, c: C.muted });
        T(t[2], x + 6, y + 22, { s: 17, b: 1, c: sign(t[2]) });
        T(t[3], x + 6, y + 28, { s: 6.8, c: C.muted });
      });
      y += 46;

      LABEL('Fee against what comes back, per voyage', L, y);
      y += 7;
      var offset = m.saved + Math.max(m.value, 0) + m.comm, max = Math.max(m.fee, offset, 1), bx = L, bh = 8;
      fillC(C.soft); doc.rect(L, y, CW, bh, 'F');
      [[m.saved, C.teal], [Math.max(m.value, 0), C.tealLt], [m.comm, C.green]].forEach(function (s) {
        var w = s[0] / max * CW; if (w > 0) { fillC(s[1]); doc.rect(bx, y, w, bh, 'F'); bx += w; }
      });
      var mx = L + Math.min(m.fee / max, 0.995) * CW;
      drawC(C.navy); doc.setLineWidth(0.7); doc.line(mx, y - 3, mx, y + bh + 3);
      T('Bundle fee ' + money(m.fee), mx > L + CW * 0.7 ? mx - 1.8 : mx + 1.8, y - 1.2, { s: 7.6, b: 1, a: mx > L + CW * 0.7 ? 'right' : 'left' });
      y += bh + 9;
      var lx = L;
      [['Printing saved ' + money(m.saved), C.teal], ['Estimated value ' + money(m.value), C.tealLt], ['Card sales, optional ' + money(m.comm), C.green]].forEach(function (l) {
        fillC(l[1]); doc.rect(lx, y - 2.6, 3, 3, 'F');
        T(l[0], lx + 5, y, { s: 8, c: C.ink2 });
        doc.setFontSize(8); lx += 5 + doc.getTextWidth(l[0]) + 9;
      });
      y += 13;

      fillC(C.paper); drawC(C.line); doc.setLineWidth(0.25); doc.rect(L, y, CW, 33, 'FD');
      fillC(C.teal); doc.rect(L, y, 1.4, 33, 'F');
      LABEL('How to read this report', L + 7, y + 8);
      P('Printing saved comes straight from the figures you entered. Guest experience value is an estimate, so it is shown on its own line and never mixed into the first result. Card sales are optional and are shown on top. Where a figure is yours, the inputs page says so. Where it is one of our illustrative defaults, it says that too.',
        L + 7, y + 14, CW - 14, { s: 8.8, c: C.ink2, lh: 4.5 });

      // ---- Page 2: what the ship gets ----
      newPage();
      section('Benefits', 'What the ship gets', 'Calculated figures come from your inputs. Estimates depend on your guests.');
      var adv = m.adv(), cw = (CW - 6) / 2;
      for (var i = 0; i < adv.length; i += 2) {
        var pair = adv.slice(i, i + 2).map(function (a) {
          var tl = lines(a[0], cw - 19, 9.5, true), fl = lines(a[2], cw - 19, 9.5, true), wl = lines(a[3], cw - 19, 8, false);
          return { a: a, tl: tl, fl: fl, wl: wl, h: 6.5 + tl.length * 4.3 + 6.8 + fl.length * 4.6 + 1.5 + wl.length * 3.9 + 3.5 };
        });
        var h = Math.max.apply(null, pair.map(function (p) { return p.h; }));
        ensure(h + 4);
        pair.forEach(function (p, k) {
          var x = L + k * (cw + 6);
          fillC(C.paper); drawC(C.line); doc.setLineWidth(0.25); doc.rect(x, y, cw, h, 'FD');
          fillC(C.green); doc.circle(x + 7, y + 7.6, 2.8, 'F');
          drawC(C.white); doc.setLineWidth(0.55);
          doc.line(x + 5.7, y + 7.7, x + 6.6, y + 8.7); doc.line(x + 6.6, y + 8.7, x + 8.4, y + 6.4);
          var cy = y + 6.5;
          p.tl.forEach(function (l, j) { T(l, x + 14, cy + j * 4.3, { s: 9.5, b: 1 }); });
          cy += p.tl.length * 4.3;
          var tc = p.a[1].indexOf('Calculated') === 0 ? C.green : C.muted;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8);
          var tgw = doc.getTextWidth(p.a[1]) + 3.6;
          drawC(tc); doc.setLineWidth(0.25); doc.roundedRect(x + 14, cy - 1.2, tgw, 4.2, 0.8, 0.8, 'S');
          T(p.a[1], x + 15.8, cy + 1.7, { s: 6.8, c: tc });
          cy += 6.8;
          p.fl.forEach(function (l, j) { T(l, x + 14, cy + 1.5 + j * 4.6, { s: 9.5, b: 1, c: C.teal }); });
          cy += p.fl.length * 4.6 + 1.5;
          p.wl.forEach(function (l, j) { T(l, x + 14, cy + 1.2 + j * 3.9, { s: 8, c: C.muted }); });
        });
        y += h + 4;
      }

      // ---- Page 3: the numbers ----
      newPage();
      section('The numbers', 'Per voyage and per year', 'Every line is worked out from the inputs on the next page.');
      var rows = m.rows(), rh = 6.5;
      ensure(rows.length * rh + 40);
      rows.forEach(function (r) {
        if (r[0] === 'head') {
          y += 3; LABEL(r[1], L, y + 3.6);
          drawC(C.teal); doc.setLineWidth(0.35); doc.line(L, y + 5.2, R, y + 5.2); y += rh; return;
        }
        if (r[0] === 'total') {
          fillC(C.soft); doc.rect(L, y, CW, rh, 'F');
          T(r[1], L + 3, y + 4.9, { b: 1, s: 9.8 }); T(r[2], R - 3, y + 4.9, { b: 1, s: 9.8, a: 'right', c: sign(r[2]) });
          y += rh; return;
        }
        T(r[1], L + 1, y + 4.9, { s: 9.3 }); T(r[2], R - 1, y + 4.9, { s: 9.3, a: 'right' });
        drawC(C.line); doc.setLineWidth(0.2); doc.line(L, y + rh, R, y + rh); y += rh;
      });
      y += 9;
      var ctxLines = lines(m.ctx() + ' ' + m.be(), CW - 14, 8.8, false), ch = 15 + ctxLines.length * 4.5;
      ensure(ch + 2);
      fillC(C.paper); drawC(C.line); doc.setLineWidth(0.25); doc.rect(L, y, CW, ch, 'FD');
      fillC(C.teal); doc.rect(L, y, 1.4, ch, 'F');
      LABEL('The fee in context', L + 7, y + 8);
      ctxLines.forEach(function (l, j) { T(l, L + 7, y + 14 + j * 4.5, { s: 8.8, c: C.ink2 }); });
      y += ch + 6;

      // ---- Page 4: your inputs ----
      newPage();
      section('Your inputs', 'The figures behind this report', 'A filled dot marks a figure you changed. An open dot is one of our illustrative defaults, which UNIKMO has not verified.');
      collectInputs().forEach(function (g) {
        ensure(22);
        LABEL(g.title, L, y + 3);
        drawC(C.teal); doc.setLineWidth(0.35); doc.line(L, y + 5, R, y + 5);
        y += 9.5;
        g.rows.forEach(function (r) {
          ensure(5.8);
          T(lines(r.label, 112, 8.6)[0], L + 1, y + 3.4, { s: 8.6, c: C.ink2 });
          T(r.val, R - 7, y + 3.4, { s: 8.6, b: r.changed, a: 'right' });
          if (r.changed) { fillC(C.teal); doc.circle(R - 1.6, y + 2.5, 1.2, 'F'); }
          else { drawC(C.muted); doc.setLineWidth(0.25); doc.circle(R - 1.6, y + 2.5, 1.2, 'S'); }
          drawC(C.line); doc.setLineWidth(0.15); doc.line(L, y + 5.2, R, y + 5.2);
          y += 5.5;
        });
        y += 5;
      });

      // ---- Method and important notes ----
      ensure(60);
      section('Method', 'How this is worked out');
      var li = document.querySelectorAll('.notes li');
      for (var k = 0; k < li.length; k++) {
        var nl = lines(clean(li[k].textContent), CW - 8, 8.8, false);
        ensure(nl.length * 4.5 + 3);
        fillC(C.teal); doc.circle(L + 1.2, y - 1, 0.7, 'F');
        nl.forEach(function (l, j) { T(l, L + 6, y + j * 4.5, { s: 8.8, c: C.ink2 }); });
        y += nl.length * 4.5 + 2.4;
      }

      y += 4;
      var note = 'This assessment uses the figures entered by the person who prepared it, together with illustrative assumptions supplied by UNIKMO. UNIKMO has not verified any default value. Estimates are not guarantees, and prices and commission rates shown are proposals for discussion, not a binding offer. A pilot on one ship would measure the estimated lines using your own data.';
      var nlines = lines(note, CW - 14, 8.4, false), nh = 15 + nlines.length * 4.3;
      ensure(nh + 2);
      fillC(C.paper); drawC(C.line); doc.setLineWidth(0.25); doc.rect(L, y, CW, nh, 'FD');
      fillC(C.navy); doc.rect(L, y, 1.4, nh, 'F');
      LABEL('Important', L + 7, y + 8, C.navy);
      nlines.forEach(function (l, j) { T(l, L + 7, y + 14 + j * 4.3, { s: 8.4, c: C.ink2 }); });

      // ---- Footer on every page ----
      var total = doc.getNumberOfPages();
      for (var p = 1; p <= total; p++) {
        doc.setPage(p);
        drawC(C.line); doc.setLineWidth(0.2); doc.line(L, H - 14, R, H - 14);
        T('UNIKMO  ×  TISONIK   |   Illustrative assessment prepared ' + dateStr, L, H - 9, { s: 7.2, c: C.muted });
        T('Page ' + p + ' of ' + total, R, H - 9, { s: 7.2, c: C.muted, a: 'right' });
      }

      doc.setProperties({ title: 'UNIKMO Cruise Value Assessment' + (who ? ' - ' + who : ''), author: by || 'UNIKMO', creator: 'UNIKMO calculator' });
      doc.save('UNIKMO Cruise Value Assessment' + (who ? ' - ' + who.replace(/[\\/:*?"<>|]/g, '') : '') + '.pdf');
    } finally {
      pdfMode = false;
    }
  }

  var pdfBusy = false;
  function pdfStatus(t) { document.querySelectorAll('.pdf-status').forEach(function (e) { e.textContent = t; }); }
  function onPdf() {
    if (pdfBusy) return;
    pdfBusy = true; pdfStatus('Preparing your report...');
    loadJsPdf()
      .then(function (J) { calc(); buildPdf(J); pdfStatus('Report created. If nothing downloaded, allow downloads for this page and try again.'); })
      .catch(function (e) { pdfStatus((e && e.message ? e.message : 'Something went wrong') + '. Please try again.'); })
      .then(function () { pdfBusy = false; });
  }
  document.querySelectorAll('.pdf-trigger').forEach(function (b) { b.addEventListener('click', onPdf); });

  // Show this script's own source in the "View the code" panel.
  var srcEl = document.getElementById('calc-src');
  var pre = document.getElementById('code-src');
  var btn = document.getElementById('code-copy');
  if (pre) fetch('/savings-calculator.js').then(function (r) { return r.text(); }).then(function (t) { pre.textContent = t.trim(); }).catch(function () {});
  if (btn && pre) btn.addEventListener('click', function () {
    var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy the code'; }, 1800); };
    var fallback = function () {
      var r = document.createRange(); r.selectNodeContents(pre);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      btn.textContent = 'Code selected, press Ctrl+C';
    };
    try { navigator.clipboard.writeText(pre.textContent).then(done, fallback); } catch (e) { fallback(); }
  });
})();
