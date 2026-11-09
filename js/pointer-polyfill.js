/* دعم المتصفحات القديمة التي لا تعرف Pointer Events (مثل آيفون بنظام iOS 12 وما قبله):
   تحويل أحداث اللمس والفأرة إلى أحداث pointer التي تستخدمها اللعبة */
(function () {
  'use strict';
  if (window.PointerEvent) return;
  var capture = {}, starts = {}, lastTouch = 0;
  var proto = window.Element && Element.prototype;
  if (proto && !proto.setPointerCapture) {
    proto.setPointerCapture = function (id) { capture[id] = this; };
    proto.releasePointerCapture = function (id) { if (capture[id] === this) delete capture[id]; };
    proto.hasPointerCapture = function (id) { return capture[id] === this; };
  }
  function elementOf(n) { return n && n.nodeType === 3 ? n.parentNode : n; }
  function fire(type, target, src, id, kind, button) {
    if (!target || !target.dispatchEvent) return false;
    var ev = document.createEvent('Event');
    ev.initEvent(type, true, true);
    ev.pointerId = id; ev.pointerType = kind; ev.isPrimary = true;
    ev.button = button || 0; ev.buttons = type === 'pointerup' ? 0 : 1;
    ev.clientX = src.clientX; ev.clientY = src.clientY; ev.pageX = src.pageX; ev.pageY = src.pageY;
    target.dispatchEvent(ev);
    return ev.defaultPrevented;
  }
  /* مناطق السحب والخريطة: يُمنع فيها تمرير الصفحة أثناء تحريك الإصبع */
  function noScroll(el) {
    for (; el && el !== document; el = el.parentNode) {
      if (el.id === 'mapWrap') return true;
      var c = ' ' + (el.className && el.className.baseVal != null ? el.className.baseVal : el.className) + ' ';
      if (c.indexOf(' piece ') >= 0 || c.indexOf(' drag-src ') >= 0) return true;
    }
    return false;
  }
  var opts = false;
  try { var o = Object.defineProperty({}, 'passive', { get: function () { opts = { passive: false, capture: true }; return false; } }); window.addEventListener('t', null, o); } catch (e) { }
  var cap = opts || true;

  document.addEventListener('touchstart', function (e) {
    lastTouch = Date.now();
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i], id = t.identifier + 10, tg = elementOf(t.target);
      starts[id] = tg;
      fire('pointerdown', tg, t, id, 'touch', 0);
    }
  }, cap);
  document.addEventListener('touchmove', function (e) {
    lastTouch = Date.now();
    var block = false;
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i], id = t.identifier + 10;
      var tg = capture[id] || starts[id];
      fire('pointermove', tg, t, id, 'touch', 0);
      if (noScroll(starts[id])) block = true;
    }
    if (block && e.cancelable) e.preventDefault();
  }, cap);
  function touchEnd(type) {
    return function (e) {
      lastTouch = Date.now();
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i], id = t.identifier + 10;
        fire(type, capture[id] || starts[id], t, id, 'touch', 0);
        delete capture[id]; delete starts[id];
      }
    };
  }
  document.addEventListener('touchend', touchEnd('pointerup'), cap);
  document.addEventListener('touchcancel', touchEnd('pointercancel'), cap);

  /* الفأرة (مع تجاهل أحداث الفأرة التي يولدها المتصفح بعد اللمس) */
  var down = false;
  document.addEventListener('mousedown', function (e) {
    if (Date.now() - lastTouch < 900) return;
    down = true;
    if (fire('pointerdown', elementOf(e.target), e, 1, 'mouse', e.button)) e.preventDefault();
  }, true);
  document.addEventListener('mousemove', function (e) {
    if (Date.now() - lastTouch < 900) return;
    fire('pointermove', capture[1] || elementOf(e.target), e, 1, 'mouse', 0);
  }, true);
  document.addEventListener('mouseup', function (e) {
    if (Date.now() - lastTouch < 900 || !down) return;
    down = false;
    fire('pointerup', capture[1] || elementOf(e.target), e, 1, 'mouse', e.button);
    delete capture[1];
  }, true);
})();
