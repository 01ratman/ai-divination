/* ============================================================
 * render.js — 结果页多标签渲染
 * ============================================================ */

window.RENDER = (function () {
  'use strict';

  var WX_COLOR = { '木':'#2e8b57', '火':'#e0552e', '土':'#c9a227', '金':'#b9bcc2', '水':'#2f6db0' };

  function el(id) { return document.getElementById(id); }

  /* 四柱表 */
  function renderPillars(container, pillars) {
    var html = '<div class="pillars">';
    pillars.forEach(function (p) {
      html += '<div class="pillar"><div class="p-name">' + p.label + '</div>' +
              '<div class="p-gz">' + p.gan + p.zhi + '</div>' +
              '<div class="p-wx">' + window.SOLAR.wuxingOfGan(p.gan) + window.SOLAR.wuxingOfZhi(p.zhi) + '</div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  /* 五行条形图 */
  function renderWx(container, count) {
    var order = ['木','火','土','金','水'];
    var total = 0; order.forEach(function (w) { total += count[w]; });
    var html = '<div class="wx-bars">';
    order.forEach(function (w) {
      var pct = total ? Math.round(count[w] / total * 100) : 0;
      html += '<div class="wx-bar-row"><div class="wx-label">' + w + '</div>' +
              '<div class="wx-bar-track"><div class="wx-bar-fill" style="width:' + pct + '%;background:' + WX_COLOR[w] + '"></div></div>' +
              '<div class="wx-num">' + count[w] + '</div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  /* 六爻卦象图（HTML） */
  function renderGua(container, gua, title) {
    var lines = gua.lines.slice().reverse(); // 上爻在上
    var html = '<div class="gua"><h4>' + title + '</h4><div class="gua-lines">';
    lines.forEach(function (t) {
      var cls = '';
      if (t === 'youngYin' || t === 'oldYin') cls = 'yin';
      if (t === 'oldYang') cls = 'yang-var';
      if (t === 'oldYin') cls = 'yin-var';
      if (t === 'youngYang') cls = '';
      html += '<div class="gua-line ' + cls + '"></div>';
    });
    html += '</div></div>';
    container.insertAdjacentHTML('beforeend', html);
  }

  function renderAll(result) {
    var b = result.bazi;
    var ly = result.liuyao;

    // 头部
    el('result-id').textContent = '命盘 ID：' + result.id;
    var d = result.form.date;
    var t = result.form.time;
    el('result-meta').textContent = b.hourKnown
      ? ('公历 ' + d.year + ' 年 ' + d.month + ' 月 ' + d.day + ' 日 ' +
         String(t.hour).padStart(2, '0') + ':' + String(t.min).padStart(2, '0'))
      : ('公历 ' + d.year + ' 年 ' + d.month + ' 月 ' + d.day + ' 日 · 出生时间不详');
    el('result-meta').textContent += ' · ' + (result.form.gender === 'male' ? '男' : '女');
    el('result-summary').textContent = result.summary;

    // 综合
    el('tab-overview').innerHTML =
      '<h3>命盘概览</h3><p>' + result.overview + '</p>' +
      '<h3>结语</h3><p>' + result.closing + '</p>';

    // 八字
    var tb = el('tab-bazi');
    tb.innerHTML = '<h3>四柱排盘</h3>';
    renderPillars(tb, b.pillars);
    tb.insertAdjacentHTML('beforeend', '<h3>五行分布</h3>');
    renderWx(tb, b.count);
    tb.insertAdjacentHTML('beforeend',
      '<h3>日主与喜忌</h3><p>日主 <strong>' + b.dayMaster + '</strong>（' + b.dayMasterWx + '），命局偏' + (b.strong ? '旺' : '弱') + '。</p>' +
      '<p>喜用神：<strong>喜' + b.yongshen + '</strong>；忌神：<strong>忌' + b.jishen + '</strong>。</p>' +
      '<p>' + window.WUXING.usefull['喜' + b.yongshen] + '</p>' +
      '<p>' + window.WUXING.avoid['忌' + b.jishen] + '</p>');

    // 六爻
    var tl = el('tab-liuyao');
    tl.innerHTML = '<h3>本命卦（由八字确定）</h3>' +
      '<p class="guaci">「' + ly.benming.name + '」· ' + ly.benming.guaci + '</p>' +
      '<p><em>' + ly.benming.baihua + '</em></p>' +
      '<p><strong>象曰：</strong>' + ly.benming.xiàng + '</p>' +
      '<p>' + ly.benming.duan + '</p>';
    tl.insertAdjacentHTML('beforeend', '<h3>本次摇卦</h3><div class="gua-box" id="gua-cast"></div>');
    renderGua(el('gua-cast'), ly.ben, '本卦');
    if (ly.bian) renderGua(el('gua-cast'), ly.bian, '变卦');

    // 紫微（完整星盘）
    var tz = el('tab-ziwei');
    tz.innerHTML = '';
    renderZiwei(tz, result.ziwei);

    // 主题
    var tt = el('tab-topics');
    tt.innerHTML = '';
    Object.keys(result.topics).forEach(function (key) {
      tt.insertAdjacentHTML('beforeend',
        '<div class="topic-card"><h4>' + key + '</h4><p>' + result.topics[key] + '</p></div>');
    });

    // 原文
    var tc = el('tab-classic');
    tc.innerHTML =
      '<div class="classic-block"><div class="c-guci">「' + ly.benming.name + '」</div>' +
      '<div class="c-guci">' + ly.benming.guaci + '</div>' +
      '<div class="c-baihua">' + ly.benming.baihua + '</div>' +
      '<div class="c-baihua">象曰：' + ly.benming.xiàng + '</div></div>';
  }

  /* ============ 紫微星盘渲染 ============ */
  // 十二宫在 4x4 星盘上的坐标（传统布局）
  var PAN_GRID = {
    '巳':[0,0], '午':[0,1], '未':[0,2], '申':[0,3],
    '辰':[1,0], '酉':[1,3],
    '卯':[2,0], '戌':[2,3],
    '寅':[3,0], '丑':[3,1], '子':[3,2], '亥':[3,3],
  };

  function renderZiwei(container, zw) {
    // 时间不详警告
    if (!zw.hourKnown) {
      container.insertAdjacentHTML('beforeend',
        '<p style="color:#e0706a;border:1px solid rgba(224,112,106,.4);padding:10px 14px;border-radius:8px;margin-bottom:16px;">' +
        '⚠ 出生时间不详，命宫、身宫、文昌文曲、火铃二星等均按"午时"假设排盘，此紫微命盘仅供形式参考，准确性不足。</p>');
    }

    // 头部信息
    var juTxt = window.ZIWEI_DATA.ju[zw.juName];
    var mingP = zw.palaces[0];
    container.insertAdjacentHTML('beforeend',
      '<h3>命盘信息</h3><p>五行局：<strong>' + zw.juName + '</strong>（' + juTxt.desc + '）</p>' +
      '<p>命宫：<strong>' + mingP.ganZhi + '</strong> · 身宫：<strong>' + zw.palaces.find(function (p) { return p.isShen; }).ganZhi + '</strong></p>');

    // 星盘（4x4 网格）
    container.insertAdjacentHTML('beforeend', '<h3>星盘</h3><div class="pan-grid">');
    var panEl = container.lastChild;
    var zwZhi = zw.ziweiZhi;
    var center = '<div class="pan-center">' + zw.juName.replace('局','') + '</div>';
    var cells = {};
    zw.palaces.forEach(function (p) { cells[p.zhi] = p; });
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        var zhi = null;
        Object.keys(PAN_GRID).forEach(function (z) {
          if (PAN_GRID[z][0] === r && PAN_GRID[z][1] === c) zhi = z;
        });
        if (!zhi) { if (r===1&&c===1||r===1&&c===2||r===2&&c===1||r===2&&c===2) panEl.insertAdjacentHTML('beforeend', center); else panEl.insertAdjacentHTML('beforeend', '<div class="pan-cell"></div>'); continue; }
        var p = cells[zhi];
        if (!p) continue;
        var mw = zw.miaoWang[zhi] || {};
        var starsHtml = p.stars.map(function (s) {
          return '<div class="pan-star' + (s === '紫微' ? ' ziwei' : '') + '">' + s + (mw[s] ? '<span class="mw">' + mw[s] + '</span>' : '') + '</div>';
        }).join('');
        var marks = (p.isMing ? ' <span class="pan-mark">命</span>' : '') + (p.isShen ? ' <span class="pan-mark">身</span>' : '');
        panEl.insertAdjacentHTML('beforeend',
          '<div class="pan-cell' + (p.isMing ? ' ming' : '') + '">' +
          '<div class="pan-title">' + p.name + marks + '</div>' +
          '<div class="pan-gz">' + p.ganZhi + (zhi === zwZhi ? ' · 紫微' : '') + '</div>' +
          '<div class="pan-stars">' + starsHtml + '</div>' +
          '</div>');
      }
    }

    // 命宫主星解读
    container.insertAdjacentHTML('beforeend', '<h3>命宫主星</h3>');
    var mingStars = mingP.stars.filter(function (s) { return window.ZIWEI_DATA.mainStars[s]; });
    if (mingStars.length) {
      mingStars.forEach(function (s) {
        var st = window.ZIWEI_DATA.mainStars[s];
        var mw = (zw.miaoWang[mingP.zhi] || {})[s] || '';
        container.insertAdjacentHTML('beforeend',
          '<div class="topic-card"><h4>' + s + '（' + st.庙旺 + (mw ? ' · ' + mw : '') + '）</h4>' +
          '<p>' + st.性格 + '</p>' +
          '<p><strong>优点：</strong>' + st.优点 + '</p>' +
          '<p><strong>缺点：</strong>' + st.缺点 + '</p>' +
          '<p><strong>建议：</strong>' + st.建议 + '</p></div>');
      });
    } else {
      container.insertAdjacentHTML('beforeend', '<p>命宫无主星坐守（命无正曜），宜借对宫迁移宫之星曜参看，可看"迁移宫"。</p>');
      var yi = zw.palaces.find(function (p) { return p.name === '迁移'; });
      var yiStars = yi.stars.filter(function (s) { return window.ZIWEI_DATA.mainStars[s]; });
      if (yiStars.length) {
        yiStars.forEach(function (s) {
          var st = window.ZIWEI_DATA.mainStars[s];
          container.insertAdjacentHTML('beforeend',
            '<div class="topic-card"><h4>迁移宫 · ' + s + '</h4><p>' + st.性格 + '</p><p><strong>建议：</strong>' + st.建议 + '</p></div>');
        });
      }
    }

    // 四化
    var sh = zw.sihua;
    container.insertAdjacentHTML('beforeend',
      '<h3>四化（' + zw.yearGan + '年干）</h3><p>' +
      '化禄：<strong>' + sh.禄 + '</strong> · 化权：<strong>' + sh.权 + '</strong> · ' +
      '化科：<strong>' + sh.科 + '</strong> · 化忌：<strong>' + sh.忌 + '</strong></p>' +
      '<p>四化之星所在之宫为吉凶之枢纽：禄主财喜，权主地位，科主名声，忌主烦扰。可对照上盘自行参详。</p>');

    // 大限
    container.insertAdjacentHTML('beforeend', '<h3>大限（每十年一运，起运' + zw.juNum + '岁）</h3>');
    var dyHtml = '<ul class="dayun-list">';
    zw.dayun.forEach(function (d) {
      var name = zw.palaces.find(function (p) { return p.idx === d.idx; }).name;
      dyHtml += '<li>' + d.ageStart + '–' + d.ageEnd + '岁 · ' + name + '（' + d.zhi + '宫）</li>';
    });
    dyHtml += '</ul>';
    container.insertAdjacentHTML('beforeend', dyHtml);
  }

  return { renderAll: renderAll, renderPillars: renderPillars, renderWx: renderWx };
})();
