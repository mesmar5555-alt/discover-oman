/* اللعبة الثالثة: البحار والمحيطات والمضائق — مواقع الأسماء مأخوذة من مواضعها في الأطلس الرسمي */
(function () {
  'use strict';
  var M = window.MapView, D = M.data, P = D.places;
  function box(key, padX, padY) { var b = P[key].box; return { w: b[2] - b[0] + (padX || 80), h: b[3] - b[1] + (padY || 60) }; }
  function wil(name) { for (var i = 0; i < D.wilayats.length; i++) if (D.wilayats[i].name === name) return D.wilayats[i]; }

  function staticCountries(layer) {
    var g = M.ztext(M.el('g', null, layer), 105, 10, 14);
    [['uae', ['دولة الإمارات', 'العربية المتحدة']], ['saudi', ['المملكة', 'العربية السعودية']], ['yemen', ['الجمهورية', 'اليمنية']], ['iran', ['الجمهورية الإسلامية الإيرانية']]].forEach(function (c) {
      var p = P[c[0]].pt;
      var t = M.el('text', { x: p[0], y: p[1], class: 'lbl-country', 'text-anchor': 'middle' }, g);
      c[1].forEach(function (ln, i) { var s = M.el('tspan', { x: p[0], dy: i === 0 ? (-(c[1].length - 1) * 0.55 + 0.35) + 'em' : '1.1em' }, t); s.textContent = ln; });
    });
  }
  function musandamFocus(layer) {
    M.gov('musandam').classList.add('focus-gov');
    var g = M.govData('musandam');
    var t = M.govLabel(layer, g, 'lbl-focus', 'محافظة مسندم');
  }

  var water = [
    { key: 'gulf', label: 'الخليج العربي', pt: P.gulf.pt, w: box('gulf').w, h: box('gulf').h, fs: 125,
      hint: 'يقع في الشمال الغربي، غرب محافظة مسندم.',
      fact: 'يقع الخليج العربي شمال غرب السلطنة، وتطل عليه محافظة مسندم من جهة الغرب.' },
    { key: 'hormuz', label: 'مضيق هرمز', pt: P.hormuz.pt, w: box('hormuz', 140, 70).w, h: box('hormuz', 140, 70).h, fs: 100, minW: 84,
      hint: 'ممر مائي ضيق في أقصى الشمال، عند رأس محافظة مسندم.',
      fact: 'يصل مضيق هرمز بين الخليج العربي وبحر عُمان، وتشرف عليه محافظة مسندم.' },
    { key: 'omansea', label: 'بحر عُمان', pt: P.omansea.pt, w: box('omansea').w, h: box('omansea').h, fs: 125,
      hint: 'يقع شمال شرق السلطنة، أمام ساحل مسقط والباطنة.',
      fact: 'يطل بحر عُمان على شمال شرق السلطنة، ومن محافظاته المطلة عليه مسقط والباطنة.' },
    { key: 'arabiansea', label: 'بحر العرب', pt: P.arabiansea.pt, w: box('arabiansea').w, h: box('arabiansea').h, fs: 125,
      hint: 'يقع جنوب شرق السلطنة، أمام ساحل ظفار والوسطى.',
      fact: 'يطل بحر العرب على جنوب شرق السلطنة، ومن محافظاته المطلة عليه ظفار والوسطى.' },
    /* المحيط الهندي لا يظهر اسمه في خرائط الأطلس المرفق؛ يقع جنوب بحر العرب خارج حدود الخريطة،
       لذا يوضع مربعه عند الطرف الجنوبي الشرقي للخريطة مع سهم يشير إلى اتجاهه */
    { key: 'indian', label: 'المحيط الهندي', pt: [4630, 7130], w: 820, h: 190, fs: 120, arrowTo: [5200, 7330],
      hint: 'أكبر مسطح مائي هنا؛ يمتد جنوب بحر العرب عند طرف الخريطة.',
      fact: 'بحر العرب جزء من المحيط الهندي، ويمتد المحيط جنوبًا خارج حدود هذه الخريطة.' }
  ];
  var sites = [
    { key: 'masirah', label: 'جزيرة مصيرة', ring: true, r: 230, pt: P.masirah.pt, side: 'right', fs: 105,
      hint: 'أكبر جزيرة قرب الساحل الشرقي، في بحر العرب.',
      fact: 'جزيرة مصيرة أكبر جزر السلطنة، تقع في بحر العرب وتتبع محافظة جنوب الشرقية.' },
    { key: 'hallaniyat', label: 'جزر الحلانيات', ring: true, r: 210, pt: P.hallaniyat_land.pt, side: 'bottom', fs: 100,
      hint: 'مجموعة جزر صغيرة في الجنوب قبالة ساحل ظفار.',
      fact: 'جزر الحلانيات في بحر العرب قبالة ساحل محافظة ظفار، وتتبع ولاية شليم وجزر الحلانيات.' },
    { key: 'daymaniyat', label: 'جزر الديمانيات', ring: true, r: 110, pt: P.daymaniyat_land.pt, side: 'top', fs: 95,
      hint: 'جزر صغيرة في بحر عُمان قريبة من ساحل مسقط والباطنة.',
      fact: 'جزر الديمانيات محمية طبيعية في بحر عُمان، قبالة ساحل جنوب الباطنة ومسقط.' },
    { key: 'madha', label: 'ولاية مدحاء', ring: true, r: 90, pt: P.madha.pt, side: 'right', fs: 95,
      hint: 'جزء صغير من السلطنة بين مسندم وشمال الباطنة، داخل أراضي الإمارات.',
      fact: 'ولاية مدحاء تتبع محافظة مسندم، وتحيط بها أراضي دولة الإمارات العربية المتحدة.' }
  ];

  var game = LabelGame({
    title: 'البحار والمحيطات',
    compass: true,
    lens: { label: 'عدسة مسندم', box: [2400, 200, 3700, 1500] },
    next: { label: 'إلى الدول المجاورة', game: 'countries' },
    setupMap: function (L) { staticCountries(L.base); musandamFocus(L.base); },
    stages: [
      { name: 'المسطحات المائية', task: 'اسحب اسم كل مسطح مائي إلى مربعه الصحيح على الخريطة',
        note: 'محافظة مسندم مميزة باللون البني: لاحظ موقعها عند مضيق هرمز. استخدم «عدسة مسندم» للتكبير.',
        items: water, labelClass: 'lbl-water', chipClass: '',
        doneText: 'عرفت مواقع الخليج العربي ومضيق هرمز وبحر عُمان وبحر العرب والمحيط الهندي.' },
      { name: 'مواقع جغرافية مهمة', task: 'اسحب اسم كل موقع إلى الدائرة المحيطة به على الخريطة',
        note: 'هذه المواقع من «علامات مميزة في خريطة سلطنة عُمان» في الأطلس.',
        items: sites, labelClass: 'lbl-focus', chipClass: 'country', slotClass: 'land',
        doneText: 'تعرفت على جزيرة مصيرة وجزر الحلانيات وجزر الديمانيات وولاية مدحاء.' }
    ]
  });
  window.Games = window.Games || {};
  window.Games.seas = game;
})();
