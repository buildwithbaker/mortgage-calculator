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

  /* --- Offline signal --- */
  window.addEventListener('offline', function () {
    say('Offline - the calculator keeps working.');
  });
}());
