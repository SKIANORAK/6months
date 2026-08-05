const DATA_URL = 'assets/data/products.json';
const TELEGRAM_USERNAME = 'SKIANORAK';
let currentProduct = null;
let currentImage = 0;

const money = (value) => value === null ? '' : `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;

function getCart() {
  try { return JSON.parse(localStorage.getItem('cart_guest')) || []; }
  catch { return []; }
}

function saveCart(cart) { localStorage.setItem('cart_guest', JSON.stringify(cart)); }

function updateCartCounter() {
  const count = getCart().reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('#cart-count').forEach((node) => { node.textContent = count; });
}

function showAlert(text) {
  const alert = document.getElementById('custom-alert');
  if (!alert) return;
  alert.textContent = text;
  alert.classList.add('show');
  window.setTimeout(() => alert.classList.remove('show'), 1600);
}

function availableTotal(product) {
  if (product.madeToOrder) return null;
  if ((product.sizes || []).some((size) => size.stock === null)) return null;
  return (product.sizes || []).reduce((sum, size) => sum + Number(size.stock || 0), 0);
}

function sizeOptions(product) {
  if (product.madeToOrder) return '';
  const options = (product.sizes || []).map((size) => {
    const stockText = size.stock === null ? 'наличие уточняется' : size.stock > 0 ? `${size.stock} шт.` : 'нет в наличии';
    const disabled = size.stock === 0 ? 'disabled' : '';
    return `<option value="${size.label}" data-stock="${size.stock ?? ''}" ${disabled}>${size.label} — ${stockText}</option>`;
  }).join('');
  return `
    <div class="size-block">
      <label for="size-select">размер и наличие</label>
      <select class="size-select" id="size-select">
        <option value="">выберите размер</option>
        ${options}
      </select>
      <div class="selected-stock" id="selected-stock"></div>
    </div>`;
}

function actionMarkup(product) {
  if (product.madeToOrder) {
    const text = encodeURIComponent(`привет. хочу обсудить custom order от «пол года»`);
    return `<a class="primary-action secondary-action" href="https://t.me/${TELEGRAM_USERNAME}?text=${text}" target="_blank" rel="noreferrer">обсудить заказ в telegram</a>`;
  }
  const total = availableTotal(product);
  if (total === 0) return '<button class="primary-action" disabled>нет в наличии</button>';
  return '<button class="primary-action" id="add-to-cart" disabled>добавить в корзину</button>';
}

function renderProduct(product) {
  currentProduct = product;
  currentImage = 0;
  const page = document.getElementById('product-page');
  const price = product.priceText || money(product.price);
  page.innerHTML = `
    <div class="product-layout">
      <section>
        <div class="gallery-main">
          <img id="main-product-image" src="${product.images[0]}" alt="${product.name}">
          ${product.images.length > 1 ? '<button class="gallery-arrow prev" id="prev-image" aria-label="предыдущее фото">‹</button><button class="gallery-arrow next" id="next-image" aria-label="следующее фото">›</button>' : ''}
        </div>
        <div class="gallery-thumbs">
          ${product.images.map((src, index) => `<button class="gallery-thumb ${index === 0 ? 'active' : ''}" data-index="${index}"><img src="${src}" alt="${product.name}, фото ${index + 1}"></button>`).join('')}
        </div>
      </section>
      <section class="product-info">
        ${product.badge ? `<span class="detail-badge">${product.badge}</span>` : ''}
        <h1 class="detail-title">${product.name}</h1>
        <div class="detail-price">${price}</div>
        <p class="detail-description">${product.description}</p>
        ${sizeOptions(product)}
        ${actionMarkup(product)}
        <div class="detail-section">
          <h2>о вещи</h2>
          <ul>${product.characteristics.map((item) => `<li>${item}</li>`).join('')}</ul>
        </div>
        <div class="detail-section">
          <h2>идея</h2>
          <p>${product.philosophy}</p>
        </div>
      </section>
    </div>`;

  document.querySelectorAll('.gallery-thumb').forEach((button) => {
    button.addEventListener('click', () => setImage(Number(button.dataset.index)));
  });
  document.getElementById('prev-image')?.addEventListener('click', () => setImage(currentImage - 1));
  document.getElementById('next-image')?.addEventListener('click', () => setImage(currentImage + 1));

  const select = document.getElementById('size-select');
  const addButton = document.getElementById('add-to-cart');
  select?.addEventListener('change', () => {
    const option = select.selectedOptions[0];
    const stockNode = document.getElementById('selected-stock');
    const stock = option?.dataset.stock;
    if (!select.value) {
      stockNode.textContent = '';
      if (addButton) addButton.disabled = true;
      return;
    }
    stockNode.textContent = stock === '' ? 'наличие уточняется — напишите перед заказом' : `в наличии: ${stock} шт.`;
    if (addButton) {
      addButton.disabled = stock === '' || Number(stock) <= 0;
      addButton.textContent = stock === '' ? 'уточнить наличие' : 'добавить в корзину';
    }
  });
  addButton?.addEventListener('click', addToCart);
}

function setImage(index) {
  if (!currentProduct) return;
  currentImage = (index + currentProduct.images.length) % currentProduct.images.length;
  document.getElementById('main-product-image').src = currentProduct.images[currentImage];
  document.querySelectorAll('.gallery-thumb').forEach((node, idx) => node.classList.toggle('active', idx === currentImage));
}

function addToCart() {
  const select = document.getElementById('size-select');
  const option = select?.selectedOptions[0];
  if (!currentProduct || !select?.value || !option) return;
  const stock = Number(option.dataset.stock);
  if (!Number.isFinite(stock) || stock <= 0) return;

  const cart = getCart();
  const existing = cart.find((item) => item.id === currentProduct.id && item.size === select.value);
  const currentQuantity = existing?.quantity || 0;
  if (currentQuantity >= stock) {
    showAlert('больше вещей этого размера нет');
    return;
  }
  if (existing) existing.quantity += 1;
  else cart.push({
    id: currentProduct.id,
    name: currentProduct.name,
    price: currentProduct.price,
    size: select.value,
    image: currentProduct.images[0],
    quantity: 1,
    stock
  });
  saveCart(cart);
  updateCartCounter();
  showAlert('добавлено в корзину');
}

async function init() {
  updateCartCounter();
  const id = new URLSearchParams(location.search).get('id');
  try {
    const response = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('load failed');
    const products = await response.json();
    const product = products.find((item) => item.id === id && item.visible !== false);
    if (!product) throw new Error('not found');
    document.title = `${product.name} — пол года`;
    renderProduct(product);
  } catch (error) {
    console.error(error);
    document.getElementById('product-page').innerHTML = '<div class="not-found"><h1>вещь не найдена</h1><p><a href="index.html">вернуться на главную</a></p></div>';
  }
}

document.addEventListener('DOMContentLoaded', init);
