/* ============================================================
 * form.js — 表单联动、校验、组装 formData、占卜编排
 * ============================================================ */

window.APP = window.APP || {};
window.APP.lastFormData = null;

window.APP.form = (function () {
  'use strict';

  var YEAR_MIN = 1940, YEAR_MAX = new Date().getFullYear();

  function el(id) { return document.getElementById(id); }
  function fillSelect(sel, from, to, format) {
    var html = '';
    var step = from <= to ? 1 : -1;
    for (var i = from; i !== to + step; i += step) {
      html += '<option value="' + i + '">' + format(i) + '</option>';
    }
    sel.innerHTML = html;
  }

  function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }

  function init() {
    // 地区 datalist（省级行政区）
    var dl = el('region-list');
    dl.innerHTML = Object.keys(window.SUN.provinces).map(function (p) {
      return '<option value="' + p + '">' + p + '</option>';
    }).join('');

    // 年
    fillSelect(el('birth-year'), YEAR_MAX, YEAR_MIN, function (i) { return i + ' 年'; });
    el('birth-year').value = 1995;
    // 月
    fillSelect(el('birth-month'), 1, 12, function (i) { return i + ' 月'; });
    el('birth-month').value = 6;
    // 日（随年月联动）
    refreshDays();
    el('birth-day').value = 15;
    // 时
    fillSelect(el('birth-hour'), 0, 23, function (i) { return i + ' 时'; });
    el('birth-hour').value = 10;
    // 分
    var hm = '';
    for (var m = 0; m < 60; m += 5) { hm += '<option value="' + m + '">' + m + ' 分</option>'; }
    el('birth-min').innerHTML = hm;
    el('birth-min').value = 30;

    // 联动
    el('birth-year').addEventListener('change', refreshDays);
    el('birth-month').addEventListener('change', refreshDays);
    el('time-unknown').addEventListener('change', toggleUnknown);

    // 按钮
    el('btn-reset').addEventListener('click', reset);
    el('btn-divinate').addEventListener('click', function () { divinate(null, false); });
  }

  function refreshDays() {
    var y = parseInt(el('birth-year').value, 10);
    var m = parseInt(el('birth-month').value, 10);
    var d = daysInMonth(y, m);
    var cur = parseInt(el('birth-day').value, 10) || 1;
    fillSelect(el('birth-day'), 1, d, function (i) { return i + ' 日'; });
    el('birth-day').value = Math.min(cur, d);
  }

  function toggleUnknown() {
    var unk = el('time-unknown').checked;
    el('birth-hour').disabled = unk;
    el('birth-min').disabled = unk;
  }

  function reset() {
    el('region').value = '';
    el('birth-year').value = 1995;
    el('birth-month').value = 6;
    refreshDays();
    el('birth-day').value = 15;
    el('birth-hour').value = 10;
    el('birth-min').value = 30;
    el('time-unknown').checked = false;
    toggleUnknown();
    el('gender').value = '';
    [el('region'), el('gender')].forEach(function (x) { x.classList.remove('error'); });
  }

  /* 校验并组装 formData，返回 null 表示失败 */
  function gather() {
    var ok = true;
    var gender = el('gender').value;
    if (!gender) { el('gender').classList.add('error'); ok = false; } else { el('gender').classList.remove('error'); }

    var regionText = el('region').value.trim();
    if (!ok) { toast('请填写必填项（性别）'); return null; }

    var timeUnknown = el('time-unknown').checked;
    return {
      region: regionText,
      date: {
        year: parseInt(el('birth-year').value, 10),
        month: parseInt(el('birth-month').value, 10),
        day: parseInt(el('birth-day').value, 10),
      },
      time: {
        hour: timeUnknown ? null : parseInt(el('birth-hour').value, 10),
        min: timeUnknown ? null : parseInt(el('birth-min').value, 10),
        known: !timeUnknown,
      },
      gender: gender,
    };
  }

  /* ---- 占卜编排 ---- */
  function divinate(formData, recast) {
    formData = formData || gather();
    if (!formData) return;
    window.APP.lastFormData = formData;

    // 1. 地区解析 + 真太阳时校正
    var region = window.SOLAR.resolveRegion(formData.region);

    var hour = formData.time.known ? formData.time.hour : 12;
    var min = formData.time.known ? formData.time.min : 0;
    var tst = window.SOLAR.trueSolarTime(hour, min, region.lon);

    // 2. 八字
    var bazi = window.BAZI.calc({
      year: formData.date.year,
      month: formData.date.month,
      day: formData.date.day,
      hour: tst.hour,
      min: tst.min,
      hourKnown: formData.time.known,
    });

    // 3. 本命卦（确定）
    var benming = window.TEXT_ENGINE.benmingGua(bazi);

    // 3.5 紫微斗数排盘
    var zp = bazi.pillars[0];
    var hbi = formData.time.known
      ? window.SOLAR.DIZHI.indexOf(window.SOLAR.shichenBranch(tst.hour))
      : 6; // 时间不详时名义午时，仅用于占位
    var ziwei = window.ZIWEI.calc({
      yearGan: zp.gan,
      yearZhi: zp.zhi,
      month: formData.date.month,
      day: formData.date.day,
      hourBranchIdx: hbi,
      hourKnown: formData.time.known,
      gender: formData.gender,
    });

    // 4. 进入动画页摇卦
    showPage('animate');
    var canvas = el('animate-canvas');
    var skipBtn = el('btn-skip');
    skipBtn.style.display = 'none';

    window.APP.canvas.playCasting(canvas, function (txt) {
      el('animate-text').textContent = txt;
    }, skipBtn).then(function (cast) {
      // 5. 组合结果
      var liuyao = {
        benming: benming,
        ben: { lines: cast.lines },
        bian: buildBian(cast.lines),
        cast: cast,
      };
      var result = window.TEXT_ENGINE.generate(formData, bazi, liuyao, region);
      result.id = genId();
      result.form = formData;
      result.region = region;
      result.bazi.hourKnown = formData.time.known;
      result.ziwei = ziwei;

      // 6. 渲染并展示
      window.RENDER.renderAll(result);
      showPage('result');
    });
  }

  function buildBian(lines) {
    var bian = lines.map(function (t) {
      if (t === 'oldYang') return 'youngYin';
      if (t === 'oldYin') return 'youngYang';
      return t;
    });
    return { lines: bian };
  }

  function genId() {
    var d = new Date();
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0') + '-' +
      Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  return { init: init, divinate: divinate };
})();

window.APP.divinate = window.APP.form.divinate;
