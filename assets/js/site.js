const DATA_URL = 'assets/data/products.json';

const money = (value) => value === null ? '' : `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;

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
  const values = (product.sizes || []).map((size) => size.stock);
  if (values.some((value) => value === null)) return { text: 'наличие уточняется', className: '' };
  const total = values.reduce((sum, value) => sum + Number(value || 0), 0);
  if (total <= 0) return { text: 'нет в наличии', className: 'sold-out' };
  return { text: `в наличии: ${total} шт.`, className: 'available' };
}

function productCard(product) {
  const stock = stockSummary(product);
  const image = product.images?.[0] || '';
  const price = product.priceText || money(product.price);
  return `
    <article class="product-card">
      <a class="product-link" href="product_months.html?id=${encodeURIComponent(product.id)}">
        <div class="product-image">
          <img src="${image}" alt="${product.name}" loading="lazy">
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

async function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  try {
    const response = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('catalog load failed');
    const products = await response.json();
    grid.innerHTML = products.filter((product) => product.visible !== false).map(productCard).join('');
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p class="muted">каталог временно недоступен</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartCounter();
  renderProducts();
});
