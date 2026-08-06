const MOBILE_BASIC = /\/mobilebasic(?:\/|$)/.test(window.location.pathname);
const SITE_PREFIX = MOBILE_BASIC ? '../' : '';
const DATA_URL = `${SITE_PREFIX}assets/data/products.json`;

const money = (value) => value === null ? '' : `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;

function assetUrl(path) {
  if (!path || /^(?:[a-z]+:|\/|#)/i.test(path)) return path;
  return `${SITE_PREFIX}${path}`;
}

function productHref(id) {
  const page = MOBILE_BASIC ? 'product.html' : 'product_months.html';
  return `${page}?id=${encodeURIComponent(id)}`;
}

function getCart() {
  try { return JSON.parse(localStorage.getItem('cart_guest')) || []; }
  catch { return []; }
}

function updateCartCounter() {
  const count = getCart().reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('#cart-count').forEach((node) => { node.textContent = count; });
}

function stockSummary(product) {
  if (product.madeToOrder) return { text: 'по запросу', className: 'available' };
  const total = (product.sizes || []).reduce((sum, size) => sum + Math.max(0, Number(size.stock || 0)), 0);
  if (total <= 0) return { text: 'нет в наличии', className: 'sold-out' };
  return { text: `в наличии: ${total} шт.`, className: 'available' };
}

function productCard(product) {
  const stock = stockSummary(product);
  const image = assetUrl(product.images?.[0] || '');
  const price = product.priceText || money(product.price);
  return `
    <article class="product-card">
      <a class="product-link" href="${productHref(product.id)}">
        <div class="product-image">
          <img src="${image}" alt="${product.name}" loading="lazy" decoding="async">
          ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
        </div>
        <div class="product-content">
          <h3 class="product-title">${product.name}</h3>
          <p class="product-description">${product.description}</p>
          <div class="product-row">
            <div class="product-price">${price}</div>
            <div class="product-stock ${stock.className}">${stock.text}</div>
          </div>
        </div>
      </a>
    </article>`;
}

function animateCards() {
  document.querySelectorAll('.product-card').forEach((card, index) => {
    window.setTimeout(() => card.classList.add('is-visible'), 60 * index);
  });
}

function initCardMotion() {
  if (!window.matchMedia('(pointer:fine)').matches || MOBILE_BASIC) return;
  document.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.setProperty('--move-x', `${x * 3}px`);
      card.style.setProperty('--move-y', `${y * 3}px`);
      const image = card.querySelector('img');
      if (image) image.style.transform = `scale(1.025) translate(${x * 3}px,${y * 3}px)`;
    });
    card.addEventListener('mouseleave', () => {
      const image = card.querySelector('img');
      if (image) image.style.transform = '';
    });
  });
}

async function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  try {
    const response = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!response.ok) throw new Error('catalog load failed');
    const products = await response.json();
    grid.innerHTML = products.filter((product) => product.visible !== false).map(productCard).join('');
    requestAnimationFrame(() => {
      animateCards();
      initCardMotion();
    });
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p class="muted">каталог временно недоступен</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartCounter();
  renderProducts();
});
