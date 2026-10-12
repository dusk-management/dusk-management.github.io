// 화면 캡처 유출 방지용 워터마크(2026-10-12, 새 포털 components/Watermark.tsx와 동일 동작).
// 접속 IP + 시각을 옅은 대각선 반복 패턴으로 깔되, 숫자 가독성을 위해 평소엔 숨기고
// 캡처 시도로 보이는 순간(PrintScreen/Win·Cmd 키, 창 포커스 잃음, 인쇄)에만 표시한다.
// 웹은 스크린샷 자체를 감지할 수 없어 휴리스틱 기반 부분 방어다(폰 촬영 등은 못 막음).
(function () {
  if (window.__duskWatermark) return;
  window.__duskWatermark = true;

  var HIDE_AFTER_KEY_MS = 4000;
  var ip = '';
  var el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;background-repeat:repeat;opacity:0';

  function pattern(text) {
    var escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='360' height='220'><text x='0' y='120' font-size='13' font-family='sans-serif' fill='rgba(0,0,0,0.055)' transform='rotate(-28 180 110)'>" + escaped + '</text></svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }

  function render() {
    var stamp = new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    el.style.backgroundImage = pattern((ip || 'IP 확인 중') + ' · ' + stamp);
  }

  var hideTimer = null;
  function setVisible(v) { el.style.opacity = v ? '1' : '0'; }
  function showTemporarily() {
    setVisible(true);
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { if (document.hasFocus()) setVisible(false); }, HIDE_AFTER_KEY_MS);
  }
  function onFocus() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { setVisible(false); }, 600);
  }

  window.addEventListener('keydown', function (e) {
    if (e.key === 'PrintScreen' || e.key === 'Meta' || (e.metaKey && e.shiftKey)) showTemporarily();
  }, true);
  window.addEventListener('keyup', function (e) { if (e.key === 'PrintScreen') showTemporarily(); }, true);
  window.addEventListener('blur', function () { setVisible(true); });
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') setVisible(true); else onFocus();
  });
  window.addEventListener('beforeprint', function () { setVisible(true); });
  window.addEventListener('afterprint', function () { setVisible(false); });

  function mount() {
    render();
    document.body.appendChild(el);
    setInterval(render, 60000);
    fetch('/__ip', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.ip) { ip = d.ip; render(); } })
      .catch(function () {});
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
