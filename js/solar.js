/* ============================================================
 * solar.js — 真太阳时、时辰换算、方位判定
 * ============================================================ */

window.SOLAR = (function () {
  'use strict';

  var TIANGAN = '甲乙丙丁戊己庚辛壬癸';
  var DIZHI = '子丑寅卯辰巳午未申酉戌亥';

  /* 天干序（0-9），五行 */
  var TIAN_WUXING = ['木','木','火','火','土','土','金','金','水','水'];
  /* 地支序（0-11），五行 */
  var DI_WUXING = ['水','土','木','木','土','火','火','土','金','金','土','水'];

  function wuxingOfGan(g) { return TIAN_WUXING[TIANGAN.indexOf(g)]; }
  function wuxingOfZhi(z) { return DI_WUXING[DIZHI.indexOf(z)]; }

  /* 找城市经纬度（简化，未收录则返回 null） */
  function findCity(name) {
    if (!name) return null;
    var provinces = window.SUN.provinces;
    if (provinces[name]) return { name: name, lon: provinces[name][0], lat: provinces[name][1] };
    // 尝试去空格匹配
    var n2 = name.replace(/\s+/g, '');
    if (provinces[n2]) return { name: n2, lon: provinces[n2][0], lat: provinces[n2][1] };
    return null;
  }

  /* 由出生小时换算十二时辰地支（23-1 为子，依此类推） */
  function shichenBranch(hour) {
    var idx = Math.floor(((hour + 1) % 24) / 2);
    return DIZHI[idx];
  }

  /* 时辰名 → 子/丑/... */
  function shichenName(branch) {
    var names = {
      '子':'子时','丑':'丑时','寅':'寅时','卯':'卯时','辰':'辰时','巳':'巳时',
      '午':'午时','未':'未时','申':'申时','酉':'酉时','戌':'戌时','亥':'亥时'
    };
    return names[branch] || '未知';
  }

  /* 真太阳时：hour + 经度校正（东经每度 +4 分钟，相对 120°E） */
  function trueSolarTime(hour, min, lon) {
    if (lon == null) return { hour: hour, min: min };
    var offsetMin = (lon - 120) * 4; // 分钟
    var total = hour * 60 + min + offsetMin;
    total = ((total % 1440) + 1440) % 1440;
    return { hour: Math.floor(total / 60), min: total % 60 };
  }

  /* 方位判定：返回 {ew, ns}，用于文本维度 */
  function directionOf(lon, lat) {
    var ew = 'center';
    if (lon >= 118) ew = 'east';
    else if (lon < 110) ew = 'west';
    var ns = 'center';
    if (lat >= 36) ns = 'north';
    else if (lat < 30) ns = 'south';
    return { ew: ew, ns: ns };
  }

  /* 解析输入地区，返回 { key, lon, lat, direction, known } */
  function resolveRegion(inputText) {
    var city = findCity(inputText);
    if (!city) {
      return { key: inputText || '', lon: null, lat: null, direction: 'unknown', known: !!inputText };
    }
    var dir = directionOf(city.lon, city.lat);
    // 综合方位：东西为主
    var combined = dir.ew === 'center' ? dir.ns : dir.ew;
    if (dir.ew === 'center' && dir.ns === 'center') combined = 'center';
    return { key: city.name, lon: city.lon, lat: city.lat, direction: combined, known: true };
  }

  return {
    TIANGAN: TIANGAN,
    DIZHI: DIZHI,
    wuxingOfGan: wuxingOfGan,
    wuxingOfZhi: wuxingOfZhi,
    shichenBranch: shichenBranch,
    shichenName: shichenName,
    trueSolarTime: trueSolarTime,
    directionOf: directionOf,
    resolveRegion: resolveRegion,
  };
})();
