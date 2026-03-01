// Global API key — persisted to localStorage
const keyInput = document.getElementById('global-api-key');
const keyStatus = document.getElementById('api-key-status');

const STORAGE_KEY = 'hopie_api_key';

if (keyInput) {
  // Restore saved key
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    keyInput.value = saved;
    keyStatus.textContent = 'Key loaded';
  }

  keyInput.addEventListener('input', () => {
    const val = keyInput.value.trim();
    if (val) {
      localStorage.setItem(STORAGE_KEY, val);
      keyStatus.textContent = 'Saved';
    } else {
      localStorage.removeItem(STORAGE_KEY);
      keyStatus.textContent = '';
    }
  });
}

function getApiKey() {
  return (keyInput && keyInput.value.trim()) || localStorage.getItem(STORAGE_KEY) || '';
}

// Try-it form
const form = document.getElementById('try-it-form');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('try-it-btn');
    const responseBox = document.getElementById('try-it-response');
    const statusEl = document.getElementById('response-status');
    const bodyEl = document.getElementById('response-body');
    const creditsEl = document.getElementById('credits-remaining');

    const apiKey = getApiKey();
    if (!apiKey) {
      alert('Paste your API key in the header first.');
      return;
    }

    const endpoint = form.dataset.endpoint;
    const body = {};
    new FormData(form).forEach((val, key) => { body[key] = val; });

    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      statusEl.textContent = `${res.status} ${res.ok ? 'OK' : 'Error'}`;
      statusEl.className = 'response-status ' + (res.ok ? 'ok' : 'err');
      bodyEl.textContent = JSON.stringify(data, null, 2);
      responseBox.style.display = 'block';

      // Show remaining credits if header present
      const remaining = res.headers.get('X-Credits-Remaining');
      creditsEl.textContent = remaining ? `${remaining} credits remaining` : '';
    } catch (err) {
      statusEl.textContent = 'Network error';
      statusEl.className = 'response-status err';
      bodyEl.textContent = err.message;
      responseBox.style.display = 'block';
      creditsEl.textContent = '';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send request';
    }
  });
}
