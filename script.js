function go(position, url) {
  if (typeof gtag === 'function') {
    gtag('event', 'click_telegram', {
      link_position: position,
      link_url: url
    });
  }

  setTimeout(() => {
    window.location.href = url;
  }, 200);
}

(function () {
  const DURATION = 10 * 60;
  const minsEl = document.getElementById('timer-mins');
  const secsEl = document.getElementById('timer-secs');

  if (!minsEl || !secsEl) return;

  let remaining = DURATION;

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function tick() {
    minsEl.textContent = pad(Math.floor(remaining / 60));
    secsEl.textContent = pad(remaining % 60);

    if (remaining <= 0) {
      remaining = DURATION;
    } else {
      remaining--;
    }
  }

  tick();
  setInterval(tick, 1000);
})();