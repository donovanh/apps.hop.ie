const API_BASE = 'https://api.hop.ie/api/v1';

// ── State refs ──────────────────────────────────────────────
const stateAmount  = document.getElementById('state-amount');
const stateInvoice = document.getElementById('state-invoice');
const stateSuccess = document.getElementById('state-success');

// ── Step refs ────────────────────────────────────────────────
const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const step3 = document.getElementById('step-3');

// ── Aria live region ─────────────────────────────────────────
const liveRegion = document.getElementById('buy-live-region');

// ── Amount state elements ────────────────────────────────────
const qtyInput       = document.getElementById('buy-quantity');
const qtyError       = document.getElementById('quantity-error');
const btnGenerate    = document.getElementById('btn-generate');
const responseAmount = document.getElementById('response-amount');
const statusAmount   = document.getElementById('status-amount');
const bodyAmount     = document.getElementById('body-amount');

// ── Invoice state elements ───────────────────────────────────
const qrCanvas        = document.getElementById('qr-canvas');
const invoiceInput    = document.getElementById('invoice-string');
const btnCopyInvoice  = document.getElementById('btn-copy-invoice');
const btnPaid         = document.getElementById('btn-paid');
const btnBack         = document.getElementById('btn-back');
const responseInvoice = document.getElementById('response-invoice');
const statusInvoice   = document.getElementById('status-invoice');
const bodyInvoice     = document.getElementById('body-invoice');

// ── Success state elements ───────────────────────────────────
const apiKeyOut       = document.getElementById('api-key-out');
const btnCopyKey      = document.getElementById('btn-copy-key');
const btnSaveKey      = document.getElementById('btn-save-key');
const saveKeyStatus   = document.getElementById('save-key-status');
const responseSuccess = document.getElementById('response-success');
const statusSuccess   = document.getElementById('status-success');
const bodySuccess     = document.getElementById('body-success');

// ── Session state ────────────────────────────────────────────
let currentInvoiceId = null;
let currentQuantity  = null;
let pollTimer        = null;
let pollCount        = 0;

const POLL_INTERVAL_MS = 3000;
const POLL_MAX         = 200; // 10 minutes

// ── Poll status element ──────────────────────────────────────
const pollStatus = document.getElementById('poll-status');

function setPollStatus(msg) {
  if (pollStatus) pollStatus.textContent = msg;
}

// ── Announce to screen readers ───────────────────────────────
function announce(msg) {
  if (!liveRegion) return;
  liveRegion.textContent = '';
  // Brief delay so readers pick up the change
  setTimeout(() => { liveRegion.textContent = msg; }, 50);
}

// ── State machine (class-based for CSS transitions) ──────────
function setStep(active, done = []) {
  [step1, step2, step3].forEach((s) => {
    s.classList.remove('is-active', 'is-done');
  });
  if (active) active.classList.add('is-active');
  done.forEach((s) => s.classList.add('is-done'));
}

function focusHeading(section) {
  const h2 = section.querySelector('h2[tabindex="-1"]');
  if (h2) h2.focus({ preventScroll: false });
}

function showAmount() {
  stateAmount.classList.add('is-active');
  stateInvoice.classList.remove('is-active');
  stateSuccess.classList.remove('is-active');
  setStep(step1);
  focusHeading(stateAmount);
}

function showInvoice() {
  stateAmount.classList.remove('is-active');
  stateInvoice.classList.add('is-active');
  stateSuccess.classList.remove('is-active');
  setStep(step2, [step1]);
  focusHeading(stateInvoice);
  announce('Invoice generated. Scan the QR code or copy the invoice string to pay.');
  startPolling();
}

function showSuccess() {
  stateAmount.classList.remove('is-active');
  stateInvoice.classList.remove('is-active');
  stateSuccess.classList.add('is-active');
  setStep(step3, [step1, step2]);
  focusHeading(stateSuccess);
  announce('Payment confirmed. Your API key is ready.');
}

// ── Response panel helpers ───────────────────────────────────
function showResponse(panelEl, statusEl, bodyEl, status, data) {
  statusEl.textContent = status;
  statusEl.className = 'response-status ' + (status.startsWith('2') ? 'ok' : 'err');
  bodyEl.textContent = JSON.stringify(data, null, 2);
  panelEl.style.display = 'block';
}

// ── Amount validation ────────────────────────────────────────
function validateQuantity() {
  const val = parseInt(qtyInput.value, 10);
  if (!qtyInput.value.trim() || isNaN(val)) {
    qtyError.textContent = 'Please enter a number.';
    return null;
  }
  if (val < 1000) {
    qtyError.textContent = 'Minimum 1000 sats (required for Lightning routing).';
    return null;
  }
  qtyError.textContent = '';
  return val;
}

qtyInput.addEventListener('input', () => validateQuantity());

// ── Polling ───────────────────────────────────────────────────
function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  pollCount = 0;
  setPollStatus('');
}

async function verifyPayment() {
  if (!currentInvoiceId || !currentQuantity) return;

  try {
    const res = await fetch(`${API_BASE}/credits/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: currentInvoiceId, quantity: currentQuantity }),
    });

    const data = await res.json();

    if (res.ok) {
      stopPolling();
      apiKeyOut.value = data.apiKey || '';
      saveKeyStatus.textContent = '';
      btnSaveKey.disabled = false;
      showResponse(responseSuccess, statusSuccess, bodySuccess, String(res.status), data);
      showSuccess();
      return true;
    }
  } catch (_) {
    // Network blip — keep polling silently
  }
  return false;
}

function startPolling() {
  stopPolling();
  pollCount = 0;
  setPollStatus('Waiting for payment confirmation…');
  btnPaid.textContent = 'I\'ve paid';
  btnPaid.disabled = false;

  pollTimer = setInterval(async () => {
    pollCount++;
    if (pollCount >= POLL_MAX) {
      stopPolling();
      setPollStatus('Taking longer than expected — click "I\'ve paid" to check manually.');
      return;
    }
    await verifyPayment();
  }, POLL_INTERVAL_MS);
}

// ── Back button ──────────────────────────────────────────────
btnBack.addEventListener('click', () => {
  stopPolling();
  currentInvoiceId = null;
  currentQuantity  = null;
  responseAmount.style.display = 'none';
  showAmount();
});

// ── Copy helpers ─────────────────────────────────────────────
function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  });
}

btnCopyInvoice.addEventListener('click', () => copyToClipboard(invoiceInput.value, btnCopyInvoice));
btnCopyKey.addEventListener('click',     () => copyToClipboard(apiKeyOut.value,    btnCopyKey));

// ── Save to localStorage ─────────────────────────────────────
btnSaveKey.addEventListener('click', () => {
  const key = apiKeyOut.value;
  if (!key) return;
  try {
    localStorage.setItem(STORAGE_KEY, key);
    saveKeyStatus.textContent = 'Saved ✓';
    btnSaveKey.disabled = true;
    announce('API key saved to this browser.');
  } catch (_) {
    // localStorage unavailable (e.g. private browsing) — silent fail
  }
});

// ── Generate invoice ─────────────────────────────────────────
btnGenerate.addEventListener('click', async () => {
  const quantity = validateQuantity();
  if (!quantity) return;

  btnGenerate.disabled = true;
  btnGenerate.setAttribute('aria-busy', 'true');
  btnGenerate.textContent = 'Requesting invoice…';

  try {
    const res = await fetch(`${API_BASE}/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });

    const data = await res.json();
    showResponse(responseAmount, statusAmount, bodyAmount, String(res.status), data);

    if (res.status !== 402) {
      announce(`Error ${res.status}: ${data.error || 'Could not generate invoice.'}`);
      return;
    }

    // Store session state
    currentInvoiceId = data.invoiceId;
    currentQuantity  = quantity;

    // Populate invoice field
    const invoiceStr = data.invoice;
    invoiceInput.value = invoiceStr;

    showInvoice();

    // Render QR code after section is visible (best-effort — library may not be available)
    if (typeof QRCode !== 'undefined') {
      qrCanvas.innerHTML = '';
      new QRCode(qrCanvas, {
        text: invoiceStr,
        width: 240,
        height: 240,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M,
      });
    }
  } catch (err) {
    showResponse(responseAmount, statusAmount, bodyAmount, 'Network error', { error: err.message });
    announce('Network error. Could not reach the server.');
  } finally {
    btnGenerate.disabled = false;
    btnGenerate.removeAttribute('aria-busy');
    btnGenerate.textContent = 'Generate invoice ⚡';
  }
});

// ── Manual verify (I've paid button) ─────────────────────────
btnPaid.addEventListener('click', async () => {
  btnPaid.disabled = true;
  btnPaid.setAttribute('aria-busy', 'true');
  btnPaid.textContent = 'Checking…';

  const success = await verifyPayment();

  if (!success) {
    setPollStatus('Payment not yet detected — still checking automatically…');
    btnPaid.textContent = 'Check again';
    btnPaid.disabled = false;
    btnPaid.removeAttribute('aria-busy');
    announce('Payment not yet detected. Still checking automatically.');
  }
});
