const IS_MOBILE_BASIC = /\/mobilebasic(?:\/|$)/.test(window.location.pathname);
const SITE_ROOT = IS_MOBILE_BASIC ? '../' : '';
const VERSION_STORAGE_KEY = '6months-view-mode';

function pageForVersion(targetVersion) {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  params.delete('view');
  params.set('view', targetVersion);
  const search = `?${params.toString()}`;

  if (targetVersion === 'desktop') {
    if (/\/mobilebasic\/product\.html$/.test(path)) return `../product_months.html${search}`;
    if (/\/mobilebasic\/bag\.html$/.test(path)) return `../bag.html${search}`;
    if (/\/mobilebasic\/about\.html$/.test(path)) return `../about.html${search}`;
    return `../index.html${search}`;
  }

  if (/\/product_months\.html$/.test(path)) return `mobilebasic/product.html${search}`;
  if (/\/bag\.html$/.test(path)) return `mobilebasic/bag.html${search}`;
  if (/\/about\.html$/.test(path)) return `mobilebasic/about.html${search}`;
  return `mobilebasic/${search}`;
}

function footerMarkup() {
  const aboutHref = 'about.html';
  const adminHref = `${SITE_ROOT}admin.html`;
  const switchMode = IS_MOBILE_BASIC ? 'desktop' : 'mobile';
  const switchLabel = IS_MOBILE_BASIC ? 'полная версия' : 'мобильная версия';
  const switchHref = pageForVersion(switchMode);

  return `
<footer class="main-footer">
  <div class="footer-content">
    <div class="footer-section">
      <h3>связь</h3>
      <p><a href="https://t.me/highallowww" target="_blank" rel="noreferrer">telegram канал</a></p>
      <p><a href="https://www.tiktok.com/@6ixmonth.s" target="_blank" rel="noreferrer">tik tok</a></p>
    </div>
    <div class="footer-section">
      <h3>заказы</h3>
      <p><a href="https://t.me/SKIANORAK" target="_blank" rel="noreferrer">@skianorak</a></p>
      <p>доставка рассчитывается отдельно</p>
    </div>
    <div class="footer-section">
      <h3>информация</h3>
      <p><a href="${aboutHref}">о бренде</a></p>
      <p><a href="${switchHref}" data-view-switch="${switchMode}">${switchLabel}</a></p>
      <p><a href="${adminHref}" class="admin-entry">глав.net</a></p>
    </div>
  </div>
  <div class="footer-bottom">© <span data-current-year></span> 6 months</div>
</footer>`;
}

function mountFooter() {
  document.querySelectorAll('[data-site-footer]').forEach((node) => {
    node.innerHTML = footerMarkup();
  });

  document.querySelectorAll('[data-current-year]').forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  document.querySelectorAll('[data-view-switch]').forEach((link) => {
    link.addEventListener('click', () => {
      localStorage.setItem(VERSION_STORAGE_KEY, link.dataset.viewSwitch);
    });
  });
}

function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const update = () => header.classList.toggle('is-scrolled', window.scrollY > 18);
  update();
  window.addEventListener('scroll', update, { passive: true });
}

function initReveal() {
  const nodes = document.querySelectorAll('[data-reveal]');
  if (!nodes.length) return;
  if (!('IntersectionObserver' in window)) {
    nodes.forEach((node) => node.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
  nodes.forEach((node) => observer.observe(node));
}

function initHeroVideo() {
  const video = document.querySelector('.hero-media video');
  if (!video) return;
  const ready = () => video.classList.add('is-ready');
  if (video.readyState >= 2) ready();
  else video.addEventListener('loadeddata', ready, { once: true });
}

document.addEventListener('DOMContentLoaded', () => {
  mountFooter();
  initHeader();
  initReveal();
  initHeroVideo();
});
