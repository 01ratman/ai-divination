/* ============================================================
 * ziwei.js — 紫微斗数排盘（完整安星）
 *
 * 输入：form { yearGan, yearZhi, month, day, hourBranchIdx, hourKnown, gender }
 *   yearGan/yearZhi: 年柱干支（乙亥 → gan="乙", zhi="亥"）
 *   hourBranchIdx: 0=子 ... 11=亥（已按真太阳时校正）
 *   hourKnown: 出生时间是否已知
 *
 * 流程：安命身宫 → 定十二宫天干 → 定五行局 → 安紫微 →
 *       安十四主星 → 安辅星 → 四化 → 大限
 * ============================================================ */

window.ZIWEI = (function () {
  'use strict';

  var GAN = window.SOLAR.TIANGAN;
  var ZHI = window.SOLAR.DIZHI;
  var D = window.ZIWEI_DATA;

  function mod(n, m) { return ((n % m) + m) % m; }

  /* 六十甲子纳音五行（index = 甲子序） */
  var NAYIN = ['金','金','火','火','木','木','土','土','金','金','火','火','水','水','土','土','金','金','木','木','水','水','土','土','火','火','木','木','金','金','水','水','火','火','土','土','木','木','金','金','火','火','水','水','土','土','金','金','木','木','水','水','火','火','土','土','木','木','金','金'];

  /* 干支 → 甲子序 */
  function gzIndex(gan, zhi) {
    var g = GAN.indexOf(gan), z = ZHI.indexOf(zhi);
    for (var k = 0; k < 6; k++) {
      var i = g + 10 * k;
      if (i % 12 === z) return i;
    }
    return 0;
  }

  /* 五行 → 五行局 */
  function juOfNayin(wx) {
    var map = { '金': '金四局', '木': '木三局', '水': '水二局', '火': '火六局', '土': '土五局' };
    return map[wx];
  }

  /* ---- 主入口 ---- */
  function calc(form) {
    var yearGan = form.yearGan;
    var yearZhi = form.yearZhi;
    var month = form.month;
    var day = form.day;
    var hour = form.hourBranchIdx;      // 0-11
    var hourKnown = form.hourKnown !== false;
    var gender = form.gender;

    // 1. 安命身宫
    var ming = mod(2 + (month - 1) - hour, 12);   // 寅起正月，顺月逆时
    var shen = mod(2 + (month - 1) + hour, 12);   // 寅起正月，顺月顺时

    // 2. 定十二宫天干（五虎遁，寅宫起）
    var wuhu = window.BAZI && window.BAZI.wuhuBase ? window.BAZI.wuhuBase(yearGan) : 2;
    var palaceGan = [];
    for (var p = 0; p < 12; p++) {
      palaceGan[p] = GAN[mod(wuhu + (p - 2), 10)];
    }

    // 3. 定五行局（命宫干支纳音）
    var mingGan = palaceGan[ming];
    var mingZhi = ZHI[ming];
    var juName = juOfNayin(NAYIN[gzIndex(mingGan, mingZhi)]);
    var juNum = D.ju[juName].num;

    // 4. 安紫微
    var ziweiZhi = D.ziweiTable[juName][day];
    var ziweiIdx = ZHI.indexOf(ziweiZhi);

    // 5. 安十四主星
    var stars = {};
    function put(name, idx) {
      if (idx == null) return;
      var key = ZHI[mod(idx, 12)];
      (stars[key] = stars[key] || []).push(name);
    }
    // 紫微系
    put('紫微', ziweiIdx);
    put('天机', ziweiIdx - 1);
    put('太阳', ziweiIdx + 3);
    put('武曲', ziweiIdx + 4);
    put('天同', ziweiIdx + 5);
    put('廉贞', ziweiIdx + 8);
    // 天府位置
    var tianfuIdx = mod(ziweiIdx + (4 - 2 * (ziweiIdx % 6)), 12);
    put('天府', tianfuIdx);
    put('太阴', tianfuIdx + 1);
    put('贪狼', tianfuIdx + 2);
    put('巨门', tianfuIdx + 3);
    put('天相', tianfuIdx + 4);
    put('天梁', tianfuIdx + 5);
    put('七杀', tianfuIdx + 6);
    put('破军', tianfuIdx + 10);

    // 6. 安辅星
    // 左辅右弼（辰起顺月 / 戌起逆月）
    put('左辅', 4 + (month - 1));
    put('右弼', 10 - (month - 1));
    // 文昌文曲（戌起逆时 / 辰起顺时）
    put('文昌', 10 - hour);
    put('文曲', 4 + hour);
    // 天魁天钺（年干）
    var ky = D.kuiYue[yearGan];
    if (ky) { put('天魁', ZHI.indexOf(ky.魁)); put('天钺', ZHI.indexOf(ky.钺)); }
    // 禄存 + 擎羊陀罗
    var luZhi = D.luCun[yearGan];
    if (luZhi) {
      var luIdx = ZHI.indexOf(luZhi);
      put('禄存', luIdx);
      put('擎羊', luIdx + 1);
      put('陀罗', luIdx - 1);
    }
    // 火星铃星（年支三合定起始，顺/逆数至生时）
    var sanHe = D.sanHe[yearZhi];
    if (sanHe) {
      put('火星', ZHI.indexOf(D.huoLing.火星[sanHe]) + hour);
      put('铃星', ZHI.indexOf(D.huoLing.铃星[sanHe]) - hour);
      // 天马 / 地劫地空
      put('天马', ZHI.indexOf(D.tianMa[sanHe]));
      put('地劫', ZHI.indexOf(D.diKongJie.地劫[sanHe]));
      put('地空', ZHI.indexOf(D.diKongJie.地空[sanHe]));
    }

    // 7. 四化（年干）
    var sihua = D.sihua[yearGan] || {};

    // 8. 大限（阳男阴女顺行 / 阴男阳女逆行；每宫十年，起运=局数）
    var yangGan = { '甲':1,'丙':1,'戊':1,'庚':1,'壬':1 };
    var shun = (yangGan[yearGan] && gender === 'male') || (!yangGan[yearGan] && gender === 'female');
    var dayun = [];
    for (var i = 0; i < 12; i++) {
      var idx = shun ? mod(ming + i, 12) : mod(ming - i, 12);
      dayun.push({
        idx: idx,
        zhi: ZHI[idx],
        ageStart: juNum + i * 10,
        ageEnd: juNum + i * 10 + 9,
      });
    }

    // 十二宫
    var palaceOrder = ['命宫','兄弟','夫妻','子女','财帛','疾厄','迁移','交友','官禄','田宅','福德','父母'];
    var palaces = [];
    for (var i2 = 0; i2 < 12; i2++) {
      var idx2 = mod(ming - i2, 12);   // 命宫后逆排十二宫
      var pname = palaceOrder[i2];
      palaces.push({
        order: i2,
        name: pname,
        idx: idx2,
        zhi: ZHI[idx2],
        gan: palaceGan[idx2],
        ganZhi: palaceGan[idx2] + ZHI[idx2],
        stars: stars[ZHI[idx2]] || [],
        isMing: idx2 === ming,
        isShen: idx2 === shen,
      });
    }

    // 庙旺信息
    var miaoWang = {};
    Object.keys(stars).forEach(function (z) {
      miaoWang[z] = {};
      stars[z].forEach(function (s) {
        if (D.mainStars[s] && D.miaoWang[s]) miaoWang[z][s] = D.miaoWang[s][z] || '平';
      });
    });

    return {
      yearGan: yearGan,
      mingIdx: ming, shenIdx: shen,
      juName: juName, juNum: juNum,
      ziweiZhi: ziweiZhi,
      palaceGan: palaceGan,
      stars: stars,
      miaoWang: miaoWang,
      sihua: sihua,
      dayun: dayun,
      palaces: palaces,
      hourKnown: hourKnown,
      gender: gender,
    };
  }

  return { calc: calc };
})();