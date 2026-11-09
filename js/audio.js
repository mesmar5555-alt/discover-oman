/* المؤثرات الصوتية: تُولَّد داخل المتصفح (Web Audio) فلا تحتاج ملفات خارجية أو إنترنت */
(function () {
  'use strict';
  var KEY = 'oman-game-sound';
  var ctx = null, master = null;
  var enabled = true;
  try { enabled = localStorage.getItem(KEY) !== 'off'; } catch (e) { /* التخزين غير متاح */ }

  function ensure() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { ctx = null; return null; }
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended' && ctx.resume) { try { var p = ctx.resume(); if (p && p.catch) p.catch(function () { }); } catch (e) { } }
    return ctx;
  }

  function tone(freq, at, dur, opt) {
    opt = opt || {};
    var c = ensure(); if (!c) return;
    var t0 = c.currentTime + (at || 0);
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = opt.type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t0 + dur);
    var peak = opt.gain || 0.22;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (opt.attack || 0.012));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function bell(freq, at, dur, gain) {
    tone(freq, at, dur, { type: 'sine', gain: gain || 0.2 });
    tone(freq * 2, at, dur * 0.6, { type: 'sine', gain: (gain || 0.2) * 0.28 });
    tone(freq * 3.01, at, dur * 0.35, { type: 'triangle', gain: (gain || 0.2) * 0.08 });
  }

  function noise(at, dur, gain, hp) {
    var c = ensure(); if (!c) return;
    var len = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var s = c.createBufferSource(); s.buffer = buf;
    var f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 1800;
    var g = c.createGain(); g.gain.value = gain || 0.12;
    s.connect(f); f.connect(g); g.connect(master);
    s.start(c.currentTime + (at || 0));
  }

  var Sound = {
    get enabled() { return enabled; },
    setEnabled: function (v) {
      enabled = !!v;
      try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) { }
      if (enabled) { ensure(); this.tap(); }
    },
    unlock: function () { if (enabled) ensure(); },
    tap: function () { if (!enabled) return; tone(880, 0, 0.06, { type: 'sine', gain: 0.07 }); },
    /* إجابة صحيحة: نغمتان صاعدتان كالجرس */
    correct: function () {
      if (!enabled) return;
      bell(784, 0, 0.35, 0.2); bell(1175, 0.09, 0.5, 0.18);
    },
    /* خطأ: نغمة منخفضة لطيفة غير مزعجة */
    wrong: function () {
      if (!enabled) return;
      tone(330, 0, 0.18, { type: 'triangle', gain: 0.13, to: 294 });
      tone(262, 0.14, 0.26, { type: 'triangle', gain: 0.11, to: 247 });
    },
    /* تثبيت قطعة البازل: نقرة خشبية + رنة قصيرة */
    snap: function () {
      if (!enabled) return;
      noise(0, 0.05, 0.16, 2400);
      tone(180, 0, 0.09, { type: 'sine', gain: 0.25, to: 90 });
      bell(988, 0.05, 0.3, 0.14); bell(1319, 0.13, 0.42, 0.13);
    },
    /* إكمال مرحلة */
    stage: function () {
      if (!enabled) return;
      [523, 659, 784, 1047].forEach(function (f, i) { bell(f, i * 0.11, 0.45, 0.16); });
    },
    /* احتفال بإكمال الخريطة */
    win: function () {
      if (!enabled) return;
      var seq = [523, 659, 784, 1047, 784, 1047, 1319];
      seq.forEach(function (f, i) { bell(f, i * 0.12, 0.55, 0.15); });
      tone(262, 0, 0.9, { type: 'triangle', gain: 0.08 });
      tone(392, 0.48, 0.9, { type: 'triangle', gain: 0.08 });
      for (var i = 0; i < 9; i++) bell(1568 + Math.random() * 1200, 0.9 + i * 0.07, 0.25, 0.05);
    }
  };
  window.Sound = Sound;
  /* الآيفون لا يسمح بالصوت إلا بعد لمسة يرفع فيها الطالب إصبعه، لذلك نفتح الصوت
     عند touchend وclick أيضًا ونشغّل مقطعًا صامتًا قصيرًا مرة واحدة */
  var unlocked = false;
  function unlock() {
    if (!enabled) return;
    var c = ensure(); if (!c) return;
    if (!unlocked) {
      try {
        var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource();
        s.buffer = b; s.connect(c.destination); (s.start || s.noteOn).call(s, 0);
        unlocked = true;
      } catch (e) { }
    }
  }
  ['pointerdown', 'touchstart', 'touchend', 'mousedown', 'click', 'keydown'].forEach(function (t) {
    document.addEventListener(t, unlock, true);
  });
})();
