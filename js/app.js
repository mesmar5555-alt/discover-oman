/* التنقل بين الألعاب دون إعادة تحميل الصفحة */
(function () {
  'use strict';
  var current = null, currentName = null;
  var ORDER = ['puzzle', 'wilayat', 'seas', 'countries', 'coloring'];

  function go(name) {
    if (!window.Games[name]) name = 'puzzle';
    if (name === currentName) return;
    if (current && current.unmount) current.unmount();
    UI.closeModal(); UI.hideToast();
    UI.setProgress(null); UI.setActions([]); UI.setLevel(1, null); UI.compass(false);
    UI.tray().innerHTML = ''; UI.trayMode(''); UI.setModes(null);
    MapView.reset();
    currentName = name; current = window.Games[name];
    var btns = document.querySelectorAll('.games-track button');
    Array.prototype.forEach.call(btns, function (b) {
      var on = b.dataset.game === name;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on) centerTab(b);
    });
    current.mount();
  }

  /* إظهار زر اللعبة الحالية في شريط التنقل فورًا (دون حركة) حتى لا تتحرك الأزرار تحت إصبع الطالب */
  function centerTab(b) {
    var track = b.parentNode;
    if (track.scrollWidth <= track.clientWidth + 1) return;
    var tr = track.getBoundingClientRect(), br = b.getBoundingClientRect();
    track.scrollLeft += (br.left + br.width / 2) - (tr.left + tr.width / 2);
  }
  function fromHash() { var n = ''; try { n = (location.hash || '').replace('#', ''); } catch (e) { } return ORDER.indexOf(n) >= 0 ? n : 'puzzle'; }
  /* تحديث العنوان (#اسم اللعبة) للحفظ والمشاركة فقط. التنقل نفسه لا يعتمد عليه،
     لأن بعض البيئات تمنع تغيير العنوان (معاينة الملفات في الآيفون، المتصفحات داخل التطبيقات) */
  function remember(name) {
    try { if (window.history && history.replaceState) history.replaceState(null, '', '#' + name); } catch (e) { }
  }
  function openGame(name) { go(name); remember(name); }

  document.addEventListener('DOMContentLoaded', function () {
    MapView.init();
    var nav = document.querySelector('.games-track');
    nav.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-game]'); if (!b) return;
      Sound.tap();
      openGame(b.dataset.game);
    });
    nav.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var i = ORDER.indexOf(currentName);
      i = (i + (e.key === 'ArrowLeft' ? 1 : -1) + ORDER.length) % ORDER.length;  // اتجاه من اليمين لليسار
      openGame(ORDER[i]);
      setTimeout(function () { var b = nav.querySelector('[data-game="' + ORDER[i] + '"]'); if (b) b.focus(); }, 30);
    });
    window.addEventListener('hashchange', function () { go(fromHash()); });

    var sb = document.getElementById('soundBtn');
    function syncSound() {
      sb.setAttribute('aria-pressed', String(Sound.enabled));
      sb.setAttribute('aria-label', Sound.enabled ? 'إيقاف الأصوات' : 'تشغيل الأصوات');
    }
    sb.addEventListener('click', function () { Sound.setEnabled(!Sound.enabled); syncSound(); UI.toast(Sound.enabled ? 'تم تشغيل الأصوات' : 'تم إيقاف الأصوات', null, 'info', 1200); });
    syncSound();

    go(fromHash());
    fitHeight();
    window.addEventListener('resize', fitHeight);
    window.addEventListener('orientationchange', function () { setTimeout(fitHeight, 250); });

    // تلميح لطيف للهاتف في الوضع الأفقي: الخريطة أكبر في الوضع العمودي
    if (window.matchMedia) {
      var mq = window.matchMedia('(orientation: landscape) and (max-height: 520px)');
      var tip = function () { if (mq.matches) setTimeout(function () { UI.toast('أدر الهاتف إلى الوضع العمودي لتكبر الخريطة', null, 'info', 3600); }, 600); };
      tip();
      if (mq.addEventListener) mq.addEventListener('change', tip); else if (mq.addListener) mq.addListener(tip);
    }
  });
  // حفظ اللعبة على الجهاز للعمل دون إنترنت (يعمل عند النشر على https مثل GitHub Pages)
  if (!window.SINGLE_FILE && 'serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { }); });
  }
  /* ارتفاع الشاشة الفعلي للأجهزة التي لا تدعم وحدة dvh (آيفون قبل iOS 15.4) */
  function fitHeight() { try { document.documentElement.style.setProperty('--app-h', window.innerHeight + 'px'); } catch (e) { } }
  window.App = { go: function (n) { openGame(n); } };
})();
