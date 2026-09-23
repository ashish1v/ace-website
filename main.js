(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile menu
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('nav-menu');
  function setMenu(open) {
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  toggle.addEventListener('click', function () { setMenu(!document.body.classList.contains('nav-open')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  // Pillars accordion (one panel open at a time)
  var items = Array.prototype.slice.call(document.querySelectorAll('.acc-item'));
  function openItem(item) {
    items.forEach(function (it) {
      var on = it === item;
      it.classList.toggle('is-open', on);
      it.querySelector('.acc-head').setAttribute('aria-expanded', String(on));
    });
  }
  items.forEach(function (item) {
    item.querySelector('.acc-head').addEventListener('click', function () { openItem(item); });
  });
  document.querySelectorAll('[data-open-pillar]').forEach(function (link) {
    link.addEventListener('click', function () {
      var item = items[Number(link.getAttribute('data-open-pillar')) - 1];
      if (item) openItem(item);
    });
  });

  // Statement: split into words that light up as it scrolls through the viewport
  var statement = document.querySelector('[data-words]');
  var words = [];
  if (statement && !reduce) {
    statement.innerHTML = statement.textContent.trim().split(/\s+/).map(function (w) {
      return '<span class="w">' + w + '</span>';
    }).join(' ');
    words = Array.prototype.slice.call(statement.querySelectorAll('.w'));
  }

  // Scroll-linked effects: header, progress bar, statement words, process line
  var header = document.querySelector('.site-header');
  var bar = document.querySelector('.progress span');
  var process = document.querySelector('[data-progress]');
  var steps = process ? Array.prototype.slice.call(process.children) : [];
  var ticking = false;
  function clamp(v) { return Math.max(0, Math.min(1, v)); }
  function update() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight;
    header.classList.toggle('scrolled', y > 20);
    if (bar) bar.style.setProperty('--sp', clamp(y / (document.documentElement.scrollHeight - vh)));
    if (words.length) {
      var r = statement.getBoundingClientRect();
      var p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35));
      var lit = Math.round(p * words.length);
      words.forEach(function (w, i) { w.classList.toggle('lit', i < lit); });
    }
    if (process) {
      var pr = process.getBoundingClientRect();
      var pp = reduce ? 1 : clamp((vh * 0.75 - pr.top) / (pr.height * 0.9));
      process.style.setProperty('--p', pp);
      steps.forEach(function (li, i) { li.classList.toggle('done', pp >= (i / Math.max(1, steps.length - 1)) - 0.02); });
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();

  // Reveal on scroll
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('in'); io.unobserve(el);
        setTimeout(function () { el.style.transitionDelay = ''; }, 1400); // keep hover effects snappy
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el, i) {
      // stagger siblings that reveal together
      var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.transitionDelay = Math.min(sib, 5) * 70 + 'ms';
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // Active nav link
  var links = document.querySelectorAll('.nav-menu a[href^="#"]:not(.btn)');
  var sections = Array.prototype.map.call(links, function (a) { return document.querySelector(a.getAttribute('href')); });
  if ('IntersectionObserver' in window) {
    var navIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { if (s) navIo.observe(s); });
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
