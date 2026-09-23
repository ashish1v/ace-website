// Corridor explorer: flat dotted map (Europe to Australia) that draws the
// selected corridor's routes from New Delhi.
(function () {
  var canvas = document.querySelector('.corridor-map');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-corridor]'));
  if (!canvas || !canvas.getContext || !buttons.length) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var VIEW = { lon0: -14, lon1: 160, lat0: 64, lat1: -44 };  // visible window
  var ORIGIN = { lon: 77.2, lat: 28.6 };
  var ROUTES = {
    indo: [['Tokyo', 139.7, 35.7], ['Sydney', 151.2, -33.9], ['Singapore', 103.8, 1.35]],
    uk: [['London', -0.13, 51.5]],
    europe: [['Brussels', 4.35, 50.85], ['Paris', 2.35, 48.86], ['Berlin', 13.4, 52.5]],
    gulf: [['Dubai', 55.27, 25.2], ['Riyadh', 46.7, 24.7], ['Doha', 51.53, 25.29]],
    asean: [['Singapore', 103.8, 1.35], ['Jakarta', 106.8, -6.2], ['Bangkok', 100.5, 13.75], ['Hanoi', 105.8, 21.03]]
  };
  var GREEN = '47,122,90', GOLD = '185,156,98', NAVY = '38,64,107';
  var map, dotsLayer, W, H, dpr, active = 'indo', started = 0, raf = 0, visible = false, userPicked = false;

  function px(lon, lat) {
    return [(lon - VIEW.lon0) / (VIEW.lon1 - VIEW.lon0) * W, (VIEW.lat0 - lat) / (VIEW.lat0 - VIEW.lat1) * H];
  }

  function size() {
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    dotsLayer = document.createElement('canvas');
    dotsLayer.width = canvas.width; dotsLayer.height = canvas.height;
    var g = dotsLayer.getContext('2d');
    g.scale(dpr, dpr);
    var india = {}; map.india.forEach(function (i) { india[i] = 1; });
    var uk = {}; map.uk.forEach(function (i) { uk[i] = 1; });
    var cell = W / ((VIEW.lon1 - VIEW.lon0) / map.step), rad = Math.max(1, cell * 0.24);
    for (var i = 0; i < map.bits.length; i++) {
      if (!map.bits[i]) continue;
      var lat = map.lat0 - Math.floor(i / map.cols) * map.step, lon = map.lon0 + (i % map.cols) * map.step;
      if (lon < VIEW.lon0 - 2 || lon > VIEW.lon1 + 2 || lat > VIEW.lat0 + 2 || lat < VIEW.lat1 - 2) continue;
      var p = px(lon, lat);
      g.fillStyle = india[i] ? 'rgb(' + GREEN + ')' : uk[i] ? 'rgba(' + GOLD + ',.9)' : 'rgba(' + NAVY + ',.2)';
      g.beginPath(); g.arc(p[0], p[1], india[i] ? rad * 1.2 : rad, 0, 6.2832); g.fill();
    }
  }

  function curve(lon, lat) {
    var a = px(ORIGIN.lon, ORIGIN.lat), b = px(lon, lat);
    var dx = b[0] - a[0], dy = b[1] - a[1], d = Math.sqrt(dx * dx + dy * dy);
    var nx = -dy / d, ny = dx / d; if (ny > 0) { nx = -nx; ny = -ny; }
    var c = [(a[0] + b[0]) / 2 + nx * d * 0.3, (a[1] + b[1]) / 2 + ny * d * 0.3], pts = [];
    for (var i = 0; i <= 50; i++) {
      var t = i / 50, u = 1 - t;
      pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
    }
    return pts;
  }

  function frame(now) {
    raf = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(dotsLayer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var t = reduce ? 1e9 : now - started;

    ROUTES[active].forEach(function (r, k) {
      var pts = curve(r[1], r[2]);
      var p = Math.min(1, Math.max(0, (t - k * 180) / 1200)); p = 1 - Math.pow(1 - p, 3);
      var n = Math.max(2, Math.round(p * (pts.length - 1)) + 1);
      var s = pts[0], e = pts[pts.length - 1];
      var grad = ctx.createLinearGradient(s[0], s[1], e[0], e[1]);
      grad.addColorStop(0, 'rgb(' + GREEN + ')'); grad.addColorStop(1, 'rgb(' + GOLD + ')');
      ctx.strokeStyle = grad; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath();
      for (var i = 0; i < n; i++) i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      // moving pulse along finished route
      if (p >= 1 && !reduce) {
        var q = pts[Math.floor(((now / 26) + k * 17) % pts.length)];
        ctx.fillStyle = 'rgba(' + GOLD + ',.9)'; ctx.beginPath(); ctx.arc(q[0], q[1], 2.6, 0, 6.2832); ctx.fill();
      }
      if (p >= 1) {
        var ripple = reduce ? 0.5 : ((now + k * 300) % 1600) / 1600;
        ctx.strokeStyle = 'rgba(' + GOLD + ',' + (1 - ripple) * 0.8 + ')'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(e[0], e[1], 4 + ripple * 14, 0, 6.2832); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e[0], e[1], 4.5, 0, 6.2832); ctx.fill();
        ctx.fillStyle = 'rgb(' + GOLD + ')'; ctx.beginPath(); ctx.arc(e[0], e[1], 3, 0, 6.2832); ctx.fill();
        pill(e, r[0], false);
      }
    });
    var o = px(ORIGIN.lon, ORIGIN.lat), k2 = reduce ? 0.5 : (now % 2400) / 2400;
    ctx.fillStyle = 'rgba(' + GREEN + ',' + (1 - k2) * 0.25 + ')'; ctx.beginPath(); ctx.arc(o[0], o[1], 7 + k2 * 20, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(o[0], o[1], 6.5, 0, 6.2832); ctx.fill();
    ctx.fillStyle = 'rgb(' + GREEN + ')'; ctx.beginPath(); ctx.arc(o[0], o[1], 4.5, 0, 6.2832); ctx.fill();
    pill(o, 'New Delhi', true);
    if (!reduce && visible) raf = requestAnimationFrame(frame);
  }

  function pill(p, text, primary) {
    ctx.font = '600 11.5px Inter, system-ui, sans-serif';
    var w = ctx.measureText(text).width + 16, h = 22, x = p[0] + 9, y = p[1] - h - 7;
    if (x + w > W - 6) x = p[0] - w - 9;
    if (y < 6) y = p[1] + 9;
    ctx.save();
    ctx.shadowColor = 'rgba(29,41,64,.12)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    ctx.fillStyle = primary ? 'rgb(' + GREEN + ')' : '#fff';
    ctx.beginPath(); ctx.moveTo(x + 11, y); ctx.arcTo(x + w, y, x + w, y + h, 11); ctx.arcTo(x + w, y + h, x, y + h, 11);
    ctx.arcTo(x, y + h, x, y, 11); ctx.arcTo(x, y, x + w, y, 11); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = primary ? '#fff' : '#1d2940'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 8, y + h / 2 + 0.5);
  }

  function kick() { if (!raf && map && (visible || reduce)) raf = requestAnimationFrame(frame); }
  function select(key, fromUser) {
    if (fromUser) userPicked = true;
    if (key === active && started) return;
    active = key; started = performance.now();
    buttons.forEach(function (b) {
      var on = b.getAttribute('data-corridor') === key;
      b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on));
    });
    kick();
  }
  buttons.forEach(function (b) {
    var key = b.getAttribute('data-corridor');
    b.addEventListener('click', function () { select(key, true); });
    b.addEventListener('mouseenter', function () { if (window.matchMedia('(hover: hover)').matches) select(key, true); });
    b.addEventListener('focus', function () { select(key, true); });
  });

  fetch('/assets/world-dots.json').then(function (r) { return r.json(); }).then(function (m) {
    var bits = new Uint8Array(m.rows * m.cols);
    for (var i = 0; i < m.d.length; i++) {
      var v = parseInt(m.d[i], 16);
      for (var b = 0; b < 4; b++) bits[i * 4 + b] = (v >> (3 - b)) & 1;
    }
    m.bits = bits; map = m;
    size(); started = performance.now(); kick();
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { size(); kick(); }, 150); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) started = performance.now(); kick(); }).observe(canvas);
    } else { visible = true; kick(); }
    // gently cycle corridors until the visitor picks one
    if (!reduce) setInterval(function () {
      if (userPicked || !visible || document.hidden) return;
      var keys = buttons.map(function (b) { return b.getAttribute('data-corridor'); });
      select(keys[(keys.indexOf(active) + 1) % keys.length]);
    }, 5000);
  }).catch(function () {});
})();
