/* اللعبة الرابعة: الدول المجاورة — مواقع الأسماء كما في الأطلس الرسمي */
(function () {
  'use strict';
  var M = window.MapView, D = M.data, P = D.places;
  var OMAN_C = [3700, 3550];   // نقطة داخل السلطنة لرسم أسهم الاتجاهات
  function box(key, padX, padY) { var b = P[key].box; return { w: b[2] - b[0] + (padX || 90), h: b[3] - b[1] + (padY || 70) }; }

  function arrow(layer, from, to) {
    var s = M.scale() || 0.1, hs = 13 / s;
    var dx = to[0] - from[0], dy = to[1] - from[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    var end = [to[0] - ux * 260, to[1] - uy * 260];
    M.el('line', { x1: from[0], y1: from[1], x2: end[0], y2: end[1], class: 'arrow' }, layer);
    var px = -uy, py = ux;
    M.el('path', { class: 'arrowhead', d: 'M' + (end[0] + ux * hs) + ' ' + (end[1] + uy * hs) + ' L' + (end[0] - ux * hs * .4 + px * hs * .8) + ' ' + (end[1] - uy * hs * .4 + py * hs * .8) + ' L' + (end[0] - ux * hs * .4 - px * hs * .8) + ' ' + (end[1] - uy * hs * .4 - py * hs * .8) + 'Z' }, layer);
  }
  function showCountry(key) { return function (fx) { arrow(fx, OMAN_C, P[key].pt); hl(fx, key); }; }
  function hl(fx, key) {
    var c = M.el('circle', { cx: P[key].pt[0], cy: P[key].pt[1], class: 'halo' }, fx);
    M.zsize(c, 'r', 200, 24, 40);
  }
  function showGov(id) { return function () { var e = M.gov(id); e.classList.add('focus-gov'); }; }
  function names(layer, done) {
    var g = M.ztext(M.el('g', null, layer), 105, 10, 14);
    [['uae', ['دولة الإمارات', 'العربية المتحدة']], ['saudi', ['المملكة', 'العربية السعودية']], ['yemen', ['الجمهورية', 'اليمنية']], ['iran', ['الجمهورية الإسلامية الإيرانية']]].forEach(function (c) {
      if (!done && c[0] !== 'iran') return;
      var p = P[c[0]].pt;
      var t = M.el('text', { x: p[0], y: p[1], class: 'lbl-country' + (c[0] !== 'iran' ? ' done' : ''), 'text-anchor': 'middle' }, g);
      c[1].forEach(function (ln, i) { var s = M.el('tspan', { x: p[0], dy: i === 0 ? (-(c[1].length - 1) * 0.55 + 0.35) + 'em' : '1.1em' }, t); s.textContent = ln; });
    });
    var w = M.ztext(M.el('g', null, layer), 120, 10, 14);
    [['gulf', 'الخليج العربي'], ['omansea', 'بحر عُمان'], ['arabiansea', 'بحر العرب']].forEach(function (s) { M.label(w, s[1], P[s[0]].pt[0], P[s[0]].pt[1], 'lbl-water'); });
  }
  function omanLabel(layer) {
    var t = M.label(layer, 'سلطنة عُمان', OMAN_C[0], OMAN_C[1] + 900, 'lbl-gov');
    M.zsize(t, 'font-size', 200, 13, 22);
  }

  var countries = [
    { key: 'uae', label: 'دولة الإمارات العربية المتحدة', lines: ['دولة الإمارات', 'العربية المتحدة'], pt: P.uae.pt, w: box('uae').w, h: box('uae').h, fs: 105, minW: 96,
      hint: 'تقع في الشمال الغربي للسلطنة، بجوار مسندم والبريمي.',
      fact: 'تقع دولة الإمارات العربية المتحدة في الشمال الغربي لسلطنة عُمان.' },
    { key: 'saudi', label: 'المملكة العربية السعودية', lines: ['المملكة', 'العربية السعودية'], pt: P.saudi.pt, w: box('saudi').w, h: box('saudi').h, fs: 105, minW: 96,
      hint: 'أكبر دولة مجاورة، تقع غرب السلطنة.',
      fact: 'تقع المملكة العربية السعودية غرب سلطنة عُمان.' },
    { key: 'yemen', label: 'الجمهورية اليمنية', lines: ['الجمهورية', 'اليمنية'], pt: P.yemen.pt, w: box('yemen').w, h: box('yemen').h, fs: 105, minW: 90,
      hint: 'تقع في الجنوب الغربي للسلطنة، بجوار محافظة ظفار.',
      fact: 'تقع الجمهورية اليمنية في الجنوب الغربي لسلطنة عُمان، وتجاور محافظة ظفار.' }
  ];
  var C = { uae: 'دولة الإمارات العربية المتحدة', saudi: 'المملكة العربية السعودية', yemen: 'الجمهورية اليمنية' };
  var questions = [
    { q: 'في أي اتجاه تقع المملكة العربية السعودية بالنسبة إلى سلطنة عُمان؟', options: ['الغرب', 'الشمال الغربي', 'الجنوب الغربي', 'الشرق'], a: 'الغرب',
      hint: 'استعن بوردة الاتجاهات: الغرب يقع على يسار الخريطة.', fact: 'تقع المملكة العربية السعودية غرب سلطنة عُمان.', show: showCountry('saudi'), reveal: showCountry('saudi') },
    { q: 'في أي اتجاه تقع دولة الإمارات العربية المتحدة بالنسبة إلى سلطنة عُمان؟', options: ['الشمال الغربي', 'الغرب', 'الجنوب الغربي', 'الجنوب الشرقي'], a: 'الشمال الغربي',
      hint: 'تقع بين الشمال والغرب.', fact: 'تقع دولة الإمارات العربية المتحدة في الشمال الغربي لسلطنة عُمان.', show: showCountry('uae'), reveal: showCountry('uae') },
    { q: 'في أي اتجاه تقع الجمهورية اليمنية بالنسبة إلى سلطنة عُمان؟', options: ['الجنوب الغربي', 'الشمال الغربي', 'الغرب', 'الشرق'], a: 'الجنوب الغربي',
      hint: 'تقع بين الجنوب والغرب.', fact: 'تقع الجمهورية اليمنية في الجنوب الغربي لسلطنة عُمان.', show: showCountry('yemen'), reveal: showCountry('yemen') },
    { q: 'أي الدول المجاورة تقع في الجنوب الغربي لسلطنة عُمان؟', options: [C.yemen, C.saudi, C.uae], a: C.yemen,
      hint: 'ابحث في الزاوية السفلية اليسرى من الخريطة.', fact: 'الجمهورية اليمنية تقع في الجنوب الغربي للسلطنة.', reveal: showCountry('yemen') },
    { q: 'ما الدولة التي تحيط أراضيها بمحافظة مسندم من جهة البر؟', options: [C.uae, C.saudi, C.yemen], a: C.uae,
      hint: 'مسندم في أقصى الشمال، وتفصلها عن باقي السلطنة أراضي الدولة المجاورة في الشمال الغربي.', fact: 'تحيط أراضي دولة الإمارات العربية المتحدة بمحافظة مسندم من جهة البر.', show: showGov('musandam'), reveal: showCountry('uae') },
    { q: 'ما الدولة المجاورة التي تحدّ محافظة البريمي؟', options: [C.uae, C.saudi, C.yemen], a: C.uae,
      hint: 'البريمي في الشمال الغربي للسلطنة.', fact: 'تحدّ دولة الإمارات العربية المتحدة محافظة البريمي.', show: showGov('buraimi'), reveal: showCountry('uae') },
    { q: 'ما الدولة المجاورة التي تحدّ محافظة ظفار من الجنوب الغربي؟', options: [C.yemen, C.uae, C.saudi], a: C.yemen,
      hint: 'ظفار في أقصى الجنوب الغربي للسلطنة.', fact: 'تحدّ الجمهورية اليمنية محافظة ظفار من الجنوب الغربي.', show: showGov('dhofar'), reveal: showCountry('yemen') },
    { q: 'كم عدد الدول التي تجاور سلطنة عُمان من جهة البر؟', options: ['3', '2', '4', '5'], a: '3',
      hint: 'عدّ الدول التي تشترك مع السلطنة في الحدود البرية على الخريطة.', fact: 'تجاور السلطنة برًا ثلاث دول: الإمارات والسعودية واليمن.' },
    { q: 'تقع سلطنة عُمان في ... من شبه الجزيرة العربية.', options: ['الجنوب الشرقي', 'الشمال الغربي', 'الجنوب الغربي', 'الشمال'], a: 'الجنوب الشرقي',
      hint: 'لاحظ أن البحار تحيط بالسلطنة من الشرق والجنوب.', fact: 'تقع سلطنة عُمان في الجنوب الشرقي من شبه الجزيرة العربية.' }
  ];

  var game = LabelGame({
    title: 'الدول المجاورة',
    compass: true,
    next: { label: 'إلى تلوين المحافظات', game: 'coloring' },
    setupMap: function (L, S) {
      names(L.base, S.stage === 1);
      omanLabel(L.base);
      D.govs.forEach(function (g) { M.gov(g.id).style.fill = '#F7E9B5'; });
    },
    stages: [
      { name: 'أين تقع الدول؟', task: 'اسحب اسم كل دولة مجاورة إلى موقعها الصحيح على الخريطة',
        note: 'خط الحدود الدولية مرسوم بخط متقطع. الجمهورية الإسلامية الإيرانية تقع شمال مضيق هرمز.',
        items: countries, labelClass: 'lbl-country done', chipClass: 'country',
        doneText: 'عرفت الدول الثلاث المجاورة لسلطنة عُمان: الإمارات والسعودية واليمن.' },
      { type: 'mc', name: 'الاتجاهات', count: 6, questions: questions,
        note: 'استعن بوردة الاتجاهات في زاوية الخريطة: ش شمال، ج جنوب، شر شرق، غ غرب.',
        doneText: 'أصبحت تعرف اتجاهات الدول المجاورة بالنسبة إلى سلطنة عُمان.' }
    ]
  });
  window.Games = window.Games || {};
  window.Games.countries = game;
})();
