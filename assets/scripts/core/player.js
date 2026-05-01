class PlayerState {
  constructor() {
    this.reset();
  }
  reset() {
    this.y = 30;
    this.lastY = 30;
    this.lastGroundPosY = 30;
    this.yVelocity = 0;
    this.onGround = true;
    this.canJump = true;
    this.isJumping = false;
    this.gravityFlipped = false;
    this.isFlying = false;
    this.isBall = false;
    this.isWave = false;
    this.isUfo = false;
    this.isSpider = false;
    this.isBird = false;
    this.isDart = false;
    this.isRobot = false;
    this.isSwing = false;
    this.isJetpack = false;
    this.isMini = false;
    this.wasBoosted = false;
    this.pendingVelocity = null;
    this.collideTop = 0;
    this.collideBottom = 0;
    this.onCeiling = false;
    this.upKeyDown = false;
    this.upKeyPressed = false;
    this.queuedHold = false;
    this.isDead = false;
    this.mirrored = false;
    this.isDashing = false;
    this.dashYVelocity = 0;
    this.isDual = false;
  }
}

class StreakManager {
  constructor(scene, textureName, duration, minSegmentSize, maxSegmentSize, strokeSize, color = 16777215, opacity = 1) {
    this._color = color;
    this._opacity = opacity;
    this._fadeDelta = 1 / duration;
    this._minSegSq = minSegmentSize * minSegmentSize;
    this._maxSeg = maxSegmentSize;
    this._maxPoints = Math.floor(duration * 60 + 2) * 5;
    this._stroke = strokeSize;
    this._pts = [];
    this._posR = {
      x: 0,
      y: 0
    };
    this._posInit = false;
    this._active = false;
    const graphicsSettings = window.performanceOptimizer ? window.performanceOptimizer.getGraphicsSettings() : {
      enableGlow: true,
      blendMode: Phaser.BlendModes.ADD
    };
    
    this._gfx = scene.add.graphics();
    this._gfx.setBlendMode(graphicsSettings.blendMode);
  }
  addToContainer(container, depth) {
    container.add(this._gfx);
    this._gfx.setDepth(depth);
  }
  setColor(newColor) {
    this._color = newColor
  }
  setPosition(x, y) {
    this._posR.x = x;
    this._posR.y = y;
    this._posInit = true;
  }
  start() {
    this._active = true;
  }
  stop() {
    this._active = false;
  }
  reset() {
    this._pts = [];
    this._posInit = false;
    this._gfx.clear();
  }
  update(deltaTime) {
    if (!this._posInit) {
      this._gfx.clear();
      return;
    }
    const fadeAmount = deltaTime * this._fadeDelta;
    let writeIndex = 0;
    for (let i = 0; i < this._pts.length; i++) {
      this._pts[i].state -= fadeAmount;
      if (this._pts[i].state > 0) {
        if (writeIndex !== i) {
          this._pts[writeIndex] = this._pts[i];
        }
        writeIndex++;
      }
    }
    this._pts.length = writeIndex;
    if (this._active && this._pts.length < this._maxPoints) {
      const currentLength = this._pts.length;
      let shouldAddPoint = true;
      if (currentLength > 0) {
        const lastPoint = this._pts[currentLength - 1];
        const deltaX = this._posR.x - lastPoint.x;
        const deltaY = this._posR.y - lastPoint.y;
        const distanceSq = deltaX * deltaX + deltaY * deltaY;
        if (this._maxSeg > 0 && Math.sqrt(distanceSq) > this._maxSeg) {
          this._pts.length = 0;
        } else if (distanceSq < this._minSegSq) {
          shouldAddPoint = false;
        } else if (currentLength > 1) {
          const prevPoint = this._pts[currentLength - 2];
          const prevDeltaX = this._posR.x - prevPoint.x;
          const prevDeltaY = this._posR.y - prevPoint.y;
          if (prevDeltaX * prevDeltaX + prevDeltaY * prevDeltaY < this._minSegSq * 2) {
            shouldAddPoint = false;
          }
        }
      }
      if (shouldAddPoint) {
        this._pts.push({
          x: this._posR.x,
          y: this._posR.y,
          state: 1
        });
      }
    }
    this._gfx.clear();
    const pointCount = this._pts.length;
    if (!(pointCount < 2)) {
      for (let i = 0; i < pointCount - 1; i++) {
        const point1 = this._pts[i];
        const point2 = this._pts[i + 1];
        const alpha = (point1.state + point2.state) * 0.5 * this._opacity;
        this._gfx.lineStyle(this._stroke, this._color, alpha);
        this._gfx.lineBetween(point1.x, point1.y, point2.x, point2.y);
      }
    }
  }
}
class WaveTrail {
  constructor(scene, color, glowColor) {
    this._color = color;
    this._glowColor = glowColor;
    this._pts = [];
    this._active = false;
    this._posInit = false;
    this._pos = { x: 0, y: 0 };
    this._maxAge = 0.6;
    this._minSegSq = 1.5 * 1.5;
    this._halfW = 7;
    this._glowHalfW = 14;
    this._gfx = scene.add.graphics();
    this._gfx.setBlendMode(Phaser.BlendModes.NORMAL);
    this._glowGfx = scene.add.graphics();
    this._glowGfx.setBlendMode(Phaser.BlendModes.ADD);
  }
  addToContainer(container, depth) {
    container.add(this._glowGfx);
    this._glowGfx.setDepth(depth - 1);
    container.add(this._gfx);
    this._gfx.setDepth(depth);
  }
  setPosition(x, y) { this._pos.x = x; this._pos.y = y; this._posInit = true; }
  start() { this._active = true; }
  stop()  { this._active = false; }
  reset() { this._pts = []; this._posInit = false; this._gfx.clear(); this._glowGfx.clear(); }

  _intersect(p1, p2, p3, p4) {
    const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
    const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
    const denom = d1x * d2y - d1y * d2x;
    if (Math.abs(denom) < 1e-6) return { x: p2.x, y: p2.y };
    const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
    const tc = Math.max(-3, Math.min(3, t));
    return { x: p1.x + d1x * tc, y: p1.y + d1y * tc };
  }

  _buildEdges(pts, halfW) {
    const n = pts.length;
    const upper = new Array(n);
    const lower = new Array(n);
    
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      let nx, ny;

      if (i === 0) {
        const dx = pts[1].x - p.x;
        const dy = pts[1].y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        nx = -dy / len;
        ny = dx / len;
      } else if (i === n - 1) {
        const dx = p.x - pts[i - 1].x;
        const dy = p.y - pts[i - 1].y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        nx = -dy / len;
        ny = dx / len;
      } else {
        const dx1 = p.x - pts[i - 1].x;
        const dy1 = p.y - pts[i - 1].y;
        const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;

        const dx2 = pts[i + 1].x - p.x;
        const dy2 = pts[i + 1].y - p.y;
        const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;

        nx = -(dy1 / len1 + dy2 / len2) * 0.5;
        ny = (dx1 / len1 + dx2 / len2) * 0.5;
      }

      upper[i] = { x: p.x + nx * halfW, y: p.y + ny * halfW };
      lower[i] = { x: p.x - nx * halfW, y: p.y - ny * halfW };
    }
    return { upper, lower };
  }

  _drawRibbon(gfx, pts, halfW, color, baseAlpha, antialias = false) {
    const n = pts.length;
    if (n < 2) return;

    const { upper, lower } = this._buildEdges(pts, halfW);
    if (antialias) {
      this._drawRibbon(gfx, pts, halfW + 0.5, color, baseAlpha * 0.5, false);
    }

    for (let i = 0; i < n - 1; i++) {
      const alpha = Math.max(0, (1 - (pts[i].age + pts[i+1].age) * 0.5)) * baseAlpha;
      if (alpha <= 0.01) continue;

      gfx.fillStyle(color, alpha);
      
      gfx.fillTriangle(
        upper[i].x, upper[i].y,
        upper[i+1].x, upper[i+1].y,
        lower[i].x, lower[i].y
      );
      gfx.fillTriangle(
        upper[i+1].x, upper[i+1].y,
        lower[i+1].x, lower[i+1].y,
        lower[i].x, lower[i].y
      );
    }
  }

  update(delta) {
    if (!this._posInit) { this._gfx.clear(); this._glowGfx.clear(); return; }
    const decay = (delta / 1000) / this._maxAge;

    let alive = 0;
    for (let i = 0; i < this._pts.length; i++) {
      this._pts[i].age += decay;
      if (this._pts[i].age < 1) this._pts[alive++] = this._pts[i];
    }
    this._pts.length = alive;

    if (this._active) {
      const n = this._pts.length;
      let add = true;
      if (n > 0) {
        const last = this._pts[n - 1];
        const dx = this._pos.x - last.x, dy = this._pos.y - last.y;
        if (dx*dx + dy*dy < this._minSegSq) add = false;
      }
      if (add) this._pts.push({ x: this._pos.x, y: this._pos.y, age: 0 });
    }

    this._gfx.clear();
    this._glowGfx.clear();
    if (this._pts.length < 2) return;

    const solid = window.solidWave === true;
    if (solid) {
      this._drawRibbon(this._gfx, this._pts, this._halfW, window.mainColor, 1.0);
    } else {
      this._drawRibbon(this._glowGfx, this._pts, this._glowHalfW, this._glowColor, 0.22);
      this._drawRibbon(this._gfx, this._pts, this._halfW, this._color, 0.95);
      this._drawRibbon(this._gfx, this._pts, Math.round(this._halfW * 0.32), 0xffffff, 0.5);
    }
  }
}
function createSpriteLayer(scene, x, y, textureName, depth, visible) {
  let atlasFrame = getAtlasFrame(scene, textureName);
  if (!atlasFrame) {
    return null;
  }
  let sprite = scene.add.image(x, y, atlasFrame.atlas, atlasFrame.frame);
  sprite.setDepth(depth);
  sprite.setVisible(visible);
  return {
    sprite: sprite
  };
}

class PlayerObject {
  constructor(scene, playerState, gameLayer) {
    this._scene = scene;
    this.p = playerState;
    this._gameLayer = gameLayer;
    this._rotation = 0;
    this.rotateActionActive = false;
    this.rotateActionTime = 0;
    this.rotateActionDuration = 0;
    this.rotateActionStart = 0;
    this.rotateActionTotal = 0;
    this._lastLandObject = null;
    this._lastXOffset = 0;
    this._lastCameraX = 0;
    this._lastCameraY = 0;
    this._dashAnimationFrame = 0;
    this._dashAnimationTimer = 0;
    this._dashAnimationSprite = null;
    this._createSprites();
    this._hitboxGraphics = scene.add.graphics().setScrollFactor(0).setDepth(20);
    this._initParticles(scene);
    scene.events.on("shutdown", () => this._cleanupExplosion());
    this.noclipStats = {
      totalFrames: 0,
      deathFrames: 0,
      accuracy: 100,
      deaths: 0
    };
  }
  _createSprites() {
    const spriteY = this._scene;
    const spriteX = b(this.p.y);
    const particleY = centerX;
    this._playerGlowLayer = createSpriteLayer(spriteY, particleY, spriteX, `${window.currentPlayer}_glow_001.png`, 9, false);
    this._playerSpriteLayer = createSpriteLayer(spriteY, particleY, spriteX, `${window.currentPlayer}_001.png`, 10, true);
    this._playerOverlayLayer = createSpriteLayer(spriteY, particleY, spriteX, `${window.currentPlayer}_2_001.png`, 8, true);
    this._playerExtraLayer = createSpriteLayer(spriteY, particleY, spriteX, `${window.currentPlayer}_extra_001.png`, 12, true);
    if (this._playerGlowLayer) {
      this._playerGlowLayer.sprite.setTint(window.secondaryColor);
      this._playerGlowLayer.sprite._glowEnabled = false;
    }
    if (this._playerSpriteLayer) {
      this._playerSpriteLayer.sprite.setTint(window.mainColor);
    } else {
      let fallbackSprite = spriteY.add.rectangle(particleY, spriteX, g, g, window.mainColor);
      fallbackSprite.setDepth(10);
      this._playerSpriteLayer = {
        sprite: fallbackSprite
      };
    }
    if (this._playerOverlayLayer) {
      this._playerOverlayLayer.sprite.setTint(window.secondaryColor);
    }
    this._shipGlowLayer = createSpriteLayer(spriteY, particleY, spriteX, `${window.currentShip}_glow_001.png`, 9, false);
    this._shipSpriteLayer = createSpriteLayer(spriteY, particleY, spriteX, `${window.currentShip}_001.png`, 10, false);
    this._shipOverlayLayer = createSpriteLayer(spriteY, particleY, spriteX, `${window.currentShip}_2_001.png`, 8, false);
    this._shipExtraLayer = createSpriteLayer(spriteY, particleY, spriteX, `${window.currentShip}_extra_001.png`, 12, false);
    if (this._shipGlowLayer) {
      this._shipGlowLayer.sprite.setTint(window.secondaryColor);
      this._shipGlowLayer.sprite._glowEnabled = false;
    }
    if (this._shipSpriteLayer) {
      this._shipSpriteLayer.sprite.setTint(window.mainColor);
    } else {
      let shipFallbackSprite = spriteY.add.polygon(particleY, spriteX, [{
        x: -72,
        y: 40
      }, {
        x: 72,
        y: 0
      }, {
        x: -72,
        y: -40
      }, {
        x: -40,
        y: 0
      }], window.mainColor);
      shipFallbackSprite.setDepth(10).setVisible(false);
      this._shipSpriteLayer = {
        sprite: shipFallbackSprite
      };
    }
    if (this._shipOverlayLayer) {
      this._shipOverlayLayer.sprite.setTint(window.secondaryColor);
    }
    this._ballGlowLayer = createSpriteLayer(spriteY, particleY, spriteX, `${window.currentBall}_glow_001.png`, 9, false);
    this._ballSpriteLayer = createSpriteLayer(spriteY, particleY, spriteX, `${window.currentBall}_001.png`, 10, false);
    this._ballOverlayLayer = createSpriteLayer(spriteY, particleY, spriteX, `${window.currentBall}_2_001.png`, 8, false);
    if (this._ballGlowLayer) {
      this._ballGlowLayer.sprite.setTint(window.secondaryColor);
      this._ballGlowLayer.sprite._glowEnabled = false;
    }
    if (this._ballSpriteLayer) {
      this._ballSpriteLayer.sprite.setTint(window.mainColor);
    }
    if (this._ballOverlayLayer) {
      this._ballOverlayLayer.sprite.setTint(window.secondaryColor);
    }
    this._waveGlowLayer = createSpriteLayer(spriteY, particleY, spriteX, "player_dart_00_glow_001.png", 9, false);
    this._waveOverlayLayer = createSpriteLayer(spriteY, particleY, spriteX, "player_dart_00_2_001.png", 8, false);
    this._waveExtraLayer = null;
    this._waveSpriteLayer = createSpriteLayer(spriteY, particleY, spriteX, "player_dart_00_001.png", 10, false);
    if (this._waveGlowLayer) {
      this._waveGlowLayer.sprite.setTint(window.secondaryColor);
      this._waveGlowLayer.sprite._glowEnabled = false;
      this._waveGlowLayer.sprite.setScale(0.42);
    }
    if (this._waveSpriteLayer) {
      this._waveSpriteLayer.sprite.setTint(window.mainColor);
      this._waveSpriteLayer.sprite.setScale(0.42);
    }
    if (this._waveOverlayLayer) {
      this._waveOverlayLayer.sprite.setTint(window.secondaryColor);
      this._waveOverlayLayer.sprite.setScale(0.42);
    }
    this.playerSprite = this._playerSpriteLayer.sprite;
    this.shipSprite = this._shipSpriteLayer.sprite;
    this._playerLayers = [this._playerSpriteLayer, this._playerGlowLayer, this._playerOverlayLayer, this._playerExtraLayer];
    this._shipLayers = [this._shipSpriteLayer, this._shipGlowLayer, this._shipOverlayLayer, this._shipExtraLayer];
    this._ballLayers = [this._ballSpriteLayer, this._ballGlowLayer, this._ballOverlayLayer].filter(layer => !!layer);
    this._waveLayers = [this._waveSpriteLayer, this._waveOverlayLayer, this._waveExtraLayer, this._waveGlowLayer].filter(layer => !!layer);
    const _spiderBase = `${window.currentSpider}_01`;
    this._spiderSpriteLayer  = createSpriteLayer(spriteY, particleY, spriteX, `${_spiderBase}_001.png`,       10, false);
    this._spiderGlowLayer    = createSpriteLayer(spriteY, particleY, spriteX, `${_spiderBase}_glow_001.png`,  9,  false);
    this._spiderOverlayLayer = createSpriteLayer(spriteY, particleY, spriteX, `${_spiderBase}_2_001.png`,     8,  false);
    this._spiderExtraLayer   = createSpriteLayer(spriteY, particleY, spriteX, `${_spiderBase}_extra_001.png`, 12, false);
    if (this._spiderSpriteLayer)  this._spiderSpriteLayer.sprite.setTint(window.mainColor);
    if (this._spiderOverlayLayer) this._spiderOverlayLayer.sprite.setTint(window.secondaryColor);
    if (this._spiderGlowLayer)    { this._spiderGlowLayer.sprite.setTint(window.secondaryColor); this._spiderGlowLayer.sprite._glowEnabled = false; }
    this._spiderLayers = [this._spiderSpriteLayer, this._spiderGlowLayer, this._spiderOverlayLayer, this._spiderExtraLayer].filter(x => !!x);
    this._birdSpriteLayer = createSpriteLayer(spriteY, particleY, spriteX, `${window.currentBird}_001.png`, 10, false);
    this._birdGlowLayer = createSpriteLayer(spriteY, particleY, spriteX, `${window.currentBird}_2_001.png`, 9, false);
    this._birdOverlayLayer = createSpriteLayer(spriteY, particleY, spriteX, `${window.currentBird}_3_001.png`, 8, false);
    this._birdExtraLayer = createSpriteLayer(spriteY, particleY, spriteX, `${window.currentBird}_extra_001.png`, 12, false);
    if (this._birdSpriteLayer) {
      this._birdSpriteLayer.sprite.setTint(window.mainColor);
    }
    if (this._birdGlowLayer) {
      this._birdGlowLayer.sprite.setTint(window.secondaryColor);
      this._birdGlowLayer.sprite._glowEnabled = false;
    }
    if (this._birdOverlayLayer) {
      this._birdOverlayLayer.sprite.setTint(window.secondaryColor);
    }
    this._birdLayers = [this._birdSpriteLayer, this._birdGlowLayer, this._birdOverlayLayer, this._birdExtraLayer].filter(x => !!x);

    this._allLayers = [...this._playerLayers, ...this._ballLayers, ...this._waveLayers, ...this._shipLayers, ...this._spiderLayers, ...this._birdLayers];
    
    this._dashAnimationSprite = spriteY.add.image(particleY, spriteX, "GJ_GameSheetGlow", "playerDash2_001.png");
    this._dashAnimationSprite.setDepth(7);
    this._dashAnimationSprite.setVisible(false);
    this._dashAnimationSprite.setTint(0xffffff);
    this._dashAnimationSprite.setBlendMode('ADD');
  }
  _updateDashAnimation(deltaTime) {
    if (!this._dashAnimationSprite) return;
    if (this.p.isDashing) {
      this._dashAnimationSprite.setVisible(true);
      this._dashAnimationTimer += deltaTime;
      if (this._dashAnimationTimer >= 16.67) {
        this._dashAnimationTimer = 0;
        this._dashAnimationFrame = (this._dashAnimationFrame % 12) + 1;
        const frameName = `playerDash2_${String(this._dashAnimationFrame).padStart(3, '0')}.png`;
        this._dashAnimationSprite.setFrame(frameName);
      }
    } else {
      this._dashAnimationSprite.setVisible(false);
      this._dashAnimationFrame = 0;
      this._dashAnimationTimer = 0;
    }
  }
  _initParticles(scene) {
    this._particleEmitter = scene.add.particles(0, 0, "GJ_WebSheet", {
      frame: "square.png",
      speed: {
        min: 110,
        max: 190
      },
      angle: {
        min: 225,
        max: 315
      },
      lifespan: {
        min: 150,
        max: 450
      },
      scale: {
        start: 0.5,
        end: 0
      },
      gravityY: 600,
      frequency: 1000 / 30,
      blendMode: "ADD",
      alpha: {
        start: 1,
        end: 0
      },
      tint: window.mainColor
    });
    this._particleEmitter.stop();
    this._particleEmitter.setDepth(9);
    this._gameLayer.container.add(this._particleEmitter);
    this._flyParticleEmitter = scene.add.particles(0, 0, "GJ_WebSheet", {
      frame: "square.png",
      speed: {
        min: 22,
        max: 38
      },
      angle: {
        min: 225,
        max: 315
      },
      lifespan: {
        min: 150,
        max: 450
      },
      scale: {
        start: 0.5,
        end: 0
      },
      gravityY: 600,
      frequency: 1000 / 30,
      blendMode: "ADD",
      tint: {
        start: 16737280,
        end: 16711680
      },
      alpha: {
        start: 1,
        end: 0
      }
    });
    this._flyParticleEmitter.stop();
    this._flyParticleEmitter.setDepth(9);
    this._gameLayer.container.add(this._flyParticleEmitter);
    this._flyParticle2Emitter = scene.add.particles(0, 0, "GJ_WebSheet", {
      frame: "square.png",
      speed: {
        min: 220,
        max: 380
      },
      angle: {
        min: 180,
        max: 360
      },
      lifespan: {
        min: 150,
        max: 450
      },
      scale: {
        start: 0.75,
        end: 0
      },
      gravityY: 600,
      frequency: 1000 / 30,
      blendMode: "ADD",
      tint: {
        start: 16760320,
        end: 16711680
      },
      alpha: {
        start: 1,
        end: 0
      }
    });
    this._flyParticle2Emitter.stop();
    this._flyParticle2Emitter.setDepth(9);
    this._gameLayer.container.add(this._flyParticle2Emitter);
    this._shipDragEmitter = scene.add.particles(0, 0, "GJ_WebSheet", {
      frame: "square.png",
      x: {
        min: -18,
        max: 18
      },
      speed: {
        min: 223.79999999999998,
        max: 343.79999999999995
      },
      angle: {
        min: 205,
        max: 295
      },
      lifespan: {
        min: 80,
        max: 220
      },
      scale: {
        start: 0.375,
        end: 0
      },
      gravityX: -700,
      gravityY: 600,
      frequency: 25,
      blendMode: "ADD",
      alpha: {
        start: 1,
        end: 0
      }
    });
    this._shipDragEmitter.stop();
    this._shipDragEmitter.setDepth(22);
    this._shipDragActive = false;
    this._particleActive = false;
    this._flyParticle2Active = false;
    this._flyParticleActive = false;
    const landParticleConfig = {
      frame: "square.png",
      speed: {
        min: 250,
        max: 350
      },
      angle: {
        min: 210,
        max: 330
      },
      lifespan: {
        min: 50,
        max: 600
      },
      scale: {
        start: 0.625,
        end: 0
      },
      gravityY: 1000,
      blendMode: "ADD",
      alpha: {
        start: 1,
        end: 0
      },
      tint: window.mainColor,
      emitting: false
    };
    this._landEmitter1 = scene.add.particles(0, 0, "GJ_WebSheet", {
      ...landParticleConfig
    });
    this._landEmitter2 = scene.add.particles(0, 0, "GJ_WebSheet", {
      ...landParticleConfig
    });
    this._aboveContainer = scene.add.container(0, 0);
    this._aboveContainer.setDepth(13);
    this._gameLayer.topContainer.add(this._landEmitter1);
    this._gameLayer.topContainer.add(this._landEmitter2);
    this._landIdx = false;
    this._streak = new StreakManager(this._scene, "streak_01", 0.231, 10, 8, 100, window.secondaryColor, 0.7);
    this._streak.addToContainer(this._gameLayer.container, 8);
    this._waveTrail = new WaveTrail(this._scene, window.secondaryColor, window.secondaryColor);
    this._waveTrail.addToContainer(this._gameLayer.container, 9);
  }
  _updateParticles(cameraX, cameraY, deltaTime) {
    if (this.p.isDead) {
      return;
    }
    const playerWorldX = this._scene._playerWorldX;
    const playerWorldY = b(this.p.y);
    this._particleEmitter.particleX = playerWorldX - 20;
    this._particleEmitter.particleY = playerWorldY + (this.p.gravityFlipped ? (-26 + (this.p.isUfo ? -5 : 0)) : (26 + (this.p.isUfo ? 5 : 0)));
    const shouldShowGroundParticles = this.p.onGround && !this.p.isFlying && !this.p.isWave && !this.p.isSpider;
    if (shouldShowGroundParticles && !this._particleActive) {
      this._particleEmitter.start();
      this._particleActive = true;
    } else if (!shouldShowGroundParticles && this._particleActive) {
      this._particleEmitter.stop();
      this._particleActive = false;
    }
    {
      const cosRotation = Math.cos(this._rotation);
      const sinRotation = Math.sin(this._rotation);
      const xOffset = this.p.isWave ? 0 : (this.p.isUfo ? 0 : -24);
      const yOffset = (this.p.isWave ? 4 : (this.p.isUfo ? 5 : 18)) * (this.p.gravityFlipped ? -1 : 1);
      const particleX = playerWorldX + xOffset * cosRotation - yOffset * sinRotation;
      const particleY = playerWorldY + xOffset * sinRotation + yOffset * cosRotation;
      const randomOffset = (Math.random() * 2 - 1) * 2 * 2;
      this._flyParticleEmitter.particleX = particleX;
      this._flyParticleEmitter.particleY = particleY + randomOffset;
      this._flyParticle2Emitter.particleX = particleX;
      this._flyParticle2Emitter.particleY = particleY + randomOffset;
      this._streak.setPosition(this.p.isWave ? particleX : (this.p.isUfo ? particleX : particleX + 8), particleY);
      this._waveTrail.setPosition(playerWorldX, playerWorldY);
    }
    this._streak.update(deltaTime);
    this._waveTrail.update(deltaTime);
    const shouldShowFlyParticles = this.p.isFlying || this.p.isUfo;
    if (shouldShowFlyParticles && !this._flyParticleActive) {
      this._flyParticleEmitter.start();
      this._flyParticleActive = true;
    } else if (!shouldShowFlyParticles && this._flyParticleActive) {
      this._flyParticleEmitter.stop();
      this._flyParticleActive = false;
    }
    const shouldShowBoostParticles = (this.p.isFlying && this.p.upKeyDown) || (this.p.isUfo && this.p.isJumping);
    if (shouldShowBoostParticles && !this._flyParticle2Active) {
      this._flyParticle2Emitter.start();
      this._flyParticle2Active = true;
    } else if (!shouldShowBoostParticles && this._flyParticle2Active) {
      this._flyParticle2Emitter.stop();
      this._flyParticle2Active = false;
    }
    const shipDragX = cameraX + this._scene._getMirrorXOffset(playerWorldX - cameraX);
    this._shipDragEmitter.x = shipDragX;
    this._shipDragEmitter.particleY = this.p.gravityFlipped ? b(this.p.y) + cameraY + 10 : b(this.p.y) + cameraY + 30;
    this._shipDragEmitter.setAngle(this.p.mirrored ? {
      min: 245,
      max: 335
    } : {
      min: 205,
      max: 295
    });
    this._shipDragEmitter.gravityX = this.p.mirrored ? 700 : -700;
    this._shipDragEmitter.setScale(this.p.gravityFlipped ? { x: -1, y: 1 } : { x: 1, y: 1 });
    const shouldShowShipDrag = this.p.isFlying && this.p.onGround && (this.p.gravityFlipped ? this.p.onCeiling : !this.p.onCeiling);
    if (shouldShowShipDrag && !this._shipDragActive) {
      this._shipDragEmitter.start();
      this._shipDragActive = true;
    } else if (!shouldShowShipDrag && this._shipDragActive) {
      this._shipDragEmitter.stop();
      this._shipDragActive = false;
    }
  }
  setCubeVisible(visible) {
    this._playerSpriteLayer.sprite.setVisible(visible);
    if (this._playerGlowLayer) {
      this._playerGlowLayer.sprite.setVisible(visible && this._playerGlowLayer.sprite._glowEnabled);
    }
    if (this._playerOverlayLayer) {
      this._playerOverlayLayer.sprite.setVisible(visible);
    }
    if (this._playerExtraLayer) {
      this._playerExtraLayer.sprite.setVisible(visible);
    }
  }
  setShipVisible(visible) {
    this._shipSpriteLayer.sprite.setVisible(visible);
    if (this._shipGlowLayer) {
      this._shipGlowLayer.sprite.setVisible(visible && this._shipGlowLayer.sprite._glowEnabled);
    }
    if (this._shipOverlayLayer) {
      this._shipOverlayLayer.sprite.setVisible(visible);
    }
    if (this._shipExtraLayer) {
      this._shipExtraLayer.sprite.setVisible(visible);
    }
  }
  setBirdVisible(v) {
    for (const layer of (this._birdLayers || [])) {
      if (layer === this._birdGlowLayer) {
        layer.sprite.setVisible(v && layer.sprite._glowEnabled);
      } else {
        layer.sprite.setVisible(v);
      }
    }
  }
  setBallVisible(visible) {
    if (this._ballSpriteLayer) {
      this._ballSpriteLayer.sprite.setVisible(visible);
    }
    if (this._ballGlowLayer) {
      this._ballGlowLayer.sprite.setVisible(visible && this._ballGlowLayer.sprite._glowEnabled);
    }
    if (this._ballOverlayLayer) {
      this._ballOverlayLayer.sprite.setVisible(visible);
    }
  }
  setWaveVisible(visible) {
    if (this._waveSpriteLayer) {
      this._waveSpriteLayer.sprite.setVisible(visible);
    }
    if (this._waveOverlayLayer) {
      this._waveOverlayLayer.sprite.setVisible(visible);
    }
    if (this._waveExtraLayer) {
      this._waveExtraLayer.sprite.setVisible(visible);
    }
    if (this._waveGlowLayer) {
      this._waveGlowLayer.sprite.setVisible(visible && this._waveGlowLayer.sprite._glowEnabled);
    }
  }
  setSpiderVisible(v) {
    for (const layer of (this._spiderLayers || [])) {
      if (layer === this._spiderGlowLayer) {
        layer.sprite.setVisible(v && layer.sprite._glowEnabled);
      } else {
        layer.sprite.setVisible(v);
      }
    }
  }
  syncSprites(cameraX, cameraY, deltaTime, mirrorOffset) {
    if (this._endAnimating) {
      return;
    }
    const screenCenterX = mirrorOffset !== undefined ? mirrorOffset : centerX;
    const screenY = b(this.p.y) + cameraY;
    const playerRotation = this._rotation;
    this._lastCameraX = cameraX;
    this._lastCameraY = cameraY;
    this._aboveContainer.x = -cameraX;
    this._aboveContainer.y = cameraY;
if (this.p.isFlying || this.p.isUfo) {
      const shipOffset = 10;
      const playerOffset = this.p.gravityFlipped ? -30 : 10; 
      const cosRotation = Math.cos(playerRotation);
      const sinRotation = Math.sin(playerRotation);
      const shipOffsetX = -shipOffset * sinRotation;
      const shipOffsetY = shipOffset * cosRotation; 
      const playerOffsetX = playerOffset * sinRotation;
      const playerOffsetY = -playerOffset * cosRotation;
      const ufoMode = this.p.isUfo && !this.p.isFlying;
      if (this.p.isFlying) {
        for (const layer of this._shipLayers) {
          if (layer) {
            layer.sprite.x = screenCenterX + shipOffsetX;
            layer.sprite.y = screenY + shipOffsetY + (this.p.gravityFlipped ? -20 : 0);
            layer.sprite.rotation = this.p.mirrored ? -playerRotation : playerRotation;
            const miniScale = this.p.isMini ? 0.6 : 1;
            layer.sprite.scaleY = this.p.gravityFlipped ? -miniScale : miniScale;
            layer.sprite.scaleX = this.p.mirrored ? -miniScale : miniScale;
          }
        }
      }
	if (this.p.isUfo && !this.p.isDead) {
        for (const layer of this._birdLayers) {
          if (layer) {
            layer.sprite.setVisible(true);
            layer.sprite.x = screenCenterX + shipOffsetX;
            layer.sprite.y = screenY + shipOffsetY + (this.p.gravityFlipped ? -15 : 5);
            layer.sprite.rotation = this.p.mirrored ? -playerRotation : playerRotation;
            const miniScale = this.p.isMini ? 0.6 : 1;
            layer.sprite.scaleY = this.p.gravityFlipped ? -miniScale : miniScale;
            layer.sprite.scaleX = this.p.mirrored ? -miniScale : miniScale;
          }
        }
      }
      
      for (const playerLayerItem of this._playerLayers) {
        if (playerLayerItem) {
          playerLayerItem.sprite.x = screenCenterX + playerOffsetX;
          playerLayerItem.sprite.y = (screenY + playerOffsetY)+(this.p.isMini?8:0) + (this.p.gravityFlipped ? -20 : 0);
          playerLayerItem.sprite.rotation = this.p.mirrored ? -playerRotation : playerRotation;
          const miniScale = this.p.isMini ? 0.6 : 1;
          const shipCubeScale = miniScale * 0.55;
          playerLayerItem.sprite.scaleY = this.p.gravityFlipped ? -shipCubeScale : shipCubeScale;
          playerLayerItem.sprite.scaleX = this.p.mirrored ? -shipCubeScale : shipCubeScale;
        }
      }
      if (ufoMode) {
        const ufoTilt = Math.max(-0.05, Math.min(0.05, -(this.p.y - this.p.lastY) * 0.008));
        for (const layer of this._birdLayers) {
          if (layer) {
            layer.sprite.rotation = this.p.mirrored ? -ufoTilt : ufoTilt;
          }
        }
		  for (const playerLayerItem of this._playerLayers) {
          if (playerLayerItem) {
            playerLayerItem.sprite.rotation = this.p.mirrored ? -ufoTilt : ufoTilt;
          }
        }
      }
    } else {
      for (const layer of this._spiderLayers) {
        if (layer) {
          layer.sprite.setVisible(false);
        }
      }
      
      for (const playerLayer of this._allLayers) {
        if (playerLayer) {
            playerLayer.sprite.x = screenCenterX;
            playerLayer.sprite.y = screenY;
            const isBallLayer = this._ballLayers.includes(playerLayer);
            playerLayer.sprite.rotation = isBallLayer ? playerRotation : (this.p.mirrored ? -playerRotation : playerRotation);
            let miniScale = this.p.isMini ? 0.6 : 1;
            if (this.p.isWave && this._waveLayers.includes(playerLayer)) {
              miniScale *= 0.42; //fix wave size
            }
            playerLayer.sprite.scaleY = (this.p.gravityFlipped ? -miniScale : miniScale);
            playerLayer.sprite.scaleX = (this.p.mirrored ? -miniScale : miniScale);
        }
      }
      for (const layer of this._spiderLayers) {
        if (layer) {
          layer.sprite.setVisible(false);
        }
      }
      
      for (const playerLayer of this._allLayers) {
        if (playerLayer) {
            playerLayer.sprite.x = screenCenterX;
            playerLayer.sprite.y = screenY;
            const isBallLayer = this._ballLayers.includes(playerLayer);
            playerLayer.sprite.rotation = isBallLayer ? playerRotation : (this.p.mirrored ? -playerRotation : playerRotation);
            let miniScale = this.p.isMini ? 0.6 : 1;
            if (this.p.isWave && this._waveLayers.includes(playerLayer)) {
              miniScale *= 0.42; //fix wave size
            }
            playerLayer.sprite.scaleY = (this.p.gravityFlipped ? -miniScale : miniScale);
            playerLayer.sprite.scaleX = (this.p.mirrored ? -miniScale : miniScale);
        }
      }
    }
    if (this.p.isWave && this._waveSpriteLayer) {
      const waveDirection = this.p.mirrored ? 1 : -1;
      this._waveSpriteLayer.sprite.x += 1.5 * waveDirection;
      this._waveSpriteLayer.sprite.y -= 1;
    }
    this._updateParticles(cameraX, cameraY, deltaTime);
    
    this._updateDashAnimation(deltaTime * 1000);
    if (this._dashAnimationSprite && this._dashAnimationSprite.visible) {
      this._dashAnimationSprite.x = screenCenterX;
      this._dashAnimationSprite.y = screenY;
      const miniScale = this.p.isMini ? 0.6 : 1;
      this._dashAnimationSprite.scaleY = this.p.gravityFlipped ? -miniScale : miniScale;
      this._dashAnimationSprite.scaleX = miniScale;
    }

    if (!this._scene._slideIn){
      if (!this._hitboxTrail) this._hitboxTrail = [];
      if (!this.p.isDead) {
        this._hitboxTrail.push({ x: this._scene._playerWorldX, y: this.p.y });
        if (this._hitboxTrail.length > 100) this._hitboxTrail.shift();
      }
      if (window.showHitboxes || this.p.isDead && window.hitboxesOnDeath) {
        this.drawHitboxes(this._hitboxGraphics, cameraX, cameraY);
      } else if (this._hitboxGraphics) {
        this._hitboxGraphics.clear();
      }
    }
  }
  enterShipMode(portal = null) {
    if (this.p.isFlying) {
      return;
    }
    this.exitBallMode();
    this.exitWaveMode();
    this.p.isFlying = true;
    this._scene.toggleGlitter(true);
    this.p.yVelocity *= 0.5;
    this.p.onGround = false;
    this.p.canJump = false;
    this.p.isJumping = false;
    this.stopRotation();
    this._rotation = 0;
    this._particleEmitter.stop();
    this._flyParticle2Active = false;
    this._streak.reset();
    this._streak.start();
    this.setWaveVisible(false);
    this.setShipVisible(true);
    for (const playerLayer of this._playerLayers) {
      if (playerLayer) {
        playerLayer.sprite.setScale(0.55);
      }
    }
    let portalY = this.p.y;
    if (portal) {
      portalY = portal.portalY !== undefined ? portal.portalY : portal.y;
    }
    this._gameLayer.setFlyMode(true, portalY, f, false);
  }
  exitShipMode() {
    if (this.p.isFlying) {
      this.p.isFlying = false;
      this._scene.toggleGlitter(false);
      this.p.yVelocity *= 0.5;
      this.p.onGround = false;
      this.p.canJump = false;
      this.p.isJumping = false;
      this.stopRotation();
      this._rotation = 0;
      this._flyParticleEmitter.stop();
      this._flyParticleActive = false;
      this._flyParticle2Emitter.stop();
      this._flyParticle2Active = false;
      this._shipDragEmitter.stop();
      this._shipDragActive = false;
      this._particleActive = false;
      this._streak.stop();
      this._streak.reset();
      this.setShipVisible(false);
      this.setCubeVisible(!this.p.isBall && !this.p.isWave);
      this.setBallVisible(this.p.isBall);
      this.setWaveVisible(this.p.isWave);
      this.setSpiderVisible(false);
      for (const playerLayer of this._playerLayers) {
        if (playerLayer) {
          playerLayer.sprite.setScale(1);
        }
      }
      this._gameLayer.setFlyMode(false, 0);
    }
  }
  enterBallMode(portal = null) {
    if (this.p.isBall) {
      return;
    }
    this.exitWaveMode();
    this.p.isBall = true;
    this.p.onGround = false;
    this.p.canJump = false;
    this.p.isJumping = false;
    this.stopRotation();
    this._rotation = 0;
    this.setCubeVisible(false);
    this.setWaveVisible(false);
    this.setShipVisible(false);
    this.setBallVisible(true);
    let portalY = this.p.y;
    if (portal) {
      portalY = portal.portalY !== undefined ? portal.portalY : portal.y;
    }
    this._gameLayer.setFlyMode(true, portalY + a, f - a * 2, true);
  }
  exitBallMode() {
    if (!this.p.isBall) {
      return;
    }
    this.p.isBall = false;
    this.p.onGround = false;
    this.p.canJump = false;
    this.p.isJumping = false;
    this.stopRotation();
    this._rotation = 0;
    this.setBallVisible(false);
    this.setWaveVisible(false);
    this.setCubeVisible(true);
    this._gameLayer.setFlyMode(false, 0);
  }
  enterWaveMode(portal = null) {
    if (this.p.isWave) {
      return;
    }
    this.exitShipMode();
    this.exitBallMode();
    this.p.isWave = true;
    this.p.yVelocity = 0;
    this.p.onGround = false;
    this.p.canJump = false;
    this.p.isJumping = false;
    this.stopRotation();
    this._rotation = 0;
    this._streak.reset();
    this._streak.start();
    this._waveTrail.reset();
    this._waveTrail.start();
    this.setCubeVisible(false);
    this.setBallVisible(false);
    this.setShipVisible(false);
    this.setWaveVisible(true);
    let portalY = this.p.y;
    if (portal) {
      portalY = portal.portalY !== undefined ? portal.portalY : portal.y;
    }
    this._gameLayer.setFlyMode(true, portalY, f, false);
  }
  exitWaveMode() {
    if (!this.p.isWave) {
      return;
    }
    this.p.isWave = false;
    this.p.yVelocity = 0;
    this.p.onGround = false;
    this.p.canJump = false;
    this.p.isJumping = false;
    this.stopRotation();
    this._rotation = 0;
    this._streak.stop();
    this._streak.reset();
    this._waveTrail.stop();
    this._waveTrail.reset();
    this.setWaveVisible(false);
    this.setCubeVisible(!this.p.isBall && !this.p.isFlying);
    this.setBallVisible(this.p.isBall);
    this.setShipVisible(this.p.isFlying);
    this.setSpiderVisible(false);
    this._gameLayer.setFlyMode(false, 0);
  }
  enterSpiderMode(portal = null) {
    if (this.p.isSpider) return;
    this.exitShipMode();
    this.exitBallMode();
    this.exitWaveMode();
    this.p.isSpider = true;
    this.p.yVelocity = 0;
    this.p.onGround = false;
    this.p.canJump = false;
    this.p.isJumping = false;
    this.p._spiderTeleportPending = false;
    this.stopRotation();
    this._rotation = 0;
    // use cube icon for spider mode (spider icon not ready yet)
    this.setCubeVisible(true);
    this.setBallVisible(false);
    this.setShipVisible(false);
    this.setWaveVisible(false);
    this.setSpiderVisible(false);
    let portalY = this.p.y;
    if (portal) portalY = portal.portalY !== undefined ? portal.portalY : portal.y;
    this._gameLayer.setFlyMode(true, portalY + a, f - a * 2, true);
  }
  exitSpiderMode() {
    if (!this.p.isSpider) return;
    this.p.isSpider = false;
    this.p.yVelocity = 0;
    this.p.onGround = false;
    this.p.canJump = false;
    this.p.isJumping = false;
    this.p._spiderTeleportPending = false;
    this.stopRotation();
    this._rotation = 0;
    this.setSpiderVisible(false);
    this.setCubeVisible(true);
    this._gameLayer.setFlyMode(false, 0);
  }
  enterUfoMode(portal = null) {
    if (this.p.isUfo) return;
    this.exitBallMode();
    this.exitWaveMode();
    this.exitShipMode();
    this.p.isUfo = true;
    this._scene.toggleGlitter(true);
    this.p.yVelocity *= 0.4;
    this.p.onGround = false;
    this.p.canJump = false;
    this.p.isJumping = false;
    this.stopRotation();
    this._rotation = 0;
    this._particleEmitter.stop();
    this._streak.reset();
    this._streak.start();
    this.setBallVisible(false);
    this.setShipVisible(false);
    this.setWaveVisible(false);
    this.setSpiderVisible(false);
    this.setBirdVisible(true);
    this.setCubeVisible(true);
    for (const playerLayer of this._playerLayers) {
      if (playerLayer) {
        playerLayer.sprite.setScale(0.55);
      }
    }
    let spawnY = this.p.y;
    if (portal) {
      spawnY = portal.portalY !== undefined ? portal.portalY : portal.y;
    }
    this._gameLayer.setFlyMode(true, spawnY, f, false);
  }
  exitUfoMode() {
    if (!this.p.isUfo) return;
    this.p.isUfo = false;
    this._scene.toggleGlitter(false);
    this.p.yVelocity *= 0.5;
    this.p.onGround = false;
    this.p.canJump = false;
    this.p.isJumping = false;
    this.stopRotation();
    this._rotation = 0;
    this._flyParticleEmitter.stop();
    this.setCubeVisible(!this.p.isBall && !this.p.isFlying);
    this.setBallVisible(this.p.isBall);
    this.setShipVisible(this.p.isFlying);
    this.setWaveVisible(this.p.isWave);
    this.setBirdVisible(false);
    this.setSpiderVisible(false);
    for (const playerLayer of this._playerLayers) {
      if (playerLayer) {
        playerLayer.sprite.setScale(1);
      }
    }
    this._gameLayer.setFlyMode(false, 0);
  }
  hitGround() {
    const wasInAir = !this.p.onGround;
    if (!this.p.isFlying && !this.p.isWave && !this.p.isUfo) {
      this.p.lastGroundY = this.p.y;
    }
    this.p.yVelocity = 0;
    this.p.onGround = true;
    this.p.canJump = true;
    this.p.isJumping = false;
    this.p.queuedHold = false;
    if (this.p.isBall) {
      if (wasInAir) {
        this._rotation = Math.round(this._rotation / Math.PI) * Math.PI;
      }
    } else if (this.p.isSpider) {
      if (wasInAir) {
        this._rotation = Math.round(this._rotation / Math.PI) * Math.PI;
      }
    } else if (this.p.isWave) {
      this._rotation = 0;
    }
    this.stopRotation();
    if (wasInAir && !this.p.isFlying && !this.p.isWave && !this.p.isSpider) {
      this._landIdx = !this._landIdx;
      const landEmitter = this._landIdx ? this._landEmitter1 : this._landEmitter2;
      const playerWorldX = this._scene._playerWorldX;
      const particleY = this.p.gravityFlipped ? b(this.p.y) - 30 : b(this.p.y) + 30;
      landEmitter.explode(10, playerWorldX, particleY);
    }
  }
  killPlayer() {
    if (this.p.isDead) {
      return;
    }
    this.p.isDead = true;
    this._scene.toggleGlitter(false);
    this._particleEmitter.stop();
    this._particleActive = false;
    this._flyParticleEmitter.stop();
    this._flyParticleActive = false;
    this._flyParticle2Emitter.stop();
    this._flyParticle2Active = false;
    this._shipDragEmitter.stop();
    this._shipDragActive = false;
    this._streak.stop();
    this._streak.reset();
    const scene = this._scene;
    const deathX = scene._getMirrorXOffset(scene._playerWorldX - scene._cameraX);
    const deathY = b(this.p.y) + this._lastCameraY;
    const deathScale = 0.9;
    scene.add.particles(deathX, deathY, "GJ_WebSheet", {
      frame: "square.png",
      speed: {
        min: 200,
        max: 800
      },
      angle: {
        min: 0,
        max: 360
      },
      scale: {
        start: 18 / 32,
        end: 0
      },
      alpha: {
        start: 1,
        end: 0
      },
      lifespan: {
        min: 50,
        max: 800
      },
      quantity: 100,
      stopAfter: 100,
      blendMode: S,
      tint: window.mainColor,
      x: {
        min: -20,
        max: 20
      },
      y: {
        min: -20,
        max: 20
      }
    }).setScrollFactor(0).setDepth(15);
    const deathGraphics = scene.add.graphics().setScrollFactor(0).setDepth(15).setBlendMode(S);
    const deathAnimation = {
      t: 0
    };
    scene.tweens.add({
      targets: deathAnimation,
      t: 1,
      duration: 500,
      ease: "Quad.Out",
      onUpdate: () => {
        const explosionRadius = 18 + deathAnimation.t * 144;
        const alpha = 1 - deathAnimation.t;
        deathGraphics.clear();
        deathGraphics.fillStyle(window.mainColor, alpha);
        deathGraphics.fillCircle(deathX, deathY, explosionRadius);
      },
      onComplete: () => deathGraphics.destroy()
    });
    this._createExplosionPieces(deathX, deathY, deathScale);
    this.setCubeVisible(false);
    this.setShipVisible(false);
    this.setBallVisible(false);
    this.setWaveVisible(false);
    this.setBirdVisible(false);
    this.setSpiderVisible(false);
  }
  _createExplosionPieces(playerX, playerY, scale) {
    const scene = this._scene;
    const explosionSize = scale * 40;
    const sliderBar = Math.round(explosionSize * 2);
    const renderTexture = scene.make.renderTexture({
      x: 0,
      y: 0,
      width: sliderBar,
      height: sliderBar,
      add: false
    });
    const playerLayers = [this._playerGlowLayer, this._playerOverlayLayer, this._ballGlowLayer, this._ballOverlayLayer, this._waveGlowLayer, this._waveOverlayLayer, this._waveExtraLayer, this._shipGlowLayer, this._shipOverlayLayer, this._playerSpriteLayer, this._playerExtraLayer, this._ballSpriteLayer, this._waveSpriteLayer, this._shipSpriteLayer, this._shipExtraLayer, this._birdSpriteLayer, this._birdGlowLayer, this._birdOverlayLayer, this._birdExtraLayer];
	  for (const layer of playerLayers) {
      if (!layer) {
        continue;
      }
      if (!layer.sprite.visible) {
        continue;
      }
      const sprite = layer.sprite;
      renderTexture.draw(sprite, sliderBar / 2 + (sprite.x - playerX), sliderBar / 2 + (sprite.y - playerY));
    }
    const textureKey = "__deathRT_" + Date.now();
    renderTexture.saveTexture(textureKey);
    const texture = scene.textures.get(textureKey);
    let piecesX = 2 + Math.round(Math.random() * 2);
    let piecesY = 2 + Math.round(Math.random() * 2);
    const randomChance = Math.random();
    if (randomChance > 0.95) {
      piecesX = 1;
    } else if (randomChance > 0.9) {
      piecesY = 1;
    }
    const baseSpeed = 7.4779225920000005;
    const minSpeed = baseSpeed * 0.5;
    const maxSpeed = baseSpeed * 1;
    const speedVariation = 0.45;
    const pieceWidth = sliderBar / piecesX;
    const pieceHeight = sliderBar / piecesY;
    const explosionPieces = [];
    const yWidths = [];
    const xPositions = [0];
    const yPositions = [0];
    let xTotal = 0;
    let yTotal = 0;
    for (let i = 0; i < piecesX - 1; i++) {
      const width = Math.round(pieceWidth * (0.55 + Math.random() * speedVariation * 2));
      explosionPieces.push(width);
      xTotal += width;
      xPositions.push(xTotal);
    }
    explosionPieces.push(sliderBar - xTotal);
    for (let j = 0; j < piecesY - 1; j++) {
      const height = Math.round(pieceHeight * (0.55 + Math.random() * speedVariation * 2));
      yWidths.push(height);
      yTotal += height;
      yPositions.push(yTotal);
    }
    yWidths.push(sliderBar - yTotal);
    this._explosionPieces = [];
    this._explosionContainer = scene.add.container(playerX, playerY).setDepth(16);
    let pieceIndex = 0;
    for (let x = 0; x < piecesX; x++) {
      const pieceWidth = explosionPieces[x];
      const xPos = xPositions[x];
      for (let y = 0; y < piecesY; y++) {
        const pieceHeight = yWidths[y];
        const yPos = yPositions[y];
        if (pieceWidth <= 0 || pieceHeight <= 0) {
          continue;
        }
        pieceIndex++;
        const pieceKey = "piece_" + x + "_" + y;
        texture.add(pieceKey, 0, xPos, yPos, pieceWidth, pieceHeight);
        const pieceSprite = scene.add.image(0, 0, textureKey, pieceKey);
        pieceSprite.x = xPos + pieceWidth / 2 - sliderBar / 2;
        pieceSprite.y = -(yPos + pieceHeight / 2 - sliderBar / 2);
        this._explosionContainer.add(pieceSprite);
        let particle = null;
        if (pieceIndex % 2 == 0) {
          const particleLifetime = 200 + Math.random() * 200;
          const sprite = pieceSprite;
          particle = scene.add.particles(0, 0, "GJ_WebSheet", {
            frame: "square.png",
            speed: 0,
            scale: {
              start: 0.5,
              end: 0
            },
            alpha: {
              start: 1,
              end: 0
            },
            lifespan: particleLifetime,
            frequency: 25,
            quantity: 1,
            emitting: true,
            blendMode: S,
            tint: window.mainColor,
            emitCallback: particle => {
              particle.x = pieceSprite.x + (Math.random() * 2 - 1) * 3 * 2;
              particle.y = pieceSprite.y + (Math.random() * 2 - 1) * 3 * 2;
            }
          });
          this._explosionContainer.addAt(particle, 0);
        }
        const explosionPiece = {
          spr: pieceSprite,
          particle: particle,
          xVel: (minSpeed + (Math.random() * 2 - 1) * maxSpeed) * (this.p.mirrored ? -1 : 1),
          yVel: -(12 + (Math.random() * 2 - 1) * 6),
          timer: 1.4,
          fadeTime: 0.5,
          rotDelta: (Math.random() * 2 - 1) * 360 / 60,
          halfSize: Math.min(pieceWidth, pieceHeight) / 2
        };
        this._explosionPieces.push(explosionPiece);
      }
    }
    this._explosionGroundSY = b(0) + this._lastCameraY;
    this._explosionRT = renderTexture;
    this._explosionTexKey = textureKey;
  }
  updateExplosionPieces(deltaTime) {
    if (!this._explosionPieces || this._explosionPieces.length === 0) {
      return;
    }
    const dt = deltaTime / 1000;
    const frameTime = Math.min(dt * 60 * 0.9, 2);
    const gravity = frameTime * 0.5 * 2;
    const groundY = this._explosionGroundSY - this._explosionContainer.y;
    let i = 0;
    while (i < this._explosionPieces.length) {
      const particle = this._explosionPieces[i];
      particle.timer -= dt;
      if (particle.timer > 0) {
        {
          particle.yVel += gravity;
          particle.xVel *= 0.98 + (1 - frameTime) * 0.02;
          let newX = particle.spr.x + particle.xVel * frameTime;
          let newY = particle.spr.y + particle.yVel * frameTime;
          const groundCollisionY = groundY - particle.halfSize;
          if (newY > groundCollisionY && particle.yVel > 0) {
            newY = groundCollisionY;
            particle.yVel *= -0.8;
            if (Math.abs(particle.yVel) < 3) {
              particle.yVel = -3;
            }
          }
          particle.spr.x = newX;
          particle.spr.y = newY;
          particle.spr.angle += particle.rotDelta * frameTime;
          if (particle.timer < particle.fadeTime) {
            const alphaRatio = particle.timer / particle.fadeTime;
            particle.spr.setAlpha(alphaRatio);
            if (particle.particle) {
              particle.particle.setAlpha(alphaRatio);
            }
          }
        }
        i++;
      } else {
        if (particle.particle) {
          particle.particle.stop();
          particle.particle.destroy();
        }
        particle.spr.destroy();
        this._explosionPieces.splice(i, 1);
      }
    }
    if (this._explosionPieces.length === 0) {
      this._cleanupExplosion();
    }
  }
  _cleanupExplosion() {
    if (this._explosionPieces) {
      for (const particle of this._explosionPieces) {
        if (particle.particle) {
          particle.particle.stop();
          particle.particle.destroy();
        }
        if (particle.spr) {
          particle.spr.destroy();
        }
      }
    }
    if (this._explosionContainer) {
      this._explosionContainer.destroy();
      this._explosionContainer = null;
    }
    if (this._explosionTexKey) {
      this._scene.textures.remove(this._explosionTexKey);
      this._explosionTexKey = null;
    }
    if (this._explosionRT) {
      this._explosionRT.destroy();
      this._explosionRT = null;
    }
    this._explosionPieces = null;
  }
  _playPortalShine(portal, type = 1) {
    const scene = this._scene;
    const portalX = portal.x;
    const portalY = b(portal.portalY);

    const typeStr = (type === 1) ? "02" : "01";
    const portalTextures = [
      `portalshine_${typeStr}_front_001.png`,
      `portalshine_${typeStr}_back_001.png`
    ];

    const containers = [this._gameLayer.topContainer, this._gameLayer.container];
    for (let i = 0; i < 2; i++) {
      const atlasFrame = getAtlasFrame(scene, portalTextures[i]);
      if (!atlasFrame) {
        continue;
      }
      const pieceSize = scene.add.image(portalX, portalY, atlasFrame.atlas, atlasFrame.frame);
      pieceSize.setBlendMode(S);
      pieceSize.setAlpha(0);
      pieceSize.angle = portal.rotationDegrees;
      containers[i].add(pieceSize);
      scene.tweens.add({
        targets: pieceSize,
        alpha: {
          from: 0,
          to: 1
        },
        duration: 50,
        onComplete: () => {
          scene.tweens.add({
            targets: pieceSize,
            alpha: 0,
            duration: 400,
            onComplete: () => pieceSize.destroy()
          });
        }
      });
    }
  }
  _checkSnapJump(currentObject) {
    const snapOffsets = [{
      dx: 240,
      dy: 60
    }, {
      dx: 300,
      dy: -60
    }, {
      dx: 180,
      dy: 120
    }];
    const lastObject = this._lastLandObject;
    if (lastObject && lastObject !== currentObject && lastObject.type === solidType) {
      const lastX = lastObject.x;
      const lastY = lastObject.y;
      const currentX = currentObject.x;
      const currentY = currentObject.y;
      const gravityDirection = this.p.gravityFlipped ? -1 : 1;
      let shouldSnap = false;
      for (const offset of snapOffsets) {
        if (Math.abs(currentX - (lastX + offset.dx)) <= 2 && Math.abs(currentY - (lastY + offset.dy * gravityDirection)) <= 2) {
          shouldSnap = true;
          break;
        }
      }
      if (shouldSnap) {
        const targetX = currentObject.x + this._lastXOffset;
        const currentWorldX = this._scene._playerWorldX;
        let newWorldX;
        newWorldX = Math.abs(targetX - currentWorldX) <= 2 ? targetX : targetX > currentWorldX ? currentWorldX + 2 : currentWorldX - 2;
        this._scene._playerWorldX = newWorldX;
      }
    }
    this._lastLandObject = currentObject;
    this._lastXOffset = this._scene._playerWorldX - currentObject.x;
  }
  _isFallingPastThreshold() {
    if (this.p.gravityFlipped) {
      return this.p.yVelocity > 0.25;
    } else {
      return this.p.yVelocity < -0.25;
    }
  }
  flipMod() {
    if (this.p.gravityFlipped) {
      return -1;
    } else {
      return 1;
    }
  }
  flipGravity(flipped, velocityMultiplier = 0.5) {
      console.log("flipGravity called: flipped=" + flipped + " current=" + this.p.gravityFlipped);
      if (this.p.gravityFlipped === flipped) {
        return;
      }
      this.p.gravityFlipped = flipped;
      this.p.yVelocity *= velocityMultiplier;
      this.p.onGround = false;
      this.p.canJump = false;
  }
  runRotateAction() {
    this.rotateActionActive = true;
    this.rotateActionTime = 0;
    const _miniDurScale = this.p.isMini ? (1 / 1.4) : 1;
    this.rotateActionDuration = (0.39 / d) * _miniDurScale;
    this.rotateActionStart = this._rotation;
    this.rotateActionTotal = Math.PI * this.flipMod();
  }
  updateDashRotation(dt) {
    const spinSpeed = Math.PI * 6.0 * this.flipMod();
    this._rotation += spinSpeed * dt;
  }
  stopRotation() {
    this.rotateActionActive = false;
  }
  updateRotateAction(deltaTime) {
    if (!this.rotateActionActive) {
      return;
    }
    this.rotateActionTime += deltaTime;
    if (this.rotateActionTime >= this.rotateActionDuration) {
      this.rotateActionActive = false;
    }
    let rotationProgress = Math.min(this.rotateActionTime / this.rotateActionDuration, 1);
    this._rotation = this.rotateActionStart + this.rotateActionTotal * rotationProgress;
  }
  convertToClosestRotation() {
    let quarterPi = Math.PI / 2;
    return Math.round(this._rotation / quarterPi) * quarterPi;
  }
  slerp2D(startAngle, endAngle, t) {
    let halfStart = startAngle * 0.5;
    let halfEnd = endAngle * 0.5;
    let cosStart = Math.cos(halfStart);
    let sinStart = Math.sin(halfStart);
    let cosEnd = Math.cos(halfEnd);
    let sinEnd = Math.sin(halfEnd);
    let dot = (cosStart * cosEnd) + (sinStart * sinEnd);
    let weightStart, weightEnd;
    if (dot < 0.0) {
        dot = -dot;
        sinEnd = -sinEnd;
        cosEnd = -cosEnd;
    }
    if (1.0 - dot > 0.0001) {
        let theta = Math.acos(dot);
        let sinTheta = Math.sin(theta);
        weightStart = Math.sin(theta * (1.0 - t)) / sinTheta;
        weightEnd = Math.sin(theta * t) / sinTheta;
    } else {
        weightStart = 1.0 - t;
        weightEnd = t;
    }
    let interpSin = (sinStart * weightStart) + (sinEnd * weightEnd);
    let interpCos = (cosStart * weightStart) + (cosEnd * weightEnd);
    let out = Math.atan2(interpSin, interpCos);
    return out + out;
  }
  updateGroundRotation(deltaTime) {
    if (this.p.isBall || this.p.isWave || this.p.isSpider) {
      return;
    }
    let targetRotation = this.convertToClosestRotation();
    let rotationSpeed = 0.47250000000000003;
    let lerpAmount = Math.min(deltaTime * 1, rotationSpeed * deltaTime);
    this._rotation = this.slerp2D(this._rotation, targetRotation, lerpAmount);
  }
  updateBallRoll(deltaTime, onSurface) {
    const gravityDirection = this.p.gravityFlipped ? -1 : 1;
    const speedFactor = onSurface ? 0.5 : 0.35;
    this._rotation += deltaTime / (g / 2) * gravityDirection * speedFactor;
  }
  updateShipRotation(deltaTime) {
    let deltaY = -(this.p.y - this.p.lastY);
    let deltaX = deltaTime * 10.3860036;
    if (deltaX * deltaX + deltaY * deltaY >= deltaTime * 0.6) {
      let targetAngle = Math.atan2(deltaY, deltaX);
      let rotationSpeed = 0.15;
      let lerpAmount = Math.min(deltaTime * 1, rotationSpeed * deltaTime);
      this._rotation = this.slerp2D(this._rotation, targetAngle, lerpAmount);
    }
  }
  playerIsFalling() {
    if (this.p.gravityFlipped) {
      return this.p.yVelocity > p;
    } else {
      return this.p.yVelocity < p;
    }
  }
  updateJump(gravityMultiplier) {
    if (this.p.pendingVelocity !== null) {
      this.p.yVelocity = this.p.pendingVelocity;
      this.p.pendingVelocity = null;
    }
    if (this.p.isDashing) {
      if (!this.p.upKeyDown || this.p.onGround) {
        this.p.isDashing = false;
        this.p.dashYVelocity = 0;
      } else {
        this.p.yVelocity = this.p.dashYVelocity;
        return;
      }
    }
    if (this.p.isFlying) {
      this._updateFlyJump(gravityMultiplier);
    } else if (this.p.isWave) {
      this._updateWaveJump();
    } else if (this.p.isBall) {
      this._updateBallJump(gravityMultiplier);
    } else if (this.p.isUfo) {
      this._updateUfoJump(gravityMultiplier);
    } else if (this.p.isSpider) {
      this._updateSpiderJump(gravityMultiplier);
    } else if (this.p.upKeyDown && this.p.canJump && !this.p.touchingRing) {
      this.p.isJumping = true;
      this.p.onGround = false;
      this.p.canJump = false;
      this.p.upKeyPressed = false;
      this.p.queuedHold = false;
      this.p.yVelocity = this.flipMod() * 22.360064;
      this.runRotateAction();
    } else if (this.p.isJumping) {
      const miniGrav = this.p.isMini ? 1.4 : 1;
      this.p.yVelocity -= p * gravityMultiplier * this.flipMod() * miniGrav;
      if (this.playerIsFalling()) {
        this.p.isJumping = false;
        this.p.onGround = false;
      }
    } else {
      if (this.playerIsFalling()) {
        this.p.canJump = false;
      }
      const miniGrav = this.p.isMini ? 1.4 : 1;
      this.p.yVelocity -= p * gravityMultiplier * this.flipMod() * miniGrav;
      if (this.p.gravityFlipped) {
        this.p.yVelocity = Math.min(this.p.yVelocity, 30);
      } else {
        this.p.yVelocity = Math.max(this.p.yVelocity, -30);
      }
      if (this._isFallingPastThreshold() && !this.rotateActionActive) {
        this.runRotateAction();
      }
      if (this.playerIsFalling()) {
        let fallingPastThreshold;
        fallingPastThreshold = this.p.gravityFlipped ? this.p.yVelocity > p * 2 : this.p.yVelocity < -(p * 2);
        if (fallingPastThreshold) {
          this.p.onGround = false;
        }
      }
    }
  }
  _updateFlyJump(deltaTime) {
    let flyJumpMultiplier = 0.8;
    if (this.p.upKeyDown) {
      flyJumpMultiplier = -1;
    }
    if (!this.p.upKeyDown && !this.playerIsFalling()) {
      flyJumpMultiplier = 1.2;
    }
    let flyJumpFactor = 0.4;
    if (this.p.upKeyDown && this.playerIsFalling()) {
      flyJumpFactor = 0.5;
    }
    this.p.yVelocity -= p * deltaTime * this.flipMod() * flyJumpMultiplier * flyJumpFactor;
    if (this.p.upKeyDown) {
      this.p.onGround = false;
    }
    if (!this.p.wasBoosted) {
      if (this.p.gravityFlipped) {
        this.p.yVelocity = Math.max(this.p.yVelocity, -16);
        this.p.yVelocity = Math.min(this.p.yVelocity, 12.8);
      } else {
        this.p.yVelocity = Math.max(this.p.yVelocity, -12.8);
        this.p.yVelocity = Math.min(this.p.yVelocity, 16);
      }
    }
  }
_updateBallJump(gravityMultiplier) {
  const miniGrav = this.p.isMini ? 1.4 : 1;
  const ballGravity = p * 0.6 * miniGrav;
  if (this.p.upKeyPressed && this.p.canJump) {
    const flipDirection = this.flipMod();
    this.p.upKeyPressed = false;
    this.p.yVelocity = flipDirection * 22.360064;
    this.flipGravity(!this.p.gravityFlipped);
    this.p.onGround = false;
    this.p.canJump = false;
    this.p.yVelocity *= 0.6;
    return;
  }
 if (this.playerIsFalling()) {
    this.p.canJump = false;
    }
    this.p.yVelocity -= ballGravity * gravityMultiplier * this.flipMod();
    if (this.p.gravityFlipped) {
      this.p.yVelocity = Math.min(this.p.yVelocity, 30);
    } else {
      this.p.yVelocity = Math.max(this.p.yVelocity, -30);
    }
    if (this.playerIsFalling()) {
      const fallingPastThreshold = this.p.gravityFlipped ? this.p.yVelocity > p * 2 : this.p.yVelocity < -(p * 2);
      if (fallingPastThreshold) {
        this.p.onGround = false;
      }
    }
  }
  _updateWaveJump() {
    const waveJumpPower = (this.p.isMini ? 22.7720072 : 11.3860036) * (playerSpeed / 11.540004);
    let waveVelocity = (this.p.upKeyDown ? 1 : -1) * this.flipMod() * waveJumpPower;
    if (this.p.onGround) {
      const canJump = this.p.onCeiling ? waveVelocity < 0 : waveVelocity > 0;
      if (canJump) {
        this.p.onGround = false;
      } else {
        waveVelocity = 0;
      }
    }
    this.p.canJump = false;
    this.p.isJumping = false;
    this.p.yVelocity = waveVelocity;
    const waveAngle = this.p.isMini ? Math.atan(0.5) : Math.PI / 4;
    this._rotation = waveVelocity === 0 ? 0 : waveVelocity > 0 ? -waveAngle : waveAngle;
  }
  _updateUfoJump(_dt) {
    const miniGrav = this.p.isMini ? 1.35 : 1;
    const gravStrength = p * 0.55 * miniGrav;
    this.p.yVelocity -= gravStrength * _dt * this.flipMod();
    if (this.p.upKeyPressed) {
      this.p.upKeyPressed = false;
      const burstVelocity = 14.5 * this.flipMod();
      this.p.yVelocity = burstVelocity;
      this.p.onGround = false;
      this.p.canJump = false;
      this.p.isJumping = true;
      try {
        this._flyParticle2Emitter.explode(6, this._scene._playerWorldX, b(this.p.y) + (this.p.gravityFlipped ? -18 : 18));
      } catch(e) {}
    }
    if (!this.p.wasBoosted) {
      if (this.p.gravityFlipped) {
        this.p.yVelocity = Math.max(this.p.yVelocity, -14.5);
        this.p.yVelocity = Math.min(this.p.yVelocity, 11);
      } else {
        this.p.yVelocity = Math.max(this.p.yVelocity, -11);
        this.p.yVelocity = Math.min(this.p.yVelocity, 14.5);
      }
    }
    if (this.p.upKeyDown) {
      this.p.onGround = false;
    }
    if (this.p.isJumping && this.playerIsFalling()) {
      this.p.isJumping = false;
    }
  }
  _updateSpiderJump(dt) {
    const playerSize = this.p.isMini ? 18 : 30;
    const miniGrav = this.p.isMini ? 1.4 : 1;
    const gravAmt = p * 0.6 * miniGrav;
    if (this.p.upKeyPressed && this.p.canJump) {
      this.p.upKeyPressed = false;
      this.p.queuedHold = false;
      const floorY = this._gameLayer.getFloorY();
      const ceilY  = this._gameLayer.getCeilingY();
      let nearestSurfaceY;
      if (!this.p.gravityFlipped) {
        nearestSurfaceY = ceilY !== null ? ceilY : Infinity;
        const playerWorldX = this._scene._playerWorldX;
        const nearbyObjects = this._gameLayer.getNearbySectionObjects(playerWorldX);
        for (const obj of nearbyObjects) {
          if (obj.type === "solid" && obj.y < this.p.y) {
            const objTop = obj.y - obj.h / 2;
            if (objTop > nearestSurfaceY || nearestSurfaceY === Infinity) {
              nearestSurfaceY = objTop;
            }
          }
        }
      } else {
        nearestSurfaceY = _floorY;
        const playerWorldX = this._scene._playerWorldX;
        const nearbyObjects = this._gameLayer.getNearbySectionObjects(playerWorldX);
        for (const obj of nearbyObjects) {
          if (obj.type === "solid" && obj.y > this.p.y) {
            const objBottom = obj.y + obj.h / 2;
            if (objBottom < nearestSurfaceY || nearestSurfaceY === null) {
              nearestSurfaceY = objBottom;
            }
          }
        }
      }
      
      if (!this.p.gravityFlipped) {
        if (isFinite(nearestSurfaceY)) {
          this.p.y = nearestSurfaceY - playerSize;
          this.flipGravity(true, 1.0);
          this.p.yVelocity = 0;
        } else {
          this.p.yVelocity = playerSpeed;
        }
      } else {
        if (isFinite(nearestSurfaceY)) {
          this.p.y = nearestSurfaceY + playerSize;
          this.flipGravity(false, 1.0);
          this.p.yVelocity = 0;
        } else {
          this.p.yVelocity = -playerSpeed;
        }
      }
      this.p.onGround = false;
      this.p.canJump = false;
      this.p.isJumping = false;
      this.runRotateAction();
      return;
    }
    if (this.playerIsFalling()) {
      this.p.canJump = false;
    }
    this.p.yVelocity -= _gravAmt * dt * this.flipMod();
    if (this.p.gravityFlipped) {
      this.p.yVelocity = Math.min(this.p.yVelocity, 30);
    } else {
      this.p.yVelocity = Math.max(this.p.yVelocity, -30);
    }
    if (this.playerIsFalling()) {
      const pastThreshold = this.p.gravityFlipped
        ? this.p.yVelocity > p * 2
        : this.p.yVelocity < -(p * 2);
      if (pastThreshold) {
        this.p.onGround = false;
      }
    }
  }
  checkCollisions(cameraX) {
    this.noclipStats.totalFrames++;
    this.p.diedThisFrame = false;
    const playerSize = this.p.isMini ? 18 : 30;
    const waveHitSize = this.p.isMini ? 6 : 9;
    const pieceWidth = cameraX + centerX;
    const playersY = this.p.y;
    const playersLastY = this.p.lastY;
    const gamemodeAddition = this.p.isFlying || this.p.isWave || this.p.isUfo ? 12 : 20;
    this.p.collideTop = 0;
    this.p.collideBottom = 0;
    this.p.onCeiling = false;
    this.p.touchingRing = false;
    let touchedPortal = false;
    let boostedThisStep = false;
    const nearbyObjects = this._gameLayer.getNearbySectionObjects(pieceWidth);
    for (let gameObj of nearbyObjects) {
      if (gameObj._broken) continue;
      let left = gameObj.x - gameObj.w / 2;
      let right = gameObj.x + gameObj.w / 2;
      let top = gameObj.y - gameObj.h / 2;
      let bottom = gameObj.y + gameObj.h / 2;
      const rad = gameObj.rotationDegrees * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const halfW = gameObj.w / 2;
      const halfH = gameObj.h / 2;
      const rotatedHalfWidth  = Math.abs(halfW * cos) + Math.abs(halfH * sin);
      const rotatedHalfHeight = Math.abs(halfW * sin) + Math.abs(halfH * cos);
      let rotatedLeft = gameObj.x - rotatedHalfWidth;
      let rotatedRight = gameObj.x + rotatedHalfWidth;
      let rotatedTop = gameObj.y - rotatedHalfHeight;
      let rotatedBottom = gameObj.y + rotatedHalfHeight;
      const _broadSize = this.p.isWave ? waveHitSize : playerSize;
      const _hasCircleHitbox = gameObj.hitbox_radius !== undefined && gameObj.hitbox_radius !== null;
      let _broadPhaseHit;
      if (_hasCircleHitbox) {
        const _dx = pieceWidth - gameObj.x;
        const _dy = playersY - gameObj.y;
        _broadPhaseHit = (_dx * _dx + _dy * _dy) <= (gameObj.hitbox_radius + _broadSize) * (gameObj.hitbox_radius + _broadSize);
      } else {
        _broadPhaseHit = !(pieceWidth + _broadSize <= rotatedLeft) && !(pieceWidth - _broadSize >= rotatedRight) && !(playersY + _broadSize <= rotatedTop) && !(playersY - _broadSize >= rotatedBottom);
      }
      if (_broadPhaseHit) {
        const _colType = gameObj.type;
        if (_colType === "portal_fly") {
          if (!gameObj.activated) {
            gameObj.activated = true;
            this._playPortalShine(gameObj);
            this.exitBallMode();
            this.exitWaveMode();
            this.exitShipMode();
            this.exitUfoMode();
            this.enterShipMode(gameObj);
          }
        } else if (_colType === portalWaveType) {
          if (!gameObj.activated) {
            gameObj.activated = true;
            this._playPortalShine(gameObj);
            this.exitBallMode();
            this.exitShipMode();
            this.exitWaveMode();
            this.exitUfoMode();
            this.enterWaveMode(gameObj);
          }
        } else if (_colType === portalUfoType) {
          if (!gameObj.activated) {
            gameObj.activated = true;
            this._playPortalShine(gameObj);
            this.exitBallMode();
            this.exitWaveMode();
            this.exitShipMode();
            this.enterUfoMode(gameObj);
          }
        } else if (_colType === "portal_cube") {
          if (!gameObj.activated) {
            gameObj.activated = true;
            this._playPortalShine(gameObj);
            this.exitShipMode();
            this.exitBallMode();
            this.exitWaveMode();
            this.exitUfoMode();
          }
        } else if (_colType === "portal_ball") {
          if (!gameObj.activated) {
            gameObj.activated = true;
            this._playPortalShine(gameObj);
            this.exitShipMode();
            this.exitWaveMode();
            this.exitUfoMode();
            this.exitBallMode();
            this.enterBallMode(gameObj);
          }
        } else if (_colType === "portal_spider") {
          if (!gameObj.activated) {
            gameObj.activated = true;
            this._playPortalShine(gameObj);
            this.exitShipMode();
            this.exitBallMode();
            this.exitWaveMode();
            this.exitUfoMode();
            this.exitSpiderMode();
            this.enterSpiderMode(gameObj);
          }
        } else if (_colType === "portal_gravity_down") {
          if (!gameObj.activated) {
            gameObj.activated = true;
            this._playPortalShine(gameObj, 2);
            this.flipGravity(false, 0.5);
          }
        } else if (_colType === "portal_gravity_up") {
          if (!gameObj.activated) {
            gameObj.activated = true;
            this._playPortalShine(gameObj, 2);
            this.flipGravity(true, 0.5);
          }
        } else if (_colType === "portal_mirror_on") {
          if (!gameObj.activated) {
            gameObj.activated = true;
            this._playPortalShine(gameObj);
            this.p.mirrored = true;
          }
        } else if (_colType === "portal_mirror_off") {
          if (!gameObj.activated) {
            gameObj.activated = true;
            this._playPortalShine(gameObj);
            this.p.mirrored = false;
          }
        } else if (_colType === "portal_mini_on") {
          if (!gameObj.activated) {
            gameObj.activated = true;
            this._playPortalShine(gameObj);
            this.p.isMini = true;
          }
        } else if (_colType === "portal_mini_off") {
          if (!gameObj.activated) {
            gameObj.activated = true;
            this._playPortalShine(gameObj);
            this.p.isMini = false;
          }
        } else if (_colType === "portal_dual_on") {
          if (!gameObj.activated) {
            gameObj.activated = true;
            this._playPortalShine(gameObj);
            this._scene._enableDualMode();
          }
        } else if (_colType === "portal_dual_off") {
          if (!gameObj.activated) {
            gameObj.activated = true;
            this._playPortalShine(gameObj);
            this._scene._disableDualMode();
          }
        } else if (_colType === speedType) {
          if (!gameObj.activated) {
            gameObj.activated = true;
            this._playPortalShine(gameObj);
            if (typeof gameObj.speedValue === "number") {
              playerSpeed = gameObj.speedValue;
            }
          }
        } else if (_colType === jumpPadType) {
          if (!gameObj.activated) {
            gameObj.activated = true;
            const _padId = gameObj.padId;
            if (_padId === 67) {
              const now = Date.now();
              if (!window.lastbluepad) {
                window.lastbluepad = 0;
              }
              if (now - window.lastbluepad < 20) {
                continue;
              }
              window.lastbluepad = now;
            }
            const _grav = 2;
            const _fm = this.flipMod();
            let _padVel = 0;
            let _padFlip = false;
            let _padNextTickVel = null;
            if (_padId === 3005) {
              const _spFloor = this._gameLayer.getFloorY();
              const _spCeil = this._gameLayer.getCeilingY() || f;
              if (!this.p.gravityFlipped) {
                this.p.y = _spCeil - playerSize;
              } else {
                this.p.y = _spFloor + playerSize;
              }
              this.flipGravity(!this.p.gravityFlipped, 1.0);
              this.p.yVelocity = 0;
              this.p.onGround = false;
              this.p.canJump = false;
              this.p.isJumping = false;
              boostedThisStep = true;
            } else {
              if (this.p.isFlying) {
                if (_padId === 35) { _padVel = 16 * _grav; _padNextTickVel = _fm * 8 * _grav; }
                else if (_padId === 140) { _padVel = 5.6 * _grav; }
                else if (_padId === 1332) { _padVel = 10.08 * _grav; }
                else if (_padId === 67) { _padVel = 15.0 * _grav; _padFlip = true; }
              } else if (this.p.isBall) {
                if (_padId === 35) { _padVel = 9.6 * _grav; }
                else if (_padId === 140) { _padVel = 6.72 * _grav; }
                else if (_padId === 1332) { _padVel = 12 * _grav; }
                else if (_padId === 67) { _padVel = 10.0 * _grav; _padFlip = true; }
              } else {
                if (_padId === 35) { _padVel = 16 * _grav; }
                else if (_padId === 140) { _padVel = 10.4 * _grav; }
                else if (_padId === 1332) { _padVel = 20 * _grav; }
                else if (_padId === 67) { _padVel = 15.0 * _grav; _padFlip = true; }
              }
              this.p.isJumping = true;
              this.p.onGround = false;
              this.p.canJump = false;
              this.p.yVelocity = _fm * _padVel;
              if (_padFlip) {
                this.flipGravity(!this.p.gravityFlipped);
              }
              if (_padNextTickVel !== null) {
                this.p.pendingVelocity = _padNextTickVel;
              }
              this.runRotateAction();
              boostedThisStep = true;
            }
          }
        } else if (_colType === jumpRingType) {
          const _orbId = gameObj.orbId;
          const _isDash = (_orbId === 1704 || _orbId === 1751);
          const justPressed = this.p.upKeyDown && !this.p.wasUpKeyDown;
          const _needsClick = (this.p.isFlying || this.p.isUfo) ? justPressed : (justPressed || (this.p.queuedHold && this.p.upKeyDown));
          this.p.touchingRing = true;
          if (!gameObj.activated && _needsClick) {
            if (_isDash) {
              gameObj._dashHoldTicks = (gameObj._dashHoldTicks || 0) + 1;
              if (gameObj._dashHoldTicks < 2) {
                gameObj.activated = true;
                const _dashAngleDeg = gameObj.orbRotation || 0;
                const _dashRad = _dashAngleDeg * Math.PI / 180;
                const _maxSin = Math.sin(70 * Math.PI / 180);
                const _rawSin = -Math.sin(_dashRad);
                const _dashSin = Math.max(-_maxSin, Math.min(_maxSin, _rawSin));
                const _dashSpeed = 18;
                const _dashVelY = _dashSin * _dashSpeed * this.flipMod();
                if (_orbId === 1751) {
                  this.flipGravity(!this.p.gravityFlipped);
                }
                this.p.isDashing = true;
                this.p.dashYVelocity = _dashVelY;
                this.p.yVelocity = _dashVelY;
                this.p.onGround = false;
                this.p.canJump = false;
                this.p.isJumping = false;
                this.p.upKeyPressed = false;
                this.p.queuedHold = false;
                this.runRotateAction();
                boostedThisStep = true;
                try {
                  for (let _orbSpr of (this._gameLayer._orbSprites || [])) {
                    if (_orbSpr && _orbSpr._eeWorldX !== undefined && Math.abs(_orbSpr._eeWorldX - gameObj.x) < 10) {
                      _orbSpr._hitTime = Date.now();
                    }
                  }
                } catch(e) {}
              }
            } else {
              gameObj.activated = true;
              const _fm = this.flipMod();
              const _cubeJump = 22.360064;
              let _orbVel = 0;
              let _flipBefore = false;
              let _flipAfter = false;
              if (_orbId === 1594) {
                this.flipGravity(!this.p.gravityFlipped);
                this.p.upKeyPressed = false;
                this.p.queuedHold = false;
                boostedThisStep = true;
              } else if (_orbId === 444) {
                const _spPlayerSize = this.p.isMini ? 18 : 30;
                const _spFloorY = this._gameLayer.getFloorY();
                const _spCeilY  = this._gameLayer.getCeilingY() || f;
                this.p.upKeyPressed = false;
                this.p.queuedHold = false;
                if (!this.p.gravityFlipped) {
                  this.p.y = _spCeilY - _spPlayerSize;
                  this.flipGravity(true, 1.0);
                } else {
                  this.p.y = _spFloorY + _spPlayerSize;
                  this.flipGravity(false, 1.0);
                }
                this.p.yVelocity = 0;
                this.p.onGround = false;
                this.p.canJump = false;
                this.p.isJumping = false;
                this.runRotateAction();
                boostedThisStep = true;
                try {
                  for (let _orbSpr of (this._gameLayer._orbSprites || [])) {
                    if (_orbSpr && _orbSpr._eeWorldX !== undefined && Math.abs(_orbSpr._eeWorldX - gameObj.x) < 10) {
                      _orbSpr._hitTime = Date.now();
                    }
                  }
                } catch(e) {}
              } else if (this.p.isWave) {
                if (_orbId === 84 || _orbId === 1022) {
                  this.flipGravity(!this.p.gravityFlipped);
                  this.p.upKeyPressed = false;
                  this.p.queuedHold = false;
                  boostedThisStep = true;
                  try {
                    for (let _orbSpr of (this._gameLayer._orbSprites || [])) {
                      if (_orbSpr && _orbSpr._eeWorldX !== undefined && Math.abs(_orbSpr._eeWorldX - gameObj.x) < 10) {
                        _orbSpr._hitTime = Date.now();
                      }
                    }
                  } catch(e) {}
                }
              } else {
                if (this.p.isFlying) {
                  if (_orbId === 36){ _orbVel = 16; }
                  else if (_orbId === 141) { _orbVel = _cubeJump * 0.37; }
                  else if (_orbId === 1333) { _orbVel = _cubeJump; }
                  else if (_orbId === 84) { _orbVel = _cubeJump * 0.4; _flipAfter = true; }
                  else if (_orbId === 1022) { _orbVel = _cubeJump * -0.7; _flipAfter = true; }
                  else if (_orbId === 1330) { _orbVel = -28; }
					} else if (this.p.isSwing) {
                  const _swingBase = _cubeJump * 0.6;
                  const _spiderBase = _cubeJump * 0.7;
                  if (_orbId === 36) { _orbVel = _swingBase; }
                  else if (_orbId === 141) { _orbVel = _swingBase * 0.72; }
                  else if (_orbId === 1333) { _orbVel = _swingBase * 1.38; }
                  else if (_orbId === 84) { _orbVel = _swingBase * 0.4; _flipAfter = true; }
                  else if (_orbId === 1022) { _orbVel = _spiderBase * -1; _flipAfter = true; }
                  else if (_orbId === 1330) { _orbVel = -28; }
                } else if (this.p.isBall) {
                  const _ballBase = _cubeJump * 0.7;
                  if (_orbId === 36) { _orbVel = _ballBase; }
                  else if (_orbId === 141) { _orbVel = _ballBase * 0.77; }
                  else if (_orbId === 1333) { _orbVel = _ballBase * 1.34; }
                  else if (_orbId === 84) { _orbVel = _ballBase * 0.4; _flipAfter = true; }
                  else if (_orbId === 1022) { _orbVel = _ballBase * -1; _flipAfter = true; }
                  else if (_orbId === 1330) { _orbVel = -30; }
                } else if (this.p.isUfo) {
                  if (_orbId === 36) { _orbVel = 16; }
                  else if (_orbId === 141) { _orbVel = _cubeJump * 0.42; }
                  else if (_orbId === 1333) { _orbVel = _cubeJump * 1.02; }
                  else if (_orbId === 84) { _orbVel = _cubeJump * 0.4; _flipAfter = true; }
                  else if (_orbId === 1022) { _orbVel = -16; _flipAfter = true; }
                  else if (_orbId === 1330) { _orbVel = -22.4; }
                } else if (this.p.isRobot) {
                  if (_orbId === 36) { _orbVel = _cubeJump * 0.9; }
                  else if (_orbId === 141) { _orbVel = _cubeJump * 0.72; }
                  else if (_orbId === 1333) { _orbVel = _cubeJump * 1.28; }
                  else if (_orbId === 84) { _orbVel = _cubeJump * 0.4; _flipAfter = true; }
                  else if (_orbId === 1022) { _orbVel = _cubeJump * -1; _flipAfter = true; }
                  else if (_orbId === 1330) { _orbVel = -30; }
                } else if (this.p.isSpider) {
                  const _spiderBase = _cubeJump * 0.7;
                  if (_orbId === 36) { _orbVel = _spiderBase; }
                  else if (_orbId === 141) { _orbVel = _spiderBase * 0.77; }
                  else if (_orbId === 1333) { _orbVel = _spiderBase * 1.34; }
                  else if (_orbId === 84) { _orbVel = _spiderBase * 0.4; _flipAfter = true; }
                  else if (_orbId === 1022) { _orbVel = _spiderBase * -1; _flipAfter = true; }
                  else if (_orbId === 1330) { _orbVel = -30; }
                } else {
                  if (_orbId === 36) { _orbVel = _cubeJump; }
                  else if (_orbId === 141) { _orbVel = _cubeJump * 0.72; }
                  else if (_orbId === 1333) { _orbVel = _cubeJump * 1.38; }
                  else if (_orbId === 84) { _orbVel = _cubeJump; _flipAfter = true; }
                  else if (_orbId === 1022) { _orbVel = _cubeJump * 1; _flipBefore = true; }
                  else if (_orbId === 1330) { _orbVel = -18; }
                }
                this.p.isJumping = true;
                this.p.onGround = false;
                this.p.canJump = false;
                this.p.upKeyPressed = false;
                this.p.queuedHold = false;
                if (_flipBefore) {
                  this.flipGravity(!this.p.gravityFlipped);
                  this.p.yVelocity = this.flipMod() * _orbVel;
                } else {
                  this.p.yVelocity = _fm * _orbVel;
                }
                if (_orbId === 1330) {
                  this.p.wasBoosted = false;
                }
                this.runRotateAction();
                boostedThisStep = true;
                if (_flipAfter) {
                  this.flipGravity(!this.p.gravityFlipped);
                }
                try {
                  for (let _orbSpr of (this._gameLayer._orbSprites || [])) {
                    if (_orbSpr && _orbSpr._eeWorldX !== undefined && Math.abs(_orbSpr._eeWorldX - gameObj.x) < 10) {
                      _orbSpr._hitTime = Date.now();
                    }
                  }
                } catch(e) {}
              }
            }
          } else if (_isDash && !this.p.upKeyDown) {
            gameObj._dashHoldTicks = 0;
          }
        } else if (_colType === coinType) {
          if (!gameObj.activated) {
            gameObj.activated = true;
            try {
              const _coinSpr = this._gameLayer._coinSprites.find(s => s && s.active && Math.abs(s._coinWorldX - gameObj.x) < 2 && Math.abs(s._coinWorldY - gameObj.y) < 2);
              if (_coinSpr && _coinSpr.scene) {
                const _startY = _coinSpr.y;
                _coinSpr.scene.tweens.add({
                  targets: _coinSpr,
                  y: _startY - 70,
                  scaleX: (_coinSpr.scaleX || 1) * 1.3,
                  scaleY: (_coinSpr.scaleY || 1) * 1.3,
                  duration: 180,
                  ease: 'Quad.Out',
                  onComplete: () => {
                    if (!_coinSpr.scene) return;
                    _coinSpr.scene.tweens.add({
                      targets: _coinSpr,
                      y: _startY + 600,
                      alpha: 0,
                      duration: 1200,
                      ease: 'Quad.In',
                      onComplete: () => {
                        try { _coinSpr.setVisible(false); } catch(e) {}
                      }
                    });
                  }
                });
              }
            } catch(e) {}
          }
        } else if (_colType === hazardType) {
          if (window.noClip) {
            this.p.diedThisFrame = true; 
            continue;
          }
          if (_hasCircleHitbox) {
            const _hdx = pieceWidth - gameObj.x;
            const _hdy = playersY - gameObj.y;
            const _hDistSq = _hdx * _hdx + _hdy * _hdy;
            const _hMinDist = gameObj.hitbox_radius + (this.p.isWave ? waveHitSize : playerSize);
            if (_hDistSq > _hMinDist * _hMinDist) continue;
          }
          this.killPlayer();
          return;
        } else if (_colType === solidType) {
          let playerBottom = playersY - playerSize + gamemodeAddition;
          let playerLastBottom = playersLastY - playerSize + gamemodeAddition;
          let playerTop = playersY + playerSize - gamemodeAddition;
          let playerLastTop = playersLastY + playerSize - gamemodeAddition;
          const collisionBuffer = 9;
          let iscolliding;
          if (_hasCircleHitbox) {
            const _sdx = pieceWidth - gameObj.x;
            const _sdy = playersY - gameObj.y;
            const _sDistSq = _sdx * _sdx + _sdy * _sdy;
            const tightRadius = gameObj.hitbox_radius + collisionBuffer;
            iscolliding = _sDistSq <= tightRadius * tightRadius;
            left = gameObj.x - gameObj.hitbox_radius;
            right = gameObj.x + gameObj.hitbox_radius;
            top = gameObj.y - gameObj.hitbox_radius;
            bottom = gameObj.y + gameObj.hitbox_radius;
          } else {
            iscolliding = pieceWidth + collisionBuffer > left && pieceWidth - collisionBuffer < right && playersY + collisionBuffer > top && playersY - collisionBuffer < bottom;
          }
          const landBottom = (this.p.yVelocity <= 0 || this.p.onGround) && (playerBottom >= bottom || playerLastBottom >= bottom);
          const landTop = (this.p.yVelocity >= 0 || this.p.onGround) && (playerTop <= top || playerLastTop <= top);
          const isstandingOnAPlatform = this.p.gravityFlipped ? landTop : landBottom;
          if (iscolliding && !isstandingOnAPlatform) {
            if (window.noClip) this.p.diedThisFrame = true;
            if (gameObj.objid === 143) {
              gameObj._broken = true;
              try {
                const _bx = gameObj.x - this._scene._cameraX;
                const _by = b(gameObj.y) + this._scene._cameraY;
                const _cont = this._gameLayer.container;
                if (_cont && _cont.list) {
                  for (let _spr of _cont.list) {
                    if (_spr && _spr.active && typeof _spr.setVisible === 'function' && _spr.visible &&
                        Math.abs((_spr.x || 0) - _bx) < 16 && Math.abs((_spr.y || 0) - _by) < 16) {
                      _spr.setVisible(false);
                    }
                  }
                }
              } catch(e) {}
              continue;
            }
            if (window.noClip) continue;
            this.killPlayer();
            return;
          }
          if (pieceWidth + playerSize - 5 > left && pieceWidth - playerSize + 5 < right) {
            if (!this.p.gravityFlipped && (playerBottom >= bottom || playerLastBottom >= bottom) && (this.p.yVelocity <= 0 || this.p.onGround)) {
              this.p.y = bottom + playerSize;
              this.hitGround();
              touchedPortal = true;
              this.p.collideBottom = bottom;
              if (!this.p.isFlying) {
                this._checkSnapJump(gameObj);
              }
              continue;
            }
            if (this.p.gravityFlipped && !this.p.isFlying && (playerTop <= top || playerLastTop <= top) && (this.p.yVelocity >= 0 || this.p.onGround)) {
              this.p.y = top - playerSize;
              this.hitGround();
              touchedPortal = true;
              this.p.onCeiling = true;
              this.p.collideTop = top;
              if (!this.p.isFlying) {
                this._checkSnapJump(gameObj);
              }
              continue;
            }
            if (this.p.isUfo) {
              if (!this.p.gravityFlipped && (playerTop <= top || playerLastTop <= top) && (this.p.yVelocity >= 0 || this.p.onGround)) {
                this.p.y = top - playerSize;
                this.hitGround();
                this.p.onCeiling = true;
                this.p.collideTop = top;
                continue;
              }
              if (this.p.gravityFlipped && (playerBottom >= bottom || playerLastBottom >= bottom) && (this.p.yVelocity <= 0 || this.p.onGround)) {
                this.p.y = bottom + playerSize;
                this.hitGround();
                touchedPortal = true;
                this.p.onCeiling = true;
                this.p.collideTop = bottom;
                continue;
              }
              continue;
            }
            if ((playerTop <= top || playerLastTop <= top) && (this.p.yVelocity >= 0 || this.p.onGround) && this.p.isFlying) {
              this.p.y = top - playerSize;
              this.hitGround();
              this.p.onCeiling = true;
              this.p.collideTop = top;
              continue;
            }
            if (!this.p.gravityFlipped && (playerTop <= top || playerLastTop <= top) && this.p.yVelocity >= 0) {
              if (iscolliding) {
                if (window.noClip) this.p.diedThisFrame = true;
                if (gameObj.objid === 143) {
                  gameObj._broken = true;
                  try {
                    const _bx = gameObj.x - this._scene._cameraX;
                    const _by = b(gameObj.y) + this._scene._cameraY;
                    const _cont = this._gameLayer.container;
                    if (_cont && _cont.list) {
                      for (let _spr of _cont.list) {
                        if (_spr && _spr.active && typeof _spr.setVisible === 'function' && _spr.visible &&
                            Math.abs((_spr.x || 0) - _bx) < 16 && Math.abs((_spr.y || 0) - _by) < 16) {
                          _spr.setVisible(false);
                        }
                      }
                    }
                  } catch(e) {}
                  continue;
                }
                if (window.noClip) continue;
                this.killPlayer();
                return;
              }
              continue;
            }
            if (this.p.gravityFlipped && (playerBottom >= bottom || playerLastBottom >= bottom) && (this.p.yVelocity <= 0 || this.p.onGround) && this.p.isFlying) {
              this.p.y = bottom + playerSize;
              this.hitGround();
              touchedPortal = true;
              this.p.onCeiling = true;
              this.p.collideTop = bottom;
              continue;
            }
          }
        }
      }
    }
    if (this.p.collideTop !== 0 && this.p.collideBottom !== 0) {
      if (Math.abs(this.p.collideTop - this.p.collideBottom) < 48) {
        if (window.noClip) this.p.diedThisFrame = true;
        if (!window.noClip) {
          this.killPlayer();
          return;
        }
      }
    }
    let floorY = this._gameLayer.getFloorY();
    const iscube = !this.p.isFlying && !this.p.isBall && !this.p.isWave && !this.p.isUfo && !this.p.isSpider;
    const effectiveSize = this.p.isWave ? waveHitSize : playerSize;
    if (!touchedPortal && !boostedThisStep) {
      let gravCeilY = this._gameLayer.getCeilingY();

      if (!touchedPortal && !boostedThisStep) {
        if (this.p.y <= floorY + effectiveSize) {
          if (!this.p.gravityFlipped || !iscube) {
            this.p.y = floorY + effectiveSize;
            this.hitGround();
            if (this.p.gravityFlipped) this.p.onCeiling = true;
          } else if (this.p.gravityFlipped && iscube && this.p.yVelocity < -0.5) {
            if (window.noClip) {
              this.p.diedThisFrame = true;
            } else {
              this.killPlayer();
              return;
            }
          }
        }

        if (gravCeilY !== null) {
          if (this.p.y >= gravCeilY - effectiveSize) {
            if (this.p.gravityFlipped) {
              this.p.y = gravCeilY - effectiveSize;
              this.hitGround();
              this.p.onCeiling = true;
            }
          }
        }
      }
      if (!this.p.gravityFlipped && !window.noClip && this.p.y < floorY - 30) {
        this.p.y = floorY + effectiveSize;
        this.p.yVelocity = 0;
        this.hitGround();
      }
      if (this.p.gravityFlipped) {
        let gravCeilY = this._gameLayer.getCeilingY();
        if (gravCeilY !== null) {
          if (this.p.y >= gravCeilY - effectiveSize) {
            this.p.y = gravCeilY - effectiveSize;
            this.hitGround();
            this.p.onCeiling = true;
          }
          if (!window.noClip && this.p.y > gravCeilY + 30) {
            this.p.y = gravCeilY - effectiveSize;
            this.p.yVelocity = 0;
            this.hitGround();
            this.p.onCeiling = true;
          }
        }
      }
    }
    let ceilingY = this._gameLayer.getCeilingY();
    if (ceilingY !== null && this.p.y >= ceilingY - effectiveSize && !iscube) {
      this.p.y = ceilingY - effectiveSize;
      this.hitGround();
      this.p.onCeiling = true;
    }
    if (this.p.y > 1890*4) {
      this.killPlayer();
      return;
    }
    if (this.p.isFlying || this.p.isWave || this.p.isUfo || this.p.isSpider) {
      const nearFloor = this.p.y <= floorY + effectiveSize;
      const nearCeiling = ceilingY !== null && this.p.y >= ceilingY - effectiveSize;
      if (!touchedPortal && !nearFloor && this.p.collideTop === 0 && !nearCeiling) {
        this.p.onGround = false;
      }
    }
    this.p.wasUpKeyDown = this.p.upKeyDown;
    if (this.p.diedThisFrame == true && window.noClipAccuracy){
      this.noclipStats.deathFrames++;
      this._scene.tweens.killTweensOf(this._scene.noclipFlash);
      this._scene.tweens.add({
        targets: this._scene.noclipFlash,
        alpha: { from: 0.5, to: 0 },
        duration: 400,
        ease: 'Cubic.easeOut'
      });
      if (this.p.diedLastFrame == false){
        this.noclipStats.deaths++;
      }
    }
    if (this.noclipStats.totalFrames > 0) {
      const safeFrames = this.noclipStats.totalFrames - this.noclipStats.deathFrames;
      this.noclipStats.accuracy = (safeFrames / this.noclipStats.totalFrames) * 100;
    }
    this.p.diedLastFrame = this.p.diedThisFrame;
  }
  drawHitboxes(graphics, camX, camY) {
    graphics.clear();
    const playerSize = this.p.isMini ? 18 : 30;
    const hitboxsize = playerSize*2;
    const isFlipped = this.p.mirrored;
    const camXCenter = camX + centerX;
    const playerY = this.p.y;
    const nearbyObjects = this._gameLayer.getNearbySectionObjects(camXCenter);
    for (let nearObject of nearbyObjects) {
      let objXCenter = nearObject.x - camX;
      let objYCenter = b(nearObject.y) + camY;
      let hitboxColor = 65280;
      if (nearObject.type === hazardType) {
        hitboxColor = 16729156;
      } else if (nearObject.type === "portal_fly" || nearObject.type === "portal_cube" || nearObject.type === "portal_ball" || nearObject.type === portalWaveType || nearObject.type === portalUfoType) {
        hitboxColor = 4491519;
      } else if (nearObject.type === "portal_gravity_down" || nearObject.type === "portal_gravity_up") {
        hitboxColor = 16776960;
      } else if (nearObject.type === "portal_mirror_on" || nearObject.type === "portal_mirror_off") {
        hitboxColor = 16744448;
      } else if (nearObject.type === "portal_mini_on" || nearObject.type === "portal_mini_off") {
        hitboxColor = 16711935;
      } else if (nearObject.type === jumpPadType) {
        hitboxColor = 16744192;
      } else if (nearObject.type === jumpRingType) {
        hitboxColor = 16711935;
      }
      const xPos = isFlipped ? screenWidth - objXCenter : objXCenter;
      graphics.lineStyle(2, hitboxColor, 0.7);
      if (nearObject.hitbox_radius !== undefined && nearObject.hitbox_radius !== null) {
        graphics.strokeCircle(xPos, objYCenter, nearObject.hitbox_radius);
      } else {
        let rot = Phaser.Math.DegToRad(nearObject.rotationDegrees);
        let cos = Math.cos(rot);
        let sin = Math.sin(rot);
        let negWidth = -nearObject.w / 2;
        let negHeight = -nearObject.h / 2;
        let posWidth =  nearObject.w / 2;
        let posHeight =  nearObject.h / 2;
        let points = [
          { x: negWidth, y: negHeight },
          { x: posWidth, y: negHeight },
          { x: posWidth, y: posHeight },
          { x: negWidth, y: posHeight }
        ];
        let rotations = points.map(p => ({
          x: xPos + (isFlipped ? -(p.x * cos - p.y * sin) : (p.x * cos - p.y * sin)),
          y: objYCenter + (isFlipped ? -(p.x * sin + p.y * cos) : (p.x * sin + p.y * cos))
        }));
        graphics.beginPath();
        graphics.moveTo(rotations[0].x, rotations[0].y);
        graphics.lineTo(rotations[1].x, rotations[1].y);
        graphics.lineTo(rotations[2].x, rotations[2].y);
        graphics.lineTo(rotations[3].x, rotations[3].y);
        graphics.closePath();
        graphics.strokePath();
      }
    }

    if (window.showHitboxTrail) {
      this._hitboxTrail.forEach((pos, index) => {
          const trailXRaw = pos.x - camX;
          const trailX = isFlipped ? screenWidth - trailXRaw : trailXRaw;
          const trailY = b(pos.y) + camY;
          graphics.lineStyle(1, hexToHexadecimal("ff0000"), 1);

          if (!this.p.isWave){
            // outer box (red)
            graphics.lineStyle(1, hexToHexadecimal("ff0000"), 0.5);
            graphics.strokeRect(trailX - playerSize, trailY - playerSize, hitboxsize, hitboxsize);

            // inner circle (dark red)
            graphics.lineStyle(1, hexToHexadecimal("b30001"), 0.5);
            graphics.strokeCircle((trailX - playerSize) + hitboxsize / 2, (trailY - playerSize) + hitboxsize / 2, hitboxsize / 2);

            graphics.lineStyle(1, hexToHexadecimal("0000ff"), 1);
          }

          // inner hitbox
          graphics.strokeRect(trailX - 9, trailY - 9, 18, 18);
      });
    }

    // comments so its easier for other people to read ts
    const playerScreenY = b(playerY) + camY;
    const _playerDrawX = isFlipped ? screenWidth - centerX : centerX;
    graphics.lineStyle(1, hexToHexadecimal("ff0000"), 1);
    if (!this.p.isWave){
      // outer box (red)
      graphics.lineStyle(2, hexToHexadecimal("ff0000"), 0.8);
      graphics.strokeRect(_playerDrawX - playerSize, playerScreenY - playerSize, hitboxsize, hitboxsize);
      // inner circle (dark red)
      graphics.lineStyle(2, hexToHexadecimal("b30001"), 0.8);
      graphics.strokeCircle((_playerDrawX - playerSize)+hitboxsize/2, (playerScreenY - playerSize)+hitboxsize/2, hitboxsize/2);

      graphics.lineStyle(2, hexToHexadecimal("0000ff"), 1);
    }
    // inner hitbox
    graphics.strokeRect(_playerDrawX - 9, playerScreenY - 9, 18, 18);
  }
  playEndAnimation(endX, endY, duration) {
    this._endAnimating = true;
    this._hitboxTrail = [];
    this._hitboxGraphics.clear();
    const scene = this._scene;
    const animDuration = duration || 240;
    const startX = scene._playerWorldX;
    const startY = this.p.y;
    const targetX = endX + 100;
    const jumpStartTime = animDuration - 40;
    const jumpStartX = startX;
    const jumpStartY = startY;
    const jumpEndX = startX + 80;
    const jumpEndTime = animDuration + 300;
    const visibleSprites = [this._playerSpriteLayer, this._playerGlowLayer, this._playerOverlayLayer, this._playerExtraLayer, this._ballSpriteLayer, this._ballGlowLayer, this._ballOverlayLayer, this._waveSpriteLayer, this._waveOverlayLayer, this._waveExtraLayer, this._waveGlowLayer, this._shipSpriteLayer, this._shipGlowLayer, this._shipOverlayLayer, this._shipExtraLayer].filter(layer => layer && layer.sprite.visible).map(layer => layer.sprite);
    this._startPercent = (this._scene._playerWorldX / this._scene._level.endXPos) * 100;
    this._particleEmitter.stop();
    this._flyParticleEmitter.stop();
    this._flyParticle2Emitter.stop();
    this._shipDragEmitter.stop();
    const wasFlying = this.p.isFlying;
    const shipLayers = [this._shipSpriteLayer, this._shipGlowLayer, this._shipOverlayLayer, this._shipExtraLayer];
    const playerLayers = [this._playerSpriteLayer, this._playerGlowLayer, this._playerOverlayLayer, this._playerExtraLayer];
    const spriteData = visibleSprites.map(sprite => {
      let spriteIndex = 0;
      if (wasFlying) {
        const isShipSprite = shipLayers.some(layer => layer && layer.sprite === sprite);
        const isPlayerSprite = playerLayers.some(layer => layer && layer.sprite === sprite);
        if (isShipSprite) {
          spriteIndex = 10;
        } else if (isPlayerSprite) {
          spriteIndex = -10;
        }
      }
      return {
        spr: sprite,
        localY: spriteIndex
      };
    });
    const streak = this._streak;
    const animationData = {
      val: 0
    };
    scene.tweens.add({
      targets: animationData,
      val: 1,
      duration: 1000,
      ease: t => Math.pow(t, 1.2),
      onUpdate: () => {
        const spriteWidth = animationData.val;
        const currentX = (1 - spriteWidth) ** 3 * jumpStartX + (1 - spriteWidth) ** 2 * 3 * spriteWidth * jumpStartX + (1 - spriteWidth) * 3 * spriteWidth ** 2 * jumpEndX + spriteWidth ** 3 * targetX;
        const currentY = (1 - spriteWidth) ** 3 * jumpStartY + (1 - spriteWidth) ** 2 * 3 * spriteWidth * jumpStartY + (1 - spriteWidth) * 3 * spriteWidth ** 2 * jumpEndTime + spriteWidth ** 3 * jumpStartTime;
        const screenX = currentX - scene._cameraX;
        const screenY = b(currentY) + scene._cameraY;
        const scale = 1 - spriteWidth * spriteWidth;
        const baseRotation = spriteData[0].spr.rotation;
        const cosRotation = Math.cos(baseRotation);
        const sinRotation = Math.sin(baseRotation);
        this._scene._interpolatedPercent = this._startPercent + (100 - this._startPercent) * spriteWidth;
        for (const spriteInfo of spriteData) {
          const yOffset = -spriteInfo.localY * sinRotation;
          const xOffset = spriteInfo.localY * cosRotation;
          spriteInfo.spr.setPosition(screenX + yOffset, screenY + xOffset);
          spriteInfo.spr.setAlpha(scale);
        }
        streak.setPosition(currentX, b(currentY));
        streak.update(scene.game.loop.delta / 1000);
      },
      onComplete: () => {
        this._scene._interpolatedPercent = 100;
        for (const spriteInfo of spriteData) {
          spriteInfo.spr.setVisible(false);
        }
        streak.stop();
        streak.reset();
        endY();
      }
    });
    for (const sprite of visibleSprites) {
      scene.tweens.add({
        targets: sprite,
        angle: sprite.angle + 360,
        duration: 1000,
        ease: t => Math.pow(t, 1.5)
      });
    }
  }
  reset() {
    this._cleanupExplosion();
    this._endAnimating = false;
    this._lastLandObject = null;
    this._lastXOffset = 0;
    this.stopRotation();
    this.rotateActionTime = 0;
    this._rotation = 0;
    this._lastCameraX = 0;
    this._lastCameraY = 0;
    this.setCubeVisible(true);
    this.setShipVisible(false);
    this.setBallVisible(false);
    this.setWaveVisible(false);
	this.setBirdVisible(false);
    this.setSpiderVisible(false);
    for (const layer of this._allLayers) {
      if (layer) {
        layer.sprite.setAlpha(1);
        if (layer.sprite.scaleY < 0) {
          layer.sprite.scaleY = Math.abs(layer.sprite.scaleY);
        }
      }
    }
    for (const playerLayer of this._playerLayers) {
      if (playerLayer) {
        playerLayer.sprite.setScale(1);
      }
    }
    this._particleEmitter.stop();
    this._particleActive = false;
    this._flyParticleEmitter.stop();
    this._flyParticleActive = false;
    this._flyParticle2Emitter.stop();
    this._flyParticle2Active = false;
    this._shipDragEmitter.stop();
    this._shipDragActive = false;
    this._streak.stop();
    this._streak.reset();
    this._waveTrail.stop();
    this._waveTrail.reset();
  }
}
