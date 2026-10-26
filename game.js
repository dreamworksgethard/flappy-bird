(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const hint = document.getElementById("hint");
  const copyBtn = document.getElementById("copy-ca");
  const caEl = document.getElementById("ca");

  const W = canvas.width;
  const H = canvas.height;

  const GRAVITY = 0.42;
  const FLAP = -7.2;
  const PIPE_GAP = 148;
  const PIPE_W = 62;
  const PIPE_SPEED = 2.55;
  const PIPE_EVERY = 95;
  const GROUND = 56;
  const BIRD_R = 16;

  let birdY, birdV, birdRot;
  let pipes;
  let frame;
  let score;
  let best = Number(localStorage.getItem("flapBest") || 0);
  let state = "ready"; // ready | play | dead
  let wing = 0;
  let groundX = 0;
  let clouds;

  function reset() {
    birdY = H * 0.42;
    birdV = 0;
    birdRot = 0;
    pipes = [];
    frame = 0;
    score = 0;
    wing = 0;
    groundX = 0;
    clouds = [
      { x: 40, y: 70, s: 1 },
      { x: 180, y: 110, s: 0.75 },
      { x: 300, y: 55, s: 1.1 },
    ];
    state = "ready";
    hint.classList.remove("hidden");
  }

  function flap() {
    if (state === "dead") {
      reset();
      return;
    }
    if (state === "ready") {
      state = "play";
      hint.classList.add("hidden");
    }
    birdV = FLAP;
    wing = 6;
  }

  function spawnPipe() {
    const top = 70 + Math.random() * (H - GROUND - PIPE_GAP - 140);
    pipes.push({ x: W + 10, top, scored: false });
  }

  function hitPipe(p) {
    const bx = W * 0.32;
    const by = birdY;
    const left = p.x;
    const right = p.x + PIPE_W;
    const gapTop = p.top;
    const gapBot = p.top + PIPE_GAP;

    if (bx + BIRD_R * 0.7 < left || bx - BIRD_R * 0.7 > right) return false;
    if (by - BIRD_R * 0.65 < gapTop || by + BIRD_R * 0.65 > gapBot) return true;
    return false;
  }

  function update() {
    groundX = (groundX - PIPE_SPEED) % 28;
    clouds.forEach((c) => {
      c.x -= 0.35 * c.s;
      if (c.x < -80) c.x = W + 40;
    });

    if (state === "ready") {
      birdY = H * 0.42 + Math.sin(frame * 0.08) * 6;
      birdRot = 0;
      wing = Math.sin(frame * 0.2) > 0 ? 4 : 0;
      frame++;
      return;
    }

    if (state === "dead") {
      birdV += GRAVITY * 1.2;
      birdY += birdV;
      birdRot = Math.min(1.4, birdRot + 0.08);
      if (birdY > H - GROUND - BIRD_R) birdY = H - GROUND - BIRD_R;
      return;
    }

    birdV += GRAVITY;
    birdY += birdV;
    birdRot = Math.max(-0.55, Math.min(1.25, birdV * 0.08));
    if (wing > 0) wing--;

    if (frame % PIPE_EVERY === 0) spawnPipe();

    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= PIPE_SPEED;

      if (!p.scored && p.x + PIPE_W < W * 0.32) {
        p.scored = true;
        score++;
        if (score > best) {
          best = score;
          localStorage.setItem("flapBest", String(best));
        }
      }

      if (hitPipe(p)) die();
      if (p.x + PIPE_W < -20) pipes.splice(i, 1);
    }

    if (birdY + BIRD_R > H - GROUND || birdY - BIRD_R < 0) die();
    frame++;
  }

  function die() {
    if (state === "dead") return;
    state = "dead";
    hint.textContent = "Tap to retry";
    hint.classList.remove("hidden");
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#7ec8ff");
    g.addColorStop(0.55, "#b8e4ff");
    g.addColorStop(1, "#ffe566");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // soft sun
    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 230, 80, 0.55)";
    ctx.arc(W - 55, 55, 42, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCloud(c) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.s, c.s);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    roundBlob(-18, 0, 22);
    roundBlob(8, -6, 26);
    roundBlob(28, 2, 20);
    ctx.restore();
  }

  function roundBlob(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPipe(p) {
    const x = p.x;
    const topH = p.top;
    const botY = p.top + PIPE_GAP;
    const botH = H - GROUND - botY;

    drawPipeSeg(x, 0, topH, true);
    drawPipeSeg(x, botY, botH, false);
  }

  function drawPipeSeg(x, y, h, isTop) {
    if (h <= 0) return;
    const lip = 18;
    const lipH = 28;

    ctx.fillStyle = "#22a845";
    ctx.fillRect(x, y, PIPE_W, h);

    // highlight stripe
    ctx.fillStyle = "#4ae86f";
    ctx.fillRect(x + 6, y, 10, h);
    ctx.fillStyle = "#1a8a35";
    ctx.fillRect(x + PIPE_W - 12, y, 8, h);

    // lip
    const ly = isTop ? y + h - lipH : y;
    ctx.fillStyle = "#2ecc55";
    roundRect(x - 6, ly, PIPE_W + 12, lipH, 6);
    ctx.fillStyle = "#4ae86f";
    ctx.fillRect(x - 2, ly + 4, 12, lipH - 8);
    ctx.strokeStyle = "#1a5c28";
    ctx.lineWidth = 3;
    roundRectStroke(x - 6, ly, PIPE_W + 12, lipH, 6);

    ctx.strokeStyle = "#1a5c28";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, PIPE_W, h);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function roundRectStroke(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.stroke();
  }

  function drawGround() {
    const y = H - GROUND;
    ctx.fillStyle = "#e8a800";
    ctx.fillRect(0, y, W, GROUND);
    ctx.fillStyle = "#3ddc63";
    ctx.fillRect(0, y, W, 14);

    ctx.fillStyle = "#2ecc55";
    for (let i = -1; i < 20; i++) {
      const gx = i * 28 + groundX;
      ctx.beginPath();
      ctx.moveTo(gx, y + 14);
      ctx.lineTo(gx + 14, y);
      ctx.lineTo(gx + 28, y + 14);
      ctx.fill();
    }

    ctx.fillStyle = "#c48a00";
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(20 + i * 50 + (groundX % 50), y + 28, 18, 8);
    }

    ctx.strokeStyle = "#2a1a08";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  function drawBird() {
    const x = W * 0.32;
    const y = birdY;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(birdRot);

    // body
    ctx.fillStyle = "#ffd24a";
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_R + 2, BIRD_R, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a1a08";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // belly
    ctx.fillStyle = "#fff1b8";
    ctx.beginPath();
    ctx.ellipse(2, 6, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // wing
    const wingY = wing > 0 ? -10 : 2;
    ctx.fillStyle = "#f0b400";
    ctx.beginPath();
    ctx.ellipse(-4, wingY, 12, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // eye
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(8, -4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#2a1a08";
    ctx.beginPath();
    ctx.arc(10, -4, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // beak
    ctx.fillStyle = "#ff8a1a";
    ctx.beginPath();
    ctx.moveTo(12, 2);
    ctx.lineTo(26, 5);
    ctx.lineTo(12, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  function drawUI() {
    ctx.fillStyle = "#2a1a08";
    ctx.font = "900 36px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(255,246,214,0.9)";
    ctx.strokeText(String(score), W / 2, 52);
    ctx.fillText(String(score), W / 2, 52);

    if (state === "ready") {
      banner("TAP TO START", H * 0.62);
    }

    if (state === "dead") {
      ctx.fillStyle = "rgba(42,26,8,0.45)";
      ctx.fillRect(0, 0, W, H);

      roundPanel(W / 2 - 110, H / 2 - 78, 220, 156);

      ctx.fillStyle = "#2a1a08";
      ctx.font = "900 28px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 36);

      ctx.font = "800 18px Nunito, sans-serif";
      ctx.fillText(`Score  ${score}`, W / 2, H / 2);
      ctx.fillText(`Best   ${best}`, W / 2, H / 2 + 28);

      ctx.font = "800 15px Nunito, sans-serif";
      ctx.fillStyle = "#1f9a3a";
      ctx.fillText("tap to play again", W / 2, H / 2 + 58);
    }
  }

  function banner(text, y) {
    ctx.font = "900 22px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#2a1a08";
    ctx.fillStyle = "#ffe566";
    ctx.strokeText(text, W / 2, y);
    ctx.fillText(text, W / 2, y);
  }

  function roundPanel(x, y, w, h) {
    ctx.fillStyle = "rgba(255,246,214,0.96)";
    ctx.strokeStyle = "#2a1a08";
    ctx.lineWidth = 4;
    ctx.beginPath();
    const r = 18;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function draw() {
    drawSky();
    clouds.forEach(drawCloud);
    pipes.forEach(drawPipe);
    drawGround();
    drawBird();
    drawUI();
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // input — touch + mouse + keyboard, prevent double-fire on hybrid devices
  let lastTap = 0;
  function onPointer(e) {
    e.preventDefault();
    const now = Date.now();
    if (now - lastTap < 80) return;
    lastTap = now;
    flap();
  }

  canvas.addEventListener("pointerdown", onPointer, { passive: false });
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      flap();
    }
  });

  // copy CA
  copyBtn.addEventListener("click", async () => {
    const text = caEl.textContent.trim();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(caEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("copy");
      sel.removeAllRanges();
    }
    copyBtn.textContent = "Copied!";
    copyBtn.classList.add("copied");
    setTimeout(() => {
      copyBtn.textContent = "Copy";
      copyBtn.classList.remove("copied");
    }, 1400);
  });

  reset();
  loop();
})();
