/**
 * InsurePro – demo authentication + role-based data
 * -------------------------------------------------------------
 * Client-side ONLY. This is a front-end prototype: accounts and
 * sessions live in localStorage. Do not use in production.
 *
 * Roles:
 *   admin  – sees every client record + company-wide metrics
 *   client – sees only their own record (enforced by lookup id)
 */
(function () {
  'use strict';

  var SESSION_KEY = 'ip-session';

  /* ---------------- Demo directory ---------------- */
  var COMPANY = {
    name: 'InsurePro',
    founded: 2016,
    carriers: 40,
    policiesBound: '1.2M+',
    claimsPaid: '$2.4B+',
    rating: '4.7/5',
    agents: 128,
    states: 48,
    hq: '350 Fifth Avenue, New York, NY',
    supportPhone: '1-800-555-0199',
    supportEmail: 'support@insurepro.example'
  };

  var CLIENTS = [
    {
      id: 'c1',
      name: 'Sarah Chen',
      email: 'sarah@client.test',
      password: 'client123',
      since: '2021-03-14',
      city: 'Austin, TX',
      agent: 'Marcus Reed',
      policies: [
        { number: 'AUTO-88421', type: 'Auto', carrier: 'Harbor Point', premium: '$97/mo', status: 'Active', renews: '2026-08-01' },
        { number: 'HOME-30912', type: 'Homeowners', carrier: 'Everline Assurance', premium: '$142/mo', status: 'Active', renews: '2027-01-15' }
      ],
      claims: [
        { number: 'CLM-5510', date: '2026-06-21', type: 'Auto glass', amount: '$640', status: 'Paid' }
      ],
      quotes: [
        { date: '2026-10-12', coverage: 'Auto', best: '$89/mo', carriers: 3 }
      ],
      documents: ['Policy declarations — Auto', 'Policy declarations — Home', 'ID cards (auto)']
    },
    {
      id: 'c2',
      name: 'James Okafor',
      email: 'james@client.test',
      password: 'client123',
      since: '2023-09-02',
      city: 'Chicago, IL',
      agent: 'Dana Whitfield',
      policies: [
        { number: 'REN-71203', type: 'Renters', carrier: 'BlueShield Mutual', premium: '$21/mo', status: 'Active', renews: '2026-12-01' }
      ],
      claims: [],
      quotes: [
        { date: '2026-09-30', coverage: 'Renters', best: '$18/mo', carriers: 3 },
        { date: '2026-08-14', coverage: 'Auto', best: '$121/mo', carriers: 3 }
      ],
      documents: ['Policy declarations — Renters']
    },
    {
      id: 'c3',
      name: 'Priya Nair',
      email: 'priya@client.test',
      password: 'client123',
      since: '2019-05-27',
      city: 'Seattle, WA',
      agent: 'Marcus Reed',
      policies: [
        { number: 'LIFE-10244', type: 'Life', carrier: 'Everline Assurance', premium: '$34/mo', status: 'Active', renews: '2027-05-27' },
        { number: 'AUTO-66390', type: 'Auto', carrier: 'Harbor Point', premium: '$108/mo', status: 'Lapsed', renews: '2026-04-01' },
        { number: 'BIZ-20871', type: 'Business', carrier: 'BlueShield Mutual', premium: '$189/mo', status: 'Active', renews: '2026-11-30' }
      ],
      claims: [
        { number: 'CLM-4988', date: '2026-03-02', type: 'Water damage', amount: '$3,120', status: 'Paid' },
        { number: 'CLM-5702', date: '2026-10-02', type: 'Liability', amount: '$875', status: 'In review' }
      ],
      quotes: [
        { date: '2026-10-28', coverage: 'Business', best: '$176/mo', carriers: 3 }
      ],
      documents: ['Policy declarations — Life', 'Policy declarations — Business', 'Commercial liability certificate']
    },
    {
      id: 'c4',
      name: 'Tom Bradley',
      email: 'tom@client.test',
      password: 'client123',
      since: '2025-11-19',
      city: 'Denver, CO',
      agent: 'Elena Ortiz',
      policies: [
        { number: 'HLT-40118', type: 'Health', carrier: 'Harbor Point', premium: '$268/mo', status: 'Active', renews: '2026-12-15' }
      ],
      claims: [
        { number: 'CLM-5688', date: '2026-09-27', type: 'Medical', amount: '$210', status: 'Paid' }
      ],
      quotes: [],
      documents: ['Policy declarations — Health']
    }
  ];

  var ADMINS = [
    { id: 'a1', name: 'Alex Rivera', email: 'admin@insurepro.test', password: 'admin123', role: 'Administrator' }
  ];

  /* ---------------- Session helpers ---------------- */
  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* quota */ }
  }

  function login(email, password) {
    email = String(email || '').trim().toLowerCase();
    password = String(password || '');

    var admin = ADMINS.filter(function (a) { return a.email === email; })[0];
    if (admin && admin.password === password) {
      write(SESSION_KEY, { role: 'admin', id: admin.id, at: Date.now() });
      return { ok: true, role: 'admin' };
    }

    var client = CLIENTS.filter(function (c) { return c.email === email; })[0];
    if (client && client.password === password) {
      write(SESSION_KEY, { role: 'client', id: client.id, at: Date.now() });
      return { ok: true, role: 'client' };
    }

    return { ok: false, error: 'Email or password is incorrect.' };
  }

  function logout() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* noop */ }
  }

  function session() {
    var s = read(SESSION_KEY);
    if (!s || !s.role) return null;
    if (Date.now() - (s.at || 0) > 1000 * 60 * 60 * 8) { logout(); return null; } // 8h expiry
    return s;
  }

  /* ---------------- Role-scoped data ----------------
   * A client can ONLY ever receive their own record:
   * everything else is filtered by id before it leaves here. */
  function getCompany() {
    return COMPANY;
  }

  function getAllClients() {
    return CLIENTS.map(function (c) {
      var copy = JSON.parse(JSON.stringify(c));
      delete copy.password; // never expose credentials
      return copy;
    });
  }

  function getClient(id) {
    var found = CLIENTS.filter(function (c) { return c.id === id; })[0];
    if (!found) return null;
    var copy = JSON.parse(JSON.stringify(found));
    delete copy.password;
    return copy;
  }

  /** Returns data scoped to the active session, or null. */
  function scopedData() {
    var s = session();
    if (!s) return null;
    if (s.role === 'admin') {
      return { role: 'admin', company: COMPANY, clients: getAllClients() };
    }
    var me = getClient(s.id);
    return me ? { role: 'client', client: me } : null;
  }

  /** Identity for the active session (never includes a password). */
  function currentAccount() {
    var s = session();
    if (!s) return null;

    if (s.role === 'admin') {
      var a = ADMINS.filter(function (x) { return x.id === s.id; })[0];
      return a ? { role: 'admin', id: a.id, name: a.name, email: a.email, label: a.role } : null;
    }

    var c = CLIENTS.filter(function (x) { return x.id === s.id; })[0];
    return c ? { role: 'client', id: c.id, name: c.name, email: c.email, label: 'Client' } : null;
  }

  /* ================================================================
   * UI layer
   * - login.html : role tabs, credential validation, redirect
   * - dashboard.html : guard + role-specific rendering
   * ============================================================== */
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function $(selector, context) {
    return (context || document).querySelector(selector);
  }

  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/[&<>"']/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
      });
  }

  function initials(name) {
    return String(name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0).toUpperCase(); })
      .join('');
  }

  /** "$97/mo" -> 97 */
  function premiumNumber(text) {
    var match = /\$([\d,]+)/.exec(String(text || ''));
    return match ? Number(match[1].replace(/,/g, '')) : 0;
  }

  /** Status text -> coloured pill class. */
  function badge(status) {
    var value = String(status || '').toLowerCase();
    var cls = 'badge';
    if (/active|paid|approved|bound/.test(value)) cls += ' is-good';
    else if (/review|pending|due|adjuster|renewal/.test(value)) cls += ' is-warn';
    else if (/lapsed|cancel|declined/.test(value)) cls += ' is-muted';
    return '<span class="' + cls + '">' + esc(status) + '</span>';
  }

  /* ---------------- Shared table partials ---------------- */

  function policiesTable(policies) {
    if (!policies || !policies.length) {
      return '<p class="dash-empty">No policies on file yet.</p>';
    }
    var rows = policies.map(function (p) {
      return '<tr>' +
        '<td><strong>' + esc(p.number) + '</strong></td>' +
        '<td>' + esc(p.type) + '</td>' +
        '<td>' + esc(p.carrier) + '</td>' +
        '<td>' + esc(p.premium) + '</td>' +
        '<td>' + esc(p.renews) + '</td>' +
        '<td>' + badge(p.status) + '</td>' +
        '</tr>';
    }).join('');

    return '<div class="table-scroll"><table class="dash-table">' +
      '<thead><tr><th>Policy</th><th>Type</th><th>Carrier</th><th>Premium</th><th>Renews</th><th>Status</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  }

  function claimsTable(claims) {
    if (!claims || !claims.length) {
      return '<p class="dash-empty">No claims on file — you are claim-free.</p>';
    }
    var rows = claims.map(function (c) {
      return '<tr>' +
        '<td><strong>' + esc(c.number) + '</strong></td>' +
        '<td>' + esc(c.date) + '</td>' +
        '<td>' + esc(c.type) + '</td>' +
        '<td>' + esc(c.amount) + '</td>' +
        '<td>' + badge(c.status) + '</td>' +
        '</tr>';
    }).join('');

    return '<div class="table-scroll"><table class="dash-table">' +
      '<thead><tr><th>Claim</th><th>Filed</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  }

  function quotesTable(quotes) {
    if (!quotes || !quotes.length) {
      return '<p class="dash-empty">No saved quotes yet — run a free quote to compare rates.</p>';
    }
    var rows = quotes.map(function (q) {
      return '<tr>' +
        '<td>' + esc(q.date) + '</td>' +
        '<td>' + esc(q.coverage) + '</td>' +
        '<td><strong>' + esc(q.best) + '</strong></td>' +
        '<td>' + esc(q.carriers) + ' carriers</td>' +
        '</tr>';
    }).join('');

    return '<div class="table-scroll"><table class="dash-table">' +
      '<thead><tr><th>Saved</th><th>Coverage</th><th>Best rate</th><th>Compared</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  }

  function infoRows(pairs) {
    return '<div class="info-rows">' + pairs.map(function (pair) {
      return '<div class="info-row"><span>' + esc(pair[0]) + '</span><strong>' + esc(pair[1]) + '</strong></div>';
    }).join('') + '</div>';
  }

  function kpi(label, value, note) {
    return '<div class="kpi">' +
      '<span class="kpi-label">' + esc(label) + '</span>' +
      '<strong class="kpi-value">' + esc(value) + '</strong>' +
      (note ? '<span class="kpi-note">' + esc(note) + '</span>' : '') +
      '</div>';
  }

  function headBlock(account, eyebrow, title, sub) {
    return '<div class="dash-head">' +
      '<div>' +
        '<span class="eyebrow">' + esc(eyebrow) + '</span>' +
        '<h1>' + esc(title) + '</h1>' +
        '<p class="dash-sub">' + esc(sub) + '</p>' +
      '</div>' +
      '<div class="dash-user">' +
        '<span class="avatar" aria-hidden="true">' + esc(initials(account.name)) + '</span>' +
        '<span class="dash-user-meta"><strong>' + esc(account.name) + '</strong><span>' + esc(account.label) + '</span></span>' +
        '<button type="button" class="btn btn-outline" id="logout-btn">Log out</button>' +
      '</div>' +
    '</div>';
  }

  var ICON_LOCK =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 11V8a5 5 0 0 1 10 0v3"/><rect x="4.5" y="11" width="15" height="9.5" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

  /* ---------------- Admin view ---------------- */

  function renderAdmin(data, account) {
    var clients = data.clients;
    var company = data.company;

    var activePolicies = 0;
    var monthlyPremium = 0;
    var openClaims = 0;

    clients.forEach(function (client) {
      client.policies.forEach(function (policy) {
        if (/active/i.test(policy.status)) {
          activePolicies += 1;
          monthlyPremium += premiumNumber(policy.premium);
        }
      });
      client.claims.forEach(function (claim) {
        if (!/paid/i.test(claim.status)) openClaims += 1;
      });
    });

    var clientCards = clients.map(function (client) {
      var policies = client.policies;
      var monthly = policies.reduce(function (sum, p) {
        return sum + (/active/i.test(p.status) ? premiumNumber(p.premium) : 0);
      }, 0);

      return '<details class="client-card">' +
        '<summary>' +
          '<span class="avatar" aria-hidden="true">' + esc(initials(client.name)) + '</span>' +
          '<span class="client-name"><strong>' + esc(client.name) + '</strong><span>' + esc(client.email) + ' · ' + esc(client.city) + '</span></span>' +
          '<span class="client-facts">' +
            '<span class="fact">' + esc(client.id) + '</span>' +
            '<span class="fact">' + policies.length + ' polic' + (policies.length === 1 ? 'y' : 'ies') + '</span>' +
            '<span class="fact">$' + monthly.toLocaleString('en-US') + '/mo</span>' +
          '</span>' +
        '</summary>' +
        '<div class="client-body">' +
          '<h4 class="sub-h">Account</h4>' +
          infoRows([
            ['Client ID', client.id],
            ['Email', client.email],
            ['City', client.city],
            ['Customer since', client.since],
            ['Assigned agent', client.agent]
          ]) +
          '<h4 class="sub-h">Policies</h4>' +
          policiesTable(policies) +
          '<h4 class="sub-h">Claims</h4>' +
          claimsTable(client.claims) +
          '<h4 class="sub-h">Saved quotes</h4>' +
          quotesTable(client.quotes) +
          '<h4 class="sub-h">Documents</h4>' +
          (client.documents.length
            ? '<ul class="ticks">' + client.documents.map(function (doc) {
                return '<li>' + esc(doc) + '</li>';
              }).join('') + '</ul>'
            : '<p class="dash-empty">No documents on file.</p>') +
        '</div>' +
      '</details>';
    }).join('');

    return headBlock(
        account,
        'Admin console',
        'Welcome back, ' + account.name,
        'Signed in as ' + account.email + ' · administrator scope · session expires after 8 hours.'
      ) +

      '<div class="kpi-grid">' +
        kpi('Policies bound', company.policiesBound, 'Since ' + company.founded) +
        kpi('Claims paid', company.claimsPaid, 'Directly to customers') +
        kpi('Carrier partners', company.carriers + '+', 'A-rated insurers') +
        kpi('Customer rating', company.rating, '25,000+ verified reviews') +
      '</div>' +

      '<p class="dash-note">' + ICON_LOCK +
        '<span>Administrator scope: company-wide information and every client record on file. ' +
        'Passwords are stripped by the data layer and are never rendered anywhere.</span>' +
      '</p>' +

      '<div class="dash-grid">' +
        '<section class="dash-card">' +
          '<div class="dash-card-head"><div><h3>Company information</h3>' +
          '<p class="card-sub">InsurePro Marketplace, Inc. — corporate record</p></div></div>' +
          infoRows([
            ['Founded', String(company.founded)],
            ['Headquarters', company.hq],
            ['Support line', company.supportPhone],
            ['Support email', company.supportEmail],
            ['Licensed agents', String(company.agents)],
            ['Licensed states', String(company.states)],
            ['Carrier partners', company.carriers + ' A-rated carriers']
          ]) +
        '</section>' +

        '<section class="dash-card">' +
          '<div class="dash-card-head"><div><h3>Directory snapshot</h3>' +
          '<p class="card-sub">Live totals across the client directory below</p></div></div>' +
          infoRows([
            ['Clients on file', clients.length.toLocaleString('en-US')],
            ['Active policies', activePolicies.toLocaleString('en-US')],
            ['Premium in force', '$' + monthlyPremium.toLocaleString('en-US') + '/mo'],
            ['Open claims', openClaims.toLocaleString('en-US')],
            ['Policies bound since ' + company.founded, company.policiesBound],
            ['Claims paid to date', company.claimsPaid]
          ]) +
        '</section>' +
      '</div>' +

      '<section class="dash-card full">' +
        '<div class="dash-card-head">' +
          '<div><h3>All clients</h3><p class="card-sub">Open a record to view policies, claims, quotes and documents.</p></div>' +
          '<span class="count-chip">' + clients.length + ' client records</span>' +
        '</div>' +
        '<div class="client-list">' + clientCards + '</div>' +
      '</section>';
  }

  /* ---------------- Client view ---------------- */

  function renderClient(client, account) {
    var activePolicies = client.policies.filter(function (p) {
      return /active/i.test(p.status);
    });
    var monthly = activePolicies.reduce(function (sum, p) {
      return sum + premiumNumber(p.premium);
    }, 0);
    var openClaims = client.claims.filter(function (c) {
      return !/paid/i.test(c.status);
    }).length;

    return headBlock(
        account,
        'Client portal',
        'Welcome back, ' + client.name.split(' ')[0],
        'Signed in as ' + client.email + ' · client ID ' + client.id + ' · session expires after 8 hours.'
      ) +

      '<div class="kpi-grid">' +
        kpi('Active policies', String(activePolicies.length), client.policies.length + ' on file in total') +
        kpi('Monthly premium', '$' + monthly.toLocaleString('en-US'), 'Across active policies') +
        kpi('Open claims', String(openClaims), client.claims.length + ' claims filed in total') +
        kpi('Saved quotes', String(client.quotes.length), 'Rates you compared') +
      '</div>' +

      '<p class="dash-note">' + ICON_LOCK +
        '<span>This portal shows <strong>only your account</strong> — your policies, claims, quotes and documents. ' +
        'Company-wide data and other clients&rsquo; records stay with InsurePro staff.</span>' +
      '</p>' +

      '<div class="dash-grid">' +
        '<section class="dash-card full">' +
          '<div class="dash-card-head"><div><h3>My policies</h3>' +
          '<p class="card-sub">Coverage, premiums and renewal dates</p></div>' +
          '<span class="count-chip">' + activePolicies.length + ' active</span></div>' +
          policiesTable(client.policies) +
        '</section>' +

        '<section class="dash-card">' +
          '<div class="dash-card-head"><div><h3>My claims</h3>' +
          '<p class="card-sub">Filed claims and their current status</p></div></div>' +
          claimsTable(client.claims) +
        '</section>' +

        '<section class="dash-card">' +
          '<div class="dash-card-head"><div><h3>My saved quotes</h3>' +
          '<p class="card-sub">Rates you asked us to email you</p></div></div>' +
          quotesTable(client.quotes) +
        '</section>' +

        '<section class="dash-card">' +
          '<div class="dash-card-head"><div><h3>Documents</h3>' +
          '<p class="card-sub">Declarations pages and ID cards</p></div></div>' +
          (client.documents.length
            ? '<ul class="ticks">' + client.documents.map(function (doc) {
                return '<li>' + esc(doc) + '</li>';
              }).join('') + '</ul>'
            : '<p class="dash-empty">No documents on file.</p>') +
        '</section>' +

        '<section class="dash-card">' +
          '<div class="dash-card-head"><div><h3>Account details</h3>' +
          '<p class="card-sub">Your record with InsurePro</p></div></div>' +
          infoRows([
            ['Client ID', client.id],
            ['Email', client.email],
            ['City', client.city],
            ['Customer since', client.since],
            ['Assigned agent', client.agent]
          ]) +
        '</section>' +
      '</div>';
  }

  /* ---------------- login.html ---------------- */

  var DEMO_ACCOUNTS = {
    client: { email: 'sarah@client.test', password: 'client123', label: 'Client — Sarah Chen' },
    admin: { email: 'admin@insurepro.test', password: 'admin123', label: 'Admin — Alex Rivera' }
  };

  var ROLE_HINTS = {
    client: 'Clients sign in to their own portal.',
    admin: 'Agents and administrators sign in to the console.'
  };

  function initLogin() {
    var form = $('#login-form');
    if (!form) return;

    // Already signed in? Go straight to the dashboard.
    if (session()) {
      window.location.replace('dashboard.html');
      return;
    }

    var tabs = Array.prototype.slice.call(document.querySelectorAll('.auth-tab'));
    var emailInput = $('#login-email');
    var passInput = $('#login-password');
    var status = $('#login-status');
    var hint = $('#auth-hint');
    var demoText = $('#demo-creds');
    var demoFill = $('#demo-fill');
    var role = 'client';

    function setStatus(message, type) {
      if (!status) return;
      status.textContent = message || '';
      status.className = 'form-status' + (type ? ' is-' + type : '');
      status.hidden = !message;
    }

    function setRole(next) {
      role = next === 'admin' ? 'admin' : 'client';
      tabs.forEach(function (tab) {
        tab.setAttribute('aria-selected', String(tab.getAttribute('data-role') === role));
      });
      var demo = DEMO_ACCOUNTS[role];
      demoText.textContent = demo.label + ' · ' + demo.email + ' / ' + demo.password;
      hint.textContent = ROLE_HINTS[role];
      setStatus('');
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () {
        setRole(tab.getAttribute('data-role'));
      });

      // Left/Right arrows move between the two role tabs.
      tab.addEventListener('keydown', function (event) {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        var next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        next.focus();
        setRole(next.getAttribute('data-role'));
      });
    });

    if (demoFill) {
      demoFill.addEventListener('click', function () {
        var demo = DEMO_ACCOUNTS[role];
        emailInput.value = demo.email;
        passInput.value = demo.password;
        setStatus('');
        emailInput.focus();
      });
    }

    [emailInput, passInput].forEach(function (input) {
      input.addEventListener('input', function () {
        if (input.getAttribute('aria-invalid') === 'true') {
          input.removeAttribute('aria-invalid');
          setStatus('');
        }
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var email = emailInput.value.trim();
      var password = passInput.value;

      if (!email) {
        emailInput.setAttribute('aria-invalid', 'true');
        setStatus('Please enter your email address.', 'error');
        emailInput.focus();
        return;
      }
      if (!EMAIL_PATTERN.test(email)) {
        emailInput.setAttribute('aria-invalid', 'true');
        setStatus('That email address looks invalid. Please check and try again.', 'error');
        emailInput.focus();
        return;
      }
      if (!password) {
        passInput.setAttribute('aria-invalid', 'true');
        setStatus('Please enter your password.', 'error');
        passInput.focus();
        return;
      }

      var result = login(email, password);

      if (!result.ok) {
        setStatus(result.error, 'error');
        passInput.value = '';
        passInput.focus();
        return;
      }

      if (result.role !== role) {
        logout();
        setStatus(
          'Those credentials belong to the ' +
          (result.role === 'admin' ? 'Admin / Agent' : 'Client') +
          ' sign-in — switch the tab above and try again.',
          'error'
        );
        return;
      }

      setStatus('Signed in — taking you to your dashboard…', 'success');
      window.location.href = 'dashboard.html';
    });

    // Support login.html?role=admin (used by "Agent login").
    var requested = null;
    try {
      requested = new URLSearchParams(window.location.search).get('role');
    } catch (e) { /* very old browsers */ }
    setRole(requested === 'admin' ? 'admin' : 'client');
  }

  /* ---------------- dashboard.html ---------------- */

  function initDashboard() {
    var body = $('#dash-body');
    if (!body) return;

    var data = scopedData();
    var account = currentAccount();

    // Not signed in (or session no longer resolves) -> back to the login page.
    if (!data || !account) {
      logout();
      window.location.replace('login.html');
      return;
    }

    body.innerHTML = data.role === 'admin'
      ? renderAdmin(data, account)
      : renderClient(data.client, account);

    var logoutBtn = $('#logout-btn', body);
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        logout();
        window.location.href = 'login.html';
      });
    }
  }

  function bootPage() {
    initLogin();
    initDashboard();
  }

  window.IPAuth = {
    login: login,
    logout: logout,
    session: session,
    scopedData: scopedData,
    currentAccount: currentAccount,
    getCompany: getCompany,
    getAllClients: getAllClients,
    getClient: getClient
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootPage, { once: true });
  } else {
    bootPage();
  }
})();
