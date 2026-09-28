/* Every number on the page is computed here from D (data.js), which the study build writes. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function parse(s) { var p = s.split('-'); return { y: +p[0], m: +p[1], d: +p[2] }; }
  function doy(s) { var p = parse(s); return Math.round((Date.UTC(p.y, p.m - 1, p.d) - Date.UTC(p.y, 0, 1)) / 864e5) + 1; }
  function dm(s) { var p = parse(s); return p.d + ' ' + MONL[p.m - 1]; }
  function dmShort(s) { var p = parse(s); return p.d + ' ' + MON[p.m - 1]; }
  // day of year to a date label in a year that is not a leap year
  function doyLabel(n, long) { var t = new Date(Date.UTC(2025, 0, 1) + (Math.round(n) - 1) * 864e5); return t.getUTCDate() + ' ' + (long ? MONL : MON)[t.getUTCMonth()]; }
  function mean(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function f1(x) { return r1(x).toFixed(1); }
  function fT(t) { return t.toFixed(2); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function lin(d0, d1, r0, r1_) { return function (v) { return r0 + (v - d0) / (d1 - d0) * (r1_ - r0); }; }
  function svg(w, h, body, label) { return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(label) + '">' + body + '</svg>'; }
  function spread(labels, minGap) { // push apart vertically sorted labels
    labels.sort(function (a, b) { return a.y - b.y; });
    for (var i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < minGap) labels[i].y = labels[i - 1].y + minGap;
    return labels;
  }

  /* ---------- the study, recomputed ---------- */
  var S = {};
  function compute() {
    S.means = {};
    D.heights.forEach(function (h) {
      D.thresholds.forEach(function (t) {
        var rows = D.grid.filter(function (r) { return r.h === h && r.t === t; });
        S.means[h + '|' + t] = { mean: mean(rows.map(function (r) { return doy(r.cuts[0]); })), rows: rows };
      });
    });
    S.rowSpread = {};
    D.heights.forEach(function (h) {
      var v = D.thresholds.map(function (t) { return r1(S.means[h + '|' + t].mean); });
      S.rowSpread[h] = Math.max.apply(null, v) - Math.min.apply(null, v);
    });
    S.maxRowSpread = Math.max.apply(null, D.heights.map(function (h) { return S.rowSpread[h]; }));
    var hs = D.heights, t0 = D.shipped.t;
    S.hSpan = r1(S.means[hs[hs.length - 1] + '|' + t0].mean) - r1(S.means[hs[0] + '|' + t0].mean);
    S.h8to25 = r1(S.means['25|' + t0].mean) - r1(S.means['8|' + t0].mean);
    // analogue
    var keys = Object.keys(D.analogue);
    S.akeys = ['mean'].concat(keys.filter(function (k) { return k !== 'mean'; }).sort());
    var firsts = keys.map(function (k) { return D.analogue[k][0]; }).sort();
    var thirds = keys.map(function (k) { return D.analogue[k][2]; }).sort();
    S.aFirst = [firsts[0], firsts[firsts.length - 1]];
    S.aThird = [thirds[0], thirds[thirds.length - 1]];
    S.aGap28 = keys.every(function (k) { return doy(D.analogue[k][1]) - doy(D.analogue[k][0]) === 28; });
    S.aRuns = keys.length;
    // gates over fifteen years
    var last = { height: 0, stage: 0, tie: 0, ci: 0 };
    D.gates.forEach(function (g) {
      var h = doy(g.height), s = doy(g.stage), c = doy(g.ci[String(D.shipped.t)]);
      if (c >= h && c >= s) last.ci++;
      else if (h > s) last.height++;
      else if (s > h) last.stage++;
      else last.tie++;
    });
    S.last = last;
    S.tieYears = D.gates.filter(function (g) { return g.height === g.stage; }).map(function (g) { return g.y; });
    S.stageYears = D.gates.filter(function (g) { return doy(g.stage) > doy(g.height); }).map(function (g) { return g.y; });
    var ci50 = D.gates.map(function (g) { return g.ci['0.5']; }).sort(function (a, b) { return doy(a) - doy(b); });
    S.ci50latest = ci50[ci50.length - 1];
    S.ciAtFirstMin = Math.min.apply(null, D.gates.map(function (g) { return g.ciAtFirstRec; }));
    S.cutsShipped = S.means[D.shipped.h + '|' + D.shipped.t].rows.map(function (r) { return r.cuts.length; });
  }

  /* ---------- header ---------- */
  function header() {
    $('#built').textContent = 'built ' + D.built;
    var m15 = S.means[D.shipped.h + '|' + D.shipped.t].mean;
    $('#qa1').textContent = 'Yes. Standing on 1 May 2026, all ' + S.aRuns + ' weather futures put the first cut between ' + dm(S.aFirst[0]) + ' and ' + dm(S.aFirst[1]) + '.';
    $('#qa2').textContent = 'Not in the Spring 2026 trial settings. Every threshold from 0.15 to 0.50 gives the same mean first cut, day ' + f1(m15) + ' (about ' + doyLabel(m15, true) + '), over fifteen past seasons.';
    $('#qa3').textContent = 'The minimum clover height, a constant in the source file: raising it from 8 to 25 cm moves the mean first cut ' + f1(S.h8to25) + ' days later.';
  }

  /* ---------- act 1: twelve 2026 futures ---------- */
  var futureSel = 'mean';
  function drawFuture() {
    var W = 900, L = 120, R = 20, top = 34, rh = 26, n = S.akeys.length, H = top + n * rh + 34;
    var x = lin(doy('2026-05-01'), doy('2026-09-01'), L, W - R);
    var b = '';
    ['2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01'].forEach(function (d) {
      var xx = x(doy(d));
      b += '<line x1="' + xx + '" x2="' + xx + '" y1="' + (top - 6) + '" y2="' + (top + n * rh) + '" stroke="var(--rule)"/>';
      b += '<text x="' + xx + '" y="' + (top + n * rh + 16) + '" text-anchor="middle">1 ' + MON[parse(d).m - 1] + '</text>';
    });
    // band for the first-cut range
    var bx0 = x(doy(S.aFirst[0])), bx1 = x(doy(S.aFirst[1]));
    b += '<rect x="' + bx0 + '" y="' + (top - 6) + '" width="' + (bx1 - bx0) + '" height="' + (n * rh + 6) + '" fill="var(--clover)" opacity=".12"/>';
    var col = ['var(--clover)', 'var(--accent)', 'var(--amber)'], names = ['first cut', 'second cut', 'third cut'];
    // direct labels above each cut cluster, placed at the mean-row position
    D.analogue.mean.forEach(function (d, i) { b += '<text x="' + x(doy(d)) + '" y="' + (top - 12) + '" text-anchor="middle" style="fill:' + col[i] + ';font-weight:500">' + names[i] + '</text>'; });
    S.akeys.forEach(function (k, i) {
      var y = top + i * rh, sel = k === futureSel;
      b += '<g class="row-hit" data-k="' + k + '"><rect class="bg" x="0" y="' + y + '" width="' + W + '" height="' + rh + '" fill="' + (sel ? 'var(--panel)' : 'transparent') + '"/>';
      b += '<text x="' + (L - 12) + '" y="' + (y + rh / 2 + 4) + '" text-anchor="end" style="' + (sel || k === 'mean' ? 'fill:var(--ink);font-weight:500' : '') + '">' + (k === 'mean' ? 'average weather' : k + ' weather') + '</text>';
      D.analogue[k].forEach(function (d, j) {
        b += '<circle cx="' + x(doy(d)) + '" cy="' + (y + rh / 2) + '" r="' + (sel ? 6.5 : 5) + '" fill="' + col[j] + '"' + (sel ? ' stroke="var(--ink)" stroke-width="1.5"' : '') + '/>';
      });
      b += '</g>';
    });
    $('#futureviz').innerHTML = svg(W, H, b, 'Cut dates in twelve simulated 2026 seasons');
    Array.prototype.forEach.call(document.querySelectorAll('#futureviz .row-hit'), function (g) {
      g.addEventListener('click', function () { futureSel = g.getAttribute('data-k'); drawFuture(); });
    });
    var c = D.analogue[futureSel];
    $('#futureread').innerHTML = 'With ' + (futureSel === 'mean' ? 'the average of the eleven years' : futureSel + '’s weather') + ' after 30 April, the rule recommends cutting on <b>' + dm(c[0]) + '</b>, <b>' + dm(c[1]) + '</b> and <b>' + dm(c[2]) + '</b> 2026.';
    $('#futuretake').textContent = 'The first two cuts barely move with the weather after 1 May; the third spreads across August.';
  }
  function act1Text() {
    $('#v1').innerHTML = '<b>The first cut is predictable from 1 May.</b> All ' + S.aRuns + ' runs put it between ' + dm(S.aFirst[0]) + ' and ' + dm(S.aFirst[1]) + ', and ' +
      (S.aGap28 ? 'in every run the second cut follows exactly 28 days later, the rule’s minimum recovery interval. ' : 'the second follows about four weeks later. ') +
      'The third cut spreads from ' + dm(S.aThird[0]) + ' to ' + dm(S.aThird[1]) + ', the part of the season the unknown weather still decides.';
  }

  /* ---------- act 2: the sweep ---------- */
  var selT = D.shipped.t, selH = D.shipped.h;
  function chips(el, vals, cur, fmt, onPick) {
    el.innerHTML = vals.map(function (v) {
      var ship = (v === D.shipped.t && el.id !== 'hchips') || (v === D.shipped.h && el.id === 'hchips');
      return '<button class="chip" aria-pressed="' + (v === cur) + '" data-v="' + v + '">' + fmt(v) + (ship ? '<span class="ship">trial</span>' : '') + '</button>';
    }).join('');
    Array.prototype.forEach.call(el.querySelectorAll('.chip'), function (c) {
      c.addEventListener('click', function () { onPick(+c.getAttribute('data-v')); });
    });
  }
  function drawSweep() {
    chips($('#tchips'), D.thresholds, selT, fT, function (v) { selT = v; drawSweep(); });
    chips($('#hchips'), D.heights, selH, function (v) { return v + ' cm'; }, function (v) { selH = v; drawSweep(); });
    var W = 900, H = 360, top = 40, bot = 300, gap = 70, L1 = 70, P = (W - L1 - gap - 70) / 2;
    var L2 = L1 + P + gap;
    var y = lin(128, 162, bot, top);
    var xT = lin(0.15, 0.50, L1, L1 + P), xH = lin(5, 30, L2, L2 + P);
    var b = '';
    for (var d = 130; d <= 160; d += 5) {
      b += '<line x1="' + L1 + '" x2="' + (L1 + P) + '" y1="' + y(d) + '" y2="' + y(d) + '" stroke="var(--rule)"/>';
      b += '<line x1="' + L2 + '" x2="' + (L2 + P) + '" y1="' + y(d) + '" y2="' + y(d) + '" stroke="var(--rule)"/>';
      b += '<text x="' + (L1 - 8) + '" y="' + (y(d) + 4) + '" text-anchor="end">' + doyLabel(d) + '</text>';
    }
    b += '<text class="ttl" x="' + (L1 - 8) + '" y="' + (top - 22) + '" text-anchor="start">First cut, mean of 15 seasons</text>';
    D.thresholds.forEach(function (t) { b += '<text x="' + xT(t) + '" y="' + (bot + 16) + '" text-anchor="middle">' + fT(t) + '</text>'; });
    D.heights.forEach(function (h) { b += '<text x="' + xH(h) + '" y="' + (bot + 16) + '" text-anchor="middle">' + h + '</text>'; });
    b += '<text class="ttl" x="' + (L1 + P / 2) + '" y="' + (bot + 40) + '" text-anchor="middle">Competition threshold (the dashboard setting)</text>';
    b += '<text class="ttl" x="' + (L2 + P / 2) + '" y="' + (bot + 40) + '" text-anchor="middle">Minimum clover height, cm (a constant in source)</text>';
    // left: one line per height
    var labs = [];
    D.heights.forEach(function (h) {
      var pts = D.thresholds.map(function (t) { return xT(t) + ',' + y(S.means[h + '|' + t].mean); }).join(' ');
      var on = h === selH;
      b += '<polyline points="' + pts + '" fill="none" stroke="' + (on ? 'var(--accent)' : 'var(--rule2)') + '" stroke-width="' + (on ? 2.5 : 1.5) + '"/>';
      labs.push({ y: y(S.means[h + '|0.5'].mean) + 4, t: h + ' cm', on: on });
    });
    spread(labs, 12).forEach(function (l) { b += '<text x="' + (L1 + P + 6) + '" y="' + l.y + '" style="' + (l.on ? 'fill:var(--accent);font-weight:500' : '') + '">' + l.t + '</text>'; });
    // right: one line per threshold, drawn and coinciding
    D.thresholds.forEach(function (t) {
      var pts = D.heights.map(function (h) { return xH(h) + ',' + y(S.means[h + '|' + t].mean); }).join(' ');
      b += '<polyline points="' + pts + '" fill="none" stroke="' + (t === selT ? 'var(--accent)' : 'var(--rule2)') + '" stroke-width="' + (t === selT ? 2.5 : 1.5) + '"/>';
    });
    b += '<text x="' + (xH(30) - 4) + '" y="' + (y(S.means['30|0.25'].mean) - 12) + '" text-anchor="end" style="fill:var(--accent)">all six thresholds, on one line</text>';
    // shipped and selected points
    var ms = S.means[D.shipped.h + '|' + D.shipped.t].mean, m = S.means[selH + '|' + selT].mean;
    [[xT(D.shipped.t), y(ms)], [xH(D.shipped.h), y(ms)]].forEach(function (p) { b += '<text x="' + p[0] + '" y="' + (p[1] + 20) + '" text-anchor="middle" style="fill:var(--faint)">trial</text>'; });
    [[xT(selT), y(m)], [xH(selH), y(m)]].forEach(function (p) {
      b += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="7" fill="var(--card)" stroke="var(--ink)" stroke-width="2"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" fill="var(--accent)"/>';
    });
    $('#sweepviz').innerHTML = svg(W, H, b, 'Mean first-cut date against threshold and against minimum height');
    var rows = S.means[selH + '|' + selT].rows.slice().sort(function (a, c) { return doy(a.cuts[0]) - doy(c.cuts[0]); });
    var e = rows[0], l = rows[rows.length - 1];
    $('#sweepread').innerHTML = 'Threshold <b class="num">' + fT(selT) + '</b>, height <b class="num">' + selH + ' cm</b>: mean first cut on day <b class="num">' + f1(m) + '</b>, about ' + doyLabel(m, true) +
      '. Earliest season ' + dm(e.cuts[0]) + ' ' + e.y + ', latest ' + dm(l.cuts[0]) + ' ' + l.y + '.';
    $('#sweeptake').textContent = 'Every line on the left is flat, and the right-hand chart climbs by ' + f1(S.hSpan) + ' days from 5 to 30 cm.';
  }
  function act2Text() {
    $('#v2').innerHTML = '<b>In the trial settings in your repository, the operator’s knob is dominated by a constant the operator cannot reach.</b> Moving the threshold from 0.15 to 0.50 changes the mean first cut by ' + f1(S.maxRowSpread) +
      ' days at every one of the seven heights. Moving the height from 5 to 30 cm changes it by ' + f1(S.hSpan) + ' days at every threshold.';
  }
  function gridTable() {
    var th = '<tr><th>Min. height</th>' + D.thresholds.map(function (t) { return '<th>' + fT(t) + (t === D.shipped.t ? ' (trial)' : '') + '</th>'; }).join('') + '<th class="derived">Spread, days</th></tr>';
    $('#gridtable thead').innerHTML = th;
    $('#gridtable tbody').innerHTML = D.heights.map(function (h) {
      return '<tr' + (h === D.shipped.h ? ' class="shipped"' : '') + '><td>' + h + ' cm' + (h === D.shipped.h ? ' (source)' : '') + '</td>' +
        D.thresholds.map(function (t) { return '<td>' + f1(S.means[h + '|' + t].mean) + '</td>'; }).join('') +
        '<td class="derived">' + f1(S.rowSpread[h]) + '</td></tr>';
    }).join('');
  }

  /* ---------- act 3: the gates in one season ---------- */
  var mT = D.shipped.t;
  function drawMech() {
    chips($('#mchips'), D.thresholds, mT, fT, function (v) { mT = v; drawMech(); });
    var s = D.series, W = 900, L = 190, R = 20;
    var x = lin(doy(s[0].d), doy(s[s.length - 1].d), L, W - R);
    var p1 = [40, 130], p2 = [185, 275], p3 = 318, rh = 22, H = p3 + 5 * rh + 40;
    var b = '', hmax = 20;
    s.forEach(function (d) { if (d.h > hmax) hmax = d.h; });
    hmax = Math.ceil(hmax / 5) * 5;
    var yc = lin(0, 1, p1[1], p1[0]), yh = lin(0, hmax, p2[1], p2[0]);
    ['-03-01', '-04-01', '-05-01', '-06-01', '-06-30'].forEach(function (m) {
      var d = D.seriesYear + m, xx = x(doy(d));
      b += '<line x1="' + xx + '" x2="' + xx + '" y1="' + p1[0] + '" y2="' + (p3 + 4 * rh) + '" stroke="var(--rule)"/>';
      b += '<text x="' + xx + '" y="' + (p3 + 4 * rh + 16) + '" text-anchor="middle">' + dmShort(d) + '</text>';
    });
    // panel 1: competition
    b += '<text class="ttl" x="' + L + '" y="' + (p1[0] - 14) + '">Competition index</text>';
    [0, 0.5, 1].forEach(function (v) { b += '<text x="' + (L - 10) + '" y="' + (yc(v) + 4) + '" text-anchor="end">' + v.toFixed(1) + '</text>'; });
    b += '<polyline fill="none" stroke="var(--wheat)" stroke-width="2" points="' + s.map(function (d) { return x(doy(d.d)) + ',' + yc(d.ci); }).join(' ') + '"/>';
    b += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yc(mT) + '" y2="' + yc(mT) + '" stroke="var(--accent)" stroke-dasharray="5 4" stroke-width="1.5"/>';
    b += '<text x="' + (W - R) + '" y="' + (yc(mT) - 5) + '" text-anchor="end" style="fill:var(--accent)">threshold ' + fT(mT) + '</text>';
    // panel 2: height
    b += '<text class="ttl" x="' + L + '" y="' + (p2[0] - 14) + '">Clover height, cm</text>';
    [0, hmax].forEach(function (v) { b += '<text x="' + (L - 10) + '" y="' + (yh(v) + 4) + '" text-anchor="end">' + v + '</text>'; });
    b += '<polyline fill="none" stroke="var(--clover)" stroke-width="2" points="' + s.map(function (d) { return x(doy(d.d)) + ',' + yh(d.h); }).join(' ') + '"/>';
    b += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yh(15) + '" y2="' + yh(15) + '" stroke="var(--clover)" stroke-dasharray="5 4" stroke-width="1.5"/>';
    b += '<text x="' + (L + 6) + '" y="' + (yh(15) - 5) + '" style="fill:var(--clover)">15 cm gate</text>';
    // panel 3: gates
    var rows = [
      { k: 'C competition', f: function (d) { return d.ci > mT; }, c: 'var(--accent)' },
      { k: 'A height', f: function (d) { return d.h >= 15; }, c: 'var(--clover)' },
      { k: 'D wheat stage', f: function (d) { return d.safe; }, c: 'var(--wheat)' },
      { k: 'B recovery', f: function () { return true; }, c: 'var(--faint)' }
    ];
    var first = null;
    s.forEach(function (d) { if (!first && rows.every(function (r) { return r.f(d); })) first = d; });
    var dx = (x(doy(s[1].d)) - x(doy(s[0].d)));
    rows.forEach(function (r, i) {
      var yy = p3 + i * rh;
      var od0 = s.filter(function (d) { return r.f(d); })[0];
      b += '<text x="' + (L - 10) + '" y="' + (yy + 14) + '" text-anchor="end">' + r.k + (od0 && r.k !== 'B recovery' ? ', opens ' + dmShort(od0.d) : ', open') + '</text>';
      b += '<rect x="' + L + '" y="' + (yy + 4) + '" width="' + (W - R - L) + '" height="' + (rh - 8) + '" fill="var(--panel)"/>';
      var start = null;
      s.forEach(function (d, j) {
        var open = r.f(d);
        if (open && start === null) start = j;
        if ((!open || j === s.length - 1) && start !== null) {
          var end = open ? j : j - 1;
          b += '<rect x="' + x(doy(s[start].d)) + '" y="' + (yy + 4) + '" width="' + (x(doy(s[end].d)) - x(doy(s[start].d)) + dx) + '" height="' + (rh - 8) + '" fill="' + r.c + '"/>';
          start = null;
        }
      });
    });
    if (first) {
      var fx = x(doy(first.d));
      b += '<line x1="' + fx + '" x2="' + fx + '" y1="' + p1[0] + '" y2="' + (p3 + 4 * rh) + '" stroke="var(--ink)" stroke-width="1.5"/>';
      b += '<text x="' + (fx - 6) + '" y="' + (p1[0] - 14) + '" text-anchor="end" style="fill:var(--ink);font-weight:500">first recommended day, ' + dmShort(first.d) + '</text>';
    }
    $('#mechviz').innerHTML = svg(W, H, b, 'Competition index, clover height and gate states through spring ' + D.seriesYear);
    var cOpen = s.filter(function (d) { return d.ci > mT; })[0];
    $('#mechread').innerHTML = 'At threshold <b class="num">' + fT(mT) + '</b> the competition gate opens on <b>' + dm(cOpen.d) + '</b>. The first day with every gate open is still <b>' + dm(first.d) + '</b>, when the clover reaches <span class="num">' + first.h.toFixed(1) + '</span> cm; the index that day is <span class="num">' + first.ci.toFixed(4) + '</span>, above every threshold the dashboard allows.';
    $('#mechtake').textContent = 'The index jumps to near 1 as soon as the clover has leaves, weeks before the wheat is sown, so every threshold is passed in March and the date waits for the clover to reach 15 cm.';
  }
  function act3Text() {
    var n = D.gates.length;
    $('#v3').innerHTML = '<b>Over fifteen seasons the competition gate is never the last to open.</b> The height gate opens last in ' + S.last.height + ' of ' + n + ' years; the wheat stage gate opens last in ' + S.stageYears.join(', ') +
      (S.tieYears.length ? ', and both open together in ' + S.tieYears.join(', ') : '') + '. Even the highest threshold, 0.50, is passed by ' + dm(S.ci50latest) + ' at the latest, and on the first recommended day the index is never below ' + S.ciAtFirstMin.toFixed(3) + '.';
  }

  /* ---------- self-check ---------- */
  function selfCheck() {
    var lines = [], bad = 0;
    var n = 0, ok = 0;
    Object.keys(D.expectedMeans).forEach(function (k) { n++; if (r1(S.means[k].mean) === D.expectedMeans[k]) ok++; });
    bad += n - ok;
    lines.push([ok === n, ok + ' of ' + n + ' grid means recomputed here equal the study build (' + D.grid.length + ' seasons)']);
    var three = S.cutsShipped.every(function (c) { return c === 3; });
    lines.push([true, 'Trial settings: ' + (three ? 'three cuts in every one of the fifteen seasons' : 'cuts per season ' + S.cutsShipped.join(', '))]);
    var s = D.series, rec = s.filter(function (d) { return d.status === 'recommended' || d.status === 'critical'; })[0];
    var mine = s.filter(function (d) { return d.ci > D.shipped.t && d.h >= 15 && d.safe; })[0];
    var same = rec && mine && rec.d === mine.d; if (!same) bad++;
    lines.push([same, 'The 2019 first recommended day computed from the gates here (' + (mine ? mine.d : 'none') + ') equals the rule’s own status (' + (rec ? rec.d : 'none') + ')']);
    var g = D.gates.filter(function (x) { return x.y === D.seriesYear; })[0];
    var gs = g && g.firstRec === (rec && rec.d); if (!gs) bad++;
    lines.push([gs, 'The same day appears in the fifteen-year gate table']);
    $('#checkout').innerHTML = lines.map(function (l) { return '<div><span class="' + (l[0] ? 'ok' : 'bad') + '">' + (l[0] ? 'pass' : 'FAIL') + '</span> ' + esc(l[1]) + '</div>'; }).join('');
    window.__selfcheck = { bad: bad, means: S.means, S: S };
  }

  /* ---------- the walkthrough ---------- */
  function tour() {
    var root = $('#tour'), hl = $('.tour-hl', root), card = $('.tour-card', root), idx = 0;
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var STEPS = [
      { sel: 'header .qa', k: 'The answers · 1 of 8', html: 'The page asks three questions about the mow rule in your crop service, and the answers are here, one per line. <b>Every number is computed in your browser</b> from the study files the page ships.' },
      { sel: '#futurecard', k: 'What works · 2 of 8', html: 'First, what the rule gets right. Twelve possible 2026 seasons, one per row, differing only in the weather after 30 April. <b>Click a row</b> to read its cut dates.' },
      { sel: '#gatebox', k: 'The four gates · 3 of 8', html: 'The rule cuts only when all four gates are open. Only the outlined one, the competition threshold, can be set without editing the source.' },
      { sel: '#limits', k: 'Limits · 4 of 8', html: 'What the numbers below are and are not, before any of them appear. The most important line: these are model outputs, and the height sensitivity inherits placeholder growth parameters.' },
      { sel: '#sweepcard', k: 'The finding · 5 of 8', html: '<b>Press the threshold buttons</b>, then the height buttons, and watch the ringed dot. Left, the threshold; right, the height. Only one of them moves the date.' },
      { sel: '#gridcard', k: 'The grid · 6 of 8', html: 'All 42 combinations, each the mean of fifteen seasons. The last column is the spread across thresholds in each row.' },
      { sel: '#mechcard', k: 'Why · 7 of 8', html: 'One season, gate by gate. <b>Change the threshold</b>: the dashed line moves, the vertical line does not, because the date waits for the clover to reach 15 cm.' },
      { sel: '#patchcard', k: 'The change · 8 of 8', html: 'Two small patches. The first lets a trial set all four gates the way it already sets the threshold; defaults are unchanged. The second fixes how recommendation windows are logged.' }
    ];
    function place() {
      var st = STEPS[idx], elm = document.querySelector(st.sel);
      if (!elm) { next(); return; }
      var r = elm.getBoundingClientRect(), sx = window.scrollX, sy = window.scrollY;
      var docTop = r.top + sy, docLeft = r.left + sx;
      root.style.height = document.documentElement.scrollHeight + 'px';
      var maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      var target = Math.max(0, Math.min(docTop - 14, maxScroll)), vTop = docTop - target;
      var cw = Math.min(400, innerWidth - 32), ch = 250;
      var fitsRight = r.left + r.width + 18 + cw <= innerWidth - 16;
      var hh = fitsRight ? r.height : Math.max(120, Math.min(r.height, innerHeight - vTop - ch - 40));
      hl.style.left = (docLeft - 8) + 'px'; hl.style.top = (docTop - 8) + 'px';
      hl.style.width = (r.width + 16) + 'px'; hl.style.height = (hh + 16) + 'px';
      var dots = STEPS.map(function (_, i) { return '<i class="' + (i === idx ? 'on' : '') + '"></i>'; }).join('');
      card.innerHTML = '<div class="tk">' + st.k + '</div><p>' + st.html + '</p><div class="tour-nav"><div class="dots">' + dots + '</div>' +
        (idx > 0 ? '<button class="tour-btn" id="tprev">Back</button>' : '') +
        '<button class="tour-btn" id="tskip">Close</button><button class="tour-btn primary" id="tnext">' + (idx < STEPS.length - 1 ? 'Next' : 'Done') + '</button></div>';
      var cx, cy;
      if (fitsRight) { cx = docLeft + r.width + 18; cy = docTop; }
      else { cx = Math.min(docLeft, sx + innerWidth - 16 - cw); cy = docTop + hh + 22; }
      card.style.left = Math.max(sx + 16, cx) + 'px';
      card.style.top = Math.max(target + 16, cy) + 'px';
      $('#tnext').onclick = next; $('#tskip').onclick = stop;
      var pv = $('#tprev'); if (pv) pv.onclick = function () { idx = Math.max(0, idx - 1); place(); };
      window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
    }
    function next() { if (idx >= STEPS.length - 1) { stop(); return; } idx++; place(); }
    function stop() { root.classList.remove('on'); try { localStorage.setItem('mow-tour', 'seen'); } catch (e) { } }
    function start() { idx = 0; root.classList.add('on'); place(); }
    $('#tourbtn').addEventListener('click', start);
    var replace = function () { if (root.classList.contains('on')) place(); };
    window.addEventListener('resize', replace);
    window.addEventListener('load', replace);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(replace);
    var seen = false; try { seen = localStorage.getItem('mow-tour') === 'seen'; } catch (e) { }
    if (!seen && !location.search.includes('tour=off')) setTimeout(start, 700);
    window.__tour = { steps: STEPS.length, go: function (i) { idx = i; root.classList.add('on'); place(); } };
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (typeof D === 'undefined') return;
    compute();
    header();
    drawFuture(); act1Text();
    drawSweep(); act2Text(); gridTable();
    drawMech(); act3Text();
    selfCheck();
    tour();
  });
})();
