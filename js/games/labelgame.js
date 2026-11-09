/* محرك مشترك لألعاب «اسحب الاسم إلى موقعه» (البحار والمحيطات، الدول المجاورة) */
(function () {
  'use strict';
  var M = window.MapView, h = UI.h;
  var HINT_AFTER = { 1: 1, 2: 2, 3: 2 };

  window.LabelGame = function (cfg) {
    var S = { level: 1, stage: 0, filled: {}, wrong: {}, wrongTotal: 0, L: null, slotGeo: {}, stageDone: false };

    function setupMap() {
      M.reset();
      S.L = { base: M.layer('lg-base'), lines: M.layer('lg-lines'), slots: M.layer('lg-slots'), fx: M.layer('lg-fx') };
      if (cfg.setupMap) cfg.setupMap(S.L, S);
    }
    function stage() { return cfg.stages[S.stage]; }

    function start(idx) {
      S.stage = idx || 0; S.filled = {}; S.wrong = {}; S.stageDone = false;
      if (S.stage === 0) S.wrongTotal = 0;
      setupMap();
      UI.compass(!!cfg.compass);
      UI.setLevel(S.level, function (lv) { S.level = lv; start(S.stage); });
      var acts = [{ label: 'إعادة المرحلة', icon: 'restart', onClick: function () { start(S.stage); } }];
      if (cfg.lens) acts.unshift({ label: cfg.lens.label, icon: 'lens', onClick: function () { if (M.isZoomed()) M.resetView(true); else M.fitBox(cfg.lens.box, 0.04); } });
      UI.setActions(acts);
      UI.setModes(stageSwitch());
      var st = stage();
      if (st.type === 'mc') startMC(st); else startLabels(st);
    }

    function stageSwitch() {
      var box = h('div', { class: 'modes', role: 'radiogroup', 'aria-label': 'المراحل' });
      cfg.stages.forEach(function (st, i) {
        box.appendChild(h('button', { type: 'button', role: 'radio', 'aria-checked': String(i === S.stage), onclick: function () { Sound.tap(); start(i); } }, [st.name]));
      });
      return box;
    }

    /* ---------- مرحلة السحب إلى المواقع ---------- */
    function startLabels(st) {
      UI.setTask(cfg.title + ' — ' + st.name, st.task);
      UI.setProgress(0, st.items.length, 'أنجزت ');
      var t = UI.tray(); t.innerHTML = '';
      t.appendChild(h('p', { class: 'tray-note', text: S.level === 3 ? 'المستوى المتقدم: لا توجد مربعات، أفلت الاسم في موقعه مباشرة.' : st.note }));
      var grid = h('div', { class: 'tray-grid drag-grid' });
      UI.shuffle(st.items).forEach(function (it) { grid.appendChild(chipFor(it, st)); });
      t.appendChild(grid);
      S.slotGeo = {};
      st.items.forEach(function (it) { drawSlot(it, st); });
      M.onView(updateSlots);
      updateSlots(M.view, M.scale());
      if (st.onStart) st.onStart(S.L, S);
    }
    function drawSlot(it, st) {
      var g = M.el('g', { class: 'slot' + (st.slotClass ? ' ' + st.slotClass : '') + (it.ring ? ' ring-slot' : '') }, S.L.slots);
      if (S.level === 3) g.style.visibility = 'hidden';
      var r, q;
      if (it.ring) {
        r = M.el('circle', { cx: it.pt[0], cy: it.pt[1], class: 'target-ring' }, g);
      } else {
        r = M.el('rect', { rx: 10 }, g);
        q = M.el('text', { class: 'q', x: it.pt[0], y: it.pt[1], 'text-anchor': 'middle', dy: '0.36em' }, g); q.textContent = '؟';
        M.zsize(q, 'font-size', 110, 13, 18);
      }
      if (it.feature) {
        var ring = M.el('circle', { cx: it.feature[0], cy: it.feature[1], class: 'ring' }, S.L.lines);
        M.zsize(ring, 'r', it.ringR || 90, 12, 34);
        M.el('line', { x1: it.pt[0], y1: it.pt[1], x2: it.feature[0], y2: it.feature[1], class: 'leader' }, S.L.lines);
      }
      if (it.arrowTo) {
        M.el('line', { x1: it.pt[0], y1: it.pt[1], x2: it.arrowTo[0], y2: it.arrowTo[1], class: 'leader' }, S.L.lines);
        var ah = M.el('circle', { cx: it.arrowTo[0], cy: it.arrowTo[1], class: 'arrowhead' }, S.L.lines);
        M.zsize(ah, 'r', 30, 3, 6);
      }
      S.slotGeo[it.key] = { g: g, rect: r, q: q, it: it, cx: it.pt[0], cy: it.pt[1] };
    }
    function updateSlots(v, s) {
      if (!s) return;
      Object.keys(S.slotGeo).forEach(function (k) {
        var sg = S.slotGeo[k], it = sg.it;
        if (it.ring) {
          sg.rpx = Math.min(Math.max(it.r * s, 17), 46);
          sg.rect.setAttribute('r', sg.rpx / s);
          if (sg.labelEl && it.side) placeRingLabel(sg, s);
          return;
        }
        var ph = window.innerWidth < 640 ? 0.8 : 1;
        var wpx = Math.max(it.w * s, (it.minW || 74) * ph), hpx = Math.max(it.h * s, 32 * ph);
        wpx = Math.min(wpx, 260); hpx = Math.min(hpx, 54);
        var w = wpx / s, hh = hpx / s, F = M.FULL;
        // يبقى المربع داخل إطار الخريطة
        var x0 = Math.min(Math.max(it.pt[0] - w / 2, F.x + 8 / s), F.x + F.w - w - 8 / s);
        var y0 = Math.min(Math.max(it.pt[1] - hh / 2, F.y + 8 / s), F.y + F.h - hh - 8 / s);
        sg.rect.setAttribute('x', x0); sg.rect.setAttribute('y', y0);
        sg.rect.setAttribute('width', w); sg.rect.setAttribute('height', hh);
        sg.cx = x0 + w / 2; sg.cy = y0 + hh / 2;
        if (sg.q) { sg.q.setAttribute('x', sg.cx); sg.q.setAttribute('y', sg.cy); }
        sg.wpx = wpx; sg.hpx = hpx;
      });
    }
    /* اسم الموقع خارج الدائرة مهما تغير التكبير */
    function placeRingLabel(sg, s) {
      var it = sg.it, t = sg.labelEl, off = (sg.rpx + 8) / s;
      var x = it.pt[0], y = it.pt[1], a = 'middle', dy = '0.35em';
      if (it.side === 'top') { y -= off; dy = '-0.15em'; }
      else if (it.side === 'bottom') { y += off; dy = '0.85em'; }
      else if (it.side === 'right') { x += off; a = 'start'; }
      else if (it.side === 'left') { x -= off; a = 'end'; }
      t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('text-anchor', a); t.setAttribute('dy', dy);
    }
    function chipFor(it, st) {
      var chip = h('button', { type: 'button', class: 'chip drag-src ' + (st.chipClass || '') }, [it.label]);
      Drag.attach(chip, {
        ghostClass: 'chip-ghost',
        ghost: function () { var r = chip.getBoundingClientRect(); return { node: h('div', { class: 'chip ' + (st.chipClass || ''), text: it.label }), w: r.width, h: r.height }; },
        onTap: function () { UI.toast('اسحب الاسم وأفلته في موقعه على الخريطة', null, 'info'); },
        onDrop: function (info) { return dropChip(it, st, chip, info); }
      });
      return chip;
    }
    function slotDist(sg, cx, cy) {
      var c = M.mapToClient(sg.cx, sg.cy);
      if (sg.it.ring) return Math.max(0, Math.hypot(cx - c.x, cy - c.y) - sg.rpx);
      var dx = Math.max(Math.abs(cx - c.x) - sg.wpx / 2, 0), dy = Math.max(Math.abs(cy - c.y) - sg.hpx / 2, 0);
      return Math.hypot(dx, dy);
    }
    function dropChip(it, st, chip, info) {
      if (!M.overMap(info.gcx, info.gcy)) return { ok: false };
      var best = null, bd = Infinity;
      Object.keys(S.slotGeo).forEach(function (k) {
        if (S.filled[k]) return;
        var d = slotDist(S.slotGeo[k], info.gcx, info.gcy);
        if (d < bd) { bd = d; best = S.slotGeo[k]; }
      });
      var tol = S.level === 3 ? 30 : 40;
      if (!best || bd > tol) {
        if (S.level < 3) { UI.toast('أفلت الاسم داخل أحد المربعات المنقّطة', null, 'info'); return { ok: false }; }
        return wrong(it, st);
      }
      if (best.it.key === it.key) {
        var c = M.mapToClient(best.cx, best.cy);
        return { ok: true, to: { x: c.x - info.gw / 2, y: c.y - info.gh / 2 }, done: function () { fill(it, st, chip); } };
      }
      return wrong(it, st);
    }
    function wrong(it, st) {
      S.wrong[it.key] = (S.wrong[it.key] || 0) + 1; S.wrongTotal++;
      Sound.wrong();
      var n = S.wrong[it.key];
      var show = n >= HINT_AFTER[S.level];
      UI.toast(UI.tryAgain(), show ? 'تلميح: ' + it.hint : null, 'try', show ? 3600 : 1800);
      if (show && S.level < 3) {
        var g = S.slotGeo[it.key].g; g.classList.remove('pulse'); void g.getBBox(); g.classList.add('pulse');
      }
      if (n >= 3 && S.level === 3) { S.slotGeo[it.key].g.style.visibility = 'visible'; S.slotGeo[it.key].g.classList.add('pulse'); }
      return { ok: false };
    }
    function fill(it, st, chip) {
      S.filled[it.key] = true;
      chip.classList.add('gone'); chip.disabled = true; setTimeout(function () { chip.remove(); }, 250);
      var sg = S.slotGeo[it.key];
      sg.g.classList.add('filled'); sg.g.style.visibility = 'visible';
      var at = it.labelAt || it.pt;
      var t = M.el('text', { x: at[0], y: at[1], class: st.labelClass + ' pop', 'text-anchor': 'middle', dy: it.lines ? null : '0.35em' }, sg.g);
      if (it.lines) {
        it.lines.forEach(function (ln, i) {
          var ts = M.el('tspan', { x: at[0], dy: i === 0 ? (-(it.lines.length - 1) * 0.55 + 0.35) + 'em' : '1.1em' }, t);
          ts.textContent = ln;
        });
      } else t.textContent = it.label;
      M.zsize(t, 'font-size', it.fs || 120, 11, 18);
      sg.labelEl = t;
      if (it.ring && it.side) placeRingLabel(sg, M.scale());
      if (it.onFill) it.onFill(S.L);
      Sound.snap(); setTimeout(function () { Sound.correct(); }, 130);
      var done = Object.keys(S.filled).length;
      UI.setProgress(done, st.items.length, 'أنجزت ');
      UI.toast('أحسنت! إجابة صحيحة', it.fact, 'good', 3600);
      if (done === st.items.length) setTimeout(function () { stageComplete(st); }, 1500);
    }

    /* ---------- مرحلة الأسئلة ---------- */
    function startMC(st) {
      var qs = UI.shuffle(st.questions).slice(0, st.count || st.questions.length);
      S.mc = { qs: qs, i: 0, first: 0 };
      if (st.onStart) st.onStart(S.L, S);
      askMC(st);
    }
    function askMC(st) {
      var R = S.mc, q = R.qs[R.i];
      q.wrong = 0;
      S.L.fx.innerHTML = '';
      M.data.govs.forEach(function (g) { M.gov(g.id).classList.remove('focus-gov'); });
      UI.setTask(cfg.title + ' — ' + st.name, q.q);
      UI.setProgress(R.i + 1, R.qs.length, 'السؤال ');
      if (q.show && S.level < 3) q.show(S.L.fx);
      var t = UI.tray(); t.innerHTML = '';
      if (st.note) t.appendChild(h('p', { class: 'tray-note', text: st.note }));
      var box = h('div', { class: 'opts' });
      var locked = false;
      UI.shuffle(q.options).forEach(function (o) {
        var b = h('button', { type: 'button', class: 'opt' }, [o]);
        b.addEventListener('click', function () {
          if (locked || b.disabled) return;
          if (o === q.a) {
            locked = true; b.classList.add('right'); Sound.correct();
            if (q.wrong === 0) R.first++;
            if (q.reveal) q.reveal(S.L.fx);
            UI.toast(q.wrong ? UI.praise() : 'أحسنت! إجابة صحيحة', q.fact, 'good', 2600);
            setTimeout(function () {
              R.i++;
              if (R.i >= R.qs.length) stageComplete(st); else askMC(st);
            }, 2200);
          } else {
            q.wrong++; S.wrongTotal++; Sound.wrong();
            b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); b.disabled = true;
            UI.toast(UI.tryAgain(), q.wrong >= HINT_AFTER[S.level] ? 'تلميح: ' + q.hint : null, 'try', 3000);
            if (q.show && S.level === 3 && q.wrong >= 2) q.show(S.L.fx);
          }
        });
        box.appendChild(b);
      });
      t.appendChild(box);
    }

    function stageComplete(st) {
      if (S.stageDone) return; S.stageDone = true;
      var last = S.stage === cfg.stages.length - 1;
      if (last) { Sound.win(); UI.confetti(); } else { Sound.stage(); UI.confetti(1500); }
      var stars = S.wrongTotal <= 1 ? 3 : S.wrongTotal <= 4 ? 2 : 1;
      var acts = [];
      if (!last) acts.push({ label: 'المرحلة التالية: ' + cfg.stages[S.stage + 1].name, primary: true, onClick: function () { start(S.stage + 1); } });
      acts.push({ label: last ? 'العب من البداية' : 'أعد المرحلة', primary: last, onClick: function () { start(last ? 0 : S.stage); } });
      if (last && S.level < 3) acts.push({ label: 'المستوى التالي', onClick: function () { S.level++; start(0); } });
      if (last && cfg.next) acts.push({ label: cfg.next.label, onClick: function () { App.go(cfg.next.game); } });
      acts.push({ label: 'تأمّل الخريطة' });
      UI.modal({ title: last ? 'بطل جغرافية عُمان!' : 'أكملت المرحلة!', text: st.doneText, stars: last ? stars : 0, actions: acts });
    }

    return {
      /* للاختبار الآلي فقط: مواقع المربعات الحالية */
      slots: function () { return Object.keys(S.slotGeo).map(function (k) { var g = S.slotGeo[k]; return { key: k, label: g.it.label, cx: g.cx, cy: g.cy }; }); },
      mount: function () { start(0); },
      unmount: function () { UI.compass(false); }
    };
  };
})();
