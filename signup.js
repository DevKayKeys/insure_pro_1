/**
 * InsurePro – sign-up wizard (signup.html)
 * -------------------------------------------------------------
 * Three-step biodata registration:
 *   1. Biodata  – name, DOB, gender, marital status, occupation
 *   2. Contact  – email, phone, address, preferred contact method
 *   3. Coverage – policy interest, who is covered, consent
 *
 * Client-side ONLY prototype: validated entries are stored in
 * localStorage (key: ip-signup-leads) and never transmitted.
 */
(function () {
  'use strict';

  var STORE_KEY = 'ip-signup-leads';
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var TOTAL_STEPS = 3;

  function $(selector, context) {
    return (context || document).querySelector(selector);
  }

  function $$(selector, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  }

  /* ----------------------------------------------------------------
   * Field helpers
   * -------------------------------------------------------------- */
  function fieldOf(input) {
    return input.closest('.field, .consent') || input.parentElement;
  }

  function setError(input, show, message) {
    var wrap = fieldOf(input);
    if (!wrap) return;

    var error = wrap.querySelector('.field-error');
    input.classList.toggle('is-invalid', show);
    input.setAttribute('aria-invalid', show ? 'true' : 'false');

    if (error) {
      if (message) error.textContent = message;
      error.hidden = !show;
    }
  }

  function clearStepErrors(panel) {
    $$('.is-invalid', panel).forEach(function (input) {
      setError(input, false);
    });
    $$('.field-error', panel).forEach(function (error) {
      error.hidden = true;
    });
  }

  /* ----------------------------------------------------------------
   * Validators
   * -------------------------------------------------------------- */
  function isAdult(dobValue) {
    if (!dobValue) return false;
    var dob = new Date(dobValue + 'T00:00:00');
    if (Number.isNaN(dob.getTime())) return false;

    var today = new Date();
    var age = today.getFullYear() - dob.getFullYear();
    var monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;

    return age >= 18 && age <= 120;
  }

  var STEP_RULES = {
    1: function (panel) {
      var ok = true;

      var required = [
        { id: '#su-first', test: function (v) { return v.length >= 2; } },
        { id: '#su-last', test: function (v) { return v.length >= 2; } },
        { id: '#su-occupation', test: function (v) { return v.length >= 2; } },
        { id: '#su-gender', test: function (v) { return v !== ''; } },
        { id: '#su-dob', test: function (v) { return isAdult(v); } }
      ];

      required.forEach(function (rule) {
        var input = $(rule.id, panel);
        if (!input) return;
        var valid = rule.test(String(input.value || '').trim());
        setError(input, !valid);
        if (!valid) ok = false;
      });

      return ok;
    },

    2: function (panel) {
      var ok = true;

      var simple = [
        { id: '#su-email', test: function (v) { return EMAIL_PATTERN.test(v); } },
        { id: '#su-phone', test: function (v) { return (v.replace(/\D/g, '').length >= 7); } },
        { id: '#su-address', test: function (v) { return v.length >= 5; } },
        { id: '#su-city', test: function (v) { return v.length >= 2; } },
        { id: '#su-state', test: function (v) { return v.length >= 2; } },
        { id: '#su-zip', test: function (v) { return /^[A-Za-z0-9][A-Za-z0-9 -]{2,9}$/.test(v); } },
        { id: '#su-country', test: function (v) { return v !== ''; } }
      ];

      simple.forEach(function (rule) {
        var input = $(rule.id, panel);
        if (!input) return;
        var valid = rule.test(String(input.value || '').trim());
        setError(input, !valid);
        if (!valid) ok = false;
      });

      return ok;
    },

    3: function (panel) {
      var ok = true;

      ['#su-coverage', '#su-beneficiaries'].forEach(function (id) {
        var input = $(id, panel);
        if (!input) return;
        var valid = input.value !== '';
        setError(input, !valid);
        if (!valid) ok = false;
      });

      var checks = [
        { id: '#su-consent' },
        { id: '#su-terms' }
      ];

      checks.forEach(function (rule) {
        var input = $(rule.id, panel);
        if (!input) return;
        var valid = input.checked;
        setError(input, !valid);
        if (!valid) ok = false;
      });

      return ok;
    }
  };

  /* ----------------------------------------------------------------
   * Reference number
   * -------------------------------------------------------------- */
  function buildReference() {
    var now = new Date();
    var stamp =
      String(now.getFullYear()).slice(-2) +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    var rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return 'IP-' + stamp + '-' + rand;
  }

  /* ----------------------------------------------------------------
   * Persistence (prototype)
   * -------------------------------------------------------------- */
  function saveLead(payload) {
    try {
      var leads = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      if (!Array.isArray(leads)) leads = [];
      leads.push(payload);
      localStorage.setItem(STORE_KEY, JSON.stringify(leads));
      return true;
    } catch (e) {
      return false; // private mode / quota — the UI still confirms
    }
  }

  /* ----------------------------------------------------------------
   * Bootstrap
   * -------------------------------------------------------------- */
  function init() {
    var form = $('#signup-form');
    if (!form) return;

    var panels = $$('.wizard-panel', form);
    var indicators = $$('.wizard-step');
    var status = $('#signup-status');
    var current = 1;

    function setStatus(message, type) {
      if (!status) return;
      status.textContent = message || '';
      status.className = 'form-status' + (type ? ' is-' + type : '');
      status.hidden = !message;
    }

    function panelFor(step) {
      return panels.filter(function (panel) {
        return Number(panel.dataset.step) === step;
      })[0];
    }

    function goTo(step, focusFirst) {
      current = Math.min(Math.max(step, 1), TOTAL_STEPS);

      panels.forEach(function (panel) {
        var active = Number(panel.dataset.step) === current;
        panel.hidden = !active;
        panel.classList.toggle('is-active', active);
        if (active) clearStepErrors(panel);
      });

      indicators.forEach(function (item) {
        var index = Number(item.dataset.stepIndicator);
        var active = index === current;
        var done = index < current;

        item.classList.toggle('is-active', active);
        item.classList.toggle('is-done', done);
        item.removeAttribute('aria-current');
        if (active) item.setAttribute('aria-current', 'step');

        var dot = item.querySelector('.wizard-dot');
        if (dot) {
          dot.textContent = done ? '✓' : String(index);
        }
      });

      setStatus('');

      var activePanel = panelFor(current);
      if (activePanel) {
        activePanel.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        if (focusFirst !== false) {
          var firstField = activePanel.querySelector('input, select, textarea, button');
          if (firstField) {
            setTimeout(function () {
              firstField.focus({ preventScroll: true });
            }, 60);
          }
        }
      }
    }

    function validateStep(step) {
      var panel = panelFor(step);
      if (!panel) return true;

      var rule = STEP_RULES[step];
      var valid = rule ? rule(panel) : true;

      if (!valid) {
        setStatus('Please complete the highlighted fields before continuing.', 'error');
        var firstInvalid = panel.querySelector('.is-invalid');
        if (firstInvalid) {
          firstInvalid.focus({ preventScroll: true });
          firstInvalid.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      } else {
        setStatus('');
      }

      return valid;
    }

    // Live feedback: clear an error the moment the user corrects it.
    form.addEventListener('input', function (event) {
      var input = event.target;
      if (input && input.classList && input.classList.contains('is-invalid')) {
        setError(input, false);
      }
      if (input && input.type === 'checkbox' && input.closest('.consent')) {
        setError(input, false);
      }
    });
    form.addEventListener('change', function (event) {
      var input = event.target;
      if (input && input.classList && input.classList.contains('is-invalid')) {
        setError(input, false);
      }
    });

    // Next / Back buttons.
    $$('[data-next]', form).forEach(function (button) {
      button.addEventListener('click', function () {
        if (validateStep(current)) goTo(current + 1);
      });
    });

    $$('[data-prev]', form).forEach(function (button) {
      button.addEventListener('click', function () {
        goTo(current - 1);
      });
    });

    // Enter key advances instead of submitting from a mid-wizard step.
    form.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;
      if (event.target.tagName === 'TEXTAREA') return;
      if (event.target.type === 'checkbox' || event.target.type === 'radio') return;
      if (current < TOTAL_STEPS) {
        event.preventDefault();
        if (validateStep(current)) goTo(current + 1);
      }
    });

    // Final submit.
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      if (!validateStep(3)) return;

      var data = new FormData(form);
      var lead = {
        reference: buildReference(),
        submittedAt: new Date().toISOString(),
        firstName: String(data.get('firstName') || '').trim(),
        lastName: String(data.get('lastName') || '').trim(),
        dob: String(data.get('dob') || ''),
        gender: String(data.get('gender') || ''),
        marital: String(data.get('marital') || ''),
        occupation: String(data.get('occupation') || '').trim(),
        email: String(data.get('email') || '').trim().toLowerCase(),
        phone: String(data.get('phone') || '').trim(),
        address: String(data.get('address') || '').trim(),
        city: String(data.get('city') || '').trim(),
        region: String(data.get('region') || '').trim(),
        zip: String(data.get('zip') || '').trim(),
        country: String(data.get('country') || ''),
        contactMethod: String(data.get('contactMethod') || 'Phone'),
        contactTime: String(data.get('contactTime') || 'Any time'),
        coverage: String(data.get('coverage') || ''),
        who: String(data.get('who') || ''),
        currentlyInsured: String(data.get('currentlyInsured') || ''),
        callbackDate: String(data.get('callbackDate') || ''),
        notes: String(data.get('notes') || '').trim()
      };

      saveLead(lead);

      // Success state.
      $('#signup-ref').textContent = lead.reference;
      $('#success-email').textContent = lead.email || 'your email';
      $('#success-message').textContent =
        'Thank you, ' + lead.firstName + '. Your advisor will contact you by ' +
        lead.contactMethod.toLowerCase() + ' — ' +
        (lead.contactTime === 'Any time' ? 'as soon as possible.' : 'during ' + lead.contactTime + '.');

      $('#signup-panel').hidden = true;
      $('#signup-success').hidden = false;

      var top = $('#signup-success');
      top.setAttribute('tabindex', '-1');
      top.focus({ preventScroll: true });
      top.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });

    goTo(1, false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
