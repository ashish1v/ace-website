// Hero: interactive dotted globe. Rotates to each corridor in sync with the
// rotating headline, draws great-circle arcs from India, and can be dragged.
(function () {
  var hero = document.querySelector('.hero');
  var canvas = document.querySelector('.globe');
  if (!hero || !canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var RAD = Math.PI / 180;

  var ORIGIN = { name: 'India', lon: 77.2, lat: 28.6 };
  var CITIES = [
    { name: 'London', lon: -0.13, lat: 51.5, group: 'uk' },
    { name: 'Brussels', lon: 4.35, lat: 50.85, group: 'europe' },
    { name: 'Paris', lon: 2.35, lat: 48.86, group: 'europe' },
    { name: 'Berlin', lon: 13.4, lat: 52.5, group: 'europe' },
    { name: 'Dubai', lon: 55.27, lat: 25.2, group: 'gulf' },
    { name: 'Riyadh', lon: 46.7, lat: 24.7, group: 'gulf' },
    { name: 'Singapore', lon: 103.8, lat: 1.35, group: 'asean' },
    { name: 'Jakarta', lon: 106.8, lat: -6.2, group: 'asean' },
    { name: 'Bangkok', lon: 100.5, lat: 13.75, group: 'asean' },
    { name: 'Tokyo', lon: 139.7, lat: 35.7, group: 'indo' },
    { name: 'Sydney', lon: 151.2, lat: -33.9, group: 'indo' },
    { name: 'Washington DC', lon: -77.04, lat: 38.9, group: 'us' },
    { name: 'San Francisco', lon: -122.4, lat: 37.8, group: 'us' },
    { name: 'Ottawa', lon: -75.7, lat: 45.4, group: 'canada' },
    { name: 'Vancouver', lon: -123.1, lat: 49.3, group: 'canada' },
    { name: 'Brasília', lon: -47.9, lat: -15.8, group: 'latam' },
    { name: 'Mexico City', lon: -99.1, lat: 19.4, group: 'latam' },
    { name: 'Buenos Aires', lon: -58.4, lat: -34.6, group: 'latam' },
    { name: 'Santiago', lon: -70.7, lat: -33.45, group: 'latam' }
  ];
  // Where the globe turns for each headline word: [centre longitude, centre latitude]
  var VIEWS = { world: [62, 18], uk: [36, 34], europe: [42, 34], gulf: [64, 22], asean: [92, 10], indo: [112, 4],
    us: [-2, 42], canada: [-8, 48], latam: [-12, 2] };
  var CARDS = {
    world: ['Corridors', 'India ↔ World', 'Connect · Move · Exchange'],
    uk: ['Corridor', 'UK–India', 'Trade · Education · Diaspora'],
    europe: ['Corridor', 'Europe–India', 'Technology · Climate · Trade'],
    gulf: ['Corridor', 'Middle East', 'Energy · Investment · Connectivity'],
    asean: ['Corridor', 'ASEAN', 'Supply chains · Trade · Culture'],
    indo: ['Corridor', 'Indo-Pacific', 'Maritime cooperation · Connectivity'],
    us: ['Corridor', 'US–India', 'Technology · Innovation · Investment'],
    canada: ['Corridor', 'Canada–India', 'Education · Clean energy · Trade'],
    latam: ['Corridor', 'Latin America–India', 'Energy · Agriculture · Critical minerals']
  };
  var GREEN = '47,122,90', GOLD = '185,156,98', NAVY = '38,64,107';

  var S = 0, R = 0, cx = 0, cy = 0, dpr = 1;
  var dots = null;
  var view = { lon: VIEWS.world[0], lat: VIEWS.world[1] };
  var target = { lon: view.lon, lat: view.lat };
  var drag = null, dragOffset = { lon: 0, lat: 0 }, lastDrag = 0;
  var arcs = [], group = 'world', visible = true, raf = 0;

  function vec(lon, lat) {
    return [Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(lon * RAD)];
  }
  var O = vec(ORIGIN.lon, ORIGIN.lat);
  CITIES.forEach(function (c) { c.v = vec(c.lon, c.lat); });

  // view rotation: turn by longitude, then tilt by latitude
  var cl, sl, cp, sp;
  function setView() {
    cl = Math.cos(view.lon * RAD); sl = Math.sin(view.lon * RAD);
    cp = Math.cos(view.lat * RAD); sp = Math.sin(view.lat * RAD);
  }
  function rot(v) {
    var x = v[0] * cl - v[2] * sl, z = v[0] * sl + v[2] * cl, y = v[1];
    return [x, y * cp - z * sp, y * sp + z * cp];
  }

  function size() {
    var r = canvas.getBoundingClientRect();
    S = r.width; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(S * dpr); canvas.height = Math.round(S * dpr);
    R = S * 0.42; cx = S / 2; cy = S / 2;
  }

  // ---------- drawing ----------
  function frame(now) {
    raf = 0;
    var tl = target.lon + dragOffset.lon, tp = Math.max(-35, Math.min(60, target.lat + dragOffset.lat));
    if (!drag && now - lastDrag > 3500) { dragOffset.lon *= 0.97; dragOffset.lat *= 0.97; }
    var ease = drag ? 0.35 : 0.045;
    view.lon += (tl - view.lon) * ease; view.lat += (tp - view.lat) * ease;
    if (!reduce && !drag) view.lon += Math.sin(now / 5200) * 0.02;
    setView();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, S, S);
    drawSphere();
    drawDots();
    drawArcs(now);
    drawNodes(now);
    if (!reduce && visible) raf = requestAnimationFrame(frame);
  }

  function drawSphere() {
    var g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.7, 'rgba(238,243,250,0.9)');
    g.addColorStop(1, 'rgba(214,226,242,0.95)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fill();
    var a = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.12);
    a.addColorStop(0, 'rgba(' + NAVY + ',0.10)'); a.addColorStop(1, 'rgba(' + NAVY + ',0)');
    ctx.fillStyle = a; ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(' + NAVY + ',0.06)'; ctx.lineWidth = 1;
    for (var lon = -180; lon < 180; lon += 30) line(meridian(lon));
    for (var lat = -60; lat <= 60; lat += 30) line(parallel(lat));
  }
  function meridian(lon) { return function (t) { return vec(lon, -90 + t * 180); }; }
  function parallel(lat) { return function (t) { return vec(-180 + t * 360, lat); }; }
  function line(fn) {
    ctx.beginPath(); var pen = false;
    for (var i = 0; i <= 72; i++) {
      var p = rot(fn(i / 72));
      if (p[2] < 0) { pen = false; continue; }
      var X = cx + p[0] * R, Y = cy - p[1] * R;
      if (pen) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
      pen = true;
    }
    ctx.stroke();
  }

  function drawDots() {
    var n = dots.kind.length, base = Math.max(0.8, R * 0.0072);
    var buckets = [[], [], [], []], india = [], uk = [];
    var sLon = dots.sinLon, cLon = dots.cosLon, sLat = dots.sinLat, cLat = dots.cosLat;
    for (var i = 0; i < n; i++) {
      var vx = cLat[i] * sLon[i], vy = sLat[i], vz = cLat[i] * cLon[i];
      var x = vx * cl - vz * sl, z0 = vx * sl + vz * cl;
      var y = vy * cp - z0 * sp, z = vy * sp + z0 * cp;
      if (z <= 0.02) continue;
      var X = cx + x * R, Y = cy - y * R, k = dots.kind[i];
      if (k === 1) india.push(X, Y, z); else if (k === 2) uk.push(X, Y, z);
      else buckets[Math.min(3, (z * 4) | 0)].push(X, Y, z);
    }
    for (var b = 0; b < 4; b++) {
      ctx.fillStyle = 'rgba(' + NAVY + ',' + (0.12 + b * 0.09) + ')';
      paint(buckets[b], base);
    }
    ctx.fillStyle = 'rgba(' + GOLD + ',0.95)'; paint(uk, base * 1.1);
    ctx.fillStyle = 'rgb(' + GREEN + ')'; paint(india, base * 1.3);
  }
  function paint(arr, r) {
    ctx.beginPath();
    for (var i = 0; i < arr.length; i += 3) {
      var s = r * (0.55 + 0.45 * arr[i + 2]);
      ctx.moveTo(arr[i] + s, arr[i + 1]); ctx.arc(arr[i], arr[i + 1], s, 0, 6.2832);
    }
    ctx.fill();
  }

  // great-circle arc from India, lifted off the surface
  function arcPoints(c) {
    var A = O, B = c.v, d = Math.acos(Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])));
    var lift = 0.06 + Math.min(d, 1.5) * 0.14, pts = [], s = Math.sin(d);
    for (var i = 0; i <= 60; i++) {
      var t = i / 60, w1 = Math.sin((1 - t) * d) / s, w2 = Math.sin(t * d) / s, h = 1 + lift * Math.sin(Math.PI * t);
      pts.push([(A[0] * w1 + B[0] * w2) * h, (A[1] * w1 + B[1] * w2) * h, (A[2] * w1 + B[2] * w2) * h]);
    }
    return pts;
  }
  CITIES.forEach(function (c) { c.pts = arcPoints(c); });

  function launch(g) {
    var now = performance.now();
    CITIES.filter(function (c) { return g === 'world' || c.group === g; }).forEach(function (c, k) {
      arcs.push({ c: c, start: now + 500 + k * (g === 'world' ? 180 : 220) });
    });
  }

  var DRAW = 1500, HOLD = 2200, FADE = 900;
  function hidden(p) { return p[2] < 0 && p[0] * p[0] + p[1] * p[1] < 1; }

  function drawArcs(now) {
    arcs = arcs.filter(function (a) { return now - a.start < DRAW + HOLD + FADE; });
    arcs.forEach(function (a) {
      var t = now - a.start; if (t < 0) return;
      var p = Math.min(1, t / DRAW); p = 1 - Math.pow(1 - p, 3);
      var alpha = t > DRAW + HOLD ? 1 - (t - DRAW - HOLD) / FADE : 1;
      var pts = a.c.pts, n = Math.max(2, Math.round(p * (pts.length - 1)) + 1);
      ctx.lineWidth = 2; ctx.lineCap = 'round';
      var prev = null, head = null;
      for (var i = 0; i < n; i++) {
        var q = rot(pts[i]);
        if (hidden(q)) { prev = null; continue; }
        var X = cx + q[0] * R, Y = cy - q[1] * R;
        if (prev) {
          ctx.strokeStyle = 'rgba(' + mix(i / (pts.length - 1)) + ',' + alpha + ')';
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(X, Y); ctx.stroke();
        }
        prev = [X, Y]; head = prev;
      }
      if (!head) return;
      if (p < 1) {
        ctx.fillStyle = 'rgba(' + GOLD + ',' + 0.25 * alpha + ')'; ctx.beginPath(); ctx.arc(head[0], head[1], 8, 0, 6.2832); ctx.fill();
        ctx.fillStyle = 'rgba(' + GOLD + ',' + alpha + ')'; ctx.beginPath(); ctx.arc(head[0], head[1], 3.2, 0, 6.2832); ctx.fill();
      } else {
        var k = ((t - DRAW) % 1400) / 1400;
        ctx.strokeStyle = 'rgba(' + GOLD + ',' + (1 - k) * 0.8 * alpha + ')'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(head[0], head[1], 4 + k * 16, 0, 6.2832); ctx.stroke();
        if (group !== 'world') tag(head, a.c.name, false, alpha);
      }
    });
  }
  function mix(f) { // green -> gold along the arc
    return Math.round(47 + 138 * f) + ',' + Math.round(122 + 34 * f) + ',' + Math.round(90 + 8 * f);
  }

  function drawNodes(now) {
    CITIES.forEach(function (c) {
      var q = rot(c.v); if (q[2] < 0.05) return;
      var X = cx + q[0] * R, Y = cy - q[1] * R;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X, Y, 3.8, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgb(' + GOLD + ')'; ctx.beginPath(); ctx.arc(X, Y, 2.5, 0, 6.2832); ctx.fill();
    });
    var o = rot(O); if (o[2] < 0) return;
    var X = cx + o[0] * R, Y = cy - o[1] * R, k = reduce ? 0.5 : (now % 2400) / 2400;
    ctx.fillStyle = 'rgba(' + GREEN + ',' + (1 - k) * 0.28 + ')'; ctx.beginPath(); ctx.arc(X, Y, 7 + k * 22, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X, Y, 6.5, 0, 6.2832); ctx.fill();
    ctx.fillStyle = 'rgb(' + GREEN + ')'; ctx.beginPath(); ctx.arc(X, Y, 4.5, 0, 6.2832); ctx.fill();
    tag([X, Y], 'India', true, 1);
  }

  function tag(p, text, primary, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = '600 12px Inter, system-ui, sans-serif';
    var w = ctx.measureText(text).width + 18, h = 24, x = p[0] + 10, y = p[1] - h - 8;
    if (x + w > S - 4) x = p[0] - w - 10;
    ctx.shadowColor = 'rgba(29,41,64,0.12)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.fillStyle = primary ? 'rgb(' + GREEN + ')' : 'rgba(255,255,255,0.97)';
    ctx.beginPath(); ctx.moveTo(x + 12, y); ctx.arcTo(x + w, y, x + w, y + h, 12); ctx.arcTo(x + w, y + h, x, y + h, 12);
    ctx.arcTo(x, y + h, x, y, 12); ctx.arcTo(x, y, x + w, y, 12); ctx.closePath(); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = primary ? '#fff' : '#1d2940'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 9, y + h / 2 + 0.5);
    ctx.restore();
  }

  function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }

  // ---------- headline + corridor card ----------
  // The HTML holds only "the world." so search engines read a clean headline;
  // the other rotating words are added here, hidden from screen readers.
  var rotator = document.querySelector('.rotator');
  if (rotator && rotator.getAttribute('data-more') && !reduce) {
    JSON.parse(rotator.getAttribute('data-more')).forEach(function (w) {
      var span = document.createElement('span');
      span.setAttribute('data-group', w[0]); span.setAttribute('aria-hidden', 'true');
      span.textContent = w[1];
      rotator.appendChild(span);
    });
  }
  var words = Array.prototype.slice.call(document.querySelectorAll('.rotator [data-group]'));
  var card = document.querySelector('.globe-card');
  var idx = 0;
  function show(i) {
    words.forEach(function (w, k) {
      var wasOn = w.classList.contains('is-on');
      w.classList.toggle('is-off', k !== i && wasOn);
      w.classList.toggle('is-on', k === i);
    });
    group = words[i].getAttribute('data-group');
    target.lon = VIEWS[group][0]; target.lat = VIEWS[group][1];
    if (card) {
      card.classList.add('is-swapping');
      setTimeout(function () {
        var d = CARDS[group];
        card.querySelector('.gc-kicker').textContent = d[0];
        card.querySelector('.gc-title').textContent = d[1];
        card.querySelector('.gc-tags').textContent = d[2];
        card.classList.remove('is-swapping');
      }, 250);
    }
    launch(group); kick();
  }

  // ---------- drag to rotate ----------
  canvas.addEventListener('pointerdown', function (e) {
    drag = { x: e.clientX, y: e.clientY, lon: dragOffset.lon, lat: dragOffset.lat };
    canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-dragging'); kick();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    dragOffset.lon = drag.lon - (e.clientX - drag.x) * 0.35;
    dragOffset.lat = drag.lat + (e.clientY - drag.y) * 0.25;
    kick();
  });
  function end() { drag = null; lastDrag = performance.now(); canvas.classList.remove('is-dragging'); }
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  // ---------- boot ----------
  fetch('/assets/world-dots.json').then(function (r) { return r.json(); }).then(function (m) {
    var bits = new Uint8Array(m.rows * m.cols);
    for (var i = 0; i < m.d.length; i++) {
      var v = parseInt(m.d[i], 16);
      for (var b = 0; b < 4; b++) bits[i * 4 + b] = (v >> (3 - b)) & 1;
    }
    var kind = {};
    m.india.forEach(function (i) { kind[i] = 1; });
    m.uk.forEach(function (i) { kind[i] = 2; });
    var sLat = [], cLat = [], sLon = [], cLon = [], k = [];
    for (var j = 0; j < bits.length; j++) {
      if (!bits[j]) continue;
      var lat = (m.lat0 - Math.floor(j / m.cols) * m.step) * RAD, lon = (m.lon0 + (j % m.cols) * m.step) * RAD;
      sLat.push(Math.sin(lat)); cLat.push(Math.cos(lat)); sLon.push(Math.sin(lon)); cLon.push(Math.cos(lon)); k.push(kind[j] || 0);
    }
    dots = { sinLat: new Float32Array(sLat), cosLat: new Float32Array(cLat), sinLon: new Float32Array(sLon), cosLon: new Float32Array(cLon), kind: new Uint8Array(k) };
    size();
    canvas.classList.add('is-ready');

    if (reduce) {
      var now = performance.now();
      CITIES.forEach(function (c) { arcs.push({ c: c, start: now - DRAW - 10 }); });
      HOLD = 1e12; frame(now);
      return;
    }
    show(0);
    setInterval(function () {
      if (!visible || document.hidden || drag) return;
      idx = (idx + 1) % words.length; show(idx);
    }, 4600);
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { size(); kick(); }, 120); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; kick(); }).observe(hero);
  }).catch(function () { /* decorative */ });
})();
