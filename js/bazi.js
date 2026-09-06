/* ============================================================
 * bazi.js — 八字四柱排盘 + 五行喜忌（简化实现）
 *
 * 依据：
 *   - 年柱以立春（约 2 月 4 日）为界
 *   - 月柱以月数 + 五虎遁
 *   - 日柱以基准日推六十甲子（1949-10-01 为甲子日）
 *   - 时柱以五鼠遁 + 时辰地支
 * 说明：简化版，非专业排盘；节气划分以近似处理，仅供娱乐。
 * ============================================================ */

window.BAZI = (function () {
  'use strict';

  var GAN = window.SOLAR.TIANGAN;      // 10
  var ZHI = window.SOLAR.DIZHI;        // 12

  /* ---- 日柱：基准 1949-10-01 = 甲子(0)，向前后推 ---- */
  function daysFromAnchor(y, m, d) {
    var base = Date.UTC(1949, 9, 1);        // 1949-10-01
    var target = Date.UTC(y, m - 1, d);
    return Math.round((target - base) / 86400000);
  }
  function dayPillar(y, m, d) {
    var idx = ((daysFromAnchor(y, m, d) % 60) + 60) % 60;
    return { gan: GAN[idx % 10], zhi: ZHI[idx % 12], idx: idx };
  }

  /* ---- 年柱：立春前用上一年 ---- */
  function yearGanZhi(year) {
    // 立春约 2 月 4 日，故 1 月 / 2 月初仍属上一年干支。简化：1 月用上一年。
    var idx = ((year - 4) % 60 + 60) % 60;   // 1984=甲子，故 year-4 mod60
    return { gan: GAN[idx % 10], zhi: ZHI[idx % 12] };
  }

  /* ---- 五虎遁：年干 → 正月(寅月)天干 ---- */
  var WUHU_BASE = { '甲': 2, '己': 2, '乙': 4, '庚': 4, '丙': 6, '辛': 6, '丁': 8, '壬': 8, '戊': 0, '癸': 0 };
  function wuhuBase(yearGan) { return WUHU_BASE[yearGan] != null ? WUHU_BASE[yearGan] : 2; }
  /* 月支序：正月=寅(2) ... 十二月=丑(1) */
  var MONTH_BRANCH_IDX = [2,3,4,5,6,7,8,9,10,11,0,1]; // 1..12 月对应的地支序

  function monthPillar(yearGan, month) {
    var branchIdx = MONTH_BRANCH_IDX[month - 1];
    var ganIdx = (WUHU_BASE[yearGan] + (month - 1)) % 10;
    return { gan: GAN[ganIdx], zhi: ZHI[branchIdx] };
  }

  /* ---- 五鼠遁：日干 → 子时天干 ---- */
  var WUSHU_BASE = { '甲': 0, '己': 0, '乙': 2, '庚': 2, '丙': 4, '辛': 4, '丁': 6, '壬': 6, '戊': 8, '癸': 8 };
  function hourPillar(dayGan, hourBranchIdx) {
    var ganIdx = (WUSHU_BASE[dayGan] + hourBranchIdx) % 10;
    return { gan: GAN[ganIdx], zhi: ZHI[hourBranchIdx] };
  }

  /* ---- 排盘主入口 ----
   * form: { year, month, day, hour(校正后), min, hourKnown }
   * 返回四柱与五行统计
   */
  function calc(form) {
    var yearPillar = yearGanZhi(form.year);
    // 1 月按立春前处理（简化）
    var effYear = form.year;
    if (form.month === 1) {
      var yp = yearGanZhi(form.year - 1);
      yearPillar = yp;
    }

    var mp = monthPillar(yearPillar.gan, form.month);
    var dp = dayPillar(form.year, form.month, form.day);

    var hourBranchIdx = 0;
    var hourKnown = form.hourKnown !== false;
    if (hourKnown) {
      hourBranchIdx = window.SOLAR.DIZHI.indexOf(window.SOLAR.shichenBranch(form.hour));
    } else {
      hourBranchIdx = 6; // 未知名义午时，标注未知
    }
    var hp = hourPillar(dp.gan, hourBranchIdx);

    var pillars = [
      { label: '年柱', gan: yearPillar.gan, zhi: yearPillar.zhi },
      { label: '月柱', gan: mp.gan, zhi: mp.zhi },
      { label: '日柱', gan: dp.gan, zhi: dp.zhi },
      { label: '时柱', gan: hp.gan, zhi: hp.zhi },
    ];

    // 五行统计
    var count = { '木':0, '火':0, '土':0, '金':0, '水':0 };
    pillars.forEach(function (p) {
      count[window.SOLAR.wuxingOfGan(p.gan)]++;
      count[window.SOLAR.wuxingOfZhi(p.zhi)]++;
    });

    // 日主
    var dayMaster = dp.gan;
    var dayMasterWx = window.SOLAR.wuxingOfGan(dayMaster);

    // 喜用神（简化启发式）
    var season = seasonOf(form.month);   // 月令五行
    // 简化：以日主五行数量 + 是否得令 判断强弱
    var strong = count[dayMasterWx] >= 3 || dayMasterWx === season;
    var yongshen, jishen;
    if (strong) {
      // 身强，宜泄耗克制：喜 = 日主所生(泄)，忌 = 生扶日主
      yongshen = generates(dayMasterWx, null) || '水';
      jishen = '生扶'; // 表达忌
    } else {
      // 身弱，宜生扶：喜 = 生日主，忌 = 克泄日主
      yongshen = '生扶';
      jishen = '克制';
    }
    // 映射为具体五行文本
    var ysWx = resolveUsable(dayMasterWx, strong, count);
    var jsWx = resolveAvoid(dayMasterWx, strong, count);

    return {
      pillars: pillars,
      count: count,
      dayMaster: dayMaster,
      dayMasterWx: dayMasterWx,
      strong: strong,
      season: season,
      yongshen: ysWx,       // 具体五行
      jishen: jsWx,         // 具体五行
      hourKnown: hourKnown,
      hourBranch: hourKnown ? window.SOLAR.shichenName(ZHI[hourBranchIdx]) : '不记得',
    };
  }

  /* 月令季节五行 */
  function seasonOf(month) {
    if (month >= 2 && month <= 4) return '木';
    if (month >= 5 && month <= 7) return '火';
    if (month >= 8 && month <= 10) return '金';
    return '水'; // 11,12,1
  }

  /* 相生表：木→火→土→金→水→木 */
  var SHENG = { '木':'火', '火':'土', '土':'金', '金':'水', '水':'木' };
  function generates(a, unused) { return SHENG[a]; }

  /* 具体喜用神五行 */
  function resolveUsable(dm, strong, count) {
    if (strong) {
      // 身强：喜泄（日主所生）
      return SHENG[dm];
    } else {
      // 身弱：喜生扶（生日主之五行）
      var parent = { '木':'水', '火':'木', '土':'火', '金':'土', '水':'金' };
      return parent[dm];
    }
  }
  function resolveAvoid(dm, strong, count) {
    if (strong) {
      // 身强：忌生扶
      var parent = { '木':'水', '火':'木', '土':'火', '金':'土', '水':'金' };
      return parent[dm];
    } else {
      // 身弱：忌克泄
      var ke = { '木':'土', '火':'金', '土':'水', '金':'木', '水':'火' };
      return ke[dm];
    }
  }

  return { calc: calc, dayPillar: dayPillar, wuhuBase: wuhuBase };
})();
