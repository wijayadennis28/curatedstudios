// Hero carousel: seamless infinite slide loop, arrows, swipe, autoplay. No deps.
// ponytail: plain JS on core Image blocks — no slider lib, delete file if carousel is removed.
(function () {
  var viewport = document.querySelector('.hero-carousel');
  if (!viewport) return;
  var slides = Array.prototype.filter.call(viewport.children, function (el) {
    return el.tagName === 'FIGURE';
  });
  if (slides.length < 2) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var n = slides.length;

  var track = document.createElement('div');
  track.className = 'hero-track';
  slides.forEach(function (s, i) {
    s.classList.add('hero-slide');
    var img = s.querySelector('img');
    if (img && i > 0) { img.setAttribute('loading', 'lazy'); img.setAttribute('decoding', 'async'); }
    track.appendChild(s);
  });

  // pos = track-child index. Real slide i lives at pos i+1.
  var pos = 1, timer = null, x0 = null, dots = [];

  function paint() {
    track.style.transform = 'translateX(' + -pos * 100 + '%)';
    var r = real();
    slides.forEach(function (s, i) {
      s.setAttribute('aria-hidden', r === i ? 'false' : 'true');
    });
    dots.forEach(function (d, i) {
      var on = r === i;
      d.classList.toggle('is-active', on);
      if (on) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
  }
  function real() { return ((pos - 1) % n + n) % n; }

  if (!reduce) {
    // Clone both ends so motion never reverses: [n-1][0..n-1][0].
    var first = slides[0].cloneNode(true), last = slides[n - 1].cloneNode(true);
    first.setAttribute('aria-hidden', 'true');
    last.setAttribute('aria-hidden', 'true');
    first.querySelectorAll('img').forEach(function (img) { img.setAttribute('loading', 'lazy'); });
    track.insertBefore(last, track.firstChild);
    track.appendChild(first);
    // Invisible snap-back when parked on a clone.
    track.addEventListener('transitionend', function (e) {
      if (e.propertyName !== 'transform') return;
      if (pos === 0) { pos = n; snap(); }
      else if (pos === n + 1) { pos = 1; snap(); }
    });
  }
  function snap() {
    track.style.transition = 'none';
    paint();
    void track.offsetWidth; // reflow flushes the jump before restoring motion
    track.style.transition = '';
  }

  viewport.appendChild(track);
  paint();

  var DELAY = 5000;

  function go(d) {
    if (!reduce && (pos + d < 0 || pos + d > n + 1)) return; // ignore mashing past the edge
    pos = reduce ? (((pos - 1 + d) % n + n) % n) + 1 : pos + d;
    paint();
  }
  function goTo(i) {
    pos = i + 1;
    paint();
  }
  function play() { stop(); if (!reduce) timer = setInterval(function () { go(1); }, DELAY); }
  function stop() { if (timer) clearInterval(timer); timer = null; }
  function wake() {
    // early tap fast-forwards the whole staged intro, then behaves normally
    if (document.body) { document.body.classList.add('is-playing'); document.body.classList.add('is-staged'); }
    play();
  }

  // Bottom pill: prev + one dot per photo + next. Built here so the
  // editor stays clean hand-picked images and dots always match the count.
  var pill = document.createElement('div');
  pill.className = 'hero-dots';
  pill.setAttribute('role', 'group');
  pill.setAttribute('aria-label', 'Choose slide');
  function pillBtn(cls, label, svgPath) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.setAttribute('aria-label', label);
    if (svgPath) b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + svgPath + '"/></svg>';
    return b;
  }
  var prev = pillBtn('hero-arrow hero-prev', 'Previous photo', 'M15 18l-6-6 6-6');
  prev.addEventListener('click', function () { go(-1); wake(); });
  pill.appendChild(prev);
  slides.forEach(function (_, i) {
    var d = pillBtn('hero-dot', 'Go to photo ' + (i + 1), null);
    d.addEventListener('click', function () { goTo(i); wake(); });
    dots.push(d);
    pill.appendChild(d);
  });
  var next = pillBtn('hero-arrow hero-next', 'Next photo', 'M9 18l6-6-6-6');
  next.addEventListener('click', function () { go(1); wake(); });
  pill.appendChild(next);
  viewport.appendChild(pill);
  paint(); // sync initial active dot

  // Centered hero mark: same Site Logo file as the loader, non-interactive
  // so it never swallows swipe/drag gestures. Skipped if no logo is set.
  var brandSrc = (window.photoLoader && window.photoLoader.logo) || '';
  if (brandSrc) {
    var brand = document.createElement('div');
    brand.className = 'hero-brand';
    brand.setAttribute('aria-hidden', 'true');
    var brandImg = document.createElement('img');
    brandImg.src = brandSrc;
    brandImg.alt = '';
    brandImg.setAttribute('decoding', 'async');
    brand.appendChild(brandImg);
    viewport.appendChild(brand);
  }

  viewport.addEventListener('pointerdown', stop);
  viewport.addEventListener('pointerup', wake);
  viewport.addEventListener('pointercancel', wake);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else wake();
  });
  viewport.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; stop(); }, { passive: true });
  viewport.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    x0 = null; wake();
  }, { passive: true });

  // Start paused: the loader cues us (photo:play) once the staged intro
  // reaches the slider's turn. Failsafe + early taps via wake() included.
  if (document.body && document.body.classList.contains('is-playing')) {
    play();
  } else {
    document.addEventListener('photo:play', function cue() {
      document.removeEventListener('photo:play', cue);
      play();
    });
    setTimeout(play, 10000); // failsafe: never sit static forever
  }
})();
