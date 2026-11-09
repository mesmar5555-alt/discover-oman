/* اللعبة الخامسة: لوّن محافظات عُمان */
(function () {
  'use strict';
  var M = window.MapView, D = M.data, h = UI.h;
  var PALETTE = [
    { id: 'red', name: 'الأحمر', c: '#E53935' }, { id: 'orange', name: 'البرتقالي', c: '#FB8C00' },
    { id: 'yellow', name: 'الأصفر', c: '#FDD835' }, { id: 'green', name: 'الأخضر', c: '#43A047' },
    { id: 'sky', name: 'السماوي', c: '#4FC3F7' }, { id: 'blue', name: 'الأزرق', c: '#1E63C6' },
    { id: 'purple', name: 'البنفسجي', c: '#8E44AD' }, { id: 'pink', name: 'الوردي', c: '#EC6FA8' },
    { id: 'brown', name: 'البني', c: '#8D6E63' }, { id: 'grey', name: 'الرمادي', c: '#9AA4AE' }
  ];
  var HINT_AFTER = { 1: 1, 2: 2, 3: 3 };
  var S = { level: 1, mode: 'challenge', color: PALETTE[3], fills: {}, names: true, celebrated: false, seq: null, i: 0, wrong: 0, wrongTotal: 0, L: null };

  function col(id) { for (var i = 0; i < PALETTE.length; i++) if (PALETTE[i].id === id) return PALETTE[i]; }
  function coloredCount() { return Object.keys(S.fills).length; }

  function setupMap() {
    M.reset();
    D.govs.forEach(function (g) { var e = M.gov(g.id); e.classList.add('empty', 'tap'); });
    S.L = { names: M.layer('c-names') };
    Object.keys(S.fills).forEach(function (id) { paint(id, S.fills[id], true); });
    drawNames();
  }
  function drawNames() {
    S.L.names.innerHTML = '';
    var show = S.mode === 'free' ? S.names : (S.level === 1 || (S.seq && S.i >= S.seq.length));
    if (!show) return;
    D.govs.forEach(function (g) { M.govLabel(S.L.names, g); });
  }
  function paint(id, pal, quiet) {
    var e = M.gov(id);
    if (!pal) { delete S.fills[id]; e.style.fill = ''; e.classList.add('empty'); return; }
    S.fills[id] = pal; e.classList.remove('empty'); e.style.fill = pal.c;
    if (!quiet) { e.classList.remove('flash'); void e.getBBox(); e.classList.add('flash'); }
  }
  function clearAll() { Object.keys(S.fills).forEach(function (id) { paint(id, null); }); S.fills = {}; S.celebrated = false; }

  function start(newSeq) {
    if (newSeq !== false) { S.fills = {}; S.celebrated = false; }
    if (S.mode === 'challenge' && (newSeq !== false || !S.seq)) makeSeq();
    setupMap();
    UI.setLevel(S.level, function (lv) { S.level = lv; start(true); });
    UI.setActions([
      { label: 'مسح الألوان', icon: 'clear', onClick: function () { clearAll(); if (S.mode === 'challenge') { S.i = 0; S.wrong = 0; S.wrongTotal = 0; drawNames(); ask(); } else refresh(); UI.toast('تم مسح الألوان', null, 'info', 1200); } },
      { label: 'إعادة التلوين', icon: 'restart', onClick: function () { start(true); UI.toast(S.mode === 'challenge' ? 'تحدٍّ جديد بألوان جديدة' : 'ابدأ التلوين من جديد', null, 'info', 1400); } }
    ]);
    buildTray();
    M.onTap(onTap);
    if (S.mode === 'challenge') ask(); else refresh();
  }
  function makeSeq() {
    var ids = UI.shuffle(D.govs.map(function (g) { return g.id; }));
    if (S.level === 1) ids.sort(function (a, b) { return M.govData(b).area - M.govData(a).area; }); // الكبيرة أولًا
    var last = null;
    S.seq = ids.map(function (id) {
      var options = PALETTE.filter(function (p) { return p !== last; });
      var p = UI.pick(options); last = p;
      return { gov: id, color: p };
    });
    S.i = 0; S.wrong = 0; S.wrongTotal = 0;
  }

  function buildTray() {
    var t = UI.tray(); t.innerHTML = '';
    var modes = h('div', { class: 'modes', role: 'radiogroup', 'aria-label': 'طريقة التلوين' });
    [['challenge', 'تحدي الألوان'], ['free', 'تلوين حر']].forEach(function (m) {
      modes.appendChild(h('button', { type: 'button', role: 'radio', 'aria-checked': String(S.mode === m[0]), onclick: function () { Sound.tap(); S.mode = m[0]; start(true); } }, [m[1]]));
    });
    UI.setModes(modes);
    var head = h('div', { class: 'tray-head' });
    if (S.mode === 'free') {
      head.appendChild(h('button', { type: 'button', class: 'btn' + (S.names ? ' on' : ''), 'aria-pressed': String(S.names), onclick: function () { Sound.tap(); S.names = !S.names; this.classList.toggle('on', S.names); this.setAttribute('aria-pressed', String(S.names)); drawNames(); } }, ['أسماء المحافظات']));
    }
    if (head.children.length) t.appendChild(head);
    S.nameEl = h('p', { class: 'color-name' });
    var sw = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'الألوان' });
    PALETTE.forEach(function (p) {
      var b = h('button', { type: 'button', class: 'swatch', role: 'radio', 'aria-label': 'اللون ' + p.name, 'aria-checked': String(S.color === p), style: 'background:' + p.c });
      b.addEventListener('click', function () { Sound.tap(); S.color = p; syncSw(sw); });
      sw.appendChild(b);
    });
    var er = h('button', { type: 'button', class: 'swatch eraser', role: 'radio', 'aria-label': 'الممحاة', 'aria-checked': String(S.color === null) });
    er.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16l8-8 6 6-5 5H8z M12 8l3-3 6 6-3 3" fill="none" stroke="#5B6573" stroke-width="2" stroke-linejoin="round"/></svg>';
    er.addEventListener('click', function () { Sound.tap(); S.color = null; syncSw(sw); });
    sw.appendChild(er);
    t.appendChild(sw);
    t.appendChild(S.nameEl);
    syncSw(sw);
  }
  function syncSw(sw) {
    Array.prototype.forEach.call(sw.children, function (b, i) { b.setAttribute('aria-checked', String(i < PALETTE.length ? S.color === PALETTE[i] : S.color === null)); });
    S.nameEl.textContent = S.color ? 'اللون المختار: ' + S.color.name : 'الممحاة: انقر على محافظة لمسح لونها';
  }
  function refresh() {
    UI.setTask('اللعبة الخامسة: لوّن محافظات عُمان', 'اختر لونًا ثم انقر على أي محافظة لتلوينها');
    UI.setProgress(coloredCount(), 11, 'لوّنت ');
  }
  function ask() {
    UI.setProgress(S.i, 11, 'لوّنت ');
    if (S.i >= S.seq.length) return;
    var st = S.seq[S.i]; S.wrong = 0;
    UI.setTask('اللعبة الخامسة: تحدي الألوان', h('span', null, ['لوّن ', h('em', { text: GEO.govName(st.gov) }), ' باللون ' + st.color.name, h('span', { class: 'sw', style: 'background:' + st.color.c })]));
  }

  function onTap(e) {
    if (!e.gov) return;
    if (S.mode === 'free') {
      if (!S.color) { if (S.fills[e.gov]) { paint(e.gov, null); Sound.tap(); } refresh(); return; }
      paint(e.gov, S.color); Sound.snap();
      refresh();
      if (coloredCount() === 11 && !S.celebrated) {
        S.celebrated = true;
        S.names = true; drawNames();
        Sound.win(); UI.confetti();
        setTimeout(function () { UI.modal({ title: 'خريطة رائعة!', text: 'لوّنت محافظات سلطنة عُمان الإحدى عشرة كلها.', actions: [{ label: 'تأمّل الخريطة', primary: true }, { label: 'جرّب تحدي الألوان', onClick: function () { S.mode = 'challenge'; start(true); } }] }); }, 900);
      }
      return;
    }
    if (S.i >= S.seq.length) return;
    var st = S.seq[S.i];
    if (!S.color) { UI.toast('اختر اللون ' + st.color.name + ' أولًا', null, 'info'); return; }
    if (e.gov !== st.gov) {
      S.wrong++; S.wrongTotal++; Sound.wrong();
      var tapped = M.gov(e.gov); tapped.classList.remove('flash'); void tapped.getBBox(); tapped.classList.add('flash');
      var hint = S.wrong >= HINT_AFTER[S.level];
      UI.toast('هذه ' + GEO.govName(e.gov) + '، ابحث عن ' + GEO.govName(st.gov), hint ? 'تلميح: ' + GEO.hints[st.gov] : UI.tryAgain(), 'try', hint ? 3600 : 2200);
      if (hint) { var tg = M.gov(st.gov); tg.classList.remove('hint'); void tg.getBBox(); tg.classList.add('hint'); setTimeout(function () { tg.classList.remove('hint'); }, 3100); }
      return;
    }
    if (S.color !== st.color) {
      S.wrong++; S.wrongTotal++; Sound.wrong();
      UI.toast('المحافظة صحيحة، لكن اللون المطلوب هو ' + st.color.name, 'اخترت ' + S.color.name + '، غيّر اللون من لوحة الألوان', 'try', 2600);
      return;
    }
    paint(st.gov, st.color); Sound.snap(); setTimeout(function () { Sound.correct(); }, 120);
    S.i++;
    if (S.i >= S.seq.length) {
      UI.setProgress(11, 11, 'لوّنت ');
      UI.setTask('اللعبة الخامسة: تحدي الألوان', 'أحسنت! أصبحت خريطة السلطنة ملونة بالكامل');
      drawNames();
      Sound.win(); UI.confetti();
      var stars = S.wrongTotal <= 1 ? 3 : S.wrongTotal <= 4 ? 2 : 1;
      setTimeout(function () {
        var acts = [{ label: 'تحدٍّ جديد', primary: true, onClick: function () { start(true); } }];
        if (S.level < 3) acts.push({ label: 'المستوى التالي', onClick: function () { S.level++; start(true); } });
        acts.push({ label: 'تأمّل الخريطة' });
        UI.modal({ title: 'بطل جغرافية عُمان!', text: 'لوّنت المحافظات الإحدى عشرة بالألوان المطلوبة.', stars: stars, actions: acts });
      }, 1100);
      return;
    }
    UI.toast('أحسنت! إجابة صحيحة', S.i >= 8 ? 'اقتربت من إتقان الخريطة' : UI.praise(), 'good', 1500);
    ask();
  }

  window.Games = window.Games || {};
  window.Games.coloring = {
    mount: function () { start(true); },
    unmount: function () { }
  };
})();
