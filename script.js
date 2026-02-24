/* ===================================================================
   EVOLUTION OF AHMET CAGATAY — Portfolio JS
   Era detection, parallax, scroll progress, nav adaptation
   =================================================================== */

(function () {
  'use strict';

  var nav = document.getElementById('mainNav');
  var scrollProgress = document.getElementById('scrollProgress');
  var eraIndicator = document.getElementById('eraIndicator');
  var eraDots = eraIndicator.querySelectorAll('.era-dot');
  var eras = document.querySelectorAll('.era');
  var fadeEls = document.querySelectorAll('.fade-in');
  var hamburger = document.querySelector('.nav-hamburger');
  var navLinks = document.querySelector('.nav-links');

  var currentEra = 'ancient';
  var isMobile = window.innerWidth <= 768;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===== Era Detection =====
  if ('IntersectionObserver' in window) {
    var eraObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.15) {
          var era = entry.target.dataset.era;
          if (era && era !== currentEra) {
            currentEra = era;
            updateEra(era);
          }
        }
      });
    }, {
      threshold: [0.15, 0.5],
      rootMargin: '-56px 0px 0px 0px'
    });

    eras.forEach(function (el) { eraObserver.observe(el); });
  }

  function updateEra(era) {
    nav.setAttribute('data-era', era);
    eraDots.forEach(function (dot) {
      dot.classList.toggle('active', dot.dataset.era === era);
    });
  }

  // ===== Scroll Progress =====
  function updateScrollProgress() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress.style.width = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + '%';
  }

  // ===== Fade-in =====
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    var fadeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          fadeObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    fadeEls.forEach(function (el) { fadeObserver.observe(el); });
  } else {
    fadeEls.forEach(function (el) { el.classList.add('visible'); });
  }

  // ===== Parallax (Medieval) =====
  var medievalSection = document.getElementById('era-medieval');
  var parallaxLayers = medievalSection ? medievalSection.querySelectorAll('.parallax-layer') : [];
  var ticking = false;

  function updateParallax() {
    if (isMobile || prefersReducedMotion || !medievalSection) return;
    var rect = medievalSection.getBoundingClientRect();
    var viewH = window.innerHeight;
    if (rect.bottom < 0 || rect.top > viewH) return;

    var progress = (viewH - rect.top) / (viewH + rect.height);
    parallaxLayers.forEach(function (layer) {
      var speed = parseFloat(layer.dataset.speed) || 0;
      layer.style.transform = 'translateY(' + ((progress - 0.5) * speed * 300) + 'px)';
    });
  }

  // ===== Scroll Handler =====
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(function () {
        updateScrollProgress();
        updateParallax();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  updateScrollProgress();

  // ===== Mobile Nav =====
  hamburger.addEventListener('click', function () {
    var isOpen = navLinks.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  navLinks.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      navLinks.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  // ===== Resize =====
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      isMobile = window.innerWidth <= 768;
      if (isMobile) {
        parallaxLayers.forEach(function (l) { l.style.transform = ''; });
      }
    }, 200);
  });

  // ===== Smooth Scroll =====
  function smoothTo(target) {
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    navLinks.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }

  eraDots.forEach(function (dot) {
    dot.addEventListener('click', function (e) {
      e.preventDefault();
      smoothTo(document.querySelector(this.getAttribute('href')));
    });
  });

  navLinks.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      smoothTo(document.querySelector(this.getAttribute('href')));
    });
  });

})();
