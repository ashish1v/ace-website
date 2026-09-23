// Hero: dotted world map with animated corridors from New Delhi,
// synced with the rotating headline, plus live office clocks.
(function () {
  var hero = document.querySelector('.hero');
  var canvas = document.querySelector('.hero-canvas');
  if (!hero || !canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ORIGIN = { name: 'New Delhi', lon: 77.2, lat: 28.6 };
  var CITIES = [
    { name: 'London', lon: -0.13, lat: 51.5, group: 'uk', label: true },
    { name: 'Brussels', lon: 4.35, lat: 50.85, group: 'europe' },
    { name: 'Berlin', lon: 13.4, lat: 52.5, group: 'europe' },
    { name: 'Paris', lon: 2.35, lat: 48.86, group: 'europe' },
    { name: 'Dubai', lon: 55.27, lat: 25.2, group: 'gulf' },
    { name: 'Riyadh', lon: 46.7, lat: 24.7, group: 'gulf' },
    { name: 'Singapore', lon: 103.8, lat: 1.35, group: 'asean' },
    { name: 'Jakarta', lon: 106.8, lat: -6.2, group: 'asean' },
    { name: 'Bangkok', lon: 100.5, lat: 13.75, group: 'asean' },
    { name: 'Tokyo', lon: 139.7, lat: 35.7, group: 'indo' },
    { name: 'Sydney', lon: 151.2, lat: -33.9, group: 'indo' }
  ];
  var C = {
    dot: 'rgba(38,64,107,0.16)',
    india: '#2f7a5a',
    uk: 'rgba(185,156,98,0.85)',
    green: '47,122,90',
    gold: '185,156,98',
    ink: '#1d2940'
  };

  var map = null, dotsLayer = null, W = 0, H = 0, dpr = 1, geo = null;
  var arcs = [];          // active animated arcs
  var visible = true, raf = 0;

  // ---------- layout ----------
  function layout() {
    var r = hero.getBoundingClientRect();
    W = r.width; H = canvas.getBoundingClientRect().height || r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var mobile = W < 900;
    var mapW = mobile ? W * 1.9 : Math.max(W * 1.05, 1100);
    var mapH = mapW * (map.rows * map.step) / 360;
    // place India at a fixed spot of the viewport
    var indiaFx = (ORIGIN.lon + 180) / 360, indiaFy = (map.lat0 - ORIGIN.lat) / (map.rows * map.step);
    var targetX = mobile ? W * 0.6 : W * 0.7, targetY = mobile ? H * 0.46 : H * 0.44;
    geo = { x0: targetX - indiaFx * mapW, y0: targetY - indiaFy * mapH, w: mapW, h: mapH, cell: mapW / map.cols };
    drawDots();
  }
  function project(lon, lat) {
    return [geo.x0 + (lon + 180) / 360 * geo.w, geo.y0 + (map.lat0 - lat) / (map.rows * map.step) * geo.h];
  }

  // ---------- static dot layer ----------
  function drawDots() {
    dotsLayer = document.createElement('canvas');
    dotsLayer.width = canvas.width; dotsLayer.height = canvas.height;
    var g = dotsLayer.getContext('2d');
    g.scale(dpr, dpr);
    var rad = Math.max(0.9, geo.cell * 0.2);
    var india = {}, uk = {};
    map.india.forEach(function (i) { india[i] = 1; });
    map.uk.forEach(function (i) { uk[i] = 1; });
    for (var i = 0, n = map.rows * map.cols; i < n; i++) {
      if (!map.bits[i]) continue;
      var r = Math.floor(i / map.cols), c = i % map.cols;
      var x = geo.x0 + (c + 0.5) * geo.cell, y = geo.y0 + r * geo.cell;
      if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
      g.fillStyle = india[i] ? C.india : uk[i] ? C.uk : C.dot;
      g.beginPath(); g.arc(x, y, india[i] ? rad * 1.25 : rad, 0, 6.2832); g.fill();
    }
    // faint permanent routes
    CITIES.forEach(function (city) {
      var pts = curve(city);
      g.strokeStyle = 'rgba(38,64,107,0.10)'; g.lineWidth = 1; g.setLineDash([2, 4]);
      g.beginPath(); pts.forEach(function (p, k) { k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.stroke();
      g.setLineDash([]);
    });
  }

  function curve(city) {
    var a = project(ORIGIN.lon, ORIGIN.lat), b = project(city.lon, city.lat);
    var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    var dx = b[0] - a[0], dy = b[1] - a[1], d = Math.sqrt(dx * dx + dy * dy);
    var nx = -dy / d, ny = dx / d; if (ny > 0) { nx = -nx; ny = -ny; } // bend upward
    var cx = mx + nx * d * 0.28, cy = my + ny * d * 0.28;
    var pts = [];
    for (var t = 0; t <= 1.0001; t += 1 / 48) {
      var u = 1 - t;
      pts.push([u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]);
    }
    return pts;
  }

  // ---------- arcs ----------
  function launch(group) {
    var list = CITIES.filter(function (c) { return group === 'world' || c.group === group; });
    var now = performance.now();
    list.forEach(function (city, k) {
      arcs.push({ city: city, pts: curve(city), start: now + k * (group === 'world' ? 220 : 160) });
    });
  }

  var DRAW = 1400, HOLD = 1600, FADE = 900;
  function frame(now) {
    raf = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(dotsLayer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    arcs = arcs.filter(function (a) { return now - a.start < DRAW + HOLD + FADE; });
    arcs.forEach(function (a) {
      var t = now - a.start; if (t < 0) return;
      var p = Math.min(1, t / DRAW); p = 1 - Math.pow(1 - p, 3);
      var alpha = t > DRAW + HOLD ? 1 - (t - DRAW - HOLD) / FADE : 1;
      drawArc(a, p, alpha, t);
    });
    drawNodes(now);
    if (!reduce && visible) raf = requestAnimationFrame(frame);
  }

  function drawArc(a, p, alpha, t) {
    var pts = a.pts, n = Math.max(2, Math.round(p * (pts.length - 1)) + 1);
    var s = pts[0], e = pts[pts.length - 1];
    var grad = ctx.createLinearGradient(s[0], s[1], e[0], e[1]);
    grad.addColorStop(0, 'rgba(' + C.green + ',' + 0.9 * alpha + ')');
    grad.addColorStop(1, 'rgba(' + C.gold + ',' + 0.95 * alpha + ')');
    ctx.strokeStyle = grad; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath();
    for (var i = 0; i < n; i++) i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    var head = pts[n - 1];
    if (p < 1) { // travelling spark
      ctx.fillStyle = 'rgba(' + C.gold + ',' + alpha + ')';
      ctx.beginPath(); ctx.arc(head[0], head[1], 3, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(' + C.gold + ',' + 0.25 * alpha + ')';
      ctx.beginPath(); ctx.arc(head[0], head[1], 7, 0, 6.2832); ctx.fill();
    } else { // arrival ripple
      var k = ((t - DRAW) % 1200) / 1200;
      ctx.strokeStyle = 'rgba(' + C.gold + ',' + (1 - k) * 0.7 * alpha + ')'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(head[0], head[1], 4 + k * 12, 0, 6.2832); ctx.stroke();
    }
  }

  function drawNodes(now) {
    CITIES.forEach(function (c) {
      var p = project(c.lon, c.lat);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p[0], p[1], 3.6, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgb(' + C.gold + ')'; ctx.beginPath(); ctx.arc(p[0], p[1], 2.4, 0, 6.2832); ctx.fill();
    });
    var o = project(ORIGIN.lon, ORIGIN.lat);
    var k = reduce ? 0.5 : (now % 2200) / 2200;
    ctx.fillStyle = 'rgba(' + C.green + ',' + (1 - k) * 0.3 + ')';
    ctx.beginPath(); ctx.arc(o[0], o[1], 6 + k * 18, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(o[0], o[1], 6, 0, 6.2832); ctx.fill();
    ctx.fillStyle = 'rgb(' + C.green + ')'; ctx.beginPath(); ctx.arc(o[0], o[1], 4, 0, 6.2832); ctx.fill();
    label(o, 'New Delhi', true);
    var lon = CITIES[0]; label(project(lon.lon, lon.lat), 'London', false);
  }

  function label(p, text, primary) {
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    var w = ctx.measureText(text).width + 16, h = 22;
    var x = p[0] + 10, y = p[1] - h - 8;
    if (x + w > W - 8) x = p[0] - w - 10;
    ctx.fillStyle = primary ? 'rgba(47,122,90,0.95)' : 'rgba(255,255,255,0.95)';
    roundRect(x, y, w, h, 11); ctx.fill();
    if (!primary) { ctx.strokeStyle = 'rgba(38,64,107,0.15)'; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.fillStyle = primary ? '#fff' : C.ink;
    ctx.textBaseline = 'middle'; ctx.fillText(text, x + 8, y + h / 2 + 0.5);
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }

  // ---------- rotating headline ----------
  var rot = document.querySelector('.rotator');
  var words = rot ? Array.prototype.slice.call(rot.querySelectorAll('[data-group]')) : [];
  var idx = 0;
  function show(i) {
    words.forEach(function (w, k) {
      var wasOn = w.classList.contains('is-on');
      w.classList.toggle('is-off', k !== i && wasOn);
      w.classList.toggle('is-on', k === i);
    });
    launch(words[i].getAttribute('data-group'));
    kick();
  }

  // ---------- clocks ----------
  function clocks() {
    document.querySelectorAll('[data-tz]').forEach(function (el) {
      var tz = el.getAttribute('data-tz');
      var time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(new Date());
      var zone = tz === 'Asia/Kolkata' ? 'IST' : (new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'short' })
        .formatToParts(new Date()).filter(function (p) { return p.type === 'timeZoneName'; })[0] || {}).value || '';
      el.textContent = time + ' ' + zone;
    });
  }
  clocks(); setInterval(clocks, 20000);

  // ---------- boot ----------
  fetch('/assets/world-dots.json').then(function (r) { return r.json(); }).then(function (m) {
    var bits = new Uint8Array(m.rows * m.cols);
    for (var i = 0; i < m.d.length; i++) {
      var v = parseInt(m.d[i], 16);
      for (var b = 0; b < 4; b++) bits[i * 4 + b] = (v >> (3 - b)) & 1;
    }
    m.bits = bits; map = m;
    layout();
    canvas.classList.add('is-ready');
    if (reduce) {
      var now = performance.now();
      CITIES.forEach(function (c) { arcs.push({ city: c, pts: curve(c), start: now - DRAW - 10 }); });
      DRAW = 1; HOLD = 1e12;
      frame(now);
      return;
    }
    if (words.length) {
      show(0);
      setInterval(function () { if (!visible || document.hidden) return; idx = (idx + 1) % words.length; show(idx); }, 3400);
    } else { launch('world'); kick(); }

    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { layout(); kick(); }, 120); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; kick(); }).observe(hero);
    }
  }).catch(function () { /* map is decorative; ignore */ });
})();
