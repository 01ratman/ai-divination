/* ============================================================
 * main.js — SPA 页面切换、全局入口
 * ============================================================ */

window.APP = window.APP || {};

/* 页面切换 */
function showPage(name) {
  document.querySelectorAll('section.page').forEach(function (s) {
    s.classList.add('hidden');
  });
  var el = document.getElementById('page-' + name);
  if (el) el.classList.remove('hidden');
  window.scrollTo(0, 0);
}

/* Toast 提示 */
function toast(msg, ok) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (ok ? ' ok' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(function () { t.classList.add('hidden'); }, 2200);
}

/* 全部脚本加载完毕后初始化 */
document.addEventListener('DOMContentLoaded', function () {
  window.APP.form.init();
  window.APP.canvas.init();
  window.APP.mainBind();
});

window.APP.mainBind = function () {
  var btnStart = document.getElementById('btn-start');
  if (btnStart) btnStart.addEventListener('click', function () { showPage('form'); });

  var btnRepick = document.getElementById('btn-repick');
  if (btnRepick) btnRepick.addEventListener('click', function () { showPage('form'); });

  var btnRecast = document.getElementById('btn-recast');
  if (btnRecast) btnRecast.addEventListener('click', function () {
    // 换一种算法：保留输入，重新摇六爻
    if (!window.APP.lastFormData) { toast('请先完成一次占卜'); return; }
    window.APP.divinate(window.APP.lastFormData, true);
  });

  // 结果标签切换
  var tabs = document.querySelectorAll('#result-tabs .tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var name = tab.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.add('hidden'); });
      var target = document.getElementById('tab-' + name);
      if (target) target.classList.remove('hidden');
    });
  });

  // 开始页 Canvas 背景动画
  window.APP.canvas.startLoop();
};
