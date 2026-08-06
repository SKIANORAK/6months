const OWNER = 'arcyuke';
const REPO = '6months';
const BRANCH = 'main';
const FILE_PATH = 'assets/data/products.json';
const SESSION_KEY = '6months-admin';

let session = { token: '', sha: '', products: [], login: '' };

function api(path) {
  return `https://api.github.com/repos/${OWNER}/${REPO}${path}`;
}

function headers() {
  return {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${session.token}`,
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

function encodeUtf8(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

function decodeUtf8(value) {
  return decodeURIComponent(escape(atob(value.replace(/\n/g, ''))));
}

function message(id, text, error = false) {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = text;
  node.style.color = error ? '#ff8d8d' : '#aaa';
}

function setBusy(button, busy, busyText) {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
    cache: 'no-store'
  });

  let payload = null;
  try { payload = await response.json(); }
  catch { payload = null; }

  if (!response.ok) {
    const error = new Error(payload?.message || `github: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return payload;
}

async function verifyAccess() {
  const user = await request('https://api.github.com/user');
  if ((user.login || '').toLowerCase() !== OWNER) {
    throw new Error(`этот token принадлежит аккаунту ${user.login || 'неизвестно'}, а нужен ${OWNER}`);
  }

  const repository = await request(api(''));
  const canWrite = Boolean(repository.permissions?.admin || repository.permissions?.maintain || repository.permissions?.push);
  if (!canWrite) {
    throw new Error(`у аккаунта ${OWNER} нет права записи в ${OWNER}/${REPO}`);
  }

  session.login = user.login;
  return user;
}

async function loadCatalog() {
  const file = await request(api(`/contents/${FILE_PATH}?ref=${encodeURIComponent(BRANCH)}`));
  session.sha = file.sha;
  session.products = JSON.parse(decodeUtf8(file.content));
}

function showEditor() {
  document.getElementById('login-panel').hidden = true;
  document.getElementById('editor').hidden = false;
  document.getElementById('editor-status').textContent = `${session.login} · ${OWNER}/${REPO}`;
  renderEditor();
}

async function login() {
  const button = document.getElementById('login');
  session.token = document.getElementById('token').value.trim();

  if (!session.token) {
    message('login-message', 'введите github token', true);
    return;
  }

  message('login-message', 'проверка владельца и доступа...');
  setBusy(button, true, 'проверка...');

  try {
    await verifyAccess();
    await loadCatalog();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: session.token }));
    message('login-message', '');
    showEditor();
  } catch (error) {
    console.error(error);
    sessionStorage.removeItem(SESSION_KEY);
    session.token = '';
    document.getElementById('token').value = '';
    message('login-message', error.message || 'не удалось войти', true);
  } finally {
    setBusy(button, false);
  }
}

function logout(reason = '') {
  sessionStorage.removeItem(SESSION_KEY);
  session = { token: '', sha: '', products: [], login: '' };
  document.getElementById('token').value = '';
  document.getElementById('editor').hidden = true;
  document.getElementById('login-panel').hidden = false;
  document.getElementById('product-editor').innerHTML = '';
  message('save-message', '');
  message('login-message', reason);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderEditor() {
  const root = document.getElementById('product-editor');
  root.innerHTML = session.products.map((product, index) => `
    <article class="product-editor-card" data-product="${index}">
      <h2>${escapeHtml(product.name)}</h2>
      <div class="editor-grid">
        <div class="field"><label>название<input data-field="name" value="${escapeHtml(product.name)}"></label></div>
        <div class="field"><label>цена<input data-field="price" type="number" min="0" step="1" value="${product.price ?? ''}" ${product.madeToOrder ? 'disabled' : ''}></label></div>
        <div class="field"><label>видимость<select data-field="visible"><option value="true" ${product.visible !== false ? 'selected' : ''}>показывать</option><option value="false" ${product.visible === false ? 'selected' : ''}>скрыть</option></select></label></div>
      </div>
      ${product.madeToOrder ? '' : `<div class="sizes-editor"><strong>размеры и наличие</strong><div class="size-list">${(product.sizes || []).map((size, sizeIndex) => sizeRow(size, sizeIndex)).join('')}</div><button type="button" class="add-size" data-action="add-size">добавить размер</button></div>`}
    </article>`).join('');

  root.querySelectorAll('[data-action="add-size"]').forEach((button) => button.addEventListener('click', () => {
    if (!collect(false)) return;
    const productIndex = Number(button.closest('[data-product]').dataset.product);
    session.products[productIndex].sizes.push({ label: '', stock: 0 });
    renderEditor();
  }));

  root.querySelectorAll('[data-action="remove-size"]').forEach((button) => button.addEventListener('click', () => {
    if (!collect(false)) return;
    const card = button.closest('[data-product]');
    session.products[Number(card.dataset.product)].sizes.splice(Number(button.dataset.size), 1);
    renderEditor();
  }));

  root.querySelectorAll('[data-stock-step]').forEach((button) => button.addEventListener('click', () => {
    const row = button.closest('[data-size-row]');
    const input = row.querySelector('[data-size-field="stock"]');
    const next = Math.max(0, Math.trunc(Number(input.value || 0) + Number(button.dataset.stockStep)));
    input.value = next;
  }));
}

function sizeRow(size, index) {
  return `<div class="size-row" data-size-row="${index}">
    <div class="field"><label>размер<input data-size-field="label" value="${escapeHtml(size.label)}"></label></div>
    <div class="field stock-field"><label>наличие<div class="stock-control"><button type="button" data-stock-step="-1">−</button><input data-size-field="stock" type="number" min="0" step="1" value="${Math.max(0, Math.trunc(Number(size.stock || 0)))}"><button type="button" data-stock-step="1">+</button></div></label></div>
    <button type="button" data-action="remove-size" data-size="${index}">удалить</button>
  </div>`;
}

function collect(showErrors = true) {
  try {
    document.querySelectorAll('[data-product]').forEach((card) => {
      const index = Number(card.dataset.product);
      const product = session.products[index];
      const name = card.querySelector('[data-field="name"]').value.trim();
      if (!name) throw new Error('название товара не может быть пустым');
      product.name = name;

      const price = card.querySelector('[data-field="price"]');
      if (price && !price.disabled) {
        const value = Number(price.value);
        if (!Number.isFinite(value) || value < 0) throw new Error(`проверьте цену товара «${name}»`);
        product.price = Math.round(value);
      }

      product.visible = card.querySelector('[data-field="visible"]').value === 'true';
      const rows = [...card.querySelectorAll('[data-size-row]')];

      if (rows.length) {
        const sizes = rows.map((row) => {
          const label = row.querySelector('[data-size-field="label"]').value.trim().toLowerCase();
          const stockValue = Number(row.querySelector('[data-size-field="stock"]').value);
          if (!label) throw new Error(`у товара «${name}» есть пустой размер`);
          if (!Number.isFinite(stockValue) || stockValue < 0) throw new Error(`проверьте остаток размера ${label}`);
          return { label, stock: Math.trunc(stockValue) };
        });

        const labels = sizes.map((size) => size.label);
        if (new Set(labels).size !== labels.length) throw new Error(`у товара «${name}» повторяются размеры`);
        product.sizes = sizes;
      }
    });

    message('save-message', '');
    return true;
  } catch (error) {
    if (showErrors) message('save-message', error.message, true);
    return false;
  }
}

async function save() {
  if (!collect(true)) return;

  const button = document.getElementById('save');
  message('save-message', 'проверка доступа...');
  setBusy(button, true, 'сохранение...');

  try {
    await verifyAccess();

    const latest = await request(api(`/contents/${FILE_PATH}?ref=${encodeURIComponent(BRANCH)}`));
    if (latest.sha !== session.sha) {
      throw new Error('каталог уже изменился в другом месте. обновите страницу и войдите заново');
    }

    const result = await request(api(`/contents/${FILE_PATH}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'update catalog from глав.net',
        content: encodeUtf8(`${JSON.stringify(session.products, null, 2)}\n`),
        sha: session.sha,
        branch: BRANCH
      })
    });

    session.sha = result.content.sha;
    message('save-message', 'готово. github pages опубликует изменения автоматически.');
  } catch (error) {
    console.error(error);
    message('save-message', `ошибка сохранения: ${error.message}`, true);
    if (error.status === 401 || error.status === 403) {
      window.setTimeout(() => logout('сессия завершена. войдите заново.'), 900);
    }
  } finally {
    setBusy(button, false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (saved?.token) document.getElementById('token').value = saved.token;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
  }

  document.getElementById('login').addEventListener('click', login);
  document.getElementById('save').addEventListener('click', save);
  document.getElementById('logout').addEventListener('click', () => logout('вы вышли из глав.net'));
  document.getElementById('token').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') login();
  });
});
