(function () {

  var SCENARIOS = [
    {
      chromePath: '~/agents/lead-qualifier',
      taskId: 'a7f2',
      initCredits: 1000,
      stats: { sats: 4, usd: '$0.0010', ms: 485, tools: 3 },
      vsLlm: { ms: '6,200ms ↑13×', cost: '$0.028 ↑28×', correct: 'no — hallucinated' },
      script: [
        { kind: 'user',  text: 'qualify inbound lead: someone@yc-demo.co' },
        { kind: 'think', text: 'i need email quality score, dns setup, and domain age.' },
        { kind: 'plan',  text: 'parallel: email-validator + domain-intelligence/dns → then whois for age.' },
        { kind: 'call', tool: 'email-validator',
          req: '{"email":"someone@yc-demo.co"}', cost: 2, ms: 182,
          res: '{"email":"someone@yc-demo.co","valid":true,"syntax":true,"dns":true,"mx":true,"role_account":false,"disposable":false,"free_provider":false,"domain_type":"corporate","domain_age_days":68,"score":0.91}' },
        { kind: 'call', tool: 'domain-intelligence/dns',
          req: '{"domain":"yc-demo.co"}', cost: 1, ms: 95,
          res: '{"ok":true,"domain":"yc-demo.co","a":["76.76.21.21"],"mx":[{"exchange":"aspmx.l.google.com","priority":1}],"txt":["v=spf1 include:_spf.google.com ~all"],"ns":["ns1.vercel-dns.com","ns2.vercel-dns.com"],"spf_present":true,"dmarc_present":false,"mx_count":1}' },
        { kind: 'think', text: 'google mx, spf present, score 0.91. domain 68 days old — young but legit infra. get whois to confirm.' },
        { kind: 'call', tool: 'domain-intelligence/whois',
          req: '{"domain":"yc-demo.co"}', cost: 1, ms: 208,
          res: '{"ok":true,"domain":"yc-demo.co","registrar":"Namecheap, Inc.","created":"2025-02-09","expires":"2026-02-09","age_days":68,"expires_in_days":297,"registrant_country":"US","source":"rdap"}' },
        { kind: 'done',  text: 'LEAD_QUALITY=high · score 0.91 · young domain (68d) but clean infra · wrote to crm.', total: 4, ms_total: 485 },
      ],
    },

    {
      chromePath: '~/agents/scam-detector',
      taskId: 'b3c9',
      initCredits: 500,
      stats: { sats: 5, usd: '$0.0013', ms: 415, tools: 2 },
      vsLlm: { ms: '9,100ms ↑22×', cost: '$0.041 ↑32×', correct: 'no — no flags raised' },
      script: [
        { kind: 'user',  text: 'check this invoice: billing@crypto-inv.io, requests crypto wire' },
        { kind: 'think', text: 'multiple red flags already — unusual sender domain, crypto payment request.' },
        { kind: 'plan',  text: 'scam-signal-check to score the domain + sender + payment method combo.' },
        { kind: 'call', tool: 'circuits/scam-signal-check',
          req: '{"domain":"crypto-inv.io","sender_email":"billing@crypto-inv.io","payment_method":"crypto"}', cost: 4, ms: 320,
          res: '{"signals":{"domain_age_days":12,"mx_configured":false,"email_deliverable":false,"payment_method":"crypto"},"flags":["new_domain","no_mx_record","undeliverable_sender","payment_method_crypto"],"anomaly_count":4,"signals_checked":4,"partial":false}' },
        { kind: 'think', text: '4 anomalies. domain 12 days old, no mx, sender undeliverable. confirm dns state.' },
        { kind: 'call', tool: 'domain-intelligence/dns',
          req: '{"domain":"crypto-inv.io"}', cost: 1, ms: 95,
          res: '{"ok":true,"domain":"crypto-inv.io","a":["104.21.44.12"],"mx":[],"txt":[],"ns":["ns1.cloudflare.com","ns2.cloudflare.com"],"spf_present":false,"dmarc_present":false,"mx_count":0}' },
        { kind: 'done',  text: 'VERDICT=HIGH_RISK · 4 anomalies · no email infra · 12-day-old domain · blocked + flagged.', total: 5, ms_total: 415 },
      ],
    },

    {
      chromePath: '~/agents/meeting-planner',
      taskId: 'e1d4',
      initCredits: 750,
      stats: { sats: 3, usd: '$0.0008', ms: 130, tools: 2 },
      vsLlm: { ms: '4,800ms ↑37×', cost: '$0.019 ↑24×', correct: 'no — ignored bank holidays' },
      script: [
        { kind: 'user',  text: 'find a 1h slot for engineering leads in dublin, berlin, and new york next tuesday' },
        { kind: 'think', text: 'need to verify it\'s a working day in all three, then find overlap in business hours.' },
        { kind: 'plan',  text: 'meeting-windows to confirm working day → timezone-overlap for the slot.' },
        { kind: 'call', tool: 'date-utils/meeting-windows',
          req: '{"countries":["IE","DE","US"],"from_date":"2026-04-21","to_date":"2026-04-21"}', cost: 2, ms: 85,
          res: '{"from_date":"2026-04-21","to_date":"2026-04-21","countries":["IE","DE","US"],"windows":[{"date":"2026-04-21","day_of_week":"Tuesday","available_in_all":true,"availability":[{"country":"IE","working_day":true,"reason":null},{"country":"DE","working_day":true,"reason":null},{"country":"US","working_day":true,"reason":null}]}]}' },
        { kind: 'think', text: 'all three clear on tuesday. now find the overlap window.' },
        { kind: 'call', tool: 'date-utils/timezone-overlap',
          req: '{"date":"2026-04-21","timezones":["Europe/Dublin","Europe/Berlin","America/New_York"],"working_hours":{"start":"09:00","end":"17:00"}}', cost: 1, ms: 45,
          res: '{"date":"2026-04-21","working_hours":{"start":"09:00","end":"17:00"},"timezones":["Europe/Dublin","Europe/Berlin","America/New_York"],"overlap_minutes":120,"best_windows":[{"start_utc":"13:00","end_utc":"15:00","duration_minutes":120,"local_times":[{"timezone":"Europe/Dublin","start":"14:00","end":"16:00"},{"timezone":"Europe/Berlin","start":"15:00","end":"17:00"},{"timezone":"America/New_York","start":"09:00","end":"11:00"}]}]}' },
        { kind: 'done',  text: 'best slot: 13:00–15:00 UTC · Dublin 2pm · Berlin 3pm · New York 9am · 120min overlap · invite sent.', total: 3, ms_total: 130 },
      ],
    },

    {
      chromePath: '~/agents/data-verifier',
      taskId: 'f8a1',
      initCredits: 200,
      stats: { sats: 5, usd: '$0.0013', ms: 2130, tools: 2 },
      vsLlm: { ms: '12,400ms ↑6×', cost: '$0.038 ↑29×', correct: 'no — cannot fetch urls' },
      script: [
        { kind: 'user',  text: 'verify this data feed before we pipe it to prod: https://feeds.example.io/market.json' },
        { kind: 'think', text: 'need to confirm the endpoint is reachable, ssl valid, and content is actually readable.' },
        { kind: 'plan',  text: 'resource-reality-check for infra signals → extract-text to inspect the payload.' },
        { kind: 'call', tool: 'circuits/resource-reality-check',
          req: '{"url":"https://feeds.example.io/market.json"}', cost: 3, ms: 890,
          res: '{"reachable":true,"signals":{"dns_resolves":true,"http_status":200,"content_type":"application/json","ssl_valid":true,"ssl_days_remaining":89},"flags":[],"anomaly_count":0,"signals_checked":5,"partial":false}' },
        { kind: 'think', text: 'clean — 200, valid ssl (89d remaining), json content-type. extract and spot-check the body.' },
        { kind: 'call', tool: 'extract-text',
          req: '{"url":"https://feeds.example.io/market.json"}', cost: 2, ms: 1240,
          res: '{"url":"https://feeds.example.io/market.json","title":"Q1 2026 Market Feed","byline":"Market Data Team","excerpt":"Structured market signals updated hourly across 40 asset classes.","html":null,"text":"...","wordCount":1847}' },
        { kind: 'done',  text: 'FEED_OK · ssl valid 89d · 1847 words · updated hourly · pipeline approved.', total: 5, ms_total: 2130 },
      ],
    },
  ];

  var DELAYS = {
    user:     1800,
    think:    2200,
    plan:     2000,
    call_req:  900,
    call_res: 1800,
    done:     4500,
    restart:  5000,
  };

  var scenarioIdx = 0;
  var step = 0;
  var credits = 1000;
  var timer = null;
  var countdownInterval = null;
  var scroller = null;
  var creditsEl = null;
  var creditsUsd = null;

  function fmtJson(s, pretty) {
    if (pretty) {
      try { s = JSON.stringify(JSON.parse(s), null, 2); } catch (e) {}
    }
    // Colon outside the key span so subsequent regexes can find the value separator
    return s.replace(/"([^"]+)":/g,                '<span class="key">"$1"</span>:')
            .replace(/:\s*"([^"]*)"/g,             ': <span class="str">"$1"</span>')
            .replace(/:\s*(true|false|null)/g,      ': <span class="kw">$1</span>')
            .replace(/(?<!\d):\s*(-?\d+\.?\d*)/g,  ': <span class="num">$1</span>');
  }

  function append(html, extraStyle) {
    var row = document.createElement('div');
    row.className = 'demo-row demo-row--in';
    if (extraStyle) row.style.cssText = extraStyle;
    row.innerHTML = html;
    scroller.appendChild(row);
    scroller.scrollTop = scroller.scrollHeight;
    return row;
  }

  function updateCredits() {
    if (creditsEl)  creditsEl.textContent = credits;
    if (creditsUsd) creditsUsd.textContent = '$' + (credits * 0.00025).toFixed(4);
  }

  function updateSidebar(scenario) {
    var pathEl = document.querySelector('.chrome-path');
    var taskEl = document.querySelector('.chrome-meta');
    if (pathEl) pathEl.textContent = scenario.chromePath;
    if (taskEl) taskEl.innerHTML = '<span class="status-dot" style="margin-right:6px"></span>live · task #' + scenario.taskId;

    var el = function (id) { return document.getElementById(id); };
    if (el('demo-stat-sats'))    el('demo-stat-sats').textContent    = scenario.stats.sats + ' sats · ' + scenario.stats.usd;
    if (el('demo-stat-tools'))   el('demo-stat-tools').textContent   = scenario.stats.tools + ' called';
    if (el('demo-stat-latency')) el('demo-stat-latency').textContent = scenario.stats.ms + 'ms';
    if (el('demo-vs-ms'))        el('demo-vs-ms').textContent        = scenario.vsLlm.ms;
    if (el('demo-vs-cost'))      el('demo-vs-cost').textContent      = scenario.vsLlm.cost;
    if (el('demo-vs-correct'))   el('demo-vs-correct').textContent   = scenario.vsLlm.correct;
  }

  function reset() {
    step = 0;
    var scenario = SCENARIOS[scenarioIdx % SCENARIOS.length];
    credits = scenario.initCredits;
    if (scroller) scroller.innerHTML = '';
    updateCredits();
    updateSidebar(scenario);
  }

  function currentScript() {
    return SCENARIOS[scenarioIdx % SCENARIOS.length].script;
  }

  function tick() {
    var script = currentScript();

    if (step >= script.length) {
      var secs = Math.round(DELAYS.restart / 1000);
      append(
        'next example in <span id="demo-countdown">' + secs + '</span>s',
        'font-size:11.5px;color:var(--fg-dim);margin-top:12px'
      );
      countdownInterval = setInterval(function () {
        secs--;
        var el = document.getElementById('demo-countdown');
        if (el) el.textContent = secs;
        if (secs <= 0) { clearInterval(countdownInterval); countdownInterval = null; }
      }, 1000);
      timer = setTimeout(function () {
        scenarioIdx++;
        reset();
        schedule();
      }, DELAYS.restart);
      return;
    }

    var s = script[step];

    if (s.kind === 'user') {
      append('<span class="dim">user $</span> ' + s.text);
      step++;
      timer = setTimeout(schedule, DELAYS.user);

    } else if (s.kind === 'think') {
      append('<span class="accent">agent</span> <span class="dim">·thinking</span> <span class="muted">' + s.text + '</span>');
      step++;
      timer = setTimeout(schedule, DELAYS.think);

    } else if (s.kind === 'plan') {
      append('<span class="accent">agent</span> <span class="dim">·plan</span> ' + s.text);
      step++;
      timer = setTimeout(schedule, DELAYS.plan);

    } else if (s.kind === 'call') {
      var reqHtml =
        '<div style="margin-bottom:6px"><span class="dim">→ POST</span> <span class="accent">/' + s.tool + '</span><br>' +
        '<span style="font-size:11px;color:var(--fg-dim)">' + fmtJson(s.req) + '</span></div>' +
        '<div class="demo-awaiting dim" style="font-size:12px">··· awaiting response</div>';
      var callRow = append(reqHtml, 'padding:8px 10px;background:var(--bg-inset);border-left:2px solid var(--accent);margin-bottom:14px');

      timer = setTimeout(function () {
        var awaiting = callRow.querySelector('.demo-awaiting');
        if (awaiting) {
          var resHtml =
            '<div style="margin-bottom:4px;font-size:12px"><span class="ok">← 200 OK</span> ' +
            '<span class="dim">· ' + s.ms + 'ms ·</span> ' +
            '<span class="accent tnum">−' + s.cost + ' sat' + (s.cost === 1 ? '' : 's') + '</span></div>' +
            '<pre style="margin:0;padding:0;background:none;border:none;font-size:11px;line-height:1.5;white-space:pre-wrap;word-break:break-word">' + fmtJson(s.res, true) + '</pre>';
          var resEl = document.createElement('div');
          resEl.className = 'demo-row--in';
          resEl.innerHTML = resHtml;
          awaiting.replaceWith(resEl);
          credits -= s.cost;
          updateCredits();
        }
        scroller.scrollTop = scroller.scrollHeight;
        step++;
        timer = setTimeout(schedule, DELAYS.call_res);
      }, DELAYS.call_req);

    } else if (s.kind === 'done') {
      append(
        '<span class="ok">✓ task complete</span> · ' + s.text +
        '<div class="dim" style="margin-top:6px;font-size:11.5px">total: ' + s.total + ' sats · ' + s.ms_total + 'ms wall · 0 retries</div>',
        'padding:10px 12px;background:color-mix(in oklch, var(--success) 12%, var(--bg-inset));border-left:2px solid var(--success);margin-top:10px'
      );
      step++;
      timer = setTimeout(schedule, DELAYS.done);
    }
  }

  function schedule() { timer = setTimeout(tick, 0); }

  function init() {
    var demo = document.getElementById('hero-demo');
    if (!demo) return;

    var scenario = SCENARIOS[0];

    demo.innerHTML = [
      '<div class="card" style="overflow:hidden;padding:0;margin:0">',
        '<div class="card-chrome">',
          '<span class="chrome-dots"><span></span><span></span><span></span></span>',
          '<span class="chrome-path">' + scenario.chromePath + '</span>',
          '<span class="chrome-meta"><span class="status-dot" style="margin-right:6px"></span>live · task #' + scenario.taskId + '</span>',
        '</div>',
        '<div class="demo-grid">',
          '<div id="demo-scroller" class="demo-scroller-pane"></div>',
          '<div class="demo-sidebar">',
            '<div>',
              '<div class="eyebrow" style="margin-bottom:6px">credits remaining</div>',
              '<div class="tnum" style="font-size:28px;font-weight:600;letter-spacing:-0.02em">',
                '<span class="accent" id="demo-credits">' + scenario.initCredits + '</span> <span class="dim" style="font-size:13px;font-weight:400">sats</span>',
              '</div>',
              '<div class="dim" style="font-size:11px;margin-top:2px" id="demo-credits-usd">$' + (scenario.initCredits * 0.00025).toFixed(4) + '</div>',
            '</div>',
            '<div>',
              '<div class="eyebrow" style="margin-bottom:8px">this task</div>',
              '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:12px">',
                '<span class="dim">tools</span><span class="tnum" id="demo-stat-tools">' + scenario.stats.tools + ' called</span>',
                '<span class="dim">cost</span><span class="accent tnum" id="demo-stat-sats">' + scenario.stats.sats + ' sats · ' + scenario.stats.usd + '</span>',
                '<span class="dim">latency</span><span class="tnum" id="demo-stat-latency">' + scenario.stats.ms + 'ms</span>',
                '<span class="dim">retries</span><span class="tnum">0</span>',
              '</div>',
            '</div>',
            '<div style="border-top:1px solid var(--rule);padding-top:14px">',
              '<div class="eyebrow" style="margin-bottom:8px">vs. llm-only</div>',
              '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:12px">',
                '<span class="dim">latency</span><span class="bad tnum" id="demo-vs-ms">' + scenario.vsLlm.ms + '</span>',
                '<span class="dim">cost</span><span class="bad tnum" id="demo-vs-cost">' + scenario.vsLlm.cost + '</span>',
                '<span class="dim">correct</span><span class="bad" id="demo-vs-correct">' + scenario.vsLlm.correct + '</span>',
              '</div>',
            '</div>',
            '<div style="margin-top:auto">',
              '<button class="btn btn-primary" style="width:100%;justify-content:center" id="demo-restart">restart demo</button>',
            '</div>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');

    scroller   = document.getElementById('demo-scroller');
    creditsEl  = document.getElementById('demo-credits');
    creditsUsd = document.getElementById('demo-credits-usd');

    document.getElementById('demo-restart').addEventListener('click', function () {
      clearTimeout(timer);
      clearInterval(countdownInterval);
      countdownInterval = null;
      scenarioIdx = 0;
      reset();
      schedule();
    });

    schedule();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
