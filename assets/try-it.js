const STORAGE_KEY = 'hopie_api_key';

// Try-it form API key field
const formKeyInput = document.getElementById('try-it-api-key');
const formKeyClear = document.getElementById('try-it-api-key-clear');
const saveCheckbox = document.getElementById('try-it-save-key');

if (formKeyInput) {
  const saved = localStorage.getItem(STORAGE_KEY);

  // Reflect localStorage state on load
  if (saved) {
    formKeyInput.value = saved;
    if (saveCheckbox) saveCheckbox.checked = true;
  }

  // Typing: save only if checkbox is checked
  formKeyInput.addEventListener('input', () => {
    if (saveCheckbox && saveCheckbox.checked) {
      const val = formKeyInput.value.trim();
      if (val) {
        localStorage.setItem(STORAGE_KEY, val);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  });
}

if (saveCheckbox) {
  saveCheckbox.addEventListener('change', () => {
    if (saveCheckbox.checked) {
      const val = formKeyInput && formKeyInput.value.trim();
      if (val) localStorage.setItem(STORAGE_KEY, val);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  });
}

if (formKeyClear) {
  formKeyClear.addEventListener('click', () => {
    if (formKeyInput) formKeyInput.value = '';
    if (saveCheckbox) saveCheckbox.checked = false;
    localStorage.removeItem(STORAGE_KEY);
  });
}

function getApiKey() {
  return (formKeyInput && formKeyInput.value.trim())
    || localStorage.getItem(STORAGE_KEY)
    || '';
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
      alert('Paste your API key above first.');
      return;
    }

    const endpoint = form.dataset.endpoint;
    const body = {};
    new FormData(form).forEach((val, key) => {
      // Attempt to parse JSON values (e.g. the params field on the calculator form)
      try { body[key] = JSON.parse(val); } catch { body[key] = val; }
    });

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
