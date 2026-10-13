/* Keko's Home - Windows 98 behaviour: theme, minimize/maximize/close, Start menu, clock */
(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };

  var win = $('win'), task = $('task'), icon = $('desktop-icon'),
      btnMin = $('btn-min'), btnMax = $('btn-max'), btnClose = $('btn-close'),
      start = $('start'), menu = $('startmenu'),
      clock = $('clock'), off = $('shutdown-screen');

  /* ---------- theme ---------- */
  function currentTheme() { return root.dataset.theme === 'light' ? 'light' : 'dark'; }
  function paintTheme() {
    var next = currentTheme() === 'dark' ? 'Light' : 'Dark';
    document.querySelectorAll('[data-theme-toggle] .tlabel').forEach(function (el) {
      el.textContent = next + ' mode';
    });
  }
  function setTheme(t) {
    root.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch (e) {}
    paintTheme();
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
      closeMenu();
    });
  });
  paintTheme();

  /* ---------- window: minimize / maximize / close ---------- */
  function minimize() {
    win.classList.add('is-hidden');
    task.classList.remove('active');
  }
  function restore() {
    win.classList.remove('is-hidden');
    task.hidden = false;
    task.classList.add('active');
    icon.hidden = true;
  }
  function closeWin() {
    minimize();
    task.hidden = true;
    icon.hidden = false;
  }
  function toggleMax() {
    var m = win.classList.toggle('max');
    btnMax.innerHTML = m ? '&#10064;' : '&#9633;';
    btnMax.title = m ? 'Restore' : 'Maximize';
  }
  btnMin.addEventListener('click', minimize);
  btnMax.addEventListener('click', toggleMax);
  btnClose.addEventListener('click', closeWin);
  $('titlebar').addEventListener('dblclick', function (e) {
    if (!e.target.closest('.tbtns')) toggleMax();
  });
  task.addEventListener('click', function () {
    if (win.classList.contains('is-hidden')) restore(); else minimize();
    closeMenu();
  });
  icon.addEventListener('click', restore);

  /* ---------- Start menu ---------- */
  function openMenu() {
    menu.hidden = false;
    start.classList.add('pressed');
    start.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    menu.hidden = true;
    start.classList.remove('pressed');
    start.setAttribute('aria-expanded', 'false');
  }
  start.addEventListener('click', function (e) {
    e.stopPropagation();
    if (menu.hidden) openMenu(); else closeMenu();
  });
  document.addEventListener('click', function (e) {
    if (!menu.hidden && !menu.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  // jump links: bring the window back first, then scroll to the section
  document.querySelectorAll('[data-jump]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      closeMenu();
      restore();
      var target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ block: 'start' });
    });
  });

  /* ---------- shut down ---------- */
  $('shutdown').addEventListener('click', function () {
    closeMenu();
    off.hidden = false;
    off.focus();
  });
  function wake() { off.hidden = true; }
  off.addEventListener('click', wake);
  off.addEventListener('keydown', wake);

  /* ---------- clock ---------- */
  function tick() {
    clock.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  tick();
  setInterval(tick, 15000);
})();
