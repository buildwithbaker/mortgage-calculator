/* PWA shell: service-worker registration + install prompt.
   Kept in its own file because the page ships a strict CSP with
   script-src 'self' (no 'unsafe-inline'), so no inline <script> is allowed. */
(function () {
  'use strict';

  var toast = document.getElementById('appToast');

  function say(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    window.setTimeout(function () { toast.hidden = true; }, 4000);
  }

  /* --- Service worker --- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) {
        // Offline support is a nice-to-have; the calculator works without it.
        console.warn('SW registration failed:', err);
      });
    });
  }

  /* --- Install prompt --- */
  var deferredPrompt = null;
  var installBtn = document.getElementById('installBtn');

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.hidden = false;
  });

  if (installBtn) {
    installBtn.addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () {
        deferredPrompt = null;
        installBtn.hidden = true;
      });
    });
  }

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    if (installBtn) installBtn.hidden = true;
    say('Installed. It works offline now.');
  });

  /* --- Theme toggle ---
     css/styles.css carries the whole html[data-theme="dark"] palette but the
     parent site drives it from js/nav.js, which this app doesn't ship. Ported
     here (minus the hamburger) so dark mode still works standalone. */
  var root = document.documentElement;
  var THEME_KEY = 'bwb-theme';
  var MOON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
  var SUN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';

  var themeBtn = document.createElement('button');
  themeBtn.className = 'theme-toggle theme-toggle-footer';
  themeBtn.type = 'button';

  function applyTheme(mode) {
    root.setAttribute('data-theme', mode);
    themeBtn.innerHTML = mode === 'dark' ? SUN : MOON;
    themeBtn.setAttribute('aria-label', mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    var meta = document.querySelector('meta[name="theme-color"]');
    // Dark value matches --color-bg in css/styles.css so the browser chrome
    // blends with the page instead of showing the light-mode indigo.
    if (meta) meta.setAttribute('content', mode === 'dark' ? '#0F1626' : '#2B4A8B');
    try { localStorage.setItem(THEME_KEY, mode); } catch (e) { /* private mode */ }
  }

  themeBtn.addEventListener('click', function () {
    applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  var footerLinks = document.querySelector('.footer-links');
  if (footerLinks) footerLinks.appendChild(themeBtn);

  var saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* private mode */ }
  applyTheme(saved || 'light');

  /* --- Payment strip (phones only) ---
     Below 760px the results card stacks under the inputs, about a screen below the
     price box, so a change to the price moved a number nobody could see. This strip
     mirrors the monthly payment and the front-end ratio at the foot of the screen
     while the results card is out of view. It only copies text the calculator has
     already written, so css/ and js/mortgage-calculator.js stay byte-identical to the
     buildwithbaker copies. aria-hidden: the results card is already a live region. */
  var results = document.querySelector('.mc .results');
  var pitiOut = document.getElementById('piti');
  var feOut = document.getElementById('fePct');
  var fePill = document.getElementById('fePill');
  if (results && pitiOut && feOut && fePill) {
    var strip = document.createElement('div');
    strip.className = 'mc-peek';
    strip.setAttribute('aria-hidden', 'true');
    strip.hidden = true;
    var stripPay = document.createElement('span');
    stripPay.className = 'mc-peek-pay';
    var stripRatio = document.createElement('span');
    stripRatio.className = 'mc-peek-ratio';
    strip.appendChild(stripPay);
    strip.appendChild(stripRatio);
    document.body.appendChild(strip);

    var fillStrip = function () {
      stripPay.textContent = pitiOut.textContent + '/mo';
      stripRatio.textContent = 'Front-end ' + feOut.textContent + ' ' + fePill.textContent;
    };
    fillStrip();
    var watch = new MutationObserver(fillStrip);
    [pitiOut, feOut, fePill].forEach(function (el) {
      watch.observe(el, { childList: true, characterData: true, subtree: true });
    });

    var narrow = window.matchMedia('(max-width: 760px)');
    var resultsVisible = true;
    var setStrip = function () {
      var show = narrow.matches && !resultsVisible;
      strip.hidden = !show;
      document.body.classList.toggle('has-peek', show);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        resultsVisible = entries[0].isIntersecting;
        setStrip();
      }).observe(results);
    }
    if (narrow.addEventListener) narrow.addEventListener('change', setStrip);
    setStrip();
  }

  /* --- Offline signal --- */
  window.addEventListener('offline', function () {
    say('Offline - the calculator keeps working.');
  });
}());
