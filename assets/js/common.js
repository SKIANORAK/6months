const SITE_FOOTER = `
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
      <p><a href="about.html">о бренде</a></p>
      <p><a href="admin.html" class="admin-entry">глав.net</a></p>
    </div>
  </div>
  <div class="footer-bottom">© <span data-current-year></span> 6 months</div>
</footer>`;

function mountFooter() {
  document.querySelectorAll('[data-site-footer]').forEach((node) => {
    node.innerHTML = SITE_FOOTER;
  });
  document.querySelectorAll('[data-current-year]').forEach((node) => {
    node.textContent = new Date().getFullYear();
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
