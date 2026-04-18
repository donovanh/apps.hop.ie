(function () {
  var toggle = document.querySelector('.nav-toggle');
  var overlay = document.querySelector('.nav-overlay');
  var closeBtn = document.querySelector('.nav-drawer-close');
  var links = document.querySelectorAll('.nav-drawer-links a');

  function openNav() { document.body.classList.add('nav-open'); }
  function closeNav() { document.body.classList.remove('nav-open'); }

  if (toggle) toggle.addEventListener('click', openNav);
  if (overlay) overlay.addEventListener('click', closeNav);
  if (closeBtn) closeBtn.addEventListener('click', closeNav);
  links.forEach(function (a) { a.addEventListener('click', closeNav); });

  // ── Style toggle ──
  var root = document.getElementById('lt-root');
  var styleBtns = document.querySelectorAll('.style-btn');
  var manualOverride = false;

  function getAutoStyle() {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches)  return 'terminal';
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'receipt';
    // No system preference: time-based fallback
    var h = new Date().getHours();
    return (h >= 20 || h < 9) ? 'terminal' : 'receipt';
  }

  function applyStyle(val) {
    if (!root) return;
    root.dataset.style = val;
    styleBtns.forEach(function (b) {
      b.classList.toggle('on', b.dataset.styleVal === val);
    });
  }

  // Initial application
  applyStyle(getAutoStyle());

  // Follow system preference changes (unless user has manually overridden)
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (!manualOverride) applyStyle(getAutoStyle());
    });
  } catch (e) {}

  // Manual toggle — overrides auto for this session
  styleBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      manualOverride = true;
      applyStyle(b.dataset.styleVal);
    });
  });
})();
