/* ============================================================
   For Aamina — particle burst → name formation
   Samples "Aamina" from an offscreen canvas, scatters that many
   particles outward in an explosion, then eases them back into
   the shape of the name, followed by a gentle idle drift.
============================================================ */

(function () {
  const NAME = "Aamina";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const heroCopy = document.getElementById("hero-copy");
  const replayBtn = document.getElementById("replay-btn");
  const canvas = document.getElementById("burst-canvas");

  // ---- Reduced motion / no-canvas fallback: just show the name ----
  if (reduceMotion || !canvas || !window.THREE) {
    if (canvas) canvas.style.display = "none";
    if (heroCopy) {
      heroCopy.classList.add("show");
      const eyebrow = heroCopy.querySelector(".hero-eyebrow");
      if (eyebrow) {
        const staticName = document.createElement("div");
        staticName.className = "hero-name-fallback";
        staticName.textContent = NAME;
        staticName.style.margin = "0.6rem 0 0";
        eyebrow.after(staticName);
      }
    }
    if (replayBtn) replayBtn.style.display = "none";
    return;
  }

  let renderer, scene, camera, points, sparks;
  let targetPositions, explodePositions, startPositions;
  let particleCount = 0;
  let clockStart = performance.now();
  const BURST_MS = 900;      // explosion phase
  const FORM_MS = 2200;      // settle-into-name phase
  const totalMs = BURST_MS + FORM_MS;
  let mouseX = 0, mouseY = 0;
  let raf;

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function sampleTextPoints(text, maxParticles) {
    const cw = 1200, ch = 400;
    const c = document.createElement("canvas");
    c.width = cw; c.height = ch;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontSize = 220;
    ctx.font = `900 ${fontSize}px "Playfair Display", serif`;
    ctx.fillText(text, cw / 2, ch / 2 + fontSize * 0.06);

    const data = ctx.getImageData(0, 0, cw, ch).data;
    const pts = [];
    const step = 3; // sampling density
    const worldWidth = 16; // world units the name should span horizontally
    const worldHeight = worldWidth * (ch / cw);
    for (let y = 0; y < ch; y += step) {
      for (let x = 0; x < cw; x += step) {
        const alpha = data[(y * cw + x) * 4 + 3];
        if (alpha > 120) {
          pts.push({
            x: (x / cw - 0.5) * worldWidth,
            y: -(y / ch - 0.5) * worldHeight,
            z: (Math.random() - 0.5) * 0.6
          });
        }
      }
    }
    return pts;
  }

  function buildScatterPoint(radius) {
    // random point on/inside a sphere shell for an outward "burst" look
    const r = radius * (0.6 + Math.random() * 0.4);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    return {
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta) * 0.6,
      z: r * Math.cos(phi) * 0.8
    };
  }

  function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 11);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // ---- sample letterforms ----
    const rawPts = sampleTextPoints(NAME, 6000);
    particleCount = rawPts.length;

    targetPositions = new Float32Array(particleCount * 3);
    explodePositions = new Float32Array(particleCount * 3);
    startPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const goldColor = new THREE.Color(0xd4af7a);
    const roseColor = new THREE.Color(0xc76b8a);
    const creamColor = new THREE.Color(0xf3e9df);

    for (let i = 0; i < particleCount; i++) {
      const p = rawPts[i];
      targetPositions[i * 3] = p.x;
      targetPositions[i * 3 + 1] = p.y;
      targetPositions[i * 3 + 2] = p.z;

      const scatter = buildScatterPoint(9 + Math.random() * 3);
      explodePositions[i * 3] = scatter.x;
      explodePositions[i * 3 + 1] = scatter.y;
      explodePositions[i * 3 + 2] = scatter.z;

      // everyone starts clustered near the center for the initial "pop"
      startPositions[i * 3] = (Math.random() - 0.5) * 0.4;
      startPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
      startPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;

      const mixT = Math.random();
      let col;
      if (mixT < 0.5) col = goldColor.clone().lerp(creamColor, mixT * 2);
      else col = roseColor.clone().lerp(goldColor, (mixT - 0.5) * 2);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(startPositions.slice(), 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const sprite = makeGlowSprite();
    const material = new THREE.PointsMaterial({
      size: 0.09,
      map: sprite,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    points = new THREE.Points(geometry, material);
    scene.add(points);

    // ---- extra embers that fly out and fade for the "burst" flourish ----
    const sparkCount = 260;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkVel = [];
    for (let i = 0; i < sparkCount; i++) {
      sparkPos[i * 3] = 0; sparkPos[i * 3 + 1] = 0; sparkPos[i * 3 + 2] = 0;
      const dir = buildScatterPoint(1);
      const speed = 6 + Math.random() * 10;
      sparkVel.push({ x: dir.x * speed, y: dir.y * speed, z: dir.z * speed });
    }
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      size: 0.06,
      map: sprite,
      transparent: true,
      depthWrite: false,
      color: 0xe8cfa0,
      blending: THREE.AdditiveBlending,
      opacity: 1
    });
    sparks = new THREE.Points(sparkGeo, sparkMat);
    sparks.userData.velocities = sparkVel;
    scene.add(sparks);

    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove);
    if (replayBtn) replayBtn.addEventListener("click", restart);

    clockStart = performance.now();
    animate();
    setTimeout(() => heroCopy && heroCopy.classList.add("show"), BURST_MS + FORM_MS * 0.55);
    setTimeout(() => replayBtn && replayBtn.classList.add("show"), BURST_MS + FORM_MS + 400);
  }

  function makeGlowSprite() {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.7)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onPointerMove(e) {
    mouseX = (e.clientX / window.innerWidth - 0.5);
    mouseY = (e.clientY / window.innerHeight - 0.5);
  }

  function restart() {
    if (heroCopy) heroCopy.classList.remove("show");
    if (replayBtn) replayBtn.classList.remove("show");
    const posAttr = points.geometry.getAttribute("position");
    for (let i = 0; i < particleCount; i++) {
      posAttr.array[i * 3] = startPositions[i * 3];
      posAttr.array[i * 3 + 1] = startPositions[i * 3 + 1];
      posAttr.array[i * 3 + 2] = startPositions[i * 3 + 2];
    }
    posAttr.needsUpdate = true;

    const sparkPos = sparks.geometry.getAttribute("position");
    for (let i = 0; i < sparkPos.count; i++) {
      sparkPos.array[i * 3] = 0; sparkPos.array[i * 3 + 1] = 0; sparkPos.array[i * 3 + 2] = 0;
    }
    sparkPos.needsUpdate = true;
    sparks.material.opacity = 1;

    clockStart = performance.now();
  }

  function animate() {
    raf = requestAnimationFrame(animate);
    const now = performance.now();
    const elapsed = now - clockStart;

    const posAttr = points.geometry.getAttribute("position");

    if (elapsed <= BURST_MS) {
      // Phase 1: pop outward from center to scattered explosion positions
      const t = easeOutCubic(Math.min(elapsed / BURST_MS, 1));
      for (let i = 0; i < particleCount; i++) {
        posAttr.array[i * 3] = startPositions[i * 3] + (explodePositions[i * 3] - startPositions[i * 3]) * t;
        posAttr.array[i * 3 + 1] = startPositions[i * 3 + 1] + (explodePositions[i * 3 + 1] - startPositions[i * 3 + 1]) * t;
        posAttr.array[i * 3 + 2] = startPositions[i * 3 + 2] + (explodePositions[i * 3 + 2] - startPositions[i * 3 + 2]) * t;
      }
    } else if (elapsed <= BURST_MS + FORM_MS) {
      // Phase 2: settle from explosion positions into the name shape
      const t = easeInOutCubic(Math.min((elapsed - BURST_MS) / FORM_MS, 1));
      for (let i = 0; i < particleCount; i++) {
        posAttr.array[i * 3] = explodePositions[i * 3] + (targetPositions[i * 3] - explodePositions[i * 3]) * t;
        posAttr.array[i * 3 + 1] = explodePositions[i * 3 + 1] + (targetPositions[i * 3 + 1] - explodePositions[i * 3 + 1]) * t;
        posAttr.array[i * 3 + 2] = explodePositions[i * 3 + 2] + (targetPositions[i * 3 + 2] - explodePositions[i * 3 + 2]) * t;
      }
    } else {
      // Phase 3: idle breathing / shimmer once the name has formed
      const idleT = (elapsed - BURST_MS - FORM_MS) / 1000;
      for (let i = 0; i < particleCount; i++) {
        const bx = targetPositions[i * 3];
        const by = targetPositions[i * 3 + 1];
        const bz = targetPositions[i * 3 + 2];
        posAttr.array[i * 3] = bx + Math.sin(idleT * 0.8 + i * 0.11) * 0.025;
        posAttr.array[i * 3 + 1] = by + Math.cos(idleT * 0.7 + i * 0.13) * 0.025;
        posAttr.array[i * 3 + 2] = bz + Math.sin(idleT * 0.5 + i * 0.09) * 0.08;
      }
    }
    posAttr.needsUpdate = true;

    // sparks: fly outward then fade
    const sparkElapsed = Math.min(elapsed, 1600);
    if (elapsed < 1600) {
      const sPos = sparks.geometry.getAttribute("position");
      const vels = sparks.userData.velocities;
      const dt = 0.016;
      for (let i = 0; i < vels.length; i++) {
        sPos.array[i * 3] += vels[i].x * dt;
        sPos.array[i * 3 + 1] += vels[i].y * dt;
        sPos.array[i * 3 + 2] += vels[i].z * dt;
      }
      sPos.needsUpdate = true;
      sparks.material.opacity = Math.max(0, 1 - elapsed / 1600);
    } else {
      sparks.material.opacity = 0;
    }

    // gentle whole-group rotation + mouse parallax for the 3D feel
    const t2 = now * 0.00012;
    points.rotation.y = Math.sin(t2) * 0.12 + mouseX * 0.25;
    points.rotation.x = mouseY * 0.12;
    sparks.rotation.y = points.rotation.y;
    sparks.rotation.x = points.rotation.x;

    renderer.render(scene, camera);
  }

  init();
})();
