/**
 * InsurePro – front-end interactions
 * -------------------------------------------------------------
 * Vanilla JavaScript (ES6), no external dependencies.
 *
 * Modules:
 *   1. Sticky header          – shadow once the page is scrolled
 *   2. Mobile navigation      – accessible hamburger menu
 *   3. Smooth in-page scrolling – with sticky-header offset
 *   4. Active section links   – highlights the current nav item
 *   5. Scroll-reveal          – fade/slide-in via IntersectionObserver
 *   6. Animated counters      – count-up when they enter the viewport
 *   7. Quote form             – inline email validation + feedback
 *   8. Footer year            – keeps the copyright year current
 *
 * Accessibility notes:
 *   - Respects `prefers-reduced-motion`
 *   - All interactive elements keep proper ARIA state
 *   - Animation enhancements only apply when the `js` class is present
 */

(function () {
  'use strict';

  /* ---------------------------------------------------------------
   * Configuration
   * ------------------------------------------------------------- */
  const CONFIG = {
    headerOffset: 140,     // px from top used to pick the active section
    counterDuration: 1600, // ms for count-up animations
    revealStagger: 90,     // ms delay between sibling reveal items
    revealThreshold: 0.15, // viewport ratio required to reveal an element
    mobileBreakpoint: 992, // px – below this the mobile menu takes over
  };

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---------------------------------------------------------------
   * Utilities
   * ------------------------------------------------------------- */
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Coalesces rapid events (scroll, resize) into one rAF call. */
  const rafThrottle = (callback) => {
    let queued = false;
    return (...args) => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        callback(...args);
      });
    };
  };

  /** Delays execution until calls have stopped for `wait` ms. */
  const debounce = (callback, wait) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => callback(...args), wait);
    };
  };

  const headerHeight = () => $('header')?.offsetHeight ?? 0;

  /* ---------------------------------------------------------------
   * 1. Sticky header
   * ------------------------------------------------------------- */
  function initStickyHeader() {
    const header = $('header');
    if (!header) return;

    const update = () => header.classList.toggle('is-scrolled', window.scrollY > 10);

    update();
    window.addEventListener('scroll', rafThrottle(update), { passive: true });
  }

  /* ---------------------------------------------------------------
   * 2. Mobile navigation
   * ------------------------------------------------------------- */
  function initMobileNav() {
    const toggle = $('#nav-toggle');
    const menu = $('#nav-menu');
    if (!toggle || !menu) return;
    const backdrop = $('#nav-backdrop');

    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      toggle.classList.toggle('is-active', open);
      menu.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);

      if (backdrop) {
        backdrop.hidden = !open;
        backdrop.classList.toggle('is-open', open);
      }

      // Collapse any submenu that was left open in the drawer.
      if (!open) {
        $$('.has-dropdown.is-open', menu).forEach((li) => li.classList.remove('is-open'));
      }
    };

    toggle.addEventListener('click', () => setOpen(!isOpen()));

    // Tapping the scrim closes the drawer.
    if (backdrop) backdrop.addEventListener('click', () => setOpen(false));

    // Close after choosing a destination (a suppressed first tap on a
    // submenu parent keeps the drawer open so the submenu can expand).
    menu.addEventListener('click', (event) => {
      if (event.defaultPrevented) return;
      if (event.target.closest('a')) setOpen(false);
    });

    // Close on Escape and return focus to the trigger.
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Reset state when switching back to the desktop layout.
    window.addEventListener(
      'resize',
      debounce(() => {
        if (window.innerWidth > CONFIG.mobileBreakpoint) setOpen(false);
      }, 150)
    );
  }

  /* ---------------------------------------------------------------
   * 2b. Mobile submenus — tap once to expand, tap again to follow
   * ------------------------------------------------------------- */
  function initMobileDropdowns() {
    const items = $$('.has-dropdown');
    if (!items.length) return;

    items.forEach((item) => {
      const link = item.querySelector(':scope > a');
      if (!link) return;

      link.addEventListener('click', (event) => {
        if (window.innerWidth > CONFIG.mobileBreakpoint) return; // desktop: hover handles it

        // First tap reveals the submenu, second tap follows the link.
        if (!item.classList.contains('is-open')) {
          event.preventDefault();
          items.forEach((other) => {
            if (other !== item) other.classList.remove('is-open');
          });
          item.classList.add('is-open');
        }
      });
    });

    // Reset expanded state when returning to the desktop layout.
    window.addEventListener(
      'resize',
      debounce(() => {
        if (window.innerWidth > CONFIG.mobileBreakpoint) {
          items.forEach((item) => item.classList.remove('is-open'));
        }
      }, 150)
    );
  }

  /* ---------------------------------------------------------------
   * 2c. Service worker — powers the installable mobile app
   * ------------------------------------------------------------- */
  function initServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(window.location.protocol)) return; // file:// has no SW

    navigator.serviceWorker.register('sw.js').catch(() => {
      /* offline support unavailable — the site still works normally */
    });
  }

  /* ---------------------------------------------------------------
   * 3. Smooth in-page scrolling
   * ------------------------------------------------------------- */
  function initSmoothScroll() {
    document.addEventListener('click', (event) => {
      const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
      if (!link) return;

      const hash = link.getAttribute('href');
      if (!hash || hash === '#') return;
      if (event.defaultPrevented) return; // mobile submenu expansion took priority

      const target = document.getElementById(hash.slice(1));
      if (!target) return;

      event.preventDefault();

      const top = Math.max(
        target.getBoundingClientRect().top + window.scrollY - headerHeight() - 8,
        0
      );

      window.scrollTo({
        top,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });

      // Keep the URL meaningful and move keyboard focus to the section.
      history.replaceState(null, '', hash);
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }

  /* ---------------------------------------------------------------
   * 4. Active section highlighting
   * ------------------------------------------------------------- */
  function initActiveNavLinks() {
    const entries = $$('.nav-links a[href^="#"]')
      .map((link) => ({
        link,
        section: document.getElementById(link.getAttribute('href').slice(1)),
      }))
      .filter(({ section }) => Boolean(section));

    if (!entries.length) return;

    const setActive = (id) => {
      entries.forEach(({ link, section }) => {
        const active = section.id === id;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    };

    const update = () => {
      const marker = window.scrollY + CONFIG.headerOffset;
      let currentId = entries[0].section.id;

      entries.forEach(({ section }) => {
        if (section.offsetTop <= marker) currentId = section.id;
      });

      setActive(currentId);
    };

    update();
    window.addEventListener('scroll', rafThrottle(update), { passive: true });
    window.addEventListener('resize', debounce(update, 150));
  }

  /* ---------------------------------------------------------------
   * 5. Scroll-reveal animations
   * ------------------------------------------------------------- */
  function initRevealOnScroll() {
    const items = $$('[data-reveal]');
    if (!items.length) return;

    const show = (element) => element.classList.add('is-visible');

    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      items.forEach(show);
      return;
    }

    // Stagger elements that share the same parent for a cascading effect.
    items.forEach((element) => {
      const siblings = Array.from(element.parentElement.children).filter((node) =>
        node.hasAttribute('data-reveal')
      );
      element.style.transitionDelay = `${siblings.indexOf(element) * CONFIG.revealStagger}ms`;
    });

    const observer = new IntersectionObserver(
      (observed, instance) => {
        observed.forEach((entry) => {
          if (!entry.isIntersecting) return;
          show(entry.target);
          instance.unobserve(entry.target);
        });
      },
      { threshold: CONFIG.revealThreshold, rootMargin: '0px 0px -50px 0px' }
    );

    items.forEach((element) => observer.observe(element));

    /* Fail-safe: never leave content hidden if IntersectionObserver callbacks
     * are starved (headless capture, background tabs, restricted webviews).
     * Anything currently on screen is revealed on the next frame, then
     * re-checked on load and on a short timer while the page settles. */
    const revealOnScreen = () => {
      items.forEach((element) => {
        if (element.classList.contains('is-visible')) return;
        const box = element.getBoundingClientRect();
        if (box.top < window.innerHeight && box.bottom > 0) show(element);
      });
    };

    requestAnimationFrame(revealOnScreen);
    window.addEventListener('load', revealOnScreen, { once: true });

    let guardTicks = 0;
    const guard = window.setInterval(() => {
      revealOnScreen();
      if (++guardTicks >= 30) window.clearInterval(guard);
    }, 400);
  }

  /* ---------------------------------------------------------------
   * 6. Animated counters
   * ------------------------------------------------------------- */
  function initCounters() {
    const counters = $$('[data-count]');
    if (!counters.length) return;

    const format = (value, suffix) => {
      const number = Math.round(value);
      if (number >= 1e6) return `${+(number / 1e6).toFixed(1)}M${suffix}`;
      if (number >= 1e3) return `${+(number / 1e3).toFixed(1)}K${suffix}`;
      return `${number}${suffix}`;
    };

    const run = (element) => {
      const target = Number(element.dataset.count);
      const suffix = element.dataset.suffix || '';
      if (!Number.isFinite(target)) return;

      if (prefersReducedMotion()) {
        element.textContent = format(target, suffix);
        return;
      }

      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - start) / CONFIG.counterDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 4); // ease-out quart
        element.textContent = format(target * eased, suffix);
        if (progress < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) {
      counters.forEach(run);
      return;
    }

    const observer = new IntersectionObserver(
      (observed, instance) => {
        observed.forEach((entry) => {
          if (!entry.isIntersecting) return;
          run(entry.target);
          instance.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((element) => observer.observe(element));
  }

  /* ---------------------------------------------------------------
   * 7. Quote form validation
   * ------------------------------------------------------------- */
  function initQuoteForm() {
    const form = $('#quote-form');
    if (!form) return;

    const input = $('#quote-email', form);
    const status = $('#quote-status', form);
    if (!input || !status) return;

    const setStatus = (message, type) => {
      status.textContent = message;
      status.className = `form-status${type ? ` is-${type}` : ''}`;
      status.hidden = Boolean(!message);
    };

    const invalidate = (message) => {
      input.setAttribute('aria-invalid', 'true');
      setStatus(message, 'error');
      input.focus();
    };

    // Clear the error as soon as the user starts correcting it.
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') {
        input.removeAttribute('aria-invalid');
        setStatus('', '');
      }
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const email = input.value.trim();

      if (!email) {
        invalidate('Please enter your email address to continue.');
        return;
      }

      if (!EMAIL_PATTERN.test(email)) {
        invalidate('That email address looks invalid. Please check and try again.');
        return;
      }

      // ZIP code (merged hero quote card) — optional, but must be a valid 5-digit US ZIP.
      const zipInput = form.querySelector('[name="zip"]');
      if (zipInput) {
        const zip = zipInput.value.trim();
        if (!/^\d{5}$/.test(zip)) {
          zipInput.setAttribute('aria-invalid', 'true');
          setStatus('Please enter a valid 5-digit ZIP code so we can price your area.', 'error');
          zipInput.focus();
          return;
        }
        zipInput.removeAttribute('aria-invalid');
      }

      input.removeAttribute('aria-invalid');
      setStatus(`Thanks! We'll send your personalized quotes to ${email}.`, 'success');
      openQuoteModal(email, form);
      form.reset();
    });
  }

  /* ---------------------------------------------------------------
   * 7b. Quote print modal — pops up after a quote is "emailed"
   * ------------------------------------------------------------- */
  const QUOTE_CATALOG = {
    auto:    { plans: ['State minimum', 'Full coverage', 'Full coverage + gap'], base: 82,  spread: 46 },
    home:    { plans: ['Dwelling only', 'Home + contents', 'Premier bundle'],    base: 96,  spread: 58 },
    health:  { plans: ['Bronze HMO', 'Silver PPO', 'Gold PPO + dental'],         base: 214, spread: 120 },
    life:    { plans: ['10-year term', '20-year term', 'Whole life'],            base: 28,  spread: 34 },
    renters: { plans: ['Core', 'Core + liability', 'Premier'],                   base: 16,  spread: 14 },
    business: { plans: ['General liability', 'GL + property', 'Business owner policy'], base: 74, spread: 66 }
  };

  function buildQuoteLines(coverage) {
    const cfg = QUOTE_CATALOG[coverage] || QUOTE_CATALOG.auto;
    const carriers = ['BlueShield Mutual', 'Harbor Point', 'Everline Assurance'];
    const seed = 0.9 + Math.random() * 0.25;
    return carriers.map((carrier, i) => {
      const monthly = Math.round((cfg.base + cfg.spread * (i * 0.55 + Math.random() * 0.3)) * seed);
      return { carrier, plan: cfg.plans[i], monthly };
    }).sort((a, b) => a.monthly - b.monthly);
  }

  function openQuoteModal(email, form) {
    const modal = $('#quote-modal');
    if (!modal) return;

    const coverage = (form.querySelector('[name="coverage"]') || {}).value || 'auto';
    const zip = (form.querySelector('[name="zip"]') || {}).value || '';
    const lines = buildQuoteLines(coverage);

    const coverageLabel = (form.querySelector('[name="coverage"] option:checked') || {}).textContent || 'Insurance';
    $('#quote-modal-sub').textContent =
      `${coverageLabel} · ZIP ${zip || '—'} · estimated rates from 3 licensed carriers`;
    $('#quote-sent-text').textContent = `A copy of these quotes has been sent to ${email}.`;

    $('#quote-lines').innerHTML = lines.map((q) => `
      <div class="quote-line">
        <div>
          <div class="carrier">${q.carrier}</div>
          <div class="plan">${q.plan}</div>
        </div>
        <div class="amount">$${q.monthly}<span>/mo</span></div>
      </div>`).join('');

    const annual = lines[0].monthly * 12;
    const savings = Math.max(0, Math.round((lines[lines.length - 1].monthly - lines[0].monthly) * 12));
    $('#quote-savings').textContent = `$${savings.toLocaleString()} / yr`;
    $('#quote-modal-title').textContent = `Your quotes start at $${lines[0].monthly}/mo`;
    modal.dataset.annual = String(annual);

    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    $('#quote-modal-close').focus();
  }

  function closeQuoteModal() {
    const modal = $('#quote-modal');
    if (!modal || modal.hidden) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { modal.hidden = true; }, 250);
  }

  function initQuoteModal() {
    const modal = $('#quote-modal');
    if (!modal) return;
    $('#quote-modal-close').addEventListener('click', closeQuoteModal);
    $('#quote-done').addEventListener('click', closeQuoteModal);
    $('#quote-print').addEventListener('click', () => window.print());
    modal.addEventListener('click', (e) => { if (e.target === modal) closeQuoteModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeQuoteModal(); });
  }

  /* ---------------------------------------------------------------
   * 7c. Light / dark theme toggle
   * ------------------------------------------------------------- */
  function initThemeToggle() {
    const btn = $('#theme-toggle');
    if (!btn) return;

    const apply = (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      try { localStorage.setItem('ip-theme', theme); } catch (e) { /* private mode */ }
    };

    apply(document.documentElement.getAttribute('data-theme') || 'light');
    btn.addEventListener('click', () => {
      apply(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------------------------------------------------------------
   * 8. Footer year
   * ------------------------------------------------------------- */
  function initFooterYear() {
    const year = $('#footer-year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  /* ---------------------------------------------------------------
   * 9. Bundle savings calculator (hero of the "Bundle & save" panel)
   * ------------------------------------------------------------- */
  function initBundleCalculator() {
    const slider = $('#bundle-premium');
    if (!slider) return;

    const premiumOut = $('#premium-out');
    const savingsOut = $('#savings-out');
    const rateOut = $('#rate-out');
    const toggles = $$('.toggle-btn[data-policies]');

    const RATES = { 2: 0.21, 3: 0.25, 4: 0.28 };
    let policies = 2;

    const money = (value) => `$${Math.round(value).toLocaleString('en-US')}`;

    const render = () => {
      const premium = Number(slider.value) || 0;
      const rate = RATES[policies] ?? 0.21;
      const span = Number(slider.max) - Number(slider.min) || 1;
      const fill = ((premium - Number(slider.min)) / span) * 100;

      slider.style.setProperty('--fill', `${fill}%`);
      if (premiumOut) premiumOut.textContent = money(premium);
      if (savingsOut) savingsOut.textContent = money(premium * rate);
      if (rateOut) rateOut.textContent = `${Math.round(rate * 100)}% bundle discount`;
    };

    slider.addEventListener('input', render);

    toggles.forEach((button) => {
      button.addEventListener('click', () => {
        toggles.forEach((item) => {
          item.classList.remove('is-active');
          item.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('is-active');
        button.setAttribute('aria-pressed', 'true');
        policies = Number(button.dataset.policies) || 2;
        render();
      });
    });

    render();
  }

  /* ---------------------------------------------------------------
   * 10. Newsletter signup (footer)
   * ------------------------------------------------------------- */
  function initNewsletter() {
    const form = $('#newsletter-form');
    if (!form) return;

    const input = $('#newsletter-email', form);
    const note = $('#newsletter-note');
    if (!input) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const email = input.value.trim();

      if (!email || !EMAIL_PATTERN.test(email)) {
        if (note) note.textContent = 'Please enter a valid email address.';
        input.focus();
        return;
      }

      if (note) note.textContent = '✓ Subscribed! Look out for your first savings tip.';
      form.reset();
    });
  }

  /* ---------------------------------------------------------------
   * Bootstrap
   * ------------------------------------------------------------- */
  function init() {
    initStickyHeader();
    initMobileNav();
    initMobileDropdowns();
    initServiceWorker();
    initSmoothScroll();
    initActiveNavLinks();
    initRevealOnScroll();
    initCounters();
    initQuoteForm();
    initQuoteModal();
    initThemeToggle();
    initFooterYear();
    initBundleCalculator();
    initNewsletter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
