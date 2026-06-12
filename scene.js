(function () {
  'use strict';
  if (typeof THREE === 'undefined') { document.body.classList.add('no-webgl'); return; }

  var canvas = document.getElementById('sky');
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) { document.body.classList.add('no-webgl'); return; }

  var DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 1.6, 9);

  var P = {
    night:     ['#050810', '#0B1424', '#06090F', '#FFD9A0', -0.42, 1.00, 0.22],
    blueHour:  ['#0A142E', '#2B3A66', '#0A0F1C', '#FFC894', -0.10, 0.55, 0.30],
    dawn:      ['#213C68', '#E0855A', '#171622', '#FFB37A',  0.07, 0.12, 0.45],
    morning:   ['#7FB1DC', '#EAE3CF', '#3C4438', '#FFF2D8',  0.52, 0.00, 0.95],
    midday:    ['#9CC4E4', '#F2EDE0', '#46503F', '#FFFFFF',  0.85, 0.00, 1.10],
    golden:    ['#B36A33', '#F2C879', '#3A2A18', '#FFC46B',  0.20, 0.00, 0.80],
    dusk:      ['#46204A', '#D8693C', '#1B1220', '#FF9A4D',  0.035,0.10, 0.45],
    koiNight:  ['#081A2C', '#175066', '#07131C', '#9FE8D8', -0.25, 0.75, 0.30],
    deepNight: ['#060C1A', '#0E1B33', '#070A12', '#FFD9A0', -0.40, 0.95, 0.24],
    midnight:  ['#04070E', '#0A1322', '#05070C', '#FFD9A0', -0.45, 1.00, 0.20]
  };

  var SECTION_PHASE = [
    ['hero', 'night'], ['manifesto', 'blueHour'], ['roman', 'dawn'],
    ['process', 'morning'], ['clients', 'midday'], ['philosophy', 'golden'],
    ['fudo', 'dusk'], ['koi', 'koiNight'], ['archive', 'deepNight'],
    ['services', 'deepNight'], ['statement', 'midnight'], ['contact', 'midnight']
  ];

  var stops = [];
  function layoutTop(el) {
    var t = 0, n = el;
    while (n) { t += n.offsetTop; n = n.offsetParent; }
    return t;
  }
  function computeStops() {
    var docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var raw = [];
    for (var i = 0; i < SECTION_PHASE.length; i++) {
      var el = document.getElementById(SECTION_PHASE[i][0]);
      if (!el) continue;
      var at = Math.min(1, Math.max(0, (layoutTop(el) + el.offsetHeight * 0.35 - window.innerHeight * 0.5) / docH));
      raw.push({ at: i === 0 ? 0 : at, pal: P[SECTION_PHASE[i][1]] });
    }
    for (var k = 1; k < raw.length; k++) if (raw[k].at < raw[k - 1].at) raw[k].at = raw[k - 1].at;
    stops = raw;
  }

  var cA = new THREE.Color(), cB = new THREE.Color();
  function lerpHex(h1, h2, t, out) { cA.set(h1); cB.set(h2); out.copy(cA).lerp(cB, t); return out; }
  function smooth(t) { return t * t * (3 - 2 * t); }

  function samplePalette(t, out) {
    if (!stops.length) return;
    var a = stops[0], b = stops[stops.length - 1];
    if (t <= a.at) { mixPal(a.pal, a.pal, 0, out); return; }
    if (t >= b.at) { mixPal(b.pal, b.pal, 0, out); return; }
    for (var i = 0; i < stops.length - 1; i++) {
      if (t >= stops[i].at && t <= stops[i + 1].at) {
        var span = Math.max(1e-5, stops[i + 1].at - stops[i].at);
        mixPal(stops[i].pal, stops[i + 1].pal, smooth((t - stops[i].at) / span), out);
        return;
      }
    }
  }
  function mixPal(p1, p2, t, out) {
    lerpHex(p1[0], p2[0], t, out.top);
    lerpHex(p1[1], p2[1], t, out.hor);
    lerpHex(p1[2], p2[2], t, out.ground);
    lerpHex(p1[3], p2[3], t, out.sun);
    out.elev = p1[4] + (p2[4] - p1[4]) * t;
    out.star = p1[5] + (p2[5] - p1[5]) * t;
    out.amb  = p1[6] + (p2[6] - p1[6]) * t;
  }
  var cur = { top: new THREE.Color(), hor: new THREE.Color(), ground: new THREE.Color(), sun: new THREE.Color(), elev: -0.4, star: 1, amb: 0.2 };

  var skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color('#050810') },
      uHor: { value: new THREE.Color('#0B1424') }
    },
    vertexShader:
      'varying vec3 vP; void main(){ vP = position;' +
      ' gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader:
      'uniform vec3 uTop; uniform vec3 uHor; varying vec3 vP;' +
      'void main(){ float h = normalize(vP).y;' +
      ' float m = smoothstep(-0.08, 0.5, h);' +
      ' gl_FragColor = vec4(mix(uHor, uTop, m), 1.0); }'
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(180, 32, 18), skyMat));

  function discMat(inner, falloff) {
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uC: { value: new THREE.Color('#FFD9A0') }, uI: { value: 1 }, uIn: { value: inner }, uF: { value: falloff } },
      vertexShader:
        'varying vec2 vUv; void main(){ vUv = uv;' +
        ' gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform vec3 uC; uniform float uI, uIn, uF; varying vec2 vUv;' +
        'void main(){ float d = distance(vUv, vec2(0.5)) * 2.0;' +
        ' float a = (1.0 - smoothstep(uIn, uF, d)) * uI;' +
        ' gl_FragColor = vec4(uC, a); }'
    });
  }
  var sunCore = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), discMat(0.0, 0.42));
  var sunHalo = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), discMat(0.0, 1.0));
  var sunAtmo = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), discMat(0.0, 1.0));
  sunHalo.material.uniforms.uI.value = 0.5;
  sunAtmo.material.uniforms.uI.value = 0.0;
  scene.add(sunCore); scene.add(sunHalo); scene.add(sunAtmo);

  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  var starGeo = new THREE.BufferGeometry();
  var N = 850, pos = new Float32Array(N * 3), rnd = mulberry(7);
  var aPhase = new Float32Array(N), aSpeed = new Float32Array(N), aSize = new Float32Array(N);
  for (var i = 0; i < N; i++) {
    var th = rnd() * Math.PI * 2, ph = Math.acos(rnd() * 0.85), r = 150;
    pos[i * 3]     = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) + 4;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    aPhase[i] = rnd() * Math.PI * 2;
    aSpeed[i] = 0.4 + rnd() * 2.6;
    aSize[i]  = (0.7 + rnd() * 1.9) * DPR;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
  starGeo.setAttribute('aSpeed', new THREE.BufferAttribute(aSpeed, 1));
  starGeo.setAttribute('aSize',  new THREE.BufferAttribute(aSize, 1));
  var starMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uA: { value: 1 }, uT: { value: 0 } },
    vertexShader:
      'attribute float aPhase; attribute float aSpeed; attribute float aSize;' +
      'uniform float uT; varying float vTw;' +
      'void main(){' +
      ' float tw = 0.5 + 0.5 * sin(uT * aSpeed + aPhase);' +
      ' vTw = pow(tw, 2.2);' +
      ' vec4 mv = modelViewMatrix * vec4(position, 1.0);' +
      ' gl_PointSize = aSize * (0.75 + 0.5 * vTw);' +
      ' gl_Position = projectionMatrix * mv; }',
    fragmentShader:
      'uniform float uA; varying float vTw;' +
      'void main(){' +
      ' float d = length(gl_PointCoord - vec2(0.5));' +
      ' float a = smoothstep(0.5, 0.05, d) * uA * (0.25 + 0.75 * vTw);' +
      ' gl_FragColor = vec4(0.93, 0.92, 0.89, a); }'
  });
  scene.add(new THREE.Points(starGeo, starMat));

  var TN = 220, tPos = new Float32Array(TN * 3), tLife = new Float32Array(TN),
      tVel = new Float32Array(TN * 3), tSize = new Float32Array(TN), tHead = 0;
  for (var ti = 0; ti < TN; ti++) { tLife[ti] = 0; tPos[ti * 3 + 2] = -40; }
  var trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  trailGeo.setAttribute('aLife', new THREE.BufferAttribute(tLife, 1));
  trailGeo.setAttribute('aSize', new THREE.BufferAttribute(tSize, 1));
  var trailMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uA: { value: 0 } },
    vertexShader:
      'attribute float aLife; attribute float aSize; varying float vL;' +
      'void main(){ vL = aLife;' +
      ' vec4 mv = modelViewMatrix * vec4(position, 1.0);' +
      ' gl_PointSize = aSize * aLife;' +
      ' gl_Position = projectionMatrix * mv; }',
    fragmentShader:
      'uniform float uA; varying float vL;' +
      'void main(){' +
      ' float d = length(gl_PointCoord - vec2(0.5));' +
      ' float core = smoothstep(0.5, 0.02, d);' +
      ' vec3 col = mix(vec3(1.0, 0.78, 0.45), vec3(0.95, 0.93, 0.88), vL);' +
      ' gl_FragColor = vec4(col, core * vL * uA); }'
  });
  scene.add(new THREE.Points(trailGeo, trailMat));

  var ndc = new THREE.Vector3(), trailWorld = new THREE.Vector3(), lastSpawn = 0;
  function spawnTrail(clientX, clientY, now) {
    if (now - lastSpawn < 16) return;
    lastSpawn = now;
    ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1, 0.5);
    ndc.unproject(camera);
    trailWorld.copy(camera.position).add(ndc.sub(camera.position).normalize().multiplyScalar(34));
    for (var k = 0; k < 2; k++) {
      var idx = tHead = (tHead + 1) % TN;
      tPos[idx * 3]     = trailWorld.x + (Math.random() - 0.5) * 0.5;
      tPos[idx * 3 + 1] = trailWorld.y + (Math.random() - 0.5) * 0.5;
      tPos[idx * 3 + 2] = trailWorld.z;
      tVel[idx * 3]     = (Math.random() - 0.5) * 0.014;
      tVel[idx * 3 + 1] = 0.008 + Math.random() * 0.02;
      tVel[idx * 3 + 2] = 0;
      tLife[idx] = 1;
      tSize[idx] = (5 + Math.random() * 9) * DPR;
    }
  }
  window.addEventListener('pointermove', function (e) {
    if (window.__skyHover && starMat.uniforms.uA.value > 0.3) spawnTrail(e.clientX, e.clientY, performance.now());
  }, { passive: true });

  var nr = mulberry(42), grid = [], GS = 96;
  for (var g = 0; g < (GS + 1) * (GS + 1); g++) grid.push(nr());
  function vnoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    function gv(ix, iy) { ix = ((ix % GS) + GS) % GS; iy = ((iy % GS) + GS) % GS; return grid[iy * (GS + 1) + ix]; }
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return gv(xi, yi) * (1 - u) * (1 - v) + gv(xi + 1, yi) * u * (1 - v) + gv(xi, yi + 1) * (1 - u) * v + gv(xi + 1, yi + 1) * u * v;
  }
  function fbm(x, y) { return vnoise(x, y) * 0.6 + vnoise(x * 2.1, y * 2.1) * 0.28 + vnoise(x * 4.3, y * 4.3) * 0.12; }

  var terGeo = new THREE.PlaneGeometry(160, 70, 150, 64);
  terGeo.rotateX(-Math.PI / 2);
  var tp = terGeo.attributes.position;
  for (var vI = 0; vI < tp.count; vI++) {
    var x = tp.getX(vI), z = tp.getZ(vI);
    var d = Math.abs(x) / 80;
    var h = fbm(x * 0.045 + 3, z * 0.045 + 7) * (2.2 + d * 9) - 1.4;
    var back = Math.max(0, (-z - 8) / 60);
    h += back * back * 14 * (0.5 + fbm(x * 0.02, z * 0.02));
    tp.setY(vI, h);
  }
  terGeo.computeVertexNormals();
  var terMat = new THREE.MeshStandardMaterial({ color: 0x06090F, flatShading: true, roughness: 1, metalness: 0 });
  var terrain = new THREE.Mesh(terGeo, terMat);
  terrain.position.set(0, -2.6, -18);
  scene.add(terrain);

  var wire = new THREE.Mesh(terGeo, new THREE.MeshBasicMaterial({ color: 0xEDEAE2, wireframe: true, transparent: true, opacity: 0.05 }));
  wire.position.copy(terrain.position); wire.position.y += 0.02;
  scene.add(wire);

  var auroraMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uA: { value: 0 } },
    vertexShader:
      'varying vec2 vUv; void main(){ vUv = uv;' +
      ' gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader:
      'precision highp float; uniform float uT; uniform float uA; varying vec2 vUv;' +
      'void main(){' +
      ' vec2 p = vUv * 2.0 - 1.0;' +
      ' float d = length(p) * 0.18;' +
      ' float xS = 2.2; float yS = 0.34;' +
      ' float rx = p.x * (1.0 + d); float gx = p.x; float bx = p.x * (1.0 - d);' +
      ' float r = 0.028 / abs(p.y + sin((rx + uT) * xS) * yS);' +
      ' float g = 0.034 / abs(p.y + sin((gx + uT) * xS) * yS);' +
      ' float b = 0.030 / abs(p.y + sin((bx + uT) * xS) * yS);' +
      ' vec3 col = vec3(r * 0.45, g * 0.85, b * 0.80);' +
      ' float fade = (1.0 - abs(p.y)) * smoothstep(1.0, 0.45, abs(p.x));' +
      ' float lum = (col.r + col.g + col.b);' +
      ' gl_FragColor = vec4(col, min(1.0, lum) * fade * uA); }'
  });
  var aurora = new THREE.Mesh(new THREE.PlaneGeometry(520, 90), auroraMat);
  aurora.position.set(0, 46, -152);
  aurora.rotation.z = -0.05;
  scene.add(aurora);

  function makeStormMat() { return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uA: { value: 0 }, uHue: { value: 0.62 }, uSeed: { value: 0 } },
    vertexShader:
      'varying vec2 vUv; void main(){ vUv = uv;' +
      ' gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader:
      'precision mediump float; uniform float uT, uA, uHue, uSeed; varying vec2 vUv;' +
      'vec3 hsv2rgb(vec3 c){ vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0); return c.z*mix(vec3(1.0),rgb,c.y); }' +
      'float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }' +
      'mat2 rot(float t){ float c=cos(t); float s=sin(t); return mat2(c,-s,s,c); }' +
      'float noise(vec2 p){ vec2 ip=floor(p); vec2 fp=fract(p);' +
      ' float a=hash12(ip); float b=hash12(ip+vec2(1.0,0.0)); float c=hash12(ip+vec2(0.0,1.0)); float d=hash12(ip+vec2(1.0,1.0));' +
      ' vec2 t=smoothstep(0.0,1.0,fp); return mix(mix(a,b,t.x),mix(c,d,t.x),t.y); }' +
      'float fbm(vec2 p){ float v=0.0; float amp=0.5;' +
      ' for(int i=0;i<6;i++){ v+=amp*noise(p); p*=rot(0.45); p*=2.0; amp*=0.5; } return v; }' +
      'void main(){' +
      ' vec2 uv = vUv * 2.0 - 1.0;' +
      ' uv.x *= 2.4;' +
      ' uv += 2.0 * fbm(uv * 1.6 + uSeed + 0.32 * uT) - 1.0;' +
      ' float dist = abs(uv.x);' +
      ' vec3 base = hsv2rgb(vec3(uHue, 0.55, 0.85));' +
      ' vec3 col = base * (0.05 / max(dist, 0.015));' +
      ' float vfade = smoothstep(1.0, 0.2, abs(vUv.y * 2.0 - 1.0));' +
      ' float lum = min(1.0, col.r + col.g + col.b);' +
      ' gl_FragColor = vec4(col, lum * vfade * uA); }'
  }); }
  var boltMat = makeStormMat();
  var bolt = new THREE.Mesh(new THREE.PlaneGeometry(90, 95), boltMat);
  bolt.position.set(18, 30, -148);
  bolt.visible = false;
  scene.add(bolt);

  var beamMat = makeStormMat();
  var beam = new THREE.Mesh(new THREE.PlaneGeometry(110, 120), beamMat);
  beam.position.set(4, 28, -150);
  beamMat.uniforms.uHue.value = 0.615;
  beamMat.uniforms.uSeed.value = 11.3;
  scene.add(beam);

  var boltEnv = 0, boltNext = 6 + Math.random() * 8, boltClock = 0;
  function maybeBolt(dt, nightF) {
    var wx = window.__weather || {};
    if (wx.mode !== 'storm' || nightF < 0.35) { boltEnv = Math.max(0, boltEnv - dt * 3); bolt.visible = boltEnv > 0.01; boltMat.uniforms.uA.value = boltEnv * 0.85; return; }
    boltClock += dt;
    if (boltClock >= boltNext) {
      boltClock = 0; boltNext = 6 + Math.random() * 9;
      boltEnv = 1;
      boltMat.uniforms.uSeed.value = Math.random() * 40.0;
      bolt.position.x = -30 + Math.random() * 60;
      boltMat.uniforms.uHue.value = 0.58 + Math.random() * 0.10;
      document.body.classList.add('bolt-flash');
      setTimeout(function () { document.body.classList.remove('bolt-flash'); }, 420);
    }
    boltEnv = Math.max(0, boltEnv - dt * 1.8);
    var flick = boltEnv > 0 ? (0.6 + 0.4 * Math.sin(boltClock * 90.0)) : 0;
    bolt.visible = boltEnv > 0.01;
    boltMat.uniforms.uA.value = boltEnv * flick * 0.85;
  }

  var sunLight = new THREE.DirectionalLight(0xFFD9A0, 0.0);
  var ambLight = new THREE.AmbientLight(0xBFD0E8, 0.22);
  scene.add(sunLight); scene.add(ambLight);

  scene.fog = new THREE.Fog(0x0B1424, 30, 150);

  var dayT = 0, px = 0, py = 0, tpx = 0, tpy = 0;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.addEventListener('pointermove', function (e) {
    tpx = (e.clientX / window.innerWidth - 0.5);
    tpy = (e.clientY / window.innerHeight - 0.5);
  }, { passive: true });

  function scrollT() {
    var m = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    return Math.min(1, Math.max(0, window.scrollY / m));
  }

  var clock = new THREE.Clock();
  function frame() {
    var t = scrollT();
    dayT += (t - dayT) * 0.06;
    window.__dayT = dayT;
    window.__nightF = cur.star;

    samplePalette(dayT, cur);

    skyMat.uniforms.uTop.value.copy(cur.top);
    skyMat.uniforms.uHor.value.copy(cur.hor);
    scene.fog.color.copy(cur.hor);

    var el = cur.elev;
    var sx = 14 - dayT * 26;
    var sy = el * 46;
    var sz = -120;
    sunCore.position.set(sx, sy, sz); sunHalo.position.set(sx, sy, sz);
    sunAtmo.position.set(sx, Math.max(sy, -6), sz + 2);
    sunCore.lookAt(camera.position); sunHalo.lookAt(camera.position); sunAtmo.lookAt(camera.position);
    var vis = Math.max(0, Math.min(1, (el + 0.12) * 6));
    var lowBoost = 1 + Math.max(0, 0.35 - Math.abs(el)) * 2.2;
    sunCore.scale.setScalar(lowBoost);
    sunHalo.scale.setScalar(lowBoost * 1.15);
    sunCore.material.uniforms.uC.value.copy(cur.sun);
    sunHalo.material.uniforms.uC.value.copy(cur.sun);
    sunCore.material.uniforms.uI.value = vis;
    sunHalo.material.uniforms.uI.value = vis * 0.45 + Math.max(0, 0.3 - Math.abs(el)) * 0.6;
    var firstLight = Math.max(0, Math.min(1, (el + 0.28) * 3.6)) * Math.max(0, 1 - Math.abs(el) * 2.2);
    sunAtmo.material.uniforms.uC.value.copy(cur.sun).lerp(cur.hor, 0.35);
    sunAtmo.material.uniforms.uI.value = firstLight * 0.5;

    starMat.uniforms.uA.value = cur.star;
    starMat.uniforms.uT.value = clock.elapsedTime;
    auroraMat.uniforms.uT.value = clock.elapsedTime * 0.12;
    auroraMat.uniforms.uA.value = Math.max(0, (cur.star - 0.7) / 0.3) * 0.6;
    trailMat.uniforms.uA.value = Math.max(0, (cur.star - 0.3) / 0.7);

    var anyAlive = false;
    for (var pi = 0; pi < TN; pi++) {
      if (tLife[pi] <= 0) continue;
      anyAlive = true;
      tLife[pi] = Math.max(0, tLife[pi] - 0.016);
      tPos[pi * 3]     += tVel[pi * 3];
      tPos[pi * 3 + 1] += tVel[pi * 3 + 1];
      tVel[pi * 3 + 1] *= 0.985;
    }
    if (anyAlive) {
      trailGeo.attributes.position.needsUpdate = true;
      trailGeo.attributes.aLife.needsUpdate = true;
      trailGeo.attributes.aSize.needsUpdate = true;
    }

    terMat.color.copy(cur.ground);
    sunLight.color.copy(cur.sun);
    sunLight.intensity = Math.max(0, el) * 1.6 + vis * 0.25;
    sunLight.position.set(sx * 0.5, Math.max(2, sy), -30);
    ambLight.intensity = cur.amb;
    wire.material.opacity = 0.028 + (1 - Math.min(1, cur.amb)) * 0.035;

    if (!reduced) {
      px += (tpx - px) * 0.04; py += (tpy - py) * 0.04;
      camera.position.x = px * 1.6;
      camera.position.y = 1.6 - py * 0.9;
      camera.lookAt(0, 1.4 + el * 6, -40);
    } else {
      camera.lookAt(0, 1.4 + el * 6, -40);
    }

    var dt = clock.getDelta();
    boltMat.uniforms.uT.value = clock.elapsedTime;
    maybeBolt(dt, cur.star);
    beamMat.uniforms.uT.value = clock.elapsedTime * 0.38;
    var heroV = Math.max(0, 1 - window.scrollY / (window.innerHeight * 0.9));
    var beamA = heroV * Math.max(0, (cur.star - 0.45) / 0.55) * 0.5;
    beam.visible = beamA > 0.01;
    beamMat.uniforms.uA.value = beamA;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    computeStops();
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('load', computeStops);
  computeStops();
  setInterval(computeStops, 2500);

  requestAnimationFrame(frame);
})();
