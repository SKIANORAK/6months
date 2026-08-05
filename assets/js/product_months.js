const DATA_URL = 'assets/data/products.json';
const TELEGRAM_USERNAME = 'SKIANORAK';
let currentProduct = null;
let currentImage = 0;
let selectedSize = '';
let touchStartX = 0;

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
  return (product.sizes || []).reduce((sum, size) => sum + Math.max(0, Number(size.stock || 0)), 0);
}

function sizeMarkup(product) {
  if (product.madeToOrder) return '';
  return `
    <div class="size-block">
      <span>размер и наличие</span>
      <div class="size-grid" id="size-grid">
        ${(product.sizes || []).map((size) => {
          const stock = Math.max(0, Number(size.stock || 0));
          return `<button class="size-option" type="button" data-size="${size.label}" data-stock="${stock}" ${stock <= 0 ? 'disabled' : ''}>
            <span class="size-label">${size.label}</span>
            <span class="size-stock">${stock > 0 ? `${stock} шт.` : 'нет'}</span>
          </button>`;
        }).join('')}
      </div>
      <div class="selected-stock" id="selected-stock"></div>
    </div>`;
}

function actionMarkup(product) {
  if (product.madeToOrder) {
    const text = encodeURIComponent('привет. хочу обсудить индивидуальный заказ от 6 months');
    return `<a class="primary-action secondary-action" href="https://t.me/${TELEGRAM_USERNAME}?text=${text}" target="_blank" rel="noreferrer">обсудить заказ в telegram</a>`;
  }
  const total = availableTotal(product);
  if (total === 0) return '<button class="primary-action" disabled>нет в наличии</button>';
  return '<button class="primary-action" id="add-to-cart" disabled>выберите размер</button>';
}

function renderProduct(product) {
  currentProduct = product;
  currentImage = 0;
  selectedSize = '';
  const page = document.getElementById('product-page');
  const price = product.priceText || money(product.price);
  page.innerHTML = `
    <div class="product-layout">
      <section class="product-gallery">
        <div class="gallery-main" id="gallery-main">
          <img id="main-product-image" src="${product.images[0]}" alt="${product.name}" decoding="async">
          ${product.images.length > 1 ? '<button class="gallery-arrow prev" id="prev-image" aria-label="предыдущее фото">‹</button><button class="gallery-arrow next" id="next-image" aria-label="следующее фото">›</button>' : ''}
          <div class="gallery-counter" id="gallery-counter">1 / ${product.images.length}</div>
        </div>
        <div class="gallery-thumbs">
          ${product.images.map((src, index) => `<button class="gallery-thumb ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="фото ${index + 1}"><img src="${src}" alt="${product.name}, фото ${index + 1}" loading="lazy" decoding="async"></button>`).join('')}
        </div>
      </section>
      <section class="product-info">
        ${product.badge ? `<span class="detail-badge">${product.badge}</span>` : ''}
        <h1 class="detail-title">${product.name}</h1>
        <div class="detail-price">${price}</div>
        <p class="detail-description">${product.description}</p>
        ${sizeMarkup(product)}
        ${actionMarkup(product)}
        <div class="detail-section">
          <h2>о модели</h2>
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

  const gallery = document.getElementById('gallery-main');
  gallery?.addEventListener('touchstart', (event) => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
  gallery?.addEventListener('touchend', (event) => {
    const distance = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(distance) < 45) return;
    setImage(currentImage + (distance < 0 ? 1 : -1));
  }, { passive: true });

  document.querySelectorAll('.size-option').forEach((button) => {
    button.addEventListener('click', () => selectSize(button));
  });
  document.getElementById('add-to-cart')?.addEventListener('click', addToCart);
}

function selectSize(button) {
  selectedSize = button.dataset.size;
  document.querySelectorAll('.size-option').forEach((node) => node.classList.toggle('is-selected', node === button));
  const stock = Number(button.dataset.stock || 0);
  const stockNode = document.getElementById('selected-stock');
  const addButton = document.getElementById('add-to-cart');
  if (stockNode) stockNode.textContent = `в наличии: ${stock} шт.`;
  if (addButton) {
    addButton.disabled = stock <= 0;
    addButton.textContent = stock > 0 ? 'добавить в корзину' : 'нет в наличии';
  }
}

function setImage(index) {
  if (!currentProduct?.images?.length) return;
  currentImage = (index + currentProduct.images.length) % currentProduct.images.length;
  const image = document.getElementById('main-product-image');
  image?.classList.add('is-changing');
  window.setTimeout(() => {
    if (image) image.src = currentProduct.images[currentImage];
    image?.classList.remove('is-changing');
  }, 90);
  document.querySelectorAll('.gallery-thumb').forEach((node, idx) => node.classList.toggle('active', idx === currentImage));
  const counter = document.getElementById('gallery-counter');
  if (counter) counter.textContent = `${currentImage + 1} / ${currentProduct.images.length}`;
}

function addToCart() {
  if (!currentProduct || !selectedSize) return;
  const size = currentProduct.sizes.find((item) => item.label === selectedSize);
  const stock = Math.max(0, Number(size?.stock || 0));
  if (stock <= 0) return;

  const cart = getCart();
  const existing = cart.find((item) => item.id === currentProduct.id && item.size === selectedSize);
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
    size: selectedSize,
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
    const response = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!response.ok) throw new Error('load failed');
    const products = await response.json();
    const product = products.find((item) => item.id === id && item.visible !== false);
    if (!product) throw new Error('not found');
    renderProduct(product);
  } catch (error) {
    console.error(error);
    document.getElementById('product-page').innerHTML = '<div class="not-found"><h1>модель не найдена</h1><p><a href="index.html">вернуться на главную</a></p></div>';
  }
}

document.addEventListener('keydown', (event) => {
  if (!currentProduct || currentProduct.images.length < 2) return;
  if (event.key === 'ArrowLeft') setImage(currentImage - 1);
  if (event.key === 'ArrowRight') setImage(currentImage + 1);
});

document.addEventListener('DOMContentLoaded', init);
