/* الخريطة الواحدة المشتركة بين الألعاب الخمس: الرسم، التكبير، السحب، اللمس */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var D = window.OMAN_DATA;
  var FULL = { x: D.viewBox[0], y: D.viewBox[1], w: D.viewBox[2], h: D.viewBox[3] };
  var svg, wrap, overlay, land;
  var view = { x: FULL.x, y: FULL.y, w: FULL.w, h: FULL.h };
  var scaled = [];          // عناصر يُعاد ضبط حجمها مع التكبير
  var viewListeners = [];
  var tapHandler = null;
  var govEls = {}, govD = {}, govById = {};
  var anim = null;

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function ringsToD(rings) {
    var d = '';
    for (var p = 0; p < rings.length; p++) {
      for (var r = 0; r < rings[p].length; r++) {
        var a = rings[p][r];
        d += 'M' + a[0] + ' ' + a[1];
        for (var i = 2; i < a.length; i += 2) d += ' ' + a[i] + ' ' + a[i + 1];
        d += 'Z';
      }
    }
    return d;
  }
  function lineD(pts) {
    var d = 'M' + pts[0] + ' ' + pts[1];
    for (var i = 2; i < pts.length; i += 2) d += ' ' + pts[i] + ' ' + pts[i + 1];
    return d;
  }

  function build() {
    svg = document.getElementById('map');
    wrap = document.getElementById('mapWrap');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    el('rect', { class: 'nbr', x: FULL.x, y: FULL.y, width: FULL.w, height: FULL.h }, svg);
    var grid = el('g', { class: 'grid' }, svg);
    D.grid.forEach(function (g) { el('line', { x1: g.a[0], y1: g.a[1], x2: g.b[0], y2: g.b[1] }, grid); });
    el('path', { class: 'sea', d: ringsToD(D.sea), 'fill-rule': 'evenodd' }, svg);
    land = el('g', { class: 'land' }, svg);
    el('path', { class: 'extra', d: ringsToD(D.omanExtra) }, land);
    D.govs.forEach(function (g) {
      govById[g.id] = g;
      govD[g.id] = ringsToD(g.rings);
      govEls[g.id] = el('path', { class: 'gov', d: govD[g.id], 'data-gov': g.id }, land);
    });
    var intl = el('g', { class: 'intl-g' }, svg);
    D.intl.forEach(function (l) { el('path', { class: 'intl', d: lineD(l) }, intl); });
    overlay = el('g', { id: 'overlay' }, svg);
    var gl = ztext(el('g', { class: 'grid' }, svg), 60, 8.5, 11);
    D.grid.forEach(function (g) {
      var t;
      if (g.v) t = el('text', { x: g.b[0], y: g.b[1], dy: '1.25em', 'text-anchor': g.b[0] < 450 ? 'end' : 'middle', dx: g.b[0] < 450 ? '0.3em' : null, direction: 'rtl' }, gl);
      else t = el('text', { x: g.a[0], y: g.a[1], dx: '0.4em', dy: '-0.45em', 'text-anchor': 'end', direction: 'rtl' }, gl);
      var parts = g.label.split(' ');
      t.textContent = '\u2066' + parts[0] + '\u2069 ' + parts.slice(1).join(' ');
    });
    el('rect', { class: 'frame', x: FULL.x, y: FULL.y, width: FULL.w, height: FULL.h }, svg);
    applyView();
    bindGestures();
    window.addEventListener('resize', function () { applyView(); });
    document.querySelector('.zoom').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-zoom]'); if (!b) return;
      var z = b.dataset.zoom;
      Sound.tap();
      if (z === 'in') zoomBy(1.6); else if (z === 'out') zoomBy(1 / 1.6); else resetView(true);
    });
  }

  /* ===== العرض والتكبير ===== */
  function clampView(v) {
    var minW = FULL.w / 12;
    var r = v.h / v.w;
    if (v.w > FULL.w) { v.w = FULL.w; v.h = FULL.w * r; }
    if (v.w < minW) { var cx = v.x + v.w / 2, cy = v.y + v.h / 2; v.w = minW; v.h = minW * r; v.x = cx - v.w / 2; v.y = cy - v.h / 2; }
    if (v.h > FULL.h && v.w >= FULL.w * 0.999) { v.h = FULL.h; }
    var mx = FULL.w * 0.04, my = FULL.h * 0.04;
    v.x = Math.min(Math.max(v.x, FULL.x - mx), FULL.x + FULL.w - v.w + mx);
    v.y = Math.min(Math.max(v.y, FULL.y - my), FULL.y + FULL.h - v.h + my);
    if (v.w >= FULL.w * 0.999) v.x = FULL.x;
    if (v.h >= FULL.h * 0.999) v.y = FULL.y;
    return v;
  }
  function applyView() {
    svg.setAttribute('viewBox', view.x + ' ' + view.y + ' ' + view.w + ' ' + view.h);
    var s = scale();
    if (!s) return;
    // سماكة الحدود بحسب التكبير حتى لا تبدو السواحل المتعرجة داكنة عند التصغير
    svg.style.setProperty('--gsw', s < 0.085 ? '0.7px' : s < 0.16 ? '0.95px' : s < 0.4 ? '1.25px' : '1.6px');
    svg.style.setProperty('--csw', s < 0.085 ? '0.45px' : s < 0.16 ? '0.7px' : '1px');
    for (var i = 0; i < scaled.length; i++) {
      var it = scaled[i];
      if (!it.el.isConnected) { scaled.splice(i--, 1); continue; }
      var px = Math.min(Math.max(it.base * s, it.min), it.max);
      it.el.setAttribute(it.attr, (px / s).toFixed(1));
    }
    viewListeners.forEach(function (f) { f(view, s); });
  }
  function setView(v) { if (anim) { cancelAnimationFrame(anim); anim = null; } view = clampView(v); applyView(); }
  function animateTo(target, ms) {
    if (anim) cancelAnimationFrame(anim);
    target = clampView({ x: target.x, y: target.y, w: target.w, h: target.h });
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { view = target; applyView(); return; }
    var from = { x: view.x, y: view.y, w: view.w, h: view.h }, t0 = performance.now(), dur = ms || 480;
    (function step(now) {
      var k = Math.min(1, (now - t0) / dur);
      var e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      view = { x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, w: from.w + (target.w - from.w) * e, h: from.h + (target.h - from.h) * e };
      applyView();
      anim = k < 1 ? requestAnimationFrame(step) : null;
    })(t0);
  }
  function fitBox(b, pad, animate) {
    pad = pad == null ? 0.12 : pad;
    var w = b[2] - b[0], h = b[3] - b[1];
    var rect = svg.getBoundingClientRect();
    var ar = rect.height && rect.width ? rect.height / rect.width : FULL.h / FULL.w;
    w *= 1 + 2 * pad; h *= 1 + 2 * pad;
    if (h / w > ar) w = h / ar; else h = w * ar;
    var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    var v = { x: cx - w / 2, y: cy - h / 2, w: w, h: h };
    if (animate === false) setView(v); else animateTo(v);
  }
  function zoomBy(f, cx, cy) {
    var rect = svg.getBoundingClientRect();
    var p = (cx == null) ? { x: view.x + view.w / 2, y: view.y + view.h / 2 } : clientToMap(cx, cy);
    var nw = view.w / f, nh = view.h / f;
    var rx = (p.x - view.x) / view.w, ry = (p.y - view.y) / view.h;
    var v = { x: p.x - rx * nw, y: p.y - ry * nh, w: nw, h: nh };
    if (cx == null) animateTo(v, 260); else setView(v);
  }
  function resetView(animate) {
    var v = { x: FULL.x, y: FULL.y, w: FULL.w, h: FULL.h };
    if (animate) animateTo(v); else setView(v);
  }
  function isZoomed() { return view.w < FULL.w * 0.98; }

  function scale() { var m = svg.getScreenCTM(); return m ? m.a : 0; }
  function clientToMap(cx, cy) {
    var m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 };
    var pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
    var r = pt.matrixTransform(m.inverse());
    return { x: r.x, y: r.y };
  }
  function mapToClient(x, y) {
    var m = svg.getScreenCTM();
    var pt = svg.createSVGPoint(); pt.x = x; pt.y = y;
    var r = pt.matrixTransform(m);
    return { x: r.x, y: r.y };
  }
  function overMap(cx, cy) {
    var r = wrap.getBoundingClientRect();
    return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
  }

  /* عناصر يتغير حجمها مع التكبير ليبقى النص مقروءًا */
  function zsize(e, attr, base, minPx, maxPx) {
    scaled.push({ el: e, attr: attr, base: base, min: minPx, max: maxPx });
    var s = scale();
    if (s) { var px = Math.min(Math.max(base * s, minPx), maxPx); e.setAttribute(attr, (px / s).toFixed(1)); }
    else e.setAttribute(attr, base);
    return e;
  }
  function ztext(g, base, minPx, maxPx) { return zsize(g, 'font-size', base, minPx, maxPx); }
  function label(parent, text, x, y, cls, anchor) {
    var t = el('text', { x: x, y: y, class: cls || '', 'text-anchor': anchor || 'middle', dy: '0.35em' }, parent);
    t.textContent = text;
    return t;
  }

  /* اسم المحافظة في موضعه واتجاهه كما في الخريطة الرسمية */
  function govLabel(parent, g, cls, text) {
    var x = g.lab.pt[0], y = g.lab.pt[1];
    var holder = el('g', { transform: g.lab.rot ? 'rotate(' + g.lab.rot + ' ' + x + ' ' + y + ')' : null, 'data-gov': g.id }, parent);
    var t = label(holder, text || g.name, x, y, 'lbl-gov ' + (cls || ''));
    zsize(t, 'font-size', GEO.labelSize(g), 9, 16);
    return t;
  }

  /* ===== الإيماءات: سحب الخريطة، التكبير بإصبعين، النقر ===== */
  function bindGestures() {
    var pts = new Map();
    var pan = null, pinch = null, moved = false, downTarget = null, multi = false;
    wrap.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.zoom') || (window.Drag && Drag.active)) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try { wrap.setPointerCapture(e.pointerId); } catch (err) { }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) {
        moved = false; multi = false; downTarget = e.target;
        pan = { x: e.clientX, y: e.clientY, v: { x: view.x, y: view.y, w: view.w, h: view.h } };
      } else if (pts.size === 2) {
        multi = true; pan = null;
        var a = Array.from(pts.values());
        pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, mid: clientToMap((a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2), v: { x: view.x, y: view.y, w: view.w, h: view.h } };
      }
    });
    wrap.addEventListener('pointermove', function (e) {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2 && pinch) {
        var a = Array.from(pts.values());
        var d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1;
        var f = d / pinch.d;
        var nw = pinch.v.w / f, nh = pinch.v.h / f;
        var midC = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
        var rect = svg.getBoundingClientRect();
        // نحافظ على نقطة المنتصف تحت الإصبعين
        view = clampView({ x: pinch.v.x, y: pinch.v.y, w: nw, h: nh });
        svg.setAttribute('viewBox', view.x + ' ' + view.y + ' ' + view.w + ' ' + view.h);
        var p = clientToMap(midC.x, midC.y);
        setView({ x: view.x + (pinch.mid.x - p.x), y: view.y + (pinch.mid.y - p.y), w: view.w, h: view.h });
        moved = true;
        return;
      }
      if (pan) {
        var dx = e.clientX - pan.x, dy = e.clientY - pan.y;
        if (!moved && Math.hypot(dx, dy) > 9) moved = true;
        if (moved && isZoomed()) {
          var s = scale() || 1;
          setView({ x: pan.v.x - dx / s, y: pan.v.y - dy / s, w: pan.v.w, h: pan.v.h });
        }
      }
    });
    function end(e) {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (e.type === 'pointerup' && pts.size === 0 && !moved && !multi && tapHandler) {
        var p = clientToMap(e.clientX, e.clientY);
        var govEl = downTarget && downTarget.closest ? downTarget.closest('[data-gov]') : null;
        var gid = govEl ? govEl.getAttribute('data-gov') : govAt(p.x, p.y, 16);
        tapHandler({ x: p.x, y: p.y, cx: e.clientX, cy: e.clientY, target: downTarget, gov: gid });
      }
      if (pts.size < 2) pinch = null;
      if (pts.size === 1) {
        var a = Array.from(pts.values())[0];
        pan = { x: a.x, y: a.y, v: { x: view.x, y: view.y, w: view.w, h: view.h } };
      }
      if (pts.size === 0) { pan = null; }
    }
    wrap.addEventListener('pointerup', end);
    wrap.addEventListener('pointercancel', end);
    wrap.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomBy(Math.exp(-e.deltaY * 0.0018), e.clientX, e.clientY);
    }, { passive: false });
    ['gesturestart', 'gesturechange'].forEach(function (n) { wrap.addEventListener(n, function (e) { e.preventDefault(); }); });
  }

  /* ===== هندسة: هل النقطة داخل محافظة؟ ===== */
  function inRings(rings, x, y) {
    for (var p = 0; p < rings.length; p++) {
      var inside = false;
      for (var r = 0; r < rings[p].length; r++) {
        var a = rings[p][r], n = a.length;
        for (var i = 0, j = n - 2; i < n; j = i, i += 2) {
          var xi = a[i], yi = a[i + 1], xj = a[j], yj = a[j + 1];
          if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
        }
      }
      if (inside) return true;
    }
    return false;
  }
  function distRings(rings, x, y) {
    var best = Infinity;
    for (var p = 0; p < rings.length; p++) for (var r = 0; r < rings[p].length; r++) {
      var a = rings[p][r], n = a.length;
      for (var i = 0, j = n - 2; i < n; j = i, i += 2) {
        var x1 = a[j], y1 = a[j + 1], x2 = a[i], y2 = a[i + 1];
        var dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
        var t = L ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L)) : 0;
        var d = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
        if (d < best) best = d;
      }
    }
    return best;
  }
  function inGov(id, x, y) { return inRings(govById[id].rings, x, y); }
  function govAt(x, y, tolPx) {
    for (var i = 0; i < D.govs.length; i++) if (inRings(D.govs[i].rings, x, y)) return D.govs[i].id;
    if (!tolPx) return null;
    var tol = tolPx / (scale() || 1), best = null, bd = Infinity;
    D.govs.forEach(function (g) {
      var b = g.bbox;
      if (x < b[0] - tol || x > b[2] + tol || y < b[1] - tol || y > b[3] + tol) return;
      var d = distRings(g.rings, x, y);
      if (d < bd) { bd = d; best = g.id; }
    });
    return bd <= tol ? best : null;
  }

  /* ===== إعادة الضبط بين الألعاب ===== */
  function reset() {
    overlay.innerHTML = '';
    tapHandler = null;
    viewListeners = [];
    D.govs.forEach(function (g) {
      var e = govEls[g.id];
      e.setAttribute('class', 'gov');
      e.style.fill = '';
      e.style.opacity = '';
    });
    svg.classList.remove('seas-mode');
    if (window.UI) UI.compass(false);
    resetView(false);
  }

  window.MapView = {
    init: build, el: el, ringsToD: ringsToD, lineD: lineD, data: D, FULL: FULL,
    get svg() { return svg; }, get wrap() { return wrap; }, get overlay() { return overlay; }, get view() { return view; },
    gov: function (id) { return govEls[id]; }, govData: function (id) { return govById[id]; }, govD: function (id) { return govD[id]; },
    setView: setView, animateTo: animateTo, fitBox: fitBox, zoomBy: zoomBy, resetView: resetView, isZoomed: isZoomed,
    scale: scale, clientToMap: clientToMap, mapToClient: mapToClient, overMap: overMap,
    zsize: zsize, ztext: ztext, label: label, govLabel: govLabel,
    onTap: function (f) { tapHandler = f; }, onView: function (f) { viewListeners.push(f); },
    inGov: inGov, govAt: govAt, reset: reset,
    layer: function (cls) { return el('g', { class: cls || '' }, overlay); }
  };
})();
