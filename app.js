/**
 * InsurePro – mobile app page (app.html)
 * -------------------------------------------------------------
 * Handles the install flow:
 *   • captures `beforeinstallprompt` (Chrome / Edge / Samsung)
 *   • recognises an already-installed (standalone) app
 *   • iOS has no prompt API → shows the Share → Add to Home Screen guide
 *   • copy-to-clipboard for the download link
 */
(function () {
  'use strict';

  var deferredPrompt = null;
  var toastTimer = null;

  function $(selector, context) {
    return (context || document).querySelector(selector);
  }

  function $$(selector, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  }

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.navigator.standalone === true
    );
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  }

  /* ---------------- Toast ---------------- */
  function toast(message) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    requestAnimationFrame(function () { el.classList.add('is-show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('is-show');
      setTimeout(function () { el.hidden = true; }, 260);
    }, 3200);
  }

  /* ---------------- Installed state ---------------- */
  function reflectInstalledState() {
    var installed = isStandalone();
    var banner = $('#app-installed');
    if (banner) banner.hidden = !installed;

    $$('[data-install]').forEach(function (button) {
      if (installed) {
        button.textContent = 'App installed — open it';
      }
    });
  }

  /* ---------------- Install flow ---------------- */
  function triggerInstall() {
    if (isStandalone()) {
      toast('InsurePro is already installed on this device.');
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (choice) {
        if (choice.outcome === 'accepted') {
          toast('Installing InsurePro… look for it on your home screen.');
        }
        deferredPrompt = null;
      });
      return;
    }

    // No install prompt available (Firefox, iOS Safari, older browsers).
    var guide = $('#download');
    if (guide) guide.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast(
      isIOS()
        ? 'On iPhone: tap Share → Add to Home Screen.'
        : 'Use your browser menu → Add to Home screen, then confirm.'
    );
  }

  /* ---------------- Wire-up ---------------- */
  function init() {
    var heroInstall = $('#btn-install');
    if (heroInstall) heroInstall.addEventListener('click', triggerInstall);

    $$('[data-install]').forEach(function (button) {
      button.addEventListener('click', triggerInstall);
    });

    var openApp = $('[data-open-app]');
    if (openApp) {
      openApp.addEventListener('click', function () {
        // Navigating to the start URL inside the installed scope opens the app.
        window.location.href = 'index.html?source=pwa';
      });
    }

    var copyBtn = $('#btn-copy-link');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var link = window.location.href.split('#')[0];
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(link).then(
            function () { toast('Download link copied to clipboard.'); },
            function () { toast(link); }
          );
        } else {
          toast(link);
        }
      });
    }

    window.addEventListener('beforeinstallprompt', function (event) {
      event.preventDefault();
      deferredPrompt = event;
      var btn = $('#btn-install');
      if (btn) btn.classList.add('is-ready');
    });

    window.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      reflectInstalledState();
      toast('InsurePro was installed successfully.');
    });

    reflectInstalledState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
