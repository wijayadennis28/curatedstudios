// Front-page loader: black curtain + logo mark, lifts once the full slider is ready.
// Once per session. ponytail: JS-injected = no-JS visitors never see it; delete file to remove.
(function () {
  function ready(instant) {
    // staged entrances run off body.is-ready; every exit path must set it.
    // instant (skip paths) also kills transitions so repeats never replay acts.
    setBody('is-ready');
    if (instant) setBody('is-instant');
  }
  function playing(instant) {
    // slider + logo-drop cue; instant on skip paths, staged after the acts.
    // is-staged marks a full show so the logo drop animates only then.
    if (instant) { setBody('is-playing'); cue(); return; }
    setTimeout(function () { setBody('is-playing'); setBody('is-staged'); cue(); }, 2400);
  }
  function setBody(cls) {
    if (document.body) document.body.classList.add(cls);
    else document.addEventListener('DOMContentLoaded', function r() {
      document.removeEventListener('DOMContentLoaded', r);
      document.body.classList.add(cls);
    });
  }
  function cue() {
    try { window.dispatchEvent(new window.Event('photo:play')); } catch (e) {}
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { ready(true); playing(true); return; }
  // ?loader=1 forces a preview replay without touching the session flag.
  var preview = /[?&]loader=1\b/.test(window.location.search || '');
  if (!preview) {
    try {
      if (sessionStorage.getItem('photoLoaderSeen')) { ready(true); playing(true); return; }
    } catch (e) {}
  }

  var data = window.photoLoader || {};
  var loader = document.createElement('div');
  loader.className = 'site-loader';
  loader.setAttribute('aria-hidden', 'true');
  loader.innerHTML = data.logo
    ? '<img src="' + data.logo + '" alt="" />'
    : '<span class="site-loader-word">' + (data.name || '') + '</span>';

  (document.body || document.documentElement).appendChild(loader);

  var armed = false;
  function arm() {
    if (armed) return;
    armed = true;
    if (loader.parentNode === document.documentElement && document.body) {
      document.body.appendChild(loader); // settle in final location first
    }
    void loader.offsetWidth; // force style recalc so the start state commits
    var fire = function () { loader.classList.add('is-in'); };
    var mark = loader.querySelector('img');
    var trigger = function () {
      // one painted frame of the start state, then go — transition can't collapse
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(function () {
          setTimeout(fire, 120);
        });
      } else {
        fire();
      }
    };
    if (mark && !mark.complete) {
      // let the logo arrive before it starts travelling; never wait forever
      var to = setTimeout(trigger, 900);
      var early = function () { clearTimeout(to); trigger(); };
      mark.addEventListener('load', early, { once: true });
      mark.addEventListener('error', early, { once: true });
    } else {
      trigger();
    }
  }
  if (!document.body || document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function ready() {
      document.removeEventListener('DOMContentLoaded', ready);
      arm();
    });
  } else {
    arm();
  }

  var MIN_HOLD = 1800, FAILSAFE = 8000, t0 = Date.now(), done = false, decoded = false;

  function dismiss() {
    if (done || !loader.parentNode) return;
    done = true;
    if (!preview) { try { sessionStorage.setItem('photoLoaderSeen', '1'); } catch (e) {} }
    ready(); // curtain lifts + staged bar entrances begin
    playing(false); // slider glides + logo drops, 1.2s later
    loader.classList.add('is-done');
    setTimeout(function () { loader.remove(); }, 1700); // logo 0.65s, then curtain 0.7s, then detach
  }
  function check() {
    if (decoded && Date.now() - t0 >= MIN_HOLD) dismiss();
  }
  function watchHero() {
    var imgs = document.querySelectorAll('.hero-carousel img');
    if (!imgs.length) { decoded = true; check(); return; }
    var pending = imgs.length;
    Array.prototype.forEach.call(imgs, function (img) {
      var over = function () { if (--pending <= 0) { decoded = true; check(); } };
      if (img.decode) { try { img.decode().then(over, over); } catch (e) { over(); } }
      else if (img.complete) { over(); }
      else { img.addEventListener('load', over, { once: true }); img.addEventListener('error', over, { once: true }); }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchHero);
  } else {
    watchHero();
  }
  setTimeout(check, MIN_HOLD); // earliest the brand moment may end
  window.addEventListener('load', function () { decoded = true; check(); });
  setTimeout(dismiss, FAILSAFE); // never trap the page
})();
