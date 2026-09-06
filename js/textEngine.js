/* ============================================================
 * textEngine.js — 插槽填充 + 权重随机组合，生成完整解读文本
 * ============================================================ */

window.TEXT_ENGINE = (function () {
  'use strict';

  /* 查找 64 卦：按序号 */
  var ALL_GUA = window.ZHOUYI.concat(window.ZHOUYI_2);
  function guaByNum(num) {
    return ALL_GUA.find(function (g) { return g.num === num; });
  }

  /* ---- 本命卦：一个八字 → 一个卦（确定性） ----
   * 取四柱 8 字，按天干地支映射为 6 爻，形成 6 位二进制(1=阳) → 卦序号(1..64)
   * 采用：下卦(初、二、三爻) 取 年柱+月柱，上卦(四、五、上爻) 取 日柱+时柱
   */
  function benmingGua(bazi) {
    var bits = [];
    var pillars = bazi.pillars;
    // 8 个字的天干地支，各映射 1 bit：以"奇偶 + 五行"组合映射，确保确定
    function bitOf(str) {
      var code = 0;
      for (var i = 0; i < str.length; i++) code += str.charCodeAt(i);
      return code % 2; // 0 或 1
    }
    // 取 6 个有效位：年干、年支、月干、月支、日干、时干（6 位）
    var seq = [
      pillars[0].gan, pillars[0].zhi,
      pillars[1].gan, pillars[1].zhi,
      pillars[2].gan,
      pillars[3].gan,
    ];
    seq.forEach(function (s) { bits.push(bitOf(s)); });
    // 二进制 → 0..63 → 卦序号 1..64
    var val = 0;
    for (var k = 0; k < 6; k++) { val = val * 2 + bits[k]; }
    var num = (val % 64) + 1;
    return guaByNum(num);
  }

  /* ---- 六爻摇卦（随机） ---- */
  function castLiuyao() {
    var lines = [];
    for (var i = 0; i < 6; i++) {
      // 三枚铜钱，每枚 0(字/阴) 或 1(背/阳)
      var backs = 0;
      for (var c = 0; c < 3; c++) backs += (Math.random() < 0.5 ? 1 : 0);
      var type;
      if (backs === 3) type = 'oldYang';       // 老阳 ○ 变
      else if (backs === 2) type = 'youngYang';// 少阳
      else if (backs === 1) type = 'youngYin'; // 少阴
      else type = 'oldYin';                    // 老阴 × 变
      lines.push(type);
    }
    // 本卦（下三爻为初、二、三）
    var ben = {
      upper: lines.slice(0, 3),  // 上卦（四、五、上）
      lower: lines.slice(3, 6),  // 下卦（初、二、三）
      lines: lines,
    };
    // 变卦：老阳变阴、老阴变阳
    var bianLines = lines.map(function (t) {
      if (t === 'oldYang') return 'youngYin';
      if (t === 'oldYin') return 'youngYang';
      return t;
    });
    return { ben: ben, bian: { lines: bianLines }, raw: lines };
  }

  /* 由爻序列推卦名（6 位，下→上） */
  function guaNameFromBits(bitsLowToHigh) {
    // 转为卦序号 1..64（简化按二进制），与 benming 保持一致即可
    var val = 0;
    for (var k = 0; k < 6; k++) { val = val * 2 + (bitsLowToHigh[k] ? 1 : 0); }
    var num = (val % 64) + 1;
    return guaByNum(num);
  }

  /* ---- 健康提醒：依据五行旺衰，结合"五行对应五脏 + 相克"生成 ----
   * 规则：某行旺则其所克之行的脏腑易受损（如火旺克金，金主肺，宜护肺）；
   *       某行缺失则其本脏宜补养。
   */
  function healthAdvice(count) {
    var order = ['木', '火', '土', '金', '水'];
    var balance = {
      '木': '以金气疏泄、舒展条达，勿郁怒伤肝',
      '火': '多近水润之物以平火气，勿过劳伤神',
      '土': '以木气疏达、培土以生金，勿久坐伤脾',
      '金': '以火气煅炼、清润肺金，勿悲忧伤肺',
      '水': '以土气制水、温阳以固本，勿惊恐伤肾',
    };
    var parts = [];

    // 旺行 → 被克行的脏腑
    var max = 0;
    order.forEach(function (o) { if (count[o] > max) max = count[o]; });
    var wangList = order.filter(function (o) { return count[o] === max; });

    wangList.forEach(function (w) {
      var k = window.WUXING.ke[w];
      var ke = window.WUXING.element[k];
      parts.push(
        '命局' + w + '气偏旺（' + count[w] + '），' + w + '克' + k + '，' +
        k + '主' + ke.脏 + '（' + ke.腑 + '），开窍于' + ke.窍 + '。' +
        '故当格外留意' + ke.脏 + '与' + ke.腑 + '之养护：' + balance[w] + '，' +
        '忌' + ke.味 + '味过重，慎' + ke.色 + '色' + ke.季 + '之扰。'
      );
    });

    // 缺行 → 本脏补养
    order.forEach(function (o) {
      if (count[o] === 0) {
        var e = window.WUXING.element[o];
        parts.push(
          '命局' + o + '气不足，' + o + '主' + e.脏 + '，开窍于' + e.窍 + '。' +
          '宜补' + o + '气以养' + e.脏 + '：多食' + e.味 + '味之品，' +
          '亲近' + e.色 + '色' + e.季 + '之生机，宽和情志，戒' + e.志 + '太过，' +
          '则' + e.脏 + '安而体健。'
        );
      }
    });

    // 至旺（过半）额外提示情志
    if (max >= 5) {
      var w0 = wangList[0];
      var e0 = window.WUXING.element[w0];
      parts.push(
        '五行至旺者，气易亢盛，' + w0 + '主' + e0.志 + '，' +
        '宜恬淡寡欲、戒' + e0.志 + '太过，常存平常心，调和心身，方免情志为病。'
      );
    }

    if (!parts.length) {
      return '命局五行较为平衡，脏腑各安其位。宜起居有常、情志和畅，常养浩然之气，则康泰无忧。';
    }
    return parts.join(' ');
  }

  /* ---- 主题标签（健康用） ---- */
  function organSummary(count) {
    var order = ['木', '火', '土', '金', '水'];
    var map = [];
    order.forEach(function (o) {
      map.push(o + '(' + window.WUXING.element[o].脏 + ') ' + count[o]);
    });
    return map.join('，');
  }

  /* ---- 权重随机抽取 ---- */
  function pickWeighted(variants) {
    var total = 0;
    variants.forEach(function (v) { total += (v.weight || 1); });
    var r = Math.random() * total;
    var acc = 0;
    for (var i = 0; i < variants.length; i++) {
      acc += (variants[i].weight || 1);
      if (r < acc) return variants[i].text;
    }
    return variants[variants.length - 1].text;
  }

  /* ---- 插槽填充 ---- */
  function fill(template, ctx) {
    return template
      .replace(/\{性别\}/g, ctx.genderName)
      .replace(/\{日主\}/g, ctx.dayMaster)
      .replace(/\{日主五行\}/g, ctx.dayMasterWx)
      .replace(/\{日主性\}/g, ctx.dayMasterXing)
      .replace(/\{日主象\}/g, ctx.dayMasterXiang)
      .replace(/\{喜用神\}/g, '喜' + ctx.yongshen)
      .replace(/\{忌神\}/g, '忌' + ctx.jishen)
      .replace(/\{方位\}/g, ctx.regionName)
      .replace(/\{方位五行\}/g, ctx.regionWx)
      .replace(/\{时辰\}/g, ctx.shichen)
      .replace(/\{时辰五行\}/g, ctx.shichenWx)
      .replace(/\{本命卦\}/g, ctx.benmingName)
      .replace(/\{卦辞\}/g, ctx.guaci)
      .replace(/\{补五行\}/g, ctx.deficiencyWx)
      .replace(/\{健康提醒\}/g, ctx.healthAdvice)
      .replace(/\{五脏分布\}/g, ctx.organSummary);
  }

  /* ---- 主入口：根据 formData + 推算结果生成完整解读 ---- */
  function generate(form, bazi, liuyao, region) {
    var shichen = window.SHICHEN[bazi.hourBranch] || window.SHICHEN.unknown;
    var shichenName = bazi.hourBranch;   // "巳时" 或 "不记得"

    // 十干文本
    var tg = window.TIANGAN[bazi.dayMaster] || {};
    var wxEl = window.WUXING.element[bazi.dayMasterWx] || {};
    var gd = window.GENDER[form.gender] || window.GENDER.male;
    var reg = region && window.REGIONS[region.direction] ? window.REGIONS[region.direction] : window.REGIONS.unknown;

    // 缺失五行（取数量最少者为"需补"）
    var minWx = '木', minN = 99;
    Object.keys(bazi.count).forEach(function (wx) {
      if (bazi.count[wx] < minN) { minN = bazi.count[wx]; minWx = wx; }
    });

    var ctx = {
      genderName: gd.name,
      dayMaster: bazi.dayMaster,
      dayMasterWx: bazi.dayMasterWx,
      dayMasterXing: wxEl.性 || tg.性 || '',
      dayMasterXiang: tg.象 || '',
      yongshen: bazi.yongshen,
      jishen: bazi.jishen,
      regionName: reg.name,
      regionWx: reg.wuxing || '未知',
      shichen: shichenName,
      shichenWx: shichen.五行为 || '未知',
      benmingName: liuyao.benming.name,
      guaci: liuyao.benming.guaci,
      deficiencyWx: minWx,
      healthAdvice: healthAdvice(bazi.count),
      organSummary: organSummary(bazi.count),
    };

    // 综合概述长文
    var overview =
      gd.opening + ' ' +
      reg.desc + ' ' +
      tg.性格 + ' ' +
      shichen.trait + ' ' +
      window.WUXING.usefull['喜' + bazi.yongshen] + ' ' +
      window.WUXING.avoid['忌' + bazi.jishen] + ' ' +
      window.WUXING.deficiency[minWx] + ' ' +
      '五行对应五脏：' + organSummary(bazi.count) + '。' +
      '本命卦为「' + liuyao.benming.name + '」，' + liuyao.benming.duan;

    // 各主题
    var topics = {};
    Object.keys(window.TOPIC_TEMPLATES).forEach(function (key) {
      var t = window.TOPIC_TEMPLATES[key];
      topics[key] = fill(pickWeighted(t.variants), ctx);
    });

    // 结语
    var closing = window.CLOSING[Math.floor(Math.random() * window.CLOSING.length)];

    return {
      overview: overview,
      topics: topics,
      closing: closing,
      summary: '命主' + bazi.dayMaster + '日主，' + reg.name + '之命，本命卦「' + liuyao.benming.name + '」。' + liuyao.benming.xiàng,
      bazi: bazi,
      liuyao: liuyao,
      ctx: ctx,
    };
  }

  return {
    guaByNum: guaByNum,
    benmingGua: benmingGua,
    castLiuyao: castLiuyao,
    guaNameFromBits: guaNameFromBits,
    generate: generate,
  };
})();
