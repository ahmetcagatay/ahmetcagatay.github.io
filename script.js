// Theme Toggle
(function () {
  const toggle = document.querySelector('.theme-toggle');
  const root = document.documentElement;

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    updateIcon(theme === 'system' ? getSystemTheme() : theme);
  }

  function updateIcon(resolved) {
    toggle.textContent = resolved === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
    toggle.setAttribute('aria-label', resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  // Init
  var saved = localStorage.getItem('theme');
  applyTheme(saved || 'system');

  toggle.addEventListener('click', function () {
    var current = localStorage.getItem('theme') || 'system';
    var resolved = current === 'system' ? getSystemTheme() : current;
    var next = resolved === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
  });

  // Listen for system changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
    if (!localStorage.getItem('theme') || localStorage.getItem('theme') === 'system') {
      applyTheme('system');
    }
  });
})();

// Mobile Nav
(function () {
  var hamburger = document.querySelector('.nav-hamburger');
  var links = document.querySelector('.nav-links');

  hamburger.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', open);
  });

  // Close on link click
  links.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      links.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
})();

// Scroll Observer — fade-in sections
(function () {
  var els = document.querySelectorAll('.fade-in');
  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('visible'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  els.forEach(function (el) { observer.observe(el); });
})();
