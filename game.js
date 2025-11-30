(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const scoreValueEl = document.getElementById("scoreValue");
  const bestValueEl = document.getElementById("bestValue");
  const finalScoreEl = document.getElementById("finalScore");
  const finalBestEl = document.getElementById("finalBest");
  const overlayEl = document.getElementById("overlay");
  const overlayTitleEl = document.getElementById("overlayTitle");
  const startButton = document.getElementById("startButton");

  class InputManager {
    constructor() {
      this.left = false;
      this.right = false;
      this.jumpHeld = false;
      this.jumpQueued = false;
      this.bindKeyboard();
      this.bindButtons();
    }

    bindKeyboard() {
      window.addEventListener("keydown", (event) => {
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD"].includes(event.code)) {
          event.preventDefault();
        }
        switch (event.code) {
          case "ArrowLeft":
          case "KeyA":
            this.left = true;
            break;
          case "ArrowRight":
          case "KeyD":
            this.right = true;
            break;
          case "ArrowUp":
          case "Space":
            this.setJump(true);
            break;
        }
      });

      window.addEventListener("keyup", (event) => {
        switch (event.code) {
          case "ArrowLeft":
          case "KeyA":
            this.left = false;
            break;
          case "ArrowRight":
          case "KeyD":
            this.right = false;
            break;
          case "ArrowUp":
          case "Space":
            this.setJump(false);
            break;
        }
      });
    }

    bindButtons() {
      const buttons = document.querySelectorAll(".control-btn");
      buttons.forEach((btn) => {
        const action = btn.dataset.action;
        const press = (event) => {
          event.preventDefault();
          this.setAction(action, true);
        };
        const release = (event) => {
          event.preventDefault();
          this.setAction(action, false);
        };
        btn.addEventListener("pointerdown", press);
        btn.addEventListener("pointerup", release);
        btn.addEventListener("pointerleave", release);
        btn.addEventListener("pointercancel", release);
      });
    }

    setAction(action, pressed) {
      if (action === "left") this.left = pressed;
      if (action === "right") this.right = pressed;
      if (action === "jump") this.setJump(pressed);
    }

    setJump(pressed) {
      if (pressed && !this.jumpHeld) {
        this.jumpQueued = true;
        this.jumpHeld = true;
      }
      if (!pressed) {
        this.jumpHeld = false;
      }
    }

    consumeJump() {
      if (this.jumpQueued) {
        this.jumpQueued = false;
        return true;
      }
      return false;
    }
  }

  class Platform {
    constructor(x, y, width, height = 14, type = "basic") {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.type = type;
      this.destroyed = false;
      this.damage = 0;
      this.damageProgress = 0;
      this.falling = false;
      this.fallVelocity = 0;
      this.fragments = [];
      this.collidable = true;
      this.cloudHeight = type === "smoke" ? 48 : 0;
      this.cloudPhase = Math.random() * Math.PI * 2;
    }

    isSolid() {
      return this.collidable && !this.destroyed && !this.falling;
    }

    registerJump() {
      if (this.type !== "fragile" || !this.isSolid()) {
        return;
      }
      this.damage += 1;
      if (this.damage === 1) {
        this.damageProgress = 0;
      }
      if (this.damage >= 2) {
        this.beginCollapse();
      }
    }

    beginCollapse() {
      if (this.falling) return;
      this.collidable = false;
      this.falling = true;
      this.fragments = Array.from({ length: 5 }, () => ({
        x: this.x + Math.random() * this.width,
        y: this.y + Math.random() * this.height,
        vx: (Math.random() - 0.5) * 120,
        vy: -80 - Math.random() * 60,
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 5,
      }));
    }

    update(dt, canvasHeight) {
      if (this.type === "fragile" && this.damage > 0 && !this.falling) {
        this.damageProgress = Math.min(1, this.damageProgress + dt * 2);
      }

      if (this.falling) {
        this.fallVelocity += 1200 * dt;
        this.y += this.fallVelocity * dt;
        this.fragments.forEach((fragment) => {
          fragment.x += fragment.vx * dt;
          fragment.y += (this.fallVelocity + fragment.vy) * dt;
          fragment.vr += (Math.random() - 0.5) * 2 * dt;
          fragment.rotation += fragment.vr * dt;
          fragment.vy += 200 * dt;
        });
        if (this.y > canvasHeight + 100) {
          this.destroyed = true;
        }
      }
    }

    draw(ctx, time = 0) {
      ctx.save();
      if (this.falling && this.fragments.length > 0) {
        ctx.fillStyle = "#cc6f2d";
        this.fragments.forEach((fragment) => {
          ctx.save();
          ctx.translate(fragment.x, fragment.y);
          ctx.rotate(fragment.rotation);
          ctx.fillRect(-6, -3, 12, 6);
          ctx.restore();
        });
        ctx.restore();
        return;
      }

      let topColor = "#3b5c90";
      let bottomColor = "#1f2f54";
      if (this.type === "fragile") {
        topColor = "#ffb17a";
        bottomColor = "#cc6f2d";
      } else if (this.type === "sticky") {
        topColor = "#62ffbb";
        bottomColor = "#1c7b53";
      }

      const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
      gradient.addColorStop(0, topColor);
      gradient.addColorStop(1, bottomColor);

      const inset = this.type === "fragile" ? this.damageProgress * 3 : 0;
      ctx.fillStyle = gradient;
      ctx.fillRect(this.x + inset, this.y + inset * 0.3, this.width - inset * 2, this.height);

      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(this.x + inset, this.y + inset * 0.3, this.width - inset * 2, 2);

      if (this.type === "fragile" && this.damage > 0) {
        ctx.strokeStyle = "rgba(60,20,0,0.65)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.x + inset + 4, this.y + 3);
        ctx.lineTo(this.x + this.width * 0.4, this.y + this.height - 3);
        if (this.damage > 0.5) {
          ctx.moveTo(this.x + this.width - inset - 6, this.y + 2);
          ctx.lineTo(this.x + this.width * 0.6, this.y + this.height - 2);
        }
        ctx.stroke();
      }

      if (this.type === "sticky") {
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        const bubbleCount = Math.max(1, Math.round(this.width / 18));
        for (let i = 0; i < bubbleCount; i += 1) {
          const bubbleX = this.x + 6 + i * (this.width / bubbleCount);
          ctx.beginPath();
          ctx.arc(bubbleX, this.y + this.height / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (this.type === "smoke") {
        this.drawSmokeCloud(ctx, time);
      }

      ctx.restore();
    }

    drawSmokeCloud(ctx, time) {
      const pulse = 0.4 + 0.15 * Math.sin(time * 2 + this.cloudPhase);
      const baseY = this.y - this.cloudHeight + 6;
      const layers = 3;
      for (let i = 0; i < layers; i += 1) {
        const offsetY = baseY + i * 12;
        const alpha = 0.2 + pulse * 0.3 - i * 0.05;
        ctx.fillStyle = `rgba(190, 200, 210, ${Math.max(alpha, 0.05)})`;
        const wave = Math.sin(time * 1.5 + this.cloudPhase + i) * 6;
        ctx.beginPath();
        const segments = 6;
        for (let j = 0; j <= segments; j += 1) {
          const t = j / segments;
          const x = this.x + this.width * t + Math.sin(time * 2 + j) * 2;
          const radius = 12 + Math.sin(time * 3 + j * 0.8) * 3;
          ctx.moveTo(x + wave, offsetY);
          ctx.arc(x + wave, offsetY, radius - i * 3, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }
  }

  class Player {
    constructor(x, y) {
      this.width = 32;
      this.height = 52;
      this.x = x - this.width / 2;
      this.y = y - this.height;
      this.prevY = this.y;
      this.vx = 0;
      this.vy = 0;
      this.moveSpeed = 230;
      this.jumpStrength = 760;
      this.wallJumpStrength = 800;
      this.extraPushX = 0;
      this.onGround = false;
      this.touchingLeftWall = false;
      this.touchingRightWall = false;
      this.groundPlatform = null;
      this.stickyFactor = 1;
      this.shakeTimer = 0;
      this.animTimer = 0;
      this.visualSway = 0;
      this.knockTimer = 0;
      this.inSmoke = false;
    }

    groundJumpForce() {
      return this.jumpStrength * this.stickyFactor;
    }

    clearSurfaceEffects() {
      this.stickyFactor = 1;
      this.shakeTimer = 0;
      this.visualSway = 0;
    }

    updateAnimation(dt) {
      this.animTimer += dt;
      if (this.animTimer > Math.PI * 200) {
        this.animTimer = 0;
      }
      const targetSway = this.vx / Math.max(1, this.moveSpeed);
      this.visualSway += (targetSway - this.visualSway) * 0.12;
    }

    draw(ctx, time) {
      ctx.save();
      const shakeX = this.shakeTimer > 0 ? Math.sin(time * 50) * 2 : 0;
      const shakeY = this.shakeTimer > 0 ? Math.cos(time * 60) * 1.5 : 0;
      ctx.translate(this.x + this.width / 2 + shakeX, this.y + this.height + shakeY);
      const airMultiplier = this.onGround ? 0.6 : 1.25;
      const bob = Math.sin(this.animTimer * 6) * 2.4 * airMultiplier;
      const lean = this.visualSway * (this.onGround ? 0.22 : 0.32);
      ctx.rotate(lean);

      // Soft shadow
      const shadowScale = 1 - Math.min(1, Math.abs(this.vy) / 1200);
      ctx.save();
      ctx.translate(0, 10);
      ctx.scale(1, shadowScale);
      ctx.fillStyle = "rgba(5, 12, 30, 0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const torsoTop = -this.height + 16 + bob * 0.25;
      const torsoHeight = this.height - 22;

      // Under-suit silhouette
      ctx.fillStyle = "#071027";
      ctx.beginPath();
      ctx.roundRect(-14, torsoTop + 2, 28, torsoHeight, 12);
      ctx.fill();

      // Backpack module
      ctx.fillStyle = "#0c1838";
      ctx.beginPath();
      ctx.roundRect(-11, torsoTop + 8, 22, torsoHeight - 12, 10);
      ctx.fill();
      ctx.fillStyle = "#12305e";
      ctx.fillRect(-3, torsoTop + 12, 6, torsoHeight - 32);

      // Main suit
      const suitGradient = ctx.createLinearGradient(-14, torsoTop, 14, torsoTop + torsoHeight);
      suitGradient.addColorStop(0, "#9ffbff");
      suitGradient.addColorStop(0.4, "#5c9bff");
      suitGradient.addColorStop(0.75, "#3853e3");
      suitGradient.addColorStop(1, "#2431a6");
      ctx.fillStyle = suitGradient;
      ctx.beginPath();
      ctx.roundRect(-12, torsoTop + 1, 24, torsoHeight - 2, 11);
      ctx.fill();

      // Accent panels
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(-10, torsoTop + 6, 4, torsoHeight - 20);
      ctx.fillRect(6, torsoTop + 10, 3, torsoHeight - 28);

      // Chest emblem
      ctx.fillStyle = "#ffe865";
      ctx.beginPath();
      ctx.arc(0, torsoTop + torsoHeight * 0.45, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillRect(-3, torsoTop + torsoHeight * 0.45 - 2, 3, 4);

      // Waist band
      ctx.fillStyle = "#040d1f";
      ctx.fillRect(-14, torsoTop + torsoHeight * 0.55, 28, 6);
      ctx.fillStyle = "#f59f3f";
      ctx.fillRect(-5, torsoTop + torsoHeight * 0.55 + 1, 10, 4);

      // Shoulder plates
      ctx.fillStyle = "#2a3771";
      ctx.beginPath();
      ctx.roundRect(-16, torsoTop + 6, 8, 10, 4);
      ctx.roundRect(8, torsoTop + 6, 8, 10, 4);
      ctx.fill();

      // Arms
      const armSwing = Math.sin(this.animTimer * 4) * 4;
      const armSpread = 6 + Math.cos(this.animTimer * 3) * 2;
      ctx.fillStyle = "#1a274f";
      ctx.beginPath();
      ctx.roundRect(-14 - armSwing * 0.2 - armSpread, torsoTop + 18, 6, 22, 3);
      ctx.roundRect(8 + armSwing * 0.2 + armSpread, torsoTop + 18, 6, 22, 3);
      ctx.fill();
      ctx.fillStyle = "#0f1838";
      ctx.fillRect(-12 - armSwing * 0.15 - armSpread, torsoTop + 20, 4, 18);
      ctx.fillRect(10 + armSwing * 0.15 + armSpread, torsoTop + 20, 4, 18);

      // Gloves
      ctx.fillStyle = "#f5e5da";
      ctx.beginPath();
      ctx.arc(-9 - armSwing * 0.2 - armSpread, torsoTop + 40, 5, 0, Math.PI * 2);
      ctx.arc(9 + armSwing * 0.2 + armSpread, torsoTop + 40, 5, 0, Math.PI * 2);
      ctx.fill();

      // Head with visor
      const headY = torsoTop - 12 + bob * 0.5;
      ctx.fillStyle = "#ffe0c7";
      ctx.beginPath();
      ctx.arc(0, headY, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#0d1738";
      ctx.beginPath();
      ctx.roundRect(-12, headY - 4, 24, 10, 5);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(-7, headY - 2, 9, 4);

      // Hair accent
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, headY - 2, 11, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();

      // Thighs
      ctx.fillStyle = "#15264d";
      ctx.beginPath();
      ctx.roundRect(-12, this.height * 0.05, 10, 18, 6);
      ctx.roundRect(2, this.height * 0.05, 10, 18, 6);
      ctx.fill();

      // Boots
      ctx.fillStyle = "#08122d";
      const bootOffsetY = this.height * 0.12;
      ctx.beginPath();
      ctx.roundRect(-12, bootOffsetY, 11, 13, 5);
      ctx.roundRect(1, bootOffsetY, 11, 13, 5);
      ctx.fill();
      ctx.fillStyle = "#58c0ff";
      ctx.fillRect(-11, bootOffsetY + 7, 9, 2);
      ctx.fillRect(2, bootOffsetY + 7, 9, 2);

      ctx.restore();
    }
  }

  class Projectile {
    constructor(x, y, vx, radius = 9) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.radius = radius;
      this.glow = Math.random() * Math.PI * 2;
      this.active = true;
    }

    update(dt) {
      this.x += this.vx * dt;
      this.glow += dt * 6;
    }

    draw(ctx) {
      ctx.save();
      const baseColor = "rgba(255,80,80,0.8)";
      const glowStrength = 0.4 + Math.sin(this.glow) * 0.2;
      ctx.shadowColor = "rgba(255,25,25,0.8)";
      ctx.shadowBlur = 20;
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255,255,255,${glowStrength})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius - 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    isOutOfBounds(width) {
      return this.x < -this.radius * 2 || this.x > width + this.radius * 2;
    }
  }

  class Cannon {
    constructor(side, y, wallThickness, canvasWidth) {
      this.side = side;
      this.y = y;
      this.width = wallThickness;
      this.height = 34;
      this.wallThickness = wallThickness;
      this.canvasWidth = canvasWidth;
      this.cooldown = 1 + Math.random() * 2;
      this.interval = 2.8 + Math.random() * 1.5;
      this.x = side === "left" ? 0 : canvasWidth - wallThickness;
    }

    update(dt, projectiles) {
      this.cooldown -= dt;
      if (this.cooldown <= 0) {
        this.cooldown = this.interval;
        this.fire(projectiles);
      }
    }

    fire(projectiles) {
      const speed = 320;
      const dir = this.side === "left" ? 1 : -1;
      const originX =
        this.side === "left"
          ? this.wallThickness + 6
          : this.canvasWidth - this.wallThickness - 6;
      const originY = this.y + this.height * 0.5;
      projectiles.push(new Projectile(originX, originY, dir * speed));
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.fillStyle = "#0c1533";
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = "#1d2a5b";
      ctx.fillRect(
        this.side === "left" ? this.width - 8 : 0,
        4,
        8,
        this.height - 8
      );

      ctx.fillStyle = "#fa5252";
      ctx.beginPath();
      if (this.side === "left") {
        ctx.moveTo(this.width, this.height / 2 - 8);
        ctx.lineTo(this.width + 6, this.height / 2);
        ctx.lineTo(this.width, this.height / 2 + 8);
      } else {
        ctx.moveTo(0, this.height / 2 - 8);
        ctx.lineTo(-6, this.height / 2);
        ctx.lineTo(0, this.height / 2 + 8);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  class Game {
    constructor(canvas, ctx, input) {
      this.canvas = canvas;
      this.ctx = ctx;
      this.input = input;
      this.platforms = [];
      this.player = null;
      this.state = "idle";
      this.gravity = 1500;
      this.wallThickness = 22;
      this.distance = 0;
      this.score = 0;
      this.displayScore = 0;
      this.pendingShift = 0;
      this.shiftSpeed = 320;
      this.targetPlayerY = this.canvas.height * 0.62;
      this.cannons = [];
      this.projectiles = [];
      this.cannonSpacing = 260;
      this.nextCannonDistance = this.cannonSpacing;
      this.bestScore = this.loadBestScore();
      this.time = 0;
      this.hasStartedOnce = false;
      this.updateHud();
      finalScoreEl.textContent = "0";
      finalBestEl.textContent = this.bestScore.toString();
    }

    loadBestScore() {
      const stored = localStorage.getItem("skyClimbBestScore");
      return stored ? Number(stored) : 0;
    }

    saveBestScore() {
      localStorage.setItem("skyClimbBestScore", String(this.bestScore));
    }

    start() {
      this.state = "running";
      this.distance = 0;
      this.score = 0;
      this.displayScore = 0;
      this.pendingShift = 0;
      this.cannons = [];
      this.projectiles = [];
      this.nextCannonDistance = this.cannonSpacing;
      this.platforms = [];
      this.player = new Player(this.canvas.width / 2, this.canvas.height * 0.7);
      this.player.vy = 0;
      this.player.onGround = true;
      this.spawnInitialPlatforms();
      this.player.groundPlatform = this.platforms[0] || null;
      this.player.clearSurfaceEffects();
      this.player.inSmoke = false;
      if (this.player.groundPlatform) {
        this.player.y = this.player.groundPlatform.y - this.player.height;
      }
      this.updateHud();
      overlayEl.classList.add("hidden");
    }

    spawnInitialPlatforms() {
      const baseY = this.canvas.height * 0.7;
      const baseWidth = 120;
      const baseX = (this.canvas.width - baseWidth) / 2;
      this.platforms.push(new Platform(baseX, baseY, baseWidth));

      let currentY = baseY - 90;
      for (let i = 0; i < 6; i += 1) {
        const platform = this.generatePlatform(
          currentY,
          i % 2 === 0 ? 60 : -60,
          i > 1
        );
        this.platforms.push(platform);
        this.trySpawnCannon(platform.y - 40);
        currentY -= 80 + Math.random() * 60;
      }
    }

    generatePlatform(y, offset = 0, allowSpecial = true) {
      const width = 55 + Math.random() * 70;
      const innerMargin = 4;
      const minX = this.wallThickness + innerMargin;
      const maxX = this.canvas.width - this.wallThickness - width - innerMargin;
      let x = minX + Math.random() * Math.max(1, maxX - minX);
      if (offset !== 0) {
        x = Math.min(Math.max(x + offset, minX), maxX);
      }
      const placementRoll = Math.random();
      if (placementRoll < 0.25) {
        x = minX;
      } else if (placementRoll > 0.75) {
        x = maxX;
      }
      let type = "basic";
      if (allowSpecial) {
        const typeRoll = Math.random();
        if (typeRoll < 0.18) {
          type = "fragile";
        } else if (typeRoll < 0.33) {
          type = "sticky";
        } else if (typeRoll < 0.45) {
          type = "smoke";
        }
      }
      return new Platform(x, y, width, 14, type);
    }

    tick(dt) {
      this.time += dt;
      if (this.state === "running") {
        this.update(dt);
      }
      this.draw();
    }

    update(dt) {
      const player = this.player;
      this.platforms.forEach((platform) => platform.update(dt, this.canvas.height));
      this.trimPlatforms();
      player.prevY = player.y;
      const wasOnGround = player.onGround;
      if (!player.onGround) {
        player.vy += this.gravity * dt;
      } else {
        player.vy = 0;
      }
      player.touchingLeftWall = false;
      player.touchingRightWall = false;

      let horizontal = 0;
      if (this.input.left) horizontal -= 1;
      if (this.input.right) horizontal += 1;
      player.vx = horizontal * player.moveSpeed + player.extraPushX;
      player.extraPushX *= 0.9;

      player.x += player.vx * dt;
      player.updateAnimation(dt);

      const minX = this.wallThickness;
      const maxX = this.canvas.width - this.wallThickness - player.width;

      if (player.x <= minX) {
        player.x = minX;
        player.touchingLeftWall = true;
        player.extraPushX = Math.max(0, player.extraPushX);
      }

      if (player.x >= maxX) {
        player.x = maxX;
        player.touchingRightWall = true;
        player.extraPushX = Math.min(0, player.extraPushX);
      }

      if (
        player.onGround &&
        player.groundPlatform &&
        (player.x + player.width <= player.groundPlatform.x ||
          player.x >= player.groundPlatform.x + player.groundPlatform.width)
      ) {
        player.onGround = false;
        player.groundPlatform = null;
        player.clearSurfaceEffects();
      }

      if (this.input.consumeJump()) {
        let jumped = false;
        if (wasOnGround) {
          let canJumpFromGround = true;
          if (player.groundPlatform && player.groundPlatform.type === "sticky") {
            const success = Math.random() < 0.33;
            if (!success) {
              canJumpFromGround = false;
              player.shakeTimer = 0.25;
            } else {
              player.shakeTimer = 0;
            }
          }
          if (canJumpFromGround) {
            const takeoffPlatform = player.groundPlatform;
            if (takeoffPlatform && takeoffPlatform.type === "fragile") {
              takeoffPlatform.registerJump();
            }
            player.vy = -player.groundJumpForce();
            player.onGround = false;
            player.groundPlatform = null;
            player.clearSurfaceEffects();
            jumped = true;
          }
        }
        if (
          !jumped &&
          player.knockTimer <= 0 &&
          (player.touchingLeftWall || player.touchingRightWall)
        ) {
          const dir = player.touchingLeftWall ? 1 : -1;
          player.vy = -player.wallJumpStrength;
          player.extraPushX = dir * player.moveSpeed * 1.3;
          player.clearSurfaceEffects();
        }
      }

      player.y += player.vy * dt;

      let landedPlatform = null;
      if (player.vy > 0 && player.knockTimer <= 0) {
        for (const platform of this.platforms) {
          if (!platform.isSolid()) continue;
          const isCrossing =
            player.prevY + player.height <= platform.y &&
            player.y + player.height >= platform.y;
          const overlapsX =
            player.x + player.width > platform.x &&
            player.x < platform.x + platform.width;

          if (isCrossing && overlapsX) {
            player.y = platform.y - player.height;
            player.vy = 0;
            landedPlatform = platform;
            break;
          }
        }
      }

      if (landedPlatform && player.knockTimer <= 0) {
        player.onGround = true;
        player.groundPlatform = landedPlatform;
        const stillSolid = landedPlatform.isSolid();
        if (landedPlatform.type === "sticky" && stillSolid) {
          player.shakeTimer = 0;
        } else if (stillSolid) {
          player.clearSurfaceEffects();
        }
        if (!stillSolid) {
          player.onGround = false;
          player.groundPlatform = null;
          player.clearSurfaceEffects();
        } else {
          this.alignAfterLanding();
        }
      } else if (player.vy !== 0) {
        player.onGround = false;
        if (player.vy > 0) {
          player.groundPlatform = null;
          player.clearSurfaceEffects();
        }
      } else if (player.onGround && player.groundPlatform) {
        player.y = player.groundPlatform.y - player.height;
      }

      if (player.shakeTimer > 0) {
        player.shakeTimer = Math.max(0, player.shakeTimer - dt);
      }
      if (player.knockTimer > 0) {
        player.knockTimer = Math.max(0, player.knockTimer - dt);
      }

      this.updateCannons(dt);
      this.updateProjectiles(dt);
      this.handleProjectileHits();
      this.checkSmokeCloudEffect();

      this.processPendingShift(dt);
      this.updateDisplayedScore(dt);
      this.updateHud();

      if (player.y > this.canvas.height) {
        this.handleGameOver();
      }
    }

    trimPlatforms() {
      const maxY = this.canvas.height + 80;
      this.platforms = this.platforms.filter(
        (platform) => !platform.destroyed && platform.y < maxY
      );
      if (
        this.player &&
        this.player.groundPlatform &&
        !this.platforms.includes(this.player.groundPlatform)
      ) {
        this.player.groundPlatform = null;
        this.player.onGround = false;
        this.player.clearSurfaceEffects();
      }
      this.trimHazards();
    }

    spawnPlatformsIfNeeded() {
      if (this.platforms.length === 0) return;
      let highestY = Math.min(...this.platforms.map((p) => p.y));
      while (highestY > -60) {
        const gap = 70 + Math.random() * 80;
        const newPlatform = this.generatePlatform(highestY - gap);
        this.platforms.push(newPlatform);
        this.trySpawnCannon(newPlatform.y - 40);
        highestY = newPlatform.y;
      }
    }

    trySpawnCannon(y) {
      if (this.distance < this.nextCannonDistance) return;
      if (Math.random() < 0.3) {
        const side = Math.random() < 0.5 ? "left" : "right";
        const cannonY = Math.max(y, -40);
        this.cannons.push(new Cannon(side, cannonY, this.wallThickness, this.canvas.width));
        const spacingMultiplier = 0.9 + Math.random() * 0.7;
        this.nextCannonDistance = this.distance + this.cannonSpacing * spacingMultiplier;
      }
    }

    updateCannons(dt) {
      this.cannons.forEach((cannon) => cannon.update(dt, this.projectiles));
    }

    updateProjectiles(dt) {
      this.projectiles.forEach((projectile) => projectile.update(dt));
      this.projectiles = this.projectiles.filter(
        (projectile) => projectile.active && !projectile.isOutOfBounds(this.canvas.width)
      );
    }

    handleProjectileHits() {
      if (this.player.knockTimer > 0) return;
      const player = this.player;
      const px1 = player.x;
      const px2 = player.x + player.width;
      const py1 = player.y;
      const py2 = player.y + player.height;

      for (const projectile of this.projectiles) {
        if (!projectile.active) continue;
        const closestX = Math.max(px1, Math.min(projectile.x, px2));
        const closestY = Math.max(py1, Math.min(projectile.y, py2));
        const dx = projectile.x - closestX;
        const dy = projectile.y - closestY;
        if (dx * dx + dy * dy <= projectile.radius * projectile.radius) {
          projectile.active = false;
          this.onPlayerHitByProjectile(projectile.vx);
          break;
        }
      }
      this.projectiles = this.projectiles.filter((projectile) => projectile.active);
    }

    checkSmokeCloudEffect() {
      const player = this.player;
      let inSmoke = false;
      for (const platform of this.platforms) {
        if (platform.type !== "smoke") continue;
        const cloudTop = platform.y - platform.cloudHeight - 6;
        const cloudBottom = platform.y + 2;
        const overlapsX =
          player.x + player.width > platform.x &&
          player.x < platform.x + platform.width;
        const overlapsY =
          player.y < cloudBottom && player.y + player.height > cloudTop;
        if (overlapsX && overlapsY) {
          inSmoke = true;
          break;
        }
      }
      player.inSmoke = inSmoke;
    }

    onPlayerHitByProjectile(projectileVx) {
      const player = this.player;
      player.knockTimer = 0.8;
      player.vy = Math.max(player.vy, 80);
      const push = projectileVx >= 0 ? 1 : -1;
      player.extraPushX = projectileVx * 0.35 + push * 80;
      player.onGround = false;
      player.groundPlatform = null;
      player.clearSurfaceEffects();
      player.y += 2;
      player.shakeTimer = 0;
    }

    alignAfterLanding() {
      const playerTopTarget = this.targetPlayerY;
      const shift = playerTopTarget - this.player.y;
      if (shift > 0) {
        this.pendingShift += shift;
      }
    }

    processPendingShift(dt) {
      if (this.pendingShift <= 0) {
        return;
      }
      const step = Math.min(this.pendingShift, this.shiftSpeed * dt);
      this.applyShift(step);
      this.pendingShift -= step;
    }

    applyShift(amount) {
      if (amount <= 0) return;
      this.player.y += amount;
      this.platforms.forEach((platform) => {
        platform.y += amount;
      });
      this.cannons.forEach((cannon) => {
        cannon.y += amount;
      });
      this.projectiles.forEach((projectile) => {
        projectile.y += amount;
      });
      this.distance += amount;
      this.score = Math.floor(this.distance / 10);
      this.trimPlatforms();
      this.trimHazards();
      this.spawnPlatformsIfNeeded();
    }

    trimHazards() {
      const cannonLimitY = this.canvas.height + 120;
      this.cannons = this.cannons.filter((cannon) => cannon.y < cannonLimitY);
      const projectileLimitY = this.canvas.height + 80;
      this.projectiles = this.projectiles.filter(
        (projectile) =>
          projectile.active &&
          !projectile.isOutOfBounds(this.canvas.width) &&
          projectile.y < projectileLimitY
      );
    }

    updateDisplayedScore(dt) {
      const diff = this.score - this.displayScore;
      if (Math.abs(diff) < 0.01) {
        this.displayScore = this.score;
        return;
      }
      const rate = 35 + Math.abs(diff) * 0.2;
      const step = Math.sign(diff) * Math.min(Math.abs(diff), rate * dt);
      this.displayScore += step;
    }

    updateHud() {
      scoreValueEl.textContent = Math.round(this.displayScore).toString();
      bestValueEl.textContent = this.bestScore.toString();
    }

    draw() {
      this.drawBackground();
      this.drawWalls();
      this.drawCannons();
      this.platforms.forEach((platform) => platform.draw(this.ctx, this.time));
      this.projectiles.forEach((projectile) => projectile.draw(this.ctx));
      if (this.player) {
        this.player.draw(this.ctx, this.time);
        if (this.player.inSmoke) {
          this.drawSmokeFog();
        }
      }
    }

    drawBackground() {
      const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
      gradient.addColorStop(0, "#0c1d3c");
      gradient.addColorStop(1, "#050917");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#1d2f55";
      const offset = (this.distance * 0.3) % 40;
      for (let i = -1; i < this.canvas.height / 40 + 2; i += 1) {
        const y = i * 40 + offset;
        ctx.fillRect(0, y, this.canvas.width, 2);
      }
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#133963";
      for (let i = 0; i < 20; i += 1) {
        const x = (i * 60 + this.distance * 0.1) % (this.canvas.width + 80) - 40;
        ctx.fillRect(x, (i * 30) % this.canvas.height, 2, 24);
      }
      ctx.restore();
    }

    drawWalls() {
      ctx.save();
      const wallGradientLeft = ctx.createLinearGradient(0, 0, this.wallThickness, 0);
      wallGradientLeft.addColorStop(0, "#111c3d");
      wallGradientLeft.addColorStop(1, "#060b1a");
      ctx.fillStyle = wallGradientLeft;
      ctx.fillRect(0, 0, this.wallThickness, this.canvas.height);

      const wallGradientRight = ctx.createLinearGradient(
        this.canvas.width - this.wallThickness,
        0,
        this.canvas.width,
        0
      );
      wallGradientRight.addColorStop(0, "#060b1a");
      wallGradientRight.addColorStop(1, "#111c3d");
      ctx.fillStyle = wallGradientRight;
      ctx.fillRect(
        this.canvas.width - this.wallThickness,
        0,
        this.wallThickness,
        this.canvas.height
      );

      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.wallThickness, 0);
      ctx.lineTo(this.wallThickness, this.canvas.height);
      ctx.moveTo(this.canvas.width - this.wallThickness, 0);
      ctx.lineTo(this.canvas.width - this.wallThickness, this.canvas.height);
      ctx.stroke();
      ctx.restore();
    }

    drawSmokeFog() {
      const player = this.player;
      if (!player) return;
      const px = Math.min(
        Math.max(player.x + player.width / 2, 0),
        this.canvas.width
      );
      const py = Math.min(
        Math.max(player.y + player.height / 2, 0),
        this.canvas.height
      );
      const radius = 140;
      this.ctx.save();
      this.ctx.fillStyle = "rgba(10, 10, 12, 1)";
      this.ctx.beginPath();
      this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.arc(px, py, radius, 0, Math.PI * 2, true);
      this.ctx.fill("evenodd");
      this.ctx.restore();
      this.ctx.save();
      this.ctx.globalAlpha = 0.45;
      this.ctx.strokeStyle = "rgba(190,195,205,1)";
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(px, py, radius - 5, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }

    drawCannons() {
      this.cannons.forEach((cannon) => cannon.draw(this.ctx));
    }

    handleGameOver() {
      this.state = "over";
      this.hasStartedOnce = true;
      this.pendingShift = 0;
      this.displayScore = this.score;
      const finalScore = this.score;
      if (finalScore > this.bestScore) {
        this.bestScore = finalScore;
        this.saveBestScore();
      }
      finalScoreEl.textContent = finalScore.toString();
      finalBestEl.textContent = this.bestScore.toString();
      overlayTitleEl.textContent = "Игра окончена";
      startButton.textContent = "Играть ещё";
      overlayEl.classList.remove("hidden");
      this.updateHud();
    }
  }

  // Polyfill for CanvasRenderingContext2D.roundRect (keeps native signature)
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius = 0) {
      const radii = typeof radius === "number"
        ? { tl: radius, tr: radius, br: radius, bl: radius }
        : { tl: radius.tl || 0, tr: radius.tr || 0, br: radius.br || 0, bl: radius.bl || 0 };

      this.moveTo(x + radii.tl, y);
      this.lineTo(x + width - radii.tr, y);
      this.quadraticCurveTo(x + width, y, x + width, y + radii.tr);
      this.lineTo(x + width, y + height - radii.br);
      this.quadraticCurveTo(x + width, y + height, x + width - radii.br, y + height);
      this.lineTo(x + radii.bl, y + height);
      this.quadraticCurveTo(x, y + height, x, y + height - radii.bl);
      this.lineTo(x, y + radii.tl);
      this.quadraticCurveTo(x, y, x + radii.tl, y);
      this.closePath();
      return this;
    };
  }

  const input = new InputManager();
  const game = new Game(canvas, ctx, input);

  startButton.addEventListener("click", () => {
    if (game.state !== "running") {
      if (game.hasStartedOnce) {
        overlayTitleEl.textContent = "Sky Ascend";
      }
      game.start();
    }
  });

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    game.tick(dt);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
