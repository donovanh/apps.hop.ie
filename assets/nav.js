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
})();
