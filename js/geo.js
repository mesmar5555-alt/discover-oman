/* معلومات جغرافية مشتركة. التلميحات مبنية على الخريطة الرسمية المرفقة
   (التحقق آليًا من: المحافظات المطلة على البحر، المحافظات ذات الحدود الدولية، المحافظات المتجاورة) */
(function () {
  'use strict';
  var D = window.OMAN_DATA;
  var GEO = {
    /* ألوان مستوحاة من ألوان خريطة النطاق الإداري للمحافظات في الأطلس */
    colors: {
      muscat: '#E08DC2', dhofar: '#8DBF6E', musandam: '#C98F52', buraimi: '#7EA6E0', dakhiliyah: '#A9B4C2',
      north_batinah: '#7FCBA6', south_batinah: '#F6C37A', south_sharqiyah: '#A59BD6', north_sharqiyah: '#F5A542',
      dhahirah: '#EE9C7E', wusta: '#F2DE6B'
    },
    hints: {
      muscat: 'تقع على ساحل بحر عُمان في الشمال الشرقي، بين جنوب الباطنة وجنوب الشرقية.',
      dhofar: 'أكبر المحافظات مساحة، تقع في أقصى الجنوب الغربي على بحر العرب وتجاور اليمن.',
      musandam: 'تقع في أقصى الشمال عند مضيق هرمز، منفصلة عن باقي أراضي السلطنة.',
      buraimi: 'تقع في الشمال الغربي على الحدود مع دولة الإمارات، ولا تطل على البحر.',
      dakhiliyah: 'تقع في الداخل بين الظاهرة غربًا وشمال الشرقية شرقًا، ولا تطل على البحر.',
      north_batinah: 'تقع على ساحل بحر عُمان في الشمال، بجوار البريمي والظاهرة.',
      south_batinah: 'تقع على ساحل بحر عُمان بين شمال الباطنة ومسقط.',
      south_sharqiyah: 'تقع في أقصى شرق السلطنة، وتتبعها جزيرة مصيرة.',
      north_sharqiyah: 'تقع في شرق السلطنة بين الداخلية وجنوب الشرقية، ولا تطل على البحر.',
      dhahirah: 'تقع في غرب السلطنة جنوب البريمي، على الحدود مع الإمارات والسعودية.',
      wusta: 'تقع في وسط السلطنة بين ظفار والشرقية، وتطل على بحر العرب.'
    },
    govName: function (id) { return 'محافظة ' + GEO.gov(id).name; },
    gov: function (id) { for (var i = 0; i < D.govs.length; i++) if (D.govs[i].id === id) return D.govs[i]; return null; },
    wilayatsOf: function (id) { return D.wilayats.filter(function (w) { return w.gov === id; }); },
    /* حجم اسم المحافظة على الخريطة بحسب مساحتها */
    labelSize: function (g) { return g.area > 20000 ? 150 : g.area > 8000 ? 122 : 100; }
  };
  window.GEO = GEO;
})();
