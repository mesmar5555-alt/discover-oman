/* السحب والإفلات باستخدام Pointer Events: يعمل باللمس والفأرة والقلم.
   لا تظهر نسخة السحب إلا بعد تحريك الإصبع، فيبقى التمرير الأفقي لشريط القطع ممكنًا */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function place(g, x, y) { g.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
  function fly(g, from, to, ms, shrink) {
    return new Promise(function (res) {
      if (reduce || !g.animate) { res(); return; }
      var a = g.animate([
        { transform: 'translate(' + from.x + 'px,' + from.y + 'px)', opacity: 1 },
        { transform: 'translate(' + to.x + 'px,' + to.y + 'px)' + (shrink ? ' scale(.35)' : ''), opacity: shrink ? 0.15 : 1 }
      ], { duration: ms, easing: 'cubic-bezier(.3,.8,.3,1)', fill: 'forwards' });
      a.onfinish = res; a.oncancel = res;
    });
  }

  function findScroller(node) {
    for (var el = node.parentElement; el && el !== document.body; el = el.parentElement) {
      var cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 2) return { el: el, axis: 'x' };
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2) return { el: el, axis: 'y' };
    }
    return null;
  }

  var Drag = {
    active: false,
    attach: function (source, opts) {
      source.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      source.addEventListener('dragstart', function (e) { e.preventDefault(); });
      source.addEventListener('pointerdown', function (e) {
        if (Drag.active || source.classList.contains('gone') || source.disabled) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.pointerType === 'mouse') e.preventDefault();
        var id = e.pointerId;
        try { source.setPointerCapture(id); } catch (err) { }
        var start = { x: e.clientX, y: e.clientY }, cur = { x: e.clientX, y: e.clientY };
        var touch = e.pointerType !== 'mouse';
        var g = null, w = 0, h = 0, lift = 0, raf = 0, finished = false, scrolling = null;
        // حاوية التمرير (شريط القطع): الحركة الأفقية تقريبًا تمرر الشريط، وأي ميل نحو الخريطة يبدأ السحب
        var sc = findScroller(source);

        function pos() { return { x: cur.x - w / 2, y: cur.y - h / 2 - lift }; }
        function info() {
          var p = pos();
          return { cx: cur.x, cy: cur.y, gx: p.x, gy: p.y, gw: w, gh: h, gcx: p.x + w / 2, gcy: p.y + h / 2 };
        }
        function begin() {
          Drag.active = true;
          var gi = opts.ghost();
          g = document.createElement('div');
          g.className = 'ghost ' + (opts.ghostClass || '');
          g.appendChild(gi.node);
          document.body.appendChild(g);
          w = gi.w; h = gi.h;
          // القطع الصغيرة تُرفع فوق الإصبع لتبقى ظاهرة، والكبيرة تكفيها رفعة بسيطة
          lift = (touch && opts.lift !== false) ? (h <= 40 ? h / 2 + 24 : h >= 110 ? 15 : 44 - (h - 40) * (29 / 70)) : 0;
          var p = pos(); place(g, p.x, p.y);
          source.classList.add('dragging');
          document.body.classList.add('is-dragging');
          if (opts.onStart) opts.onStart();
        }
        function move(ev) {
          if (ev.pointerId !== id || finished) return;
          cur = { x: ev.clientX, y: ev.clientY };
          if (scrolling) {
            if (scrolling.axis === 'x') scrolling.el.scrollLeft = scrolling.s0 - (cur.x - start.x);
            else scrolling.el.scrollTop = scrolling.s0 - (cur.y - start.y);
            return;
          }
          if (!g) {
            var dx = cur.x - start.x, dy = cur.y - start.y;
            if (Math.hypot(dx, dy) < 7) return;
            if (sc && touch) {
              var along = sc.axis === 'x' ? Math.abs(dx) : Math.abs(dy), across = sc.axis === 'x' ? Math.abs(dy) : Math.abs(dx);
              if (across < along * 0.42) { scrolling = { el: sc.el, axis: sc.axis, s0: sc.axis === 'x' ? sc.el.scrollLeft : sc.el.scrollTop }; return; }
            }
            begin();
          }
          if (ev.cancelable) ev.preventDefault();
          if (!raf) raf = requestAnimationFrame(function () { raf = 0; if (!g) return; var p = pos(); place(g, p.x, p.y); if (opts.onMove) opts.onMove(info()); });
        }
        function cleanup() {
          finished = true;
          source.removeEventListener('pointermove', move);
          source.removeEventListener('pointerup', up);
          source.removeEventListener('pointercancel', cancel);
          source.removeEventListener('lostpointercapture', lost);
          if (raf) { cancelAnimationFrame(raf); raf = 0; }
          document.body.classList.remove('is-dragging');
        }
        function back() {
          var r = source.getBoundingClientRect(), p = pos();
          fly(g, p, { x: r.left + r.width / 2 - w / 2, y: r.top + r.height / 2 - h / 2 }, 380, true).then(function () {
            g.remove(); source.classList.remove('dragging'); Drag.active = false;
          });
        }
        function up(ev) {
          if (ev.pointerId !== id || finished) return;
          cur = { x: ev.clientX, y: ev.clientY };
          cleanup();
          if (scrolling) return;
          if (!g) { if (opts.onTap) opts.onTap(); return; }
          var p0 = pos(); place(g, p0.x, p0.y);
          var res = opts.onDrop(info()) || { ok: false };
          if (res.ok) {
            fly(g, p0, res.to || p0, 260).then(function () {
              g.remove(); source.classList.remove('dragging'); Drag.active = false;
              if (res.done) res.done();
            });
          } else back();
        }
        function cancel(ev) {
          if (ev.pointerId !== id || finished) return;
          cleanup();
          if (g) back();
        }
        function lost(ev) { if (!finished) cancel(ev); }
        source.addEventListener('pointermove', move);
        source.addEventListener('pointerup', up);
        source.addEventListener('pointercancel', cancel);
        source.addEventListener('lostpointercapture', lost);
      });
    }
  };
  window.Drag = Drag;
})();
