/* نقر موثوق باللمس: يُنفَّذ الزر لحظة رفع الإصبع دون انتظار حدث click من المتصفح،
   لأن بعض المتصفحات داخل التطبيقات قد تؤخره أو تُسقطه بعد السحب. ويُتجاهل click المكرر بعده */
(function () {
  'use strict';
  var down = null, last = { b: null, t: 0 };
  function btnOf(n) { return n && n.closest ? n.closest('button') : null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') { down = null; return; }
    var b = btnOf(e.target);
    down = (b && !b.disabled && !b.classList.contains('drag-src') && !b.classList.contains('piece'))
      ? { b: b, x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId } : null;
  }, true);
  document.addEventListener('pointermove', function (e) {
    if (down && e.pointerId === down.id && Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 12) down = null;
  }, true);
  document.addEventListener('pointercancel', function () { down = null; }, true);
  document.addEventListener('pointerup', function (e) {
    if (!down || e.pointerId !== down.id) return;
    var b = down.b, quick = Date.now() - down.t < 900;
    down = null;
    if (!quick || b.disabled || !b.isConnected) return;
    // نفعّل الزر الذي لمسه الإصبع حتى لو تحرك الزر نفسه (تمرير شريط الأزرار عند التركيز)
    last = { t: Date.now(), x: e.clientX, y: e.clientY };
    b.click();
  }, true);
  /* نتجاهل click الذي يولده المتصفح بعد ذلك في الموضع نفسه حتى لا يُضغط زر آخر انتقل تحت الإصبع */
  document.addEventListener('click', function (e) {
    if (!e.isTrusted || !last.t) return;
    if (Date.now() - last.t < 900 && Math.abs((e.clientX || last.x) - last.x) + Math.abs((e.clientY || last.y) - last.y) < 50) {
      e.stopImmediatePropagation(); e.preventDefault();
    }
  }, true);
  /* بالفأرة: لا ننقل التركيز إلى أزرار الأشرطة القابلة للتمرير حتى لا يتحرك الشريط قبل النقر */
  document.addEventListener('mousedown', function (e) {
    var b = btnOf(e.target);
    if (b && b.closest('.games-track, .tray-modes, .tray-body')) e.preventDefault();
  }, true);
})();
