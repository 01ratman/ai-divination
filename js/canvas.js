/* ============================================================
 * canvas.js — 开始页背景动画 + 摇卦推演动画 + 五行环图
 * ============================================================ */

window.APP = window.APP || {};
window.APP.canvas = (function () {
  'use strict';

  var bgCanvas, bgCtx, rafId = null, stars = [];
  var animCtx = null;
  var currentAnim = null;

  function init() {
    bgCanvas = document.getElementById('start-canvas');
    if (bgCanvas) bgCtx = bgCanvas.getContext('2d');
  }

  /* ---- 开始页太极/星空背景 ---- */
  function initStars() {
    var w = 220, h = 220;
    stars = [];
    for (var i = 0; i < 40; i++) {
      stars.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.5 + 0.3, a: Math.random() * 0.6 + 0.2 });
    }
  }
  function drawTaiji(ctx, w, h, t) {
    ctx.clearRect(0, 0, w, h);
    // 星空
    stars.forEach(function (s) {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,' + s.a + ')';
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    // 太极
    var cx = w / 2, cy = h / 2, r = 70;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t / 1000);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(212,175,95,0.9)';
    // 阴阳鱼
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -r / 2, r / 2, 0, Math.PI);
    ctx.arc(0, r / 2, r / 2, Math.PI, 0);
    ctx.fillStyle = 'rgba(212,175,95,0.15)';
    ctx.fill();
    // 阴阳点
    ctx.beginPath(); ctx.arc(0, -r / 2, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212,175,95,0.9)'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, r / 2, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#0b1020'; ctx.fill();
    ctx.restore();
  }

  function startLoop() {
    if (!bgCtx) return;
    initStars();
    if (rafId) cancelAnimationFrame(rafId);
    var last = 0;
    function step(ts) {
      drawTaiji(bgCtx, 220, 220, ts);
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  /* ---- 推演动画：六爻摇卦 ---- */
  /* 返回 Promise，完成后 resolve({lines}) */
  function playCasting(canvas, onText, skipBtn) {
    animCtx = canvas.getContext('2d');
    var w = canvas.width = canvas.clientWidth || window.innerWidth;
    var h = canvas.height = canvas.clientHeight || window.innerHeight;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    return new Promise(function (resolve) {
      var lines = [];
      var idx = 0;
      var frames = 0;
      var skipped = false;

      function doSkip() { if (!skipped) { skipped = true; resolve({ lines: lines, skipped: true }); } }
      if (skipBtn) { skipBtn.style.display = 'inline-block'; skipBtn.onclick = doSkip; }

      function drawBackdrop() {
        animCtx.fillStyle = '#0b1020';
        animCtx.fillRect(0, 0, w, h);
        // 八卦圈
        animCtx.strokeStyle = 'rgba(212,175,95,0.15)';
        animCtx.lineWidth = 1;
        animCtx.beginPath();
        animCtx.arc(w / 2, h / 2, Math.min(w, h) * 0.36, 0, Math.PI * 2);
        animCtx.stroke();
      }

      function drawLine(i, type) {
        var y = h / 2 + (i - 2.5) * 46;
        animCtx.strokeStyle = 'rgba(212,175,95,0.95)';
        animCtx.lineWidth = 14;
        animCtx.lineCap = 'round';
        if (type === 'youngYang' || type === 'oldYang') {
          animCtx.beginPath();
          animCtx.moveTo(w / 2 - 40, y); animCtx.lineTo(w / 2 + 40, y);
          animCtx.stroke();
          if (type === 'oldYang') { markVar(y); }
        } else {
          animCtx.beginPath();
          animCtx.moveTo(w / 2 - 40, y); animCtx.lineTo(w / 2 - 12, y);
          animCtx.moveTo(w / 2 + 12, y); animCtx.lineTo(w / 2 + 40, y);
          animCtx.stroke();
          if (type === 'oldYin') { markVar(y); }
        }
      }
      function markVar(y) {
        animCtx.fillStyle = '#e0706a';
        animCtx.beginPath();
        animCtx.arc(w / 2, y, 6, 0, Math.PI * 2);
        animCtx.fill();
      }

      function castOne() {
        var backs = 0;
        for (var c = 0; c < 3; c++) backs += (Math.random() < 0.5 ? 1 : 0);
        var type;
        if (backs === 3) type = 'oldYang';
        else if (backs === 2) type = 'youngYang';
        else if (backs === 1) type = 'youngYin';
        else type = 'oldYin';
        return type;
      }

      function loop() {
        if (skipped) return;
        drawBackdrop();
        // 已画爻
        for (var i = 0; i < lines.length; i++) drawLine(i, lines[i]);
        // 摇动中的铜钱
        if (idx < 6) {
          var t = frames % 40;
          var type = castOne();
          if (t === 39) {
            lines.push(type);
            idx++;
            if (onText) onText('第 ' + idx + ' 爻 …');
            frames = 0;
          } else {
            if (onText) onText('摇动铜钱…');
            frames++;
          }
        } else {
          if (onText) onText('卦象已成');
          if (skipBtn) skipBtn.style.display = 'none';
          resolve({ lines: lines, skipped: false });
          return;
        }
        requestAnimationFrame(loop);
      }
      loop();
    });
  }

  return { init: init, startLoop: startLoop, playCasting: playCasting };
})();
