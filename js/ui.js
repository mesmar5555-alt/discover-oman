/* أدوات الواجهة المشتركة: التعليمات، الرسائل، الاحتفال، المستوى، التقدم */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  function h(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    }
    (children || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  var PRAISE = ['أحسنت!', 'رائع!', 'ممتاز، واصل التقدم', 'إجابة موفقة!', 'عمل رائع!', 'أحسنت، أنت تتقدم بثبات'];
  var TRY = ['لا بأس، حاول مرة أخرى', 'اقتربت! جرّب موقعًا آخر', 'فكّر في الاتجاهات وحاول من جديد', 'محاولة جيدة، أعد المحاولة', 'لا تستسلم، أنت قادر على ذلك'];

  var toastTimer = null;
  function toast(main, sub, kind, ms) {
    var t = $('toast');
    t.className = 'toast';
    t.innerHTML = '';
    t.appendChild(document.createTextNode(main));
    if (sub) t.appendChild(h('small', { text: sub }));
    // إعادة تشغيل الحركة
    void t.offsetWidth;
    t.className = 'toast show ' + (kind || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast ' + (kind || ''); }, ms || (sub ? 3200 : 1900));
  }
  function hideToast() { clearTimeout(toastTimer); $('toast').className = 'toast'; }

  function setTask(title, textOrNode) {
    $('taskTitle').textContent = title || '';
    var p = $('taskText');
    p.innerHTML = '';
    if (textOrNode == null) return;
    if (typeof textOrNode === 'string') p.textContent = textOrNode; else p.appendChild(textOrNode);
  }

  function setProgress(done, total, label) {
    var box = $('progress');
    if (total == null) { box.hidden = true; return; }
    box.hidden = false;
    $('progressText').textContent = (label || '') + done + ' / ' + total;
    $('progressBar').style.width = (total ? Math.round(100 * done / total) : 0) + '%';
  }

  var levelHandler = null;
  function showLevel(level) {
    Array.prototype.forEach.call($('levelCtl').querySelectorAll('button'), function (b) {
      b.setAttribute('aria-checked', String(+b.dataset.level === level));
    });
    $('levelSel').value = String(level);
  }
  function setLevel(level, onChange) {
    levelHandler = onChange || null;
    $('levelBox').hidden = !onChange;
    showLevel(level);
    syncCtl();
  }
  document.addEventListener('DOMContentLoaded', function () {
    $('levelCtl').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-level]'); if (!b || !levelHandler) return;
      var lv = +b.dataset.level;
      showLevel(lv); Sound.tap(); levelHandler(lv);
    });
    $('levelSel').addEventListener('change', function () {
      if (!levelHandler) return;
      var lv = +this.value; showLevel(lv); Sound.tap(); levelHandler(lv);
    });
  });

  function setActions(buttons) {
    var box = $('taskActions'); box.innerHTML = '';
    (buttons || []).forEach(function (b) {
      var btn = h('button', { type: 'button', class: 'btn' + (b.cls ? ' ' + b.cls : ''), title: b.label, 'aria-label': b.aria || b.label }, [b.icon ? icon(b.icon) : null, h('span', { class: 'lbl', text: b.label })]);
      btn.addEventListener('click', function () { Sound.tap(); b.onClick(btn); });
      if (b.id) btn.id = b.id;
      box.appendChild(btn);
    });
    syncCtl();
  }

  function icon(name) {
    var paths = {
      restart: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
      lens: '<circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M15 15l5 5M8 10.5h5M10.5 8v5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
      clear: '<path d="M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'
    };
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = paths[name] || '';
    return s;
  }

  /* نافذة الاحتفال / النتيجة */
  var lastFocus = null;
  function modal(opts) {
    var m = $('modal');
    $('modalTitle').textContent = opts.title || '';
    $('modalText').textContent = opts.text || '';
    $('modalStars').textContent = opts.stars ? '★★★'.slice(0, opts.stars) + '☆☆☆'.slice(0, 3 - opts.stars) : '';
    var acts = $('modalActions'); acts.innerHTML = '';
    (opts.actions || [{ label: 'متابعة', primary: true }]).forEach(function (a, i) {
      var b = h('button', { type: 'button', class: 'btn' + (a.primary ? ' primary' : ''), onclick: function () { Sound.tap(); closeModal(); if (a.onClick) a.onClick(); } }, [a.label]);
      acts.appendChild(b);
    });
    lastFocus = document.activeElement;
    m.hidden = false;
    var first = acts.querySelector('button'); if (first) setTimeout(function () { first.focus(); }, 60);
  }
  function closeModal() {
    $('modal').hidden = true;
    if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) { }
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('modal').hidden) closeModal();
  });

  /* قصاصات احتفالية بألوان العلم */
  function confetti(ms) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var cv = $('confetti'), c = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
    var cols = ['#C8102E', '#007A3D', '#FFFFFF', '#E0A100', '#C8102E', '#007A3D'];
    var P = [];
    for (var i = 0; i < 170; i++) {
      P.push({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35, vx: (Math.random() - .5) * 22 * dpr, vy: (-Math.random() * 18 - 6) * dpr,
        w: (6 + Math.random() * 7) * dpr, h: (8 + Math.random() * 10) * dpr, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[i % cols.length] });
    }
    var t0 = performance.now(), dur = ms || 2600;
    (function frame(now) {
      var k = (now - t0) / dur;
      c.clearRect(0, 0, W, H);
      if (k >= 1) return;
      P.forEach(function (p) {
        p.vy += .55 * dpr; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.globalAlpha = 1 - Math.max(0, k - .7) / .3;
        c.fillStyle = p.c; c.strokeStyle = 'rgba(0,0,0,.12)';
        c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
        c.restore();
      });
      requestAnimationFrame(frame);
    })(t0);
  }

  function tray() { return $('trayBody'); }
  function trayMode(mode) { $('tray').className = 'tray' + (mode ? ' ' + mode : ''); }
  function syncCtl() { $('trayCtl').hidden = $('levelBox').hidden && !$('taskActions').children.length && !$('trayModes').children.length; }
  function setModes(node) { var b = $('trayModes'); b.innerHTML = ''; if (node) b.appendChild(node); syncCtl(); }

  window.UI = {
    h: h, shuffle: shuffle, pick: pick, PRAISE: PRAISE, TRY: TRY,
    toast: toast, hideToast: hideToast, setTask: setTask, setProgress: setProgress, setLevel: setLevel,
    setActions: setActions, icon: icon, trayMode: trayMode, setModes: setModes, modal: modal, closeModal: closeModal, confetti: confetti, tray: tray,
    praise: function () { return pick(PRAISE); }, tryAgain: function () { return pick(TRY); },
    compass: function (show) { $('compass').hidden = !show; }
  };
})();
