(function () {
  const STAGING_MODE_KEY = 'hopie_staging_mode';
  const STAGING_PWD_KEY  = 'hopie_staging_key';
  const STAGING_ORIGIN   = 'https://api-staging.hop.ie';
  const PROD_ORIGIN      = 'https://api.hop.ie';

  // Activate from ?staging=true
  if (new URLSearchParams(window.location.search).get('staging') === 'true') {
    localStorage.setItem(STAGING_MODE_KEY, '1');
    const url = new URL(window.location);
    url.searchParams.delete('staging');
    history.replaceState({}, '', url);
  }

  if (localStorage.getItem(STAGING_MODE_KEY) !== '1') return;

  // Override API base for buy.js
  window.stagingApiBase = STAGING_ORIGIN + '/api/v1';

  // Patch fetch: rewrite URLs, inject key header, clear key on 401
  const _fetch = window.fetch;
  window.fetch = function (resource, init) {
    if (typeof resource === 'string' &&
        (resource.includes(PROD_ORIGIN) || resource.includes(STAGING_ORIGIN))) {
      resource = resource.replace(PROD_ORIGIN, STAGING_ORIGIN);
      const key = localStorage.getItem(STAGING_PWD_KEY);
      init = {
        ...(init || {}),
        headers: { ...(init?.headers || {}), ...(key ? { 'X-Staging-Key': key } : {}) },
      };
      return _fetch.call(this, resource, init).then(res => {
        if (res.status === 401) {
          localStorage.removeItem(STAGING_PWD_KEY);
          const banner = document.getElementById('staging-banner');
          if (banner) renderPrompt(banner);
        }
        return res;
      });
    }
    return _fetch.call(this, resource, init);
  };

  // Hash password before storing — plain text never touches localStorage or the network
  async function hashPassword(password) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Banner: password prompt state
  function renderPrompt(el) {
    el.innerHTML = [
      '<span class="staging-label">STAGING MODE</span>',
      '<input class="staging-input" id="staging-pwd" type="password"',
      '  placeholder="Staging password" autocomplete="off">',
      '<button class="staging-btn" id="staging-enter">Enter</button>',
    ].join('');

    const input = document.getElementById('staging-pwd');
    const btn   = document.getElementById('staging-enter');

    function submit() {
      const val = input.value.trim();
      if (!val) return;
      hashPassword(val).then(hash => {
        localStorage.setItem(STAGING_PWD_KEY, hash);
        renderActive(el);
      });
    }

    btn.onclick = submit;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    input.focus();
  }

  // Banner: active state
  function renderActive(el) {
    el.innerHTML = [
      '<span class="staging-label">STAGING MODE</span>',
      '<button class="staging-btn" id="staging-exit">Exit</button>',
    ].join('');

    document.getElementById('staging-exit').onclick = () => {
      localStorage.removeItem(STAGING_MODE_KEY);
      localStorage.removeItem(STAGING_PWD_KEY);
      window.location.href = window.location.pathname;
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    const banner = document.getElementById('staging-banner');
    if (!banner) return;
    banner.style.display = 'flex';
    if (localStorage.getItem(STAGING_PWD_KEY)) {
      renderActive(banner);
    } else {
      renderPrompt(banner);
    }
  });
}());
