// Work coverflow: old-iTunes 3D stack from the shoot Query grid. No deps.
// ponytail: transforms server-rendered cards at runtime — grid stays as the
// no-JS fallback and the editor surface; delete file to revert to the grid.
(function () {
  // Entrance cascade trigger: two painted frames of the hidden state first,
  // then is-ready — runs regardless of build outcome so nothing sticks hidden.
  function markReady() {
    var done = function () { if (document.body) document.body.classList.add('is-ready'); };
    // double-rAF + beat: guarantees one painted frame of the hidden state first
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () { setTimeout(done, 80); });
      });
    } else {
      done();
    }
  }
  markReady();
  var source = document.querySelector('.coverflow-page .wp-block-post-template');
  if (!source) return;
  var cards = Array.prototype.filter.call(source.children, function (el) {
    return el.tagName === 'LI';
  });
  if (cards.length < 2) return;

  // Harvest thumbnail + title + subtitle (excerpt) + hyperlink from each card.
  var items = cards.map(function (li) {
    var img = li.querySelector('img');
    var link = li.querySelector('.wp-block-post-title a') || li.querySelector('a');
    var title = li.querySelector('.wp-block-post-title');
    var sub = li.querySelector('.wp-block-post-excerpt');
    return {
      src: img ? img.currentSrc || img.src : '',
      alt: img ? img.alt : '',
      url: link ? link.href : '',
      title: title ? title.textContent.trim() : '',
      sub: sub ? sub.textContent.trim() : '',
    };
  }).filter(function (it) { return it.src; });
  if (items.length < 2) return;

  var n = items.length, idx = 0, x0 = null;

  var stage = document.createElement('div');
  stage.className = 'coverflow';
  stage.setAttribute('role', 'region');
  stage.setAttribute('aria-roledescription', 'carousel');
  stage.setAttribute('aria-label', 'Shoots');
  var deck = document.createElement('div');
  deck.className = 'coverflow-deck';
  stage.appendChild(deck);

  var slides = items.map(function (it, i) {
    var a = document.createElement('a');
    a.className = 'coverflow-slide';
    a.href = it.url;
    a.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
    a.setAttribute('tabindex', i === 0 ? '0' : '-1');
    var img = document.createElement('img');
    img.src = it.src;
    img.alt = it.alt || it.title;
    if (i > 1) { img.setAttribute('loading', 'lazy'); img.setAttribute('decoding', 'async'); }
    a.appendChild(img);
    a.addEventListener('click', function (e) {
      if (i !== idx) { e.preventDefault(); go(i); } // side covers center first
    });
    deck.appendChild(a);
    return a;
  });

  var caption = document.createElement('p');
  caption.className = 'coverflow-caption';
  stage.appendChild(caption);
  var subline = document.createElement('p');
  subline.className = 'coverflow-sub';
  stage.appendChild(subline);

  function arrow(dir, label, path) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'hero-arrow flow-' + dir;
    b.setAttribute('aria-label', label);
    b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + path + '"/></svg>';
    b.addEventListener('click', function () { go(idx + (dir === 'next' ? 1 : -1)); });
    stage.appendChild(b);
  }
  arrow('prev', 'Previous shoot', 'M15 18l-6-6 6-6');
  arrow('next', 'Next shoot', 'M9 18l6-6-6-6');

  function paint() {
    slides.forEach(function (s, i) {
      var off = i - idx;
      var abs = Math.abs(off);
      s.style.transform =
        'translateX(' + off * 58 + '%)' +
        ' translateZ(' + -abs * 140 + 'px)' +
        ' rotateY(' + (off === 0 ? 0 : off < 0 ? 48 : -48) + 'deg)';
      s.style.zIndex = String(100 - abs);
      s.style.opacity = abs > 3 ? '0' : String(1 - abs * 0.22);
      s.style.filter = abs === 0 ? 'none' : 'brightness(' + (1 - abs * 0.18) + ')';
      s.style.pointerEvents = abs > 3 ? 'none' : 'auto';
      s.setAttribute('aria-hidden', off === 0 ? 'false' : 'true');
      s.setAttribute('tabindex', off === 0 ? '0' : '-1');
    });
    caption.textContent = items[idx].title;
    subline.textContent = items[idx].sub;
    subline.style.display = items[idx].sub ? '' : 'none';
  }
  function go(i) {
    idx = Math.max(0, Math.min(n - 1, i)); // clamped ends, like iTunes
    paint();
  }

  stage.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') go(idx - 1);
    else if (e.key === 'ArrowRight') go(idx + 1);
  });
  stage.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  }, { passive: true });

  source.style.display = 'none';
  source.parentNode.insertBefore(stage, source.nextSibling);
  paint();
})();
