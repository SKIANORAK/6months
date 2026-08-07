const MOBILE_BASIC = /\/mobilebasic(?:\/|$)/.test(window.location.pathname);
const SITE_PREFIX = MOBILE_BASIC ? '../' : '';
const DATA_URL = `${SITE_PREFIX}assets/data/products.json`;
const REDUCED_CARD_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

function productCard(product, index) {
  const stock = stockSummary(product);
  const image = assetUrl(product.images?.[0] || '');
  const price = product.priceText || money(product.price);
  return `
    <article class="product-card" style="--card-index:${index}">
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

function initBrandFlight() {
  const body = document.body;
  if (!body.classList.contains('home-page')) return;

  const brand = document.querySelector('.hero-brand-flight');
  const logo = document.querySelector('.home-logo');
  if (!brand || !logo) {
    body.classList.remove('brand-intro-pending');
    body.classList.add('brand-intro-done');
    return;
  }

  const finish = () => {
    brand.classList.add('is-flown');
    logo.classList.add('is-arrived');
    body.classList.remove('brand-intro-pending', 'brand-flight-active');
    body.classList.add('brand-intro-done');
  };

  if (REDUCED_CARD_MOTION || typeof brand.animate !== 'function') {
    finish();
    return;
  }

  const run = () => {
    const sourceRect = brand.getBoundingClientRect();
    const targetRect = logo.getBoundingClientRect();
    if (!sourceRect.width || !targetRect.width) {
      finish();
      return;
    }

    const style = window.getComputedStyle(brand);
    const ghost = document.createElement('div');
    ghost.className = 'brand-flight-ghost';
    ghost.textContent = brand.textContent;
    Object.assign(ghost.style, {
      position: 'fixed',
      left: `${sourceRect.left}px`,
      top: `${sourceRect.top}px`,
      width: `${sourceRect.width}px`,
      height: `${sourceRect.height}px`,
      zIndex: '220',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      fontFamily: style.fontFamily,
      fontStyle: style.fontStyle,
      fontWeight: style.fontWeight,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      color: style.color,
      textAlign: 'center',
      textShadow: style.textShadow,
      transformOrigin: '0 0',
      willChange: 'transform, opacity, text-shadow'
    });

    document.body.append(ghost);
    brand.classList.add('is-flight-source-hidden');
    body.classList.add('brand-flight-active');

    const dx = targetRect.left - sourceRect.left;
    const dy = targetRect.top - sourceRect.top;
    const targetScale = Math.min(.58, Math.max(.2, targetRect.width / sourceRect.width));
    const middleScale = Math.min(.76, Math.max(targetScale + .12, .48));

    const animation = ghost.animate([
      {
        transform: 'translate3d(0,0,0) scale(1)',
        opacity: 1,
        textShadow: '0 0 0 rgba(255,255,255,0)'
      },
      {
        offset: .28,
        transform: `translate3d(${dx * .12}px,${dy * .17}px,0) scale(.94)`,
        opacity: .96,
        textShadow: '0 0 18px rgba(255,255,255,.22)'
      },
      {
        offset: .7,
        transform: `translate3d(${dx * .72}px,${dy * .68}px,0) scale(${middleScale})`,
        opacity: .9,
        textShadow: '0 0 9px rgba(255,255,255,.14)'
      },
      {
        transform: `translate3d(${dx}px,${dy}px,0) scale(${targetScale})`,
        opacity: 1,
        textShadow: '0 0 0 rgba(255,255,255,0)'
      }
    ], {
      duration: MOBILE_BASIC ? 980 : 1120,
      easing: 'cubic-bezier(.18,.76,.2,1)',
      fill: 'forwards'
    });

    animation.finished
      .catch(() => {})
      .then(() => {
        ghost.remove();
        finish();
      });
  };

  window.setTimeout(() => requestAnimationFrame(run), MOBILE_BASIC ? 260 : 360);
}

function animateCards() {
  const cards = [...document.querySelectorAll('.product-card')];
  if (!cards.length) return;

  cards.forEach((card, index) => {
    card.style.setProperty('--card-delay', `${Math.min(index, 5) * 65}ms`);
  });

  if (!('IntersectionObserver' in window) || REDUCED_CARD_MOTION) {
    cards.forEach((card) => card.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -20px' });

  cards.forEach((card) => observer.observe(card));
}

function initImageStates() {
  document.querySelectorAll('.product-card').forEach((card) => {
    const image = card.querySelector('img');
    if (!image) return;
    const ready = () => card.classList.add('image-ready');
    if (image.complete) ready();
    else {
      image.addEventListener('load', ready, { once: true });
      image.addEventListener('error', ready, { once: true });
    }
  });
}

function initCardMotion() {
  const cards = document.querySelectorAll('.product-card');

  if (MOBILE_BASIC) {
    cards.forEach((card) => {
      const release = () => card.classList.remove('is-pressed');
      card.addEventListener('pointerdown', () => card.classList.add('is-pressed'));
      card.addEventListener('pointerup', release);
      card.addEventListener('pointercancel', release);
      card.addEventListener('pointerleave', release);
    });
    return;
  }

  if (!window.matchMedia('(pointer:fine)').matches || REDUCED_CARD_MOTION) return;
  cards.forEach((card) => {
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
    grid.innerHTML = products
      .filter((product) => product.visible !== false)
      .map((product, index) => productCard(product, index))
      .join('');
    requestAnimationFrame(() => {
      initImageStates();
      animateCards();
      initCardMotion();
    });
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p class="muted">каталог временно недоступен</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initBrandFlight();
  updateCartCounter();
  renderProducts();
});
