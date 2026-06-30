// ===== Phone mask: +998 (XX) XXX-XX-XX =====
const phoneInput = document.getElementById('phoneInput');

function formatPhone(raw) {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  digits = digits.slice(0, 9);

  let out = '+998';
  if (digits.length > 0) out += ' (' + digits.slice(0, 2);
  if (digits.length >= 2) out += ')';
  if (digits.length >= 2) out += ' ' + digits.slice(2, 5);
  if (digits.length >= 5) out += '-' + digits.slice(5, 7);
  if (digits.length >= 7) out += '-' + digits.slice(7, 9);
  return out;
}

if (phoneInput) {
  phoneInput.addEventListener('focus', () => {
    if (!phoneInput.value) phoneInput.value = '+998 ';
  });
  phoneInput.addEventListener('input', (e) => {
    e.target.value = formatPhone(e.target.value);
  });
  phoneInput.addEventListener('blur', () => {
    if (phoneInput.value.trim() === '+998' || phoneInput.value.trim() === '+998 (') {
      phoneInput.value = '';
    }
  });
}

// ===== Form validation & submit =====
const form = document.getElementById('enrollForm');
const successEl = document.getElementById('formSuccess');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');

function setFieldError(name, message) {
  const field = form.querySelector(`[name="${name}"]`).closest('.field');
  const errorEl = field.querySelector('.field-error');
  if (message) {
    field.classList.add('invalid');
    errorEl.textContent = message;
  } else {
    field.classList.remove('invalid');
    errorEl.textContent = '';
  }
}

function validate(data) {
  let ok = true;
  if (!data.parentName || data.parentName.trim().length < 2) {
    setFieldError('parentName', 'Ism va familiya kiriting (kamida 2 ta belgi)');
    ok = false;
  } else {
    setFieldError('parentName', '');
  }
  if (!data.grade) {
    setFieldError('grade', 'Farzandingiz sinfini tanlang');
    ok = false;
  } else {
    setFieldError('grade', '');
  }
  const digits = (data.phone || '').replace(/\D/g, '');
  if (digits.length !== 12 || !digits.startsWith('998')) {
    setFieldError('phone', "To'liq telefon raqamini kiriting: +998 (__) ___-__-__");
    ok = false;
  } else {
    setFieldError('phone', '');
  }
  return ok;
}

// Live clear errors on input
form?.querySelectorAll('input, select').forEach((el) => {
  el.addEventListener('input', () => {
    el.closest('.field')?.classList.remove('invalid');
  });
  el.addEventListener('change', () => {
    el.closest('.field')?.classList.remove('invalid');
  });
});

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const data = {
    parentName: (fd.get('parentName') || '').toString().trim(),
    grade: (fd.get('grade') || '').toString().trim(),
    phone: (fd.get('phone') || '').toString().trim(),
  };

  if (!validate(data)) {
    form.querySelector('.field.invalid input, .field.invalid select')?.focus();
    return;
  }

  submitBtn.classList.add('loading');
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        source: 'saminov-school-website',
        userAgent: navigator.userAgent,
        ts: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || 'Server error');
    }

    form.hidden = true;
    successEl.hidden = false;
    successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    alert("Yuborishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring yoki +998 (90) 700-44-04 ga qo'ng'iroq qiling.");
    console.error('submit error:', err);
  } finally {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
});

resetBtn?.addEventListener('click', () => {
  form.reset();
  form.hidden = false;
  successEl.hidden = true;
  form.querySelectorAll('.field.invalid').forEach((f) => f.classList.remove('invalid'));
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// ===== Footer year =====
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
