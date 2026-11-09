/* اللعبة الأولى: بازل محافظات عُمان */
(function () {
  'use strict';
  var M = window.MapView, D = M.data, h = UI.h;
  var LEVELS = {
    1: { tol: 600, hintAfter: 1, names: true },
    2: { tol: 400, hintAfter: 2, names: true },
    3: { tol: 260, hintAfter: 3, names: false }
  };
  /* ترتيب سهل للمبتدئين: المحافظات الكبيرة والمميزة أولًا */
  var EASY_ORDER = ['dhofar', 'musandam', 'wusta', 'dhahirah', 'south_sharqiyah', 'dakhiliyah', 'north_sharqiyah', 'buraimi', 'north_batinah', 'muscat', 'south_batinah'];
  var S = { level: 1, placed: {}, wrong: {}, wrongTotal: 0, count: 0, labels: null, tiles: {} };

  function pieceSvg(g, w, hgt) {
    var b = g.bbox, pad = 30;
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', (b[0] - pad) + ' ' + (b[1] - pad) + ' ' + (b[2] - b[0] + 2 * pad) + ' ' + (b[3] - b[1] + 2 * pad));
    s.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    if (w) { s.setAttribute('width', w); s.setAttribute('height', hgt); }
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', M.govD(g.id));
    p.setAttribute('fill', GEO.colors[g.id]);
    p.setAttribute('fill-rule', 'evenodd');
    s.appendChild(p);
    return s;
  }

  function progress() { UI.setProgress(S.count, 11, 'تم تركيب '); }

  function start() {
    M.reset();
    UI.trayMode('row');
    S.placed = {}; S.wrong = {}; S.wrongTotal = 0; S.count = 0; S.tiles = {};
    D.govs.forEach(function (g) { M.gov(g.id).classList.add('empty'); });
    S.labels = M.layer('gov-labels');
    UI.setTask('اللعبة الأولى: بازل محافظات عُمان', 'اسحب كل محافظة إلى مكانها الصحيح على الخريطة');
    progress();
    buildTray();
  }

  function buildTray() {
    var tray = UI.tray(); tray.innerHTML = '';
    var L = LEVELS[S.level];
    tray.appendChild(h('p', { class: 'tray-note', text: L.names ? 'قطع المحافظات الإحدى عشرة: اسحب القطعة إلى الخريطة' : 'المستوى المتقدم: تعرّف على المحافظة من شكلها فقط' }));
    var grid = h('div', { class: 'tray-grid shelf' });
    var ids = S.level === 1 ? EASY_ORDER.slice() : UI.shuffle(D.govs.map(function (g) { return g.id; }));
    ids.forEach(function (id) {
      var g = M.govData(id);
      var tile = h('button', { type: 'button', class: 'piece' + (L.names ? '' : ' noname'), 'data-id': id, 'aria-label': L.names ? GEO.govName(id) : 'قطعة محافظة' });
      tile.appendChild(pieceSvg(g));
      if (L.names) tile.appendChild(h('span', { text: g.name }));
      S.tiles[id] = tile;
      grid.appendChild(tile);
      Drag.attach(tile, {
        ghost: function () {
          var s = M.scale(), b = g.bbox, pad = 30;
          var w = (b[2] - b[0] + 2 * pad) * s, hh = (b[3] - b[1] + 2 * pad) * s;
          return { node: pieceSvg(g, w, hh), w: w, h: hh };
        },
        onTap: function () {
          UI.toast(L.names ? GEO.govName(id) : 'اسحب القطعة إلى مكانها', L.names ? 'اسحبها إلى مكانها على الخريطة' : null, 'info');
        },
        onDrop: function (info) { return drop(id, info); }
      });
    });
    tray.appendChild(grid);
  }

  function drop(id, info) {
    var g = M.govData(id), L = LEVELS[S.level], pad = 30;
    if (!M.overMap(info.gcx, info.gcy)) {
      UI.toast('اسحب القطعة إلى داخل الخريطة', null, 'info');
      return { ok: false };
    }
    var tl = M.clientToMap(info.gx, info.gy);
    var dx = tl.x - (g.bbox[0] - pad), dy = tl.y - (g.bbox[1] - pad);
    var dist = Math.hypot(dx, dy);
    // نقطة مرجعية داخل القطعة (موضع اسمها) بعد الإزاحة
    var ax = g.label[0] + dx, ay = g.label[1] + dy;
    var ok = dist <= L.tol || (dist <= L.tol * 1.7 && M.inGov(id, ax, ay));
    if (ok) {
      var to = M.mapToClient(g.bbox[0] - pad, g.bbox[1] - pad);
      return { ok: true, to: to, done: function () { placed(id); } };
    }
    S.wrong[id] = (S.wrong[id] || 0) + 1; S.wrongTotal++;
    Sound.wrong();
    var showHint = S.wrong[id] >= L.hintAfter;
    UI.toast(UI.tryAgain(), showHint ? 'تلميح: ' + GEO.hints[id] : null, 'try');
    if (showHint) {
      var e = M.gov(id);
      e.classList.remove('hint'); void e.getBBox(); e.classList.add('hint');
      setTimeout(function () { e.classList.remove('hint'); }, 3100);
    }
    return { ok: false };
  }

  function placed(id) {
    if (S.placed[id]) return;
    S.placed[id] = true; S.count++;
    var e = M.gov(id);
    e.classList.remove('empty', 'hint');
    e.style.fill = GEO.colors[id];
    e.classList.add('flash');
    setTimeout(function () { e.classList.remove('flash'); }, 800);
    var tile = S.tiles[id];
    tile.classList.add('gone'); tile.disabled = true;
    setTimeout(function () { tile.remove(); }, 260);
    Sound.snap();
    setTimeout(function () { Sound.correct(); }, 140);
    progress();
    if (S.count === 11) { finish(); return; }
    var sub = S.count >= 8 ? 'اقتربت من إتقان الخريطة' : (S.count === 1 ? 'بداية رائعة، واصل' : UI.praise());
    UI.toast('أحسنت! إجابة صحيحة', GEO.govName(id) + ' — ' + sub, 'good', 2200);
  }

  function finish() {
    UI.setTask('اللعبة الأولى: بازل محافظات عُمان', 'اكتملت الخريطة! هذه أسماء المحافظات في مواقعها الصحيحة');
    var tray = UI.tray(); tray.innerHTML = '';
    tray.appendChild(h('p', { class: 'tray-note', text: 'أحسنت! ركّبت المحافظات الإحدى عشرة. تأمّل الأسماء على الخريطة.' }));
    var order = D.govs.slice().sort(function (a, b) { return a.lab.pt[1] - b.lab.pt[1]; });
    order.forEach(function (g, i) {
      setTimeout(function () { M.govLabel(S.labels, g, 'pop'); }, 180 + i * 140);
    });
    setTimeout(function () {
      Sound.win(); UI.confetti();
      UI.toast('بطل جغرافية عُمان!', null, 'good', 2400);
    }, 250);
    var stars = S.wrongTotal <= 2 ? 3 : S.wrongTotal <= 6 ? 2 : 1;
    setTimeout(function () {
      var acts = [{ label: 'العب مرة أخرى', primary: true, onClick: start }];
      if (S.level < 3) acts.push({ label: 'المستوى التالي', onClick: function () { setLevel(S.level + 1); } });
      acts.push({ label: 'تأمّل الخريطة', onClick: function () { } });
      UI.modal({ title: 'بطل جغرافية عُمان!', text: 'ركّبت المحافظات الإحدى عشرة في مواقعها الصحيحة.', stars: stars, actions: acts });
    }, 2300);
  }

  function setLevel(lv) { S.level = lv; UI.setLevel(lv, setLevel); start(); }

  window.Games = window.Games || {};
  window.Games.puzzle = {
    mount: function () {
      UI.setLevel(S.level, setLevel);
      UI.setActions([{ label: 'إعادة اللعبة', icon: 'restart', onClick: start }]);
      start();
    },
    unmount: function () { }
  };
})();
