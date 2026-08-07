const HOME_BURN_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initHomeBrandBurn() {
  const body = document.body;
  if (!body.classList.contains('home-burn-page')) return;

  const brand = document.querySelector('.hero-brand-flight');
  const logo = document.querySelector('.home-logo');
  if (!brand || !logo) {
    body.classList.remove('brand-intro-pending', 'brand-burn-active');
    body.classList.add('brand-intro-done');
    return;
  }

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    brand.classList.add('is-burned');
    logo.classList.add('is-arrived');
    body.classList.remove('brand-intro-pending', 'brand-burn-active');
    body.classList.add('brand-intro-done');
  };

  if (HOME_BURN_REDUCED) {
    finish();
    return;
  }

  const startBurn = () => {
    body.classList.add('brand-burn-active');
    brand.addEventListener('animationend', (event) => {
      if (event.animationName === 'brandBurnOut') finish();
    }, { once: true });
    window.setTimeout(finish, 1040);
  };

  window.setTimeout(() => requestAnimationFrame(startBurn), 300);
}

document.addEventListener('DOMContentLoaded', initHomeBrandBurn);
