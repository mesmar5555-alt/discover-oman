/* اللعبة الثانية: اكتشف الولايات (63 ولاية من خريطة الولايات في الأطلس المرفق) */
(function () {
  'use strict';
  var M = window.MapView, D = M.data, h = UI.h;
  var ROUND = 8;
  var MIX = {
    1: ['locate', 'locate', 'mcGov', 'locate', 'mcMember', 'locate', 'mcGov', 'mcMember'],
    2: ['locate', 'drag', 'mcGov', 'tapGov', 'locate', 'drag', 'mcGov', 'tapGov'],
    3: ['locate', 'drag', 'tapGov', 'mcMember', 'locate', 'drag', 'tapGov', 'mcMember']
  };
  var S = { level: 1, mode: 'explore', sel: null, seen: {}, L: null, quiz: null, round: null, busy: false };

  function tint(hex, k) {
    k = k == null ? 0.55 : k;
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return 'rgb(' + Math.round(r + (255 - r) * k) + ',' + Math.round(g + (255 - g) * k) + ',' + Math.round(b + (255 - b) * k) + ')';
  }
  function wName(w) { return 'ولاية ' + w.name; }
  function about(w) { return w.capital ? 'عاصمة سلطنة عُمان، ومركز محافظة مسقط' : w.center ? 'مركز ' + GEO.govName(w.gov) : 'تتبع ' + GEO.govName(w.gov); }
  function byName(n) { for (var i = 0; i < D.wilayats.length; i++) if (D.wilayats[i].name === n) return D.wilayats[i]; }

  /* ===== رسم الخريطة ===== */
  function setupMap() {
    M.reset();
    D.govs.forEach(function (g) { var e = M.gov(g.id); e.style.fill = tint(GEO.colors[g.id]); e.classList.add('tap'); });
    S.L = { gnames: M.layer('w-gnames'), labels: M.ztext(M.layer('w-labels'), 78, 11, 15), dots: M.layer('w-dots'), fx: M.layer('w-fx') };
    S.dotEls = {};
    M.onView(relabel);
  }
  function showGovNames(on, only) {
    S.L.gnames.innerHTML = '';
    if (!on) return;
    D.govs.forEach(function (g) { if (!only || only === g.id) M.govLabel(S.L.gnames, g); });
  }
  function focusGov(id, zoom) {
    D.govs.forEach(function (g) {
      var e = M.gov(g.id);
      e.classList.toggle('dim', !!id && g.id !== id);
      e.classList.toggle('sel', g.id === id);
    });
    if (zoom && id) fitWilayats(id); else if (zoom) M.resetView(true);
  }
  function drawDots(list) {
    S.L.dots.innerHTML = ''; S.L.labels.innerHTML = ''; S.dotEls = {};
    list.forEach(function (w) {
      var c = M.el('circle', { cx: w.pt[0], cy: w.pt[1], class: 'dot' + (w.capital ? ' cap' : '') }, S.L.dots);
      M.zsize(c, 'r', w.capital ? 34 : 26, w.capital ? 6.5 : 5.5, w.capital ? 10 : 8.5);
      S.dotEls[w.name] = c;
    });
    S.shown = list;
  }
  /* يوضع الاسم بالإزاحة نفسها التي في خريطة الولايات الرسمية (79 وحدة = حجم خطها)،
     مع تصغيرها بنسبة حجم الخط الحالي، فيبقى ترتيب الأسماء كما رسمه الأطلس */
  function placeLabel(t, w) {
    var f = parseFloat(S.L.labels.getAttribute('font-size')) || 78;
    var k = f / 79;
    var dx = w.lbl[0] - w.pt[0], dy = w.lbl[1] - w.pt[1], L = Math.hypot(dx, dy) || 1;
    // نقاطنا أكبر من نقاط الأطلس نسبةً إلى الخط، فنبعد الاسم بمقدار الفرق
    var dot = S.dotEls[w.name], r = dot ? parseFloat(dot.getAttribute('r')) || 0 : 0;
    var extra = Math.max(0, r - 12.6 * k) + f * 0.08;
    t.setAttribute('x', w.pt[0] + dx * k + dx / L * extra);
    t.setAttribute('y', w.pt[1] + dy * k + dy / L * extra);
  }
  function wLabel(w, cls) {
    var t = M.el('text', { class: 'lbl-w ' + (cls || ''), 'text-anchor': 'middle', dy: '0.35em' }, S.L.labels);
    t.textContent = w.name;
    t._w = w;
    placeLabel(t, w);
    clearTimeout(S.relT); S.relT = setTimeout(relabel, 0);
    return t;
  }
  function relabel() {
    if (!S.L) return;
    var placed = [], hidden = 0;
    var all = Array.prototype.slice.call(S.L.labels.childNodes).filter(function (t) { return t._w; });
    // الأولوية: الأسماء المطلوبة في السؤال ثم العاصمة ثم بقية الأسماء
    all.sort(function (a, b) { return pri(b) - pri(a); });
    all.forEach(function (t) {
      placeLabel(t, t._w);
      t.style.visibility = '';
      if (pri(t) >= 2) { placed.push(t.getBBox()); return; }
      var bb = t.getBBox(), pad = -bb.height * 0.12;
      var hit = placed.some(function (o) { return bb.x < o.x + o.width - pad && bb.x + bb.width > o.x + pad && bb.y < o.y + o.height - pad && bb.y + bb.height > o.y + pad; });
      if (hit) { t.style.visibility = 'hidden'; hidden++; } else placed.push(bb);
    });
    var note = document.getElementById('wHidden');
    if (note) note.textContent = hidden ? 'كبّر الخريطة لرؤية كل الأسماء' : '';
  }
  function pri(t) { var c = t.getAttribute('class') || ''; return /good|miss/.test(c) ? 4 : t._w.capital ? 3 : t._w.center ? 2 : 1; }
  function fitWilayats(id) {
    var ws = GEO.wilayatsOf(id), g = M.govData(id);
    var xs = ws.map(function (w) { return w.pt[0]; }), ys = ws.map(function (w) { return w.pt[1]; });
    var b = [Math.min.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, xs), Math.max.apply(null, ys)];
    var pad = Math.max(420, 0.15 * Math.max(b[2] - b[0], b[3] - b[1]));
    b = [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad];
    // لا نكبّر أكثر من حدود المحافظة نفسها إن كانت أصغر
    b = [Math.max(b[0], g.bbox[0] - pad), Math.max(b[1], g.bbox[1] - pad), Math.min(b[2], g.bbox[2] + pad), Math.min(b[3], g.bbox[3] + pad)];
    M.fitBox(b, 0.02);
  }
  function halo(w) {
    var c = M.el('circle', { cx: w.pt[0], cy: w.pt[1], class: 'halo' }, S.L.fx);
    M.zsize(c, 'r', 70, 16, 24);
    setTimeout(function () { c.remove(); }, 2600);
  }
  function nearestDot(p, list, tolPx) {
    var s = M.scale() || 1, best = null, bd = Infinity;
    (list || S.shown || []).forEach(function (w) {
      var d = Math.hypot(w.pt[0] - p.x, w.pt[1] - p.y);
      if (d < bd) { bd = d; best = w; }
    });
    return bd * s <= (tolPx || 26) ? best : null;
  }
  function flashLabel(w, cls, ms) {
    var t = wLabel(w, cls);
    setTimeout(function () { t.remove(); }, ms || 1800);
  }

  /* ===== أوضاع اللعبة ===== */
  function modeSwitch() {
    var box = h('div', { class: 'modes', role: 'radiogroup', 'aria-label': 'طريقة اللعب' });
    [['explore', 'استكشف المحافظات'], ['challenge', 'التحدي الشامل']].forEach(function (m) {
      box.appendChild(h('button', { type: 'button', role: 'radio', 'aria-checked': String(S.mode === m[0]), onclick: function () { Sound.tap(); if (S.mode === m[0]) return; S.mode = m[0]; start(); } }, [m[1]]));
    });
    return box;
  }
  function start() {
    clearTimeout(S.nextT);
    setupMap();
    UI.setLevel(S.level, function (lv) { S.level = lv; if (S.mode === 'challenge') start(); });
    UI.setActions([{ label: S.mode === 'explore' ? 'عرض السلطنة كاملة' : 'جولة جديدة', icon: S.mode === 'explore' ? 'map' : 'restart', onClick: start }]);
    UI.setModes(modeSwitch());
    if (S.mode === 'explore') startExplore(); else startRound();
  }

  /* ---------- الاستكشاف ---------- */
  function startExplore() {
    S.sel = null; S.quiz = null;
    showGovNames(true);
    drawDots(D.wilayats);
    focusGov(null, false);
    UI.setTask('اللعبة الثانية: اكتشف الولايات', 'انقر على أي محافظة في الخريطة لتظهر ولاياتها');
    UI.setProgress(Object.keys(S.seen).length, 11, 'استكشفت ');
    var t = UI.tray(); t.innerHTML = '';
    t.appendChild(h('p', { class: 'tray-note', text: 'النقاط على الخريطة هي مراكز الولايات الـ 63 كما في خريطة الولايات الرسمية. اختر محافظة لتتعرف على ولاياتها.' }));
    var grid = h('div', { class: 'tray-grid' });
    D.govs.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); }).forEach(function (g) {
      grid.appendChild(h('button', { type: 'button', class: 'chip plain', onclick: function () { Sound.tap(); selectGov(g.id); } }, [g.name]));
    });
    t.appendChild(grid);
    M.onTap(exploreTap);
  }
  function exploreTap(e) {
    if (S.quiz) { quizTap(e); return; }
    if (S.sel) {
      var w = nearestDot(e, GEO.wilayatsOf(S.sel), 24);
      if (w) { Sound.tap(); halo(w); UI.toast(wName(w), about(w), 'info', 2000); return; }
    }
    if (e.gov && e.gov !== S.sel) { Sound.tap(); selectGov(e.gov); }
  }
  function selectGov(id) {
    S.sel = id; S.quiz = null;
    S.seen[id] = true;
    UI.setProgress(Object.keys(S.seen).length, 11, 'استكشفت ');
    var ws = GEO.wilayatsOf(id);
    showGovNames(false);
    focusGov(id, true);
    drawDots(ws);
    ws.forEach(function (w) { wLabel(w); });
    UI.setTask('اللعبة الثانية: اكتشف الولايات', GEO.govName(id) + ': ' + ws.length + ' ولايات. انقر على أي ولاية لتتعرف عليها');
    var t = UI.tray(); t.innerHTML = '';
    var head = h('div', { class: 'tray-head' }, [h('h3', { text: 'ولايات ' + GEO.govName(id) + ' (' + ws.length + ')' }), h('span', { id: 'wHidden', class: 'hidden-note' })]);
    t.appendChild(head);
    var grid = h('div', { class: 'tray-grid' });
    ws.forEach(function (w) {
      grid.appendChild(h('button', { type: 'button', class: 'chip plain', onclick: function () { Sound.tap(); halo(w); UI.toast(wName(w), about(w), 'info', 2000); } }, [w.name]));
    });
    t.appendChild(grid);
    var acts = h('div', { class: 'tray-grid', style: 'margin-top:8px' });
    acts.appendChild(h('button', { type: 'button', class: 'btn primary', onclick: function () { Sound.tap(); startQuiz(id); } }, ['اختبر نفسك: حدد ولايات المحافظة']));
    acts.appendChild(h('button', { type: 'button', class: 'btn', onclick: function () { Sound.tap(); startExplore(); M.resetView(true); } }, ['اختر محافظة أخرى']));
    t.appendChild(acts);
  }
  /* اختبار قصير داخل المحافظة المختارة: حدد ولاية ... */
  function startQuiz(id) {
    var ws = UI.shuffle(GEO.wilayatsOf(id));
    S.quiz = { gov: id, list: ws, i: 0, wrong: 0 };
    S.L.labels.innerHTML = '';
    UI.tray().querySelectorAll('.chip.plain').forEach(function (c) { c.disabled = true; c.style.opacity = .45; });
    askQuiz();
  }
  function askQuiz() {
    var q = S.quiz, w = q.list[q.i];
    q.wrong = 0;
    UI.setTask('اختبر نفسك في ' + GEO.govName(q.gov), h('span', null, ['حدد ', h('em', { text: wName(w) }), ' على الخريطة (' + (q.i + 1) + ' من ' + q.list.length + ')']));
  }
  function quizTap(e) {
    var q = S.quiz; if (!q || S.busy) return;
    var target = q.list[q.i];
    var w = nearestDot(e, GEO.wilayatsOf(q.gov), 26);
    if (!w) return;
    if (w === target) {
      Sound.correct(); halo(w); wLabel(w, 'good'); S.dotEls[w.name].classList.add('good');
      UI.toast(q.wrong ? UI.praise() : 'أحسنت! إجابة صحيحة', wName(w), 'good', 1500);
      q.i++;
      if (q.i >= q.list.length) {
        S.quiz = null;
        setTimeout(function () { Sound.stage(); UI.confetti(1600); UI.toast('أتقنت ولايات ' + GEO.govName(q.gov) + '!', 'اختر محافظة أخرى لتواصل الاستكشاف', 'good', 3200); selectGov(q.gov); }, 900);
      } else { S.busy = true; setTimeout(function () { S.busy = false; askQuiz(); }, 700); }
    } else {
      q.wrong++; Sound.wrong();
      flashLabel(w, 'miss');
      UI.toast('هذه ' + wName(w), q.wrong >= 2 ? 'تلميح: انظر إلى النقطة الوامضة' : UI.tryAgain(), 'try');
      if (q.wrong >= 2) { var d = S.dotEls[target.name]; d.classList.remove('target'); void d.getBBox(); d.classList.add('target'); halo(target); }
    }
  }

  /* ---------- التحدي الشامل ---------- */
  function startRound() {
    var used = {};
    S.round = { qs: MIX[S.level].map(function (t) { return { type: t }; }), i: 0, first: 0 };
    S.round.used = used;
    UI.tray().innerHTML = '';
    nextQ();
  }
  function freshWilayat(filter) {
    var pool = D.wilayats.filter(function (w) { return !S.round.used[w.name] && (!filter || filter(w)); });
    if (!pool.length) pool = D.wilayats.filter(function (w) { return !filter || filter(w); });
    var w = UI.pick(pool); S.round.used[w.name] = true; return w;
  }
  function qHeader() {
    var t = UI.tray(); t.innerHTML = '';
    return t;
  }
  function nextQ() {
    var R = S.round;
    if (R.i >= R.qs.length) { endRound(); return; }
    var q = R.qs[R.i]; q.wrong = 0; q.done = false;
    UI.setProgress(R.i + 1, ROUND, 'السؤال ');
    S.L.labels.innerHTML = ''; S.L.fx.innerHTML = '';
    showGovNames(S.level === 1 && (q.type === 'mcGov' || q.type === 'mcMember'));
    M.onTap(null);
    ({ locate: qLocate, mcGov: qMcGov, mcMember: qMcMember, tapGov: qTapGov, drag: qDrag })[q.type](q);
  }
  function answered(q, firstTry) {
    if (q.done) return; q.done = true;
    if (firstTry) S.round.first++;
    clearTimeout(S.nextT);
    S.nextT = setTimeout(function () { S.round.i++; nextQ(); }, 1500);
  }
  function revealAfter(q, n, fn) { if (q.wrong >= n) fn(); }

  function qLocate(q) {
    var w = q.w || (q.w = freshWilayat());
    var L = S.level;
    if (L === 1) { focusGov(w.gov, true); drawDots(GEO.wilayatsOf(w.gov)); }
    else { focusGov(null, false); M.resetView(true); drawDots(D.wilayats); if (L === 2) M.gov(w.gov).classList.add('sel'); }
    UI.setTask('التحدي الشامل', h('span', null, ['حدد ', h('em', { text: wName(w) }), ' على الخريطة' + (L === 1 ? ' في ' + GEO.govName(w.gov) : '')]));
    var t = qHeader();
    t.appendChild(h('p', { class: 'tray-note', text: L === 1 ? 'انقر على النقطة الصحيحة. النقاط هي ولايات المحافظة.' : 'انقر على النقطة الصحيحة. يمكنك تكبير الخريطة بالإصبعين أو بزر +.' }));
    M.onTap(function (e) {
      if (q.done) return;
      var hit = nearestDot(e, null, 24);
      if (!hit) return;
      if (hit === w) {
        Sound.correct(); halo(w); wLabel(w, 'good'); S.dotEls[w.name].classList.add('good');
        UI.toast(q.wrong ? UI.praise() : 'أحسنت! إجابة صحيحة', wName(w) + ' — ' + GEO.govName(w.gov), 'good', 1600);
        answered(q, q.wrong === 0);
      } else {
        q.wrong++; Sound.wrong(); flashLabel(hit, 'miss');
        var hint = q.wrong >= (L === 1 ? 1 : 2) ? 'تلميح: ' + w.name + ' في ' + GEO.govName(w.gov) : UI.tryAgain();
        UI.toast('هذه ' + wName(hit), hint, 'try');
        if (q.wrong >= 2 && L > 1) M.gov(w.gov).classList.add('sel');
        if (q.wrong >= 3) { var d = S.dotEls[w.name]; d.classList.add('target'); halo(w); }
      }
    });
  }
  function options(list, correct, onPick) {
    var box = h('div', { class: 'opts' });
    UI.shuffle(list).forEach(function (o) {
      var b = h('button', { type: 'button', class: 'opt' }, [o.label]);
      b.addEventListener('click', function () {
        if (b.disabled) return;
        var ok = o.key === correct;
        onPick(o, ok, b);
        if (ok) { b.classList.add('right'); Array.prototype.forEach.call(box.children, function (x) { x.disabled = true; }); }
        else { b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); }
      });
      box.appendChild(b);
    });
    return box;
  }
  function otherGovs(id, n) { return UI.shuffle(D.govs.filter(function (g) { return g.id !== id; })).slice(0, n); }

  function qMcGov(q) {
    var w = q.w || (q.w = freshWilayat());
    focusGov(null, false); M.resetView(true);
    drawDots(S.level < 3 ? [w] : []);
    if (S.level < 3) { wLabel(w); halo(w); }
    UI.setTask('التحدي الشامل', h('span', null, ['إلى أي محافظة تتبع ', h('em', { text: wName(w) }), '؟']));
    var t = qHeader();
    if (S.level < 3) t.appendChild(h('p', { class: 'tray-note', text: 'لاحظ موقع الولاية على الخريطة ثم اختر محافظتها.' }));
    var opts = [w.gov].concat(otherGovs(w.gov, 3).map(function (g) { return g.id; })).map(function (id) { return { key: id, label: GEO.govName(id) }; });
    t.appendChild(options(opts, w.gov, function (o, ok) {
      if (ok) {
        Sound.correct(); M.gov(w.gov).classList.add('sel');
        UI.toast(q.wrong ? UI.praise() : 'أحسنت! إجابة صحيحة', wName(w) + ' تتبع ' + GEO.govName(w.gov), 'good', 1800);
        answered(q, q.wrong === 0);
      } else {
        q.wrong++; Sound.wrong();
        UI.toast(UI.tryAgain(), q.wrong >= 2 ? 'تلميح: ' + GEO.hints[w.gov] : 'انظر أين تقع النقطة على الخريطة', 'try');
        if (q.wrong >= 2) { var e = M.gov(w.gov); e.classList.add('hint'); setTimeout(function () { e.classList.remove('hint'); }, 3100); }
      }
    }));
  }
  function qMcMember(q) {
    var gid = q.gov || (q.gov = UI.pick(D.govs).id);
    var right = freshWilayat(function (w) { return w.gov === gid; });
    var wrongs = UI.shuffle(D.wilayats.filter(function (w) { return w.gov !== gid; })).slice(0, 3);
    focusGov(gid, false); M.resetView(true); drawDots([]);
    if (S.level === 1) showGovNames(true, gid);
    UI.setTask('التحدي الشامل', h('span', null, ['اختر ولاية تابعة لـ ', h('em', { text: GEO.govName(gid) })]));
    var t = qHeader();
    t.appendChild(h('p', { class: 'tray-note', text: 'المحافظة المطلوبة مميزة على الخريطة.' }));
    var opts = [right].concat(wrongs).map(function (w) { return { key: w.name, label: w.name, w: w }; });
    t.appendChild(options(opts, right.name, function (o, ok) {
      if (ok) {
        Sound.correct(); drawDots(GEO.wilayatsOf(gid)); wLabel(right, 'good'); halo(right);
        UI.toast(q.wrong ? UI.praise() : 'أحسنت! إجابة صحيحة', wName(right) + ' تتبع ' + GEO.govName(gid), 'good', 1800);
        answered(q, q.wrong === 0);
      } else {
        q.wrong++; Sound.wrong();
        UI.toast('ولاية ' + o.w.name + ' تتبع ' + GEO.govName(o.w.gov), 'اختر ولاية أخرى', 'try', 2600);
      }
    }));
  }
  function qTapGov(q) {
    var w = q.w || (q.w = freshWilayat());
    focusGov(null, false); M.resetView(true);
    drawDots(S.level < 3 ? [w] : []);
    if (S.level < 3) { wLabel(w); halo(w); }
    UI.setTask('التحدي الشامل', h('span', null, ['في أي محافظة تقع ', h('em', { text: wName(w) }), '؟ انقر عليها في الخريطة']));
    var t = qHeader();
    t.appendChild(h('p', { class: 'tray-note', text: S.level < 3 ? 'انقر على المحافظة التي تقع فيها النقطة.' : 'تذكّر موقع الولاية، ثم انقر على محافظتها.' }));
    M.onTap(function (e) {
      if (q.done || !e.gov) return;
      if (e.gov === w.gov) {
        Sound.correct(); focusGov(w.gov, false); showGovNames(true, w.gov);
        if (S.level === 3) { drawDots([w]); wLabel(w, 'good'); }
        UI.toast(q.wrong ? UI.praise() : 'أحسنت! إجابة صحيحة', wName(w) + ' تتبع ' + GEO.govName(w.gov), 'good', 1800);
        answered(q, q.wrong === 0);
      } else {
        q.wrong++; Sound.wrong();
        var e2 = M.gov(e.gov); e2.classList.remove('flash'); void e2.getBBox(); e2.classList.add('flash');
        UI.toast('هذه ' + GEO.govName(e.gov), q.wrong >= 2 ? 'تلميح: ' + GEO.hints[w.gov] : UI.tryAgain(), 'try', 2600);
      }
    });
  }
  function qDrag(q) {
    var gid = q.gov || (q.gov = UI.pick(D.govs.filter(function (g) { return GEO.wilayatsOf(g.id).length >= 3; })).id);
    var ws = GEO.wilayatsOf(gid);
    var picks = UI.shuffle(ws).slice(0, 3);
    picks.forEach(function (w) { S.round.used[w.name] = true; });
    q.left = 3; q.firstAll = true;
    focusGov(gid, true); drawDots(ws);
    UI.setTask('التحدي الشامل', h('span', null, ['اسحب أسماء الولايات إلى مواقعها في ', h('em', { text: GEO.govName(gid) })]));
    var t = qHeader();
    t.appendChild(h('p', { class: 'tray-note', text: 'اسحب كل اسم وأفلته فوق نقطة ولايته.' }));
    var grid = h('div', { class: 'tray-grid drag-grid' });
    picks.forEach(function (w) {
      var chip = h('button', { type: 'button', class: 'chip wil drag-src' }, [w.name]);
      var tries = 0;
      Drag.attach(chip, {
        ghostClass: 'chip-ghost',
        ghost: function () { var n = h('div', { class: 'chip wil', text: w.name }); var r = chip.getBoundingClientRect(); return { node: n, w: r.width, h: r.height }; },
        onTap: function () { UI.toast('اسحب الاسم إلى نقطة ولايته', null, 'info'); },
        onDrop: function (info) {
          if (!M.overMap(info.gcx, info.gcy)) return { ok: false };
          var p = M.clientToMap(info.gcx, info.gcy);
          var hit = nearestDot(p, ws, 34);
          if (hit === w) {
            var c = M.mapToClient(w.pt[0], w.pt[1]);
            return { ok: true, to: { x: c.x - info.gw / 2, y: c.y - info.gh / 2 }, done: function () {
              chip.classList.add('gone'); chip.disabled = true; setTimeout(function () { chip.remove(); }, 250);
              Sound.snap(); setTimeout(function () { Sound.correct(); }, 120);
              S.dotEls[w.name].classList.add('good'); wLabel(w, 'good');
              q.left--;
              if (q.left === 0) { UI.toast('أحسنت! أكملت الولايات الثلاث', GEO.govName(gid), 'good', 1800); answered(q, q.firstAll); }
              else UI.toast('أحسنت! إجابة صحيحة', wName(w), 'good', 1300);
            } };
          }
          tries++; q.firstAll = false; Sound.wrong();
          if (hit) flashLabel(hit, 'miss');
          UI.toast(hit ? 'هذه نقطة ' + wName(hit) : 'أفلت الاسم فوق إحدى النقاط', tries >= 2 ? 'تلميح: انظر إلى النقطة الوامضة' : UI.tryAgain(), 'try');
          if (tries >= 2) { var d = S.dotEls[w.name]; d.classList.remove('target'); void d.getBBox(); d.classList.add('target'); halo(w); }
          return { ok: false };
        }
      });
      grid.appendChild(chip);
    });
    t.appendChild(grid);
  }
  function endRound() {
    var f = S.round.first;
    UI.setProgress(ROUND, ROUND, 'السؤال ');
    Sound.win(); UI.confetti();
    var stars = f >= 7 ? 3 : f >= 4 ? 2 : 1;
    var lvlName = ['', 'السهل', 'المتوسط', 'المتقدم'][S.level];
    UI.modal({
      title: f >= 7 ? 'بطل جغرافية عُمان!' : 'أحسنت، أنهيت الجولة!',
      text: 'أجبت من المحاولة الأولى عن ' + f + ' من ' + ROUND + ' أسئلة في المستوى ' + lvlName + '.',
      stars: stars,
      actions: [{ label: 'جولة جديدة', primary: true, onClick: start }].concat(S.level < 3 ? [{ label: 'المستوى التالي', onClick: function () { S.level++; start(); } }] : []).concat([{ label: 'استكشف المحافظات', onClick: function () { S.mode = 'explore'; start(); } }])
    });
  }

  window.Games = window.Games || {};
  window.Games.wilayat = {
    mount: function () { start(); },
    unmount: function () { clearTimeout(S.nextT); S.quiz = null; }
  };
})();
