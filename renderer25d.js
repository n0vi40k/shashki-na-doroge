/**
 * True 3D-Perspective 2.5D Highway Renderer for «ШАШКИ НА ДОРОГЕ»
 * Natural Front-Chase Perspective: Sky & City Horizon at top (y ≈ 11.5% H),
 * 4-lane highway flaring wide toward foreground at bottom (y = H),
 * Player at y ≈ 31% H facing forward/downward (+Y) with drawn animated faces & detailed 2.5D vehicles.
 */
(function (global) {
  'use strict';

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function roundedRectPath(ctx, x, y, w, h, r) {
    const rad = Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }

  function trapezoidPath(ctx, topCx, topY, topW, botCx, botY, botW, r) {
    const rad = Math.max(0, r || 0);
    const tlx = topCx - topW * 0.5;
    const trx = topCx + topW * 0.5;
    const blx = botCx - botW * 0.5;
    const brx = botCx + botW * 0.5;

    ctx.beginPath();
    if (rad <= 0.5) {
      ctx.moveTo(tlx, topY);
      ctx.lineTo(trx, topY);
      ctx.lineTo(brx, botY);
      ctx.lineTo(blx, botY);
    } else {
      ctx.moveTo(tlx + rad, topY);
      ctx.lineTo(trx - rad, topY);
      ctx.quadraticCurveTo(trx, topY, trx + (brx - trx) * 0.12, topY + rad);
      ctx.lineTo(brx - (brx - trx) * 0.12, botY - rad);
      ctx.quadraticCurveTo(brx, botY, brx - rad, botY);
      ctx.lineTo(blx + rad, botY);
      ctx.quadraticCurveTo(blx, botY, blx + (tlx - blx) * 0.12, botY - rad);
      ctx.lineTo(tlx - (tlx - blx) * 0.12, topY + rad);
      ctx.quadraticCurveTo(tlx, topY, tlx + rad, topY);
    }
    ctx.closePath();
  }

  const SKYLINE_BUILDINGS = [
    { x: 0.04, w: 0.08, h: 52, col: '#0f182a', tower: false },
    { x: 0.13, w: 0.07, h: 74, col: '#132036', tower: true },
    { x: 0.21, w: 0.09, h: 46, col: '#0d1524', tower: false },
    { x: 0.31, w: 0.06, h: 64, col: '#15243c', tower: false },
    { x: 0.39, w: 0.07, h: 38, col: '#0f1727', tower: false },
    { x: 0.54, w: 0.07, h: 42, col: '#10192b', tower: false },
    { x: 0.62, w: 0.06, h: 68, col: '#142239', tower: true },
    { x: 0.70, w: 0.09, h: 48, col: '#0e1627', tower: false },
    { x: 0.80, w: 0.08, h: 76, col: '#162640', tower: true },
    { x: 0.89, w: 0.09, h: 50, col: '#0f1728', tower: false },
  ];

  const STARS = [
    [0.08, 0.025], [0.18, 0.045], [0.29, 0.018], [0.43, 0.036],
    [0.52, 0.022], [0.66, 0.042], [0.77, 0.02], [0.91, 0.038],
    [0.14, 0.07], [0.36, 0.065], [0.61, 0.068], [0.85, 0.062],
  ];

  class Renderer25D {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.width = 440;
      this.height = 780;
      this.dpr = 1;
      this.zMax = 3.2;
    }

    resize(cssWidth, cssHeight) {
      const w = Math.max(280, Math.round(cssWidth));
      const h = Math.max(420, Math.round(cssHeight));
      const dpr = Math.min(2, global.devicePixelRatio || 1);
      this.width = w;
      this.height = h;
      this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }

    horizonY() {
      return Math.round(this.height * 0.115);
    }

    /**
     * Straight 3D perspective road bounds at screen Y:
     * Linear convergence toward distant vanishing point (straight lane lines & rails).
     */
    roadBoundsAtY(y) {
      const hy = this.horizonY();
      const rawP = (y - hy) / Math.max(1, this.height - hy);
      const p = clamp(rawP, 0, 1);
      const topW = this.width * 0.42;
      const botW = this.width * 0.88;
      const roadW = lerp(topW, botW, p);
      const leftX = (this.width - roadW) * 0.5;
      return {
        leftX,
        rightX: leftX + roadW,
        roadW,
        laneW: roadW / 4,
        scale: lerp(0.46, 1.0, p),
        p,
      };
    }

    /** Perspective Jacobian speed multiplier so road markings, pickups, and cars move in lockstep. */
    perspectiveSpeedFactor(y) {
      const hy = this.horizonY();
      const p = clamp((y - hy) / Math.max(1, this.height - hy), 0, 1);
      const invMin = 1 / this.zMax;
      const invP = invMin + 0.266 * (1 - invMin); // player depth reference
      const invY = invMin + p * (1 - invMin);
      return clamp(Math.pow(invY / invP, 1.5), 0.42, 2.35);
    }

    heroScale(y) {
      const b = this.roadBoundsAtY(y);
      return clamp((b.laneW * 0.88) / 96, 0.54, 0.82);
    }

    /** Map normalized 3D Z-depth (1 = foreground bottom .. zMax = horizon) to screen Y. */
    zToScreenY(z) {
      const hy = this.horizonY();
      const invMin = 1 / this.zMax;
      const frac = clamp((1 / z - invMin) / (1 - invMin), 0, 1);
      return hy + (this.height - hy) * frac;
    }

    laneX(laneFloat, y) {
      const b = this.roadBoundsAtY(y);
      return b.leftX + b.laneW * (laneFloat + 0.5);
    }

    render(state) {
      this._currentRenderState = state;
      const ctx = this.ctx;
      const W = this.width;
      const H = this.height;
      const hy = this.horizonY();

      ctx.save();
      ctx.scale(this.dpr, this.dpr);

      if (state.shake > 0.2) {
        const sx = (Math.random() - 0.5) * state.shake;
        const sy = (Math.random() - 0.5) * state.shake;
        ctx.translate(sx, sy);
      }

      this._drawSkyAndCityHorizon(ctx, W, H, hy, state);
      this._drawPerspectiveHighway(ctx, W, H, hy, state);
      this._drawScenicEvents(ctx, W, H, hy, state);
      this._drawSkidMarks(ctx, state);
      this._drawShockwaves(ctx, state);
      this._drawGantryShadows(ctx, W, H, hy, state);
      this._drawPickups(ctx, state);

      // Clip road entities below horizon so receding overtaken cars vanish cleanly behind horizon
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, hy - 8, W, H - hy + 20);
      ctx.clip();

      const drawables = [{ kind: 'player', y: state.player.y }];
      for (const car of state.traffic) {
        drawables.push({ kind: 'traffic', y: car.y, car });
      }
      drawables.sort((a, b) => a.y - b.y);

      for (const d of drawables) {
        if (d.kind === 'player') {
          this._drawPlayer(ctx, state);
        } else {
          this._drawTrafficCar(ctx, d.car, state);
        }
      }

      this._drawParticles(ctx, state);
      ctx.restore();

      this._drawOverheadGantries(ctx, W, H, hy, state);
      this._drawSpeedLines(ctx, W, H, state);
      this._drawFloatingPopups(ctx, state);

      if (state.beamTimer > 0.15) {
        const alpha = clamp((state.beamTimer - 0.15) * 0.32, 0, 0.15);
        ctx.fillStyle = `rgba(210, 240, 255, ${alpha})`;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.restore();
    }

    _drawSkyAndCityHorizon(ctx, W, H, hy, state) {
      // Deep twilight night sky with warm horizon dusk glow
      const skyGrad = ctx.createLinearGradient(0, 0, 0, hy + 24);
      skyGrad.addColorStop(0, '#060913');
      skyGrad.addColorStop(0.58, '#0e172a');
      skyGrad.addColorStop(0.86, '#1f2642');
      skyGrad.addColorStop(1, '#3b2c3f');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, hy + 26);

      // Subtle horizon amber/magenta city glow
      const cityGlow = ctx.createRadialGradient(W * 0.5, hy, 8, W * 0.5, hy, W * 0.58);
      cityGlow.addColorStop(0, 'rgba(255, 145, 70, 0.24)');
      cityGlow.addColorStop(0.5, 'rgba(56, 189, 248, 0.08)');
      cityGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = cityGlow;
      ctx.fillRect(0, 0, W, hy + 24);

      // Twinkling stars
      STARS.forEach(([sx, sy], i) => {
        const tw = 0.35 + 0.55 * Math.sin(state.time * 2.2 + i * 1.7);
        ctx.fillStyle = `rgba(225, 240, 255, ${tw.toFixed(2)})`;
        ctx.fillRect(sx * W, sy * H, 1.8, 1.8);
      });

      // City Skyline Silhouette at Horizon
      const blinkRed = Math.floor(state.time * 2.5) % 2 === 0;
      SKYLINE_BUILDINGS.forEach((b, idx) => {
        const bx = b.x * W;
        const bw = b.w * W;
        const bh = b.h;
        const by = hy - bh + 6;
        ctx.fillStyle = b.col;
        ctx.fillRect(bx, by, bw, bh);

        // Lit building windows
        ctx.fillStyle = idx % 2 === 0 ? 'rgba(255, 214, 130, 0.32)' : 'rgba(125, 211, 252, 0.24)';
        for (let wy = by + 7; wy < hy - 4; wy += 7) {
          for (let wx = bx + 4; wx < bx + bw - 5; wx += 6) {
            if ((Math.floor(wx + wy) + idx) % 3 !== 0) {
              ctx.fillRect(wx, wy, 3, 3.5);
            }
          }
        }

        // Spire + blinking red aviation beacon on tall towers
        if (b.tower) {
          const sx = bx + bw * 0.5;
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(sx, by);
          ctx.lineTo(sx, by - 12);
          ctx.stroke();
          ctx.fillStyle = blinkRed ? '#ff3b5c' : 'rgba(255, 59, 92, 0.25)';
          ctx.beginPath();
          ctx.arc(sx, by - 13, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Lower side embankments outside highway
      const sideGrad = ctx.createLinearGradient(0, hy, 0, H);
      sideGrad.addColorStop(0, '#090f1a');
      sideGrad.addColorStop(1, '#05080f');
      ctx.fillStyle = sideGrad;
      ctx.fillRect(0, hy, W, H - hy);
    }

    _drawShockwaves(ctx, state) {
      if (!state.shockwaves || state.shockwaves.length === 0) return;
      ctx.save();
      for (const sw of state.shockwaves) {
        const prog = 1 - clamp(sw.life / sw.maxLife, 0, 1);
        const alpha = clamp((1 - prog) * 0.72, 0, 0.72);
        const rx = (22 + prog * 95) * sw.scale;
        const ry = rx * 0.42;
        ctx.strokeStyle = `rgba(${sw.rgb || '0, 212, 255'}, ${alpha.toFixed(2)})`;
        ctx.lineWidth = Math.max(1.2, (4 - prog * 2.5) * sw.scale);
        ctx.beginPath();
        ctx.ellipse(sw.x, sw.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    _drawScenicPropCar25D(ctx, cx, cy, sc, angle, opts) {
      const w = (opts.w || 42) * sc;
      const h = (opts.h || 68) * sc;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // Ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.56)';
      trapezoidPath(ctx, 2 * sc, -h * 0.44, w * 0.94, 3 * sc, h * 0.50, w * 1.08, 7 * sc);
      ctx.fill();

      // Wheels
      ctx.fillStyle = '#090d14';
      [
        [-w * 0.52, -h * 0.34],
        [w * 0.52 - 5 * sc, -h * 0.34],
        [-w * 0.52, h * 0.14],
        [w * 0.52 - 5 * sc, h * 0.14],
      ].forEach(([wx, wy]) => {
        roundedRectPath(ctx, wx, wy, 5 * sc, 12 * sc, 1.8 * sc);
        ctx.fill();
      });

      // Underglow halo (optional)
      if (opts.underglowRgb) {
        const ug = ctx.createRadialGradient(0, 0, 4 * sc, 0, 0, h * 0.65);
        ug.addColorStop(0, `rgba(${opts.underglowRgb}, 0.55)`);
        ug.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ug;
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.9, h * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Main 2.5D body
      trapezoidPath(ctx, 0, -h * 0.45, w * 0.85, 0, h * 0.44, w * 1.0, 6 * sc);
      const grad = ctx.createLinearGradient(-w * 0.5, -h * 0.45, w * 0.5, h * 0.45);
      grad.addColorStop(0, opts.light || '#f8fafc');
      grad.addColorStop(0.55, opts.mid || '#cbd5e1');
      grad.addColorStop(1, opts.dark || '#64748b');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 0.9 * sc;
      ctx.stroke();

      // Livery / Hood Stripes
      if (opts.dps) {
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(-w * 0.44, -h * 0.42, w * 0.88, 6 * sc);
        ctx.beginPath();
        ctx.moveTo(-w * 0.34, h * 0.16);
        ctx.lineTo(w * 0.34, h * 0.16);
        ctx.lineTo(w * 0.22, h * 0.33);
        ctx.lineTo(-w * 0.22, h * 0.33);
        ctx.closePath();
        ctx.fill();
      } else if (opts.flatbed) {
        ctx.fillStyle = '#334155';
        roundedRectPath(ctx, -w * 0.40, -h * 0.41, w * 0.80, h * 0.36, 3 * sc);
        ctx.fill();
      }

      // Popped open hood for car_meet
      if (opts.hoodOpen) {
        ctx.fillStyle = '#0f172a';
        roundedRectPath(ctx, -w * 0.34, h * 0.13, w * 0.68, h * 0.24, 3 * sc);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-w * 0.18, h * 0.20, w * 0.36, 4 * sc);
      }

      // Roof & Windshield
      const roofTop = -h * 0.45;
      const roofBot = opts.flatbed ? -h * 0.02 : -h * 0.18;
      trapezoidPath(ctx, 0, roofTop, w * 0.66, 0, roofBot, w * 0.72, 4 * sc);
      ctx.fillStyle = opts.light || '#e2e8f0';
      ctx.fill();

      trapezoidPath(ctx, 0, roofBot, w * 0.70, 0, h * 0.14, w * 0.84, 3 * sc);
      ctx.fillStyle = '#0c1524';
      ctx.fill();

      // Driver silhouette if occupied
      if (opts.hasDriver) {
        ctx.fillStyle = opts.dps ? '#1e3a8a' : '#1f2937';
        ctx.beginPath();
        ctx.arc(w * 0.14, roofBot + 8 * sc, 4 * sc, 0, Math.PI * 2);
        ctx.fill();
      }

      // Headlights & Amber/Red Bars
      ctx.fillStyle = '#fffbeb';
      roundedRectPath(ctx, -w * 0.42, h * 0.30, 10 * sc, 5 * sc, 1.5 * sc);
      ctx.fill();
      roundedRectPath(ctx, w * 0.42 - 10 * sc, h * 0.30, 10 * sc, 5 * sc, 1.5 * sc);
      ctx.fill();

      if (opts.dps) {
        const barY = roofTop + (roofBot - roofTop) * 0.42;
        const strobe = Math.floor((opts.time || 0) * 10) % 2 === 0;
        roundedRectPath(ctx, -11 * sc, barY, 22 * sc, 5 * sc, 2 * sc);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.fillStyle = strobe ? '#ff2b4a' : '#1e3a8a';
        ctx.fillRect(-10 * sc, barY + 0.8 * sc, 9.5 * sc, 3.4 * sc);
        ctx.fillStyle = strobe ? '#1d4ed8' : '#38bdf8';
        ctx.fillRect(0.5 * sc, barY + 0.8 * sc, 9.5 * sc, 3.4 * sc);

        const sg = ctx.createRadialGradient(0, barY + 2 * sc, 2 * sc, 0, barY + 2 * sc, 34 * sc);
        sg.addColorStop(0, strobe ? 'rgba(255, 43, 74, 0.55)' : 'rgba(56, 189, 248, 0.55)');
        sg.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(0, barY + 2 * sc, 34 * sc, 0, Math.PI * 2);
        ctx.fill();
      } else if (opts.amberBeacon) {
        const barY = roofTop + (roofBot - roofTop) * 0.55;
        const pulse = 0.55 + 0.45 * Math.sin((opts.time || 0) * 9);
        const bg = ctx.createRadialGradient(0, barY, 2 * sc, 0, barY, 30 * sc);
        bg.addColorStop(0, `rgba(255, 175, 25, ${(0.72 * pulse).toFixed(2)})`);
        bg.addColorStop(1, 'rgba(255, 175, 25, 0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(0, barY, 30 * sc, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff9f1c';
        ctx.beginPath();
        ctx.arc(0, barY, 3.5 * sc, 0, Math.PI * 2);
        ctx.fill();
      } else if (opts.hazards) {
        if (Math.floor((opts.time || 0) * 4) % 2 === 0) {
          ctx.fillStyle = '#ff9f1c';
          ctx.fillRect(-w * 0.43, h * 0.34, 4 * sc, 4 * sc);
          ctx.fillRect(w * 0.43 - 4 * sc, h * 0.34, 4 * sc, 4 * sc);
        }
      }

      ctx.restore();
    }

    _drawScenicEvents(ctx, W, H, hy, state) {
      if (!state.scenicEvents || state.scenicEvents.length === 0) return;
      for (const ev of state.scenicEvents) {
        if (ev.y < hy + 10 || ev.y > H + 125) continue;
        const b = this.roadBoundsAtY(ev.y);
        const s = b.scale;
        if (s < 0.18) continue;

        const side = ev.side || 1; // -1 = left shoulder, +1 = right shoulder
        const py = ev.y;
        const sc = s * 1.12;
        const availMargin = side < 0 ? b.leftX : (W - b.rightX);
        if (availMargin < 26 * s) continue;

        // Perspective-matched paved turnout pocket flush with the highway shoulder curb
        const topY = Math.max(hy + 4, py - 68 * sc);
        const midTopY = Math.max(hy + 4, py - 46 * sc);
        const midBotY = Math.min(H, py + 46 * sc);
        const botY = Math.min(H, py + 68 * sc);
        const bTop = this.roadBoundsAtY(topY);
        const bMidTop = this.roadBoundsAtY(midTopY);
        const bMidBot = this.roadBoundsAtY(midBotY);
        const bBot = this.roadBoundsAtY(botY);
        const edgeTop = (side < 0 ? bTop.leftX : bTop.rightX) + side * 4 * s;
        const edgeMid = (side < 0 ? b.leftX : b.rightX) + side * 8 * s;
        const edgeBot = (side < 0 ? bBot.leftX : bBot.rightX) + side * 12 * s;
        const bayW = clamp(availMargin * 0.94, 52 * sc, 88 * sc);
        const outTopX = (side < 0 ? bMidTop.leftX : bMidTop.rightX) + side * bayW * 0.82;
        const outBotX = (side < 0 ? bMidBot.leftX : bMidBot.rightX) + side * bayW;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(edgeTop, topY);
        ctx.lineTo(outTopX, midTopY);
        ctx.lineTo(outBotX, midBotY);
        ctx.lineTo(edgeBot, botY);
        ctx.closePath();
        ctx.fillStyle = ev.kind === 'gas_station' ? '#1c2638' : '#151d2b';
        ctx.fill();

        // Stroke only the outer perimeter curb so pocket joins seamlessly to highway barrier
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.52)';
        ctx.lineWidth = 1.6 * sc;
        ctx.beginPath();
        ctx.moveTo(edgeTop, topY);
        ctx.lineTo(outTopX, midTopY);
        ctx.lineTo(outBotX, midBotY);
        ctx.lineTo(edgeBot, botY);
        ctx.stroke();

        // Dashed turnout entry marking along shoulder barrier
        ctx.strokeStyle = 'rgba(255, 208, 67, 0.72)';
        ctx.lineWidth = 1.6 * sc;
        ctx.setLineDash([7 * sc, 6 * sc]);
        ctx.beginPath();
        ctx.moveTo(edgeTop + side * 5 * sc, midTopY);
        ctx.lineTo(edgeBot + side * 5 * sc, midBotY);
        ctx.stroke();
        ctx.setLineDash([]);

        const centerX = edgeMid + side * (bayW * 0.50);

        if (ev.kind === 'dps_post') {
          // Cones separating highway lane edge & DPS bay
          for (let c = -1; c <= 1; c++) {
            const cy = py + c * 28 * sc;
            const bCone = this.roadBoundsAtY(cy);
            const coneX = (side < 0 ? bCone.leftX : bCone.rightX) + side * 14 * sc;
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.moveTo(coneX, cy - 11 * sc);
            ctx.lineTo(coneX - 5.5 * sc, cy + 2 * sc);
            ctx.lineTo(coneX + 5.5 * sc, cy + 2 * sc);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(coneX - 2.6 * sc, cy - 5.5 * sc, 5.2 * sc, 2.4 * sc);
          }

          // Angled 2.5D DPS Patrol Car comfortably parked on turnout pocket
          const carX = clamp(centerX + side * 4 * sc, 26 * sc, W - 26 * sc);
          this._drawScenicPropCar25D(ctx, carX, py + 6 * sc, sc * 0.86, side * 0.22, {
            w: 44,
            h: 72,
            light: '#f8fafc',
            mid: '#e2e8f0',
            dark: '#94a3b8',
            dps: true,
            hasDriver: true,
            time: state.time,
          });

          // Animated DPS Officer standing beside radar tripod facing highway
          const offX = edgeMid + side * 22 * sc;
          const offY = py - 24 * sc;
          const wave = Math.sin(state.time * 9) * 0.45;
          // Reflective yellow vest body + dark trousers + cap
          ctx.fillStyle = '#0f172a';
          roundedRectPath(ctx, offX - 5 * sc, offY + 2 * sc, 10 * sc, 10 * sc, 2.5 * sc);
          ctx.fill();
          ctx.fillStyle = '#bef264';
          roundedRectPath(ctx, offX - 6 * sc, offY - 8 * sc, 12 * sc, 12 * sc, 3 * sc);
          ctx.fill();
          ctx.fillStyle = '#e3aa87';
          ctx.beginPath();
          ctx.arc(offX, offY - 12 * sc, 4.5 * sc, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#1e3a8a';
          roundedRectPath(ctx, offX - 5 * sc, offY - 17 * sc, 10 * sc, 4 * sc, 1.5 * sc);
          ctx.fill();

          // Waving striped baton toward highway
          ctx.save();
          ctx.translate(offX - side * 4 * sc, offY - 5 * sc);
          ctx.rotate(-side * (0.6 + wave));
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(side < 0 ? 0 : -12 * sc, -1.6 * sc, 12 * sc, 3.2 * sc);
          ctx.fillStyle = '#111827';
          ctx.fillRect(side < 0 ? 3 * sc : -9 * sc, -1.6 * sc, 3 * sc, 3.2 * sc);
          ctx.fillRect(side < 0 ? 8 * sc : -4 * sc, -1.6 * sc, 3 * sc, 3.2 * sc);
          ctx.restore();

          // Speed-trap tripod camera aimed at passing lanes
          const camX = edgeMid + side * 20 * sc;
          const camY = py - 46 * sc;
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.6 * sc;
          ctx.beginPath();
          ctx.moveTo(camX, camY);
          ctx.lineTo(camX - 6 * sc, camY + 13 * sc);
          ctx.moveTo(camX, camY);
          ctx.lineTo(camX + 6 * sc, camY + 13 * sc);
          ctx.stroke();
          roundedRectPath(ctx, camX - 5.5 * sc, camY - 5 * sc, 11 * sc, 7 * sc, 1.8 * sc);
          ctx.fillStyle = '#0f172a';
          ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(camX - side * 2.5 * sc, camY - 1.5 * sc, 2.2 * sc, 0, Math.PI * 2);
          ctx.fill();

          if (ev.flashTimer > 0) {
            const fa = clamp(ev.flashTimer * 2.8, 0, 1);
            const fg = ctx.createRadialGradient(camX - side * 3 * sc, camY, 2, camX - side * 3 * sc, camY, 76 * sc);
            fg.addColorStop(0, `rgba(255, 255, 255, ${fa.toFixed(2)})`);
            fg.addColorStop(0.35, `rgba(186, 230, 253, ${(fa * 0.6).toFixed(2)})`);
            fg.addColorStop(1, 'rgba(186, 230, 253, 0)');
            ctx.fillStyle = fg;
            ctx.beginPath();
            ctx.arc(camX - side * 3 * sc, camY, 76 * sc, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (ev.kind === 'gas_station') {
          const gCenterX = clamp(centerX + side * 4 * sc, 36 * sc, W - 36 * sc);
          // Warm canopy ambient ground light
          const glow = ctx.createRadialGradient(gCenterX, py, 6 * sc, gCenterX, py, 96 * sc);
          glow.addColorStop(0, 'rgba(46, 229, 157, 0.28)');
          glow.addColorStop(0.55, 'rgba(255, 159, 28, 0.16)');
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(gCenterX, py, 96 * sc, 0, Math.PI * 2);
          ctx.fill();

          // Parked refueling car on inner pump lane
          this._drawScenicPropCar25D(ctx, edgeMid + side * 22 * sc, py + 12 * sc, sc * 0.85, 0, {
            w: 38,
            h: 60,
            light: '#93c5fd',
            mid: '#3b82f6',
            dark: '#1d4ed8',
            time: state.time,
          });

          // 3D Canopy Pillars & Glowing Fuel Islands
          ctx.fillStyle = '#0f172a';
          roundedRectPath(ctx, gCenterX - 24 * sc, py - 42 * sc, 54 * sc, 80 * sc, 6 * sc);
          ctx.fill();
          ctx.strokeStyle = '#2ee59d';
          ctx.lineWidth = 2.6 * sc;
          ctx.stroke();

          // Canopy illuminated ceiling strips + red fuel pumps
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(gCenterX - 14 * sc, py - 30 * sc, 34 * sc, 5 * sc);
          ctx.fillRect(gCenterX - 14 * sc, py + 22 * sc, 34 * sc, 5 * sc);
          ctx.fillStyle = '#ef4444';
          roundedRectPath(ctx, gCenterX - 8 * sc, py - 18 * sc, 12 * sc, 13 * sc, 2 * sc);
          ctx.fill();
          roundedRectPath(ctx, gCenterX - 8 * sc, py + 4 * sc, 12 * sc, 13 * sc, 2 * sc);
          ctx.fill();

          // Upright Price Totem (never mirrored!)
          const totX = edgeMid + side * 16 * sc;
          const totY = py - 42 * sc;
          roundedRectPath(ctx, totX - 11 * sc, totY - 14 * sc, 22 * sc, 28 * sc, 3 * sc);
          ctx.fillStyle = '#070b14';
          ctx.fill();
          ctx.strokeStyle = '#2ee59d';
          ctx.lineWidth = 1.6 * sc;
          ctx.stroke();
          ctx.fillStyle = '#2ee59d';
          ctx.font = `900 ${Math.max(5.5, Math.round(6.2 * sc))}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('АИ98', totX, totY - 3 * sc);
          ctx.fillStyle = '#ffd043';
          ctx.fillText('75.9', totX, totY + 8 * sc);
        } else if (ev.kind === 'roadworks') {
          // Red-white Jersey barriers guarding outer shoulder lane
          for (let i = 0; i < 4; i++) {
            const by = py - 44 * sc + i * 26 * sc;
            const bBar = this.roadBoundsAtY(by);
            const bx = (side < 0 ? bBar.leftX : bBar.rightX) + side * 9 * sc;
            roundedRectPath(ctx, bx - 4 * sc, by - 9 * sc, 8 * sc, 18 * sc, 2 * sc);
            ctx.fillStyle = i % 2 === 0 ? '#ef4444' : '#f8fafc';
            ctx.fill();
          }

          // Directional LED Arrow Trailer Board (pointing safely away from work zone!)
          const brdX = clamp(centerX - side * 2 * sc, 24 * sc, W - 24 * sc);
          const brdY = py - 34 * sc;
          roundedRectPath(ctx, brdX - 16 * sc, brdY - 9 * sc, 32 * sc, 18 * sc, 3 * sc);
          ctx.fillStyle = '#0b1120';
          ctx.fill();
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.4 * sc;
          ctx.stroke();
          if (Math.floor(state.time * 4) % 2 === 0) {
            ctx.fillStyle = '#ff9f1c';
            ctx.font = `900 ${Math.max(6, Math.round(9.5 * sc))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(side < 0 ? '>>>' : '<<<', brdX, brdY);
          }

          // 2.5D Utility Work Truck + Rotating Amber Roof Beacon
          const trkX = clamp(centerX + side * 4 * sc, 28 * sc, W - 28 * sc);
          this._drawScenicPropCar25D(ctx, trkX, py + 12 * sc, sc * 0.88, 0, {
            w: 44,
            h: 72,
            light: '#f59e0b',
            mid: '#d97706',
            dark: '#92400e',
            flatbed: true,
            amberBeacon: true,
            hasDriver: true,
            time: state.time,
          });

          // Animated welding sparks near flatbed rear
          for (let sp = 0; sp < 6; sp++) {
            const ph = (state.time * 5.2 + sp * 0.19) % 1;
            const ang = sp * 1.05 - 1.4;
            const sx = trkX - side * 8 * sc + Math.cos(ang) * ph * 18 * sc;
            const sy = py - 14 * sc + Math.sin(ang) * ph * 16 * sc;
            ctx.fillStyle = `rgba(255, 224, 130, ${(1 - ph).toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 2 * sc, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (ev.kind === 'car_meet') {
          const mCenterX = clamp(centerX + side * 2 * sc, 30 * sc, W - 30 * sc);
          // Two 2.5D tuned street cars centered neatly inside turnout bay
          this._drawScenicPropCar25D(ctx, mCenterX - side * 4 * sc, py - 22 * sc, sc * 0.78, -side * 0.18, {
            w: 40,
            h: 64,
            light: '#38bdf8',
            mid: '#1e293b',
            dark: '#0f172a',
            underglowRgb: '0, 212, 255',
            hoodOpen: true,
            hazards: true,
            time: state.time,
          });
          this._drawScenicPropCar25D(ctx, mCenterX + side * 4 * sc, py + 24 * sc, sc * 0.78, side * 0.14, {
            w: 40,
            h: 64,
            light: '#c084fc',
            mid: '#4c1d95',
            dark: '#1e1b4b',
            underglowRgb: '217, 70, 239',
            hazards: true,
            time: state.time,
          });
        }

        ctx.restore();
      }
    }

    _drawPerspectiveHighway(ctx, W, H, hy, state) {
      const topB = this.roadBoundsAtY(hy);
      const botB = this.roadBoundsAtY(H);

      // Asphalt surface gradient (brighter atmospheric haze near horizon, rich deep tarmac near camera)
      const roadGrad = ctx.createLinearGradient(0, hy, 0, H);
      roadGrad.addColorStop(0, '#2a3345');
      roadGrad.addColorStop(0.28, '#1b222e');
      roadGrad.addColorStop(1, '#10151e');

      ctx.beginPath();
      ctx.moveTo(topB.leftX, hy);
      ctx.lineTo(topB.rightX, hy);
      ctx.lineTo(botB.rightX, H);
      ctx.lineTo(botB.leftX, H);
      ctx.closePath();
      ctx.fillStyle = roadGrad;
      ctx.fill();

      // Tire wear tracks & subtle wet-asphalt reflection strip per lane
      for (let lane = 0; lane < 4; lane++) {
        const tx = this.laneX(lane, hy);
        const bx = this.laneX(lane, H);
        const tw = topB.laneW * 0.54;
        const bw = botB.laneW * 0.54;

        ctx.fillStyle = 'rgba(7, 10, 16, 0.34)';
        ctx.beginPath();
        ctx.moveTo(tx - tw * 0.5, hy);
        ctx.lineTo(tx + tw * 0.5, hy);
        ctx.lineTo(bx + bw * 0.5, H);
        ctx.lineTo(bx - bw * 0.5, H);
        ctx.closePath();
        ctx.fill();
      }

      // Solid outer edge highway lines (white) + inner shoulder rumble strip
      ctx.strokeStyle = 'rgba(236, 244, 255, 0.78)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(topB.leftX + 4, hy);
      ctx.lineTo(botB.leftX + 6, H);
      ctx.moveTo(topB.rightX - 4, hy);
      ctx.lineTo(botB.rightX - 6, H);
      ctx.stroke();

      // 3D Z-projected Lane Dashes (smaller/tighter near horizon, larger/faster near foreground!)
      const zPeriod = 0.34;
      const zScroll = ((state.roadScroll * 0.0020) % zPeriod + zPeriod) % zPeriod;

      for (let div = 1; div <= 3; div++) {
        const frac = div / 4;
        for (let z = 1.0 + zScroll; z < this.zMax; z += zPeriod) {
          const zEnd = Math.min(this.zMax, z + 0.16);
          const y1 = this.zToScreenY(z);      // lower (closer to camera)
          const y0 = this.zToScreenY(zEnd);   // higher (closer to horizon)
          if (y1 - y0 < 1.5) continue;

          const b0 = this.roadBoundsAtY(y0);
          const b1 = this.roadBoundsAtY(y1);
          const x0 = b0.leftX + b0.roadW * frac;
          const x1 = b1.leftX + b1.roadW * frac;
          const w0 = 3.2 * b0.scale;
          const w1 = 3.8 * b1.scale;

          ctx.fillStyle = div === 2 ? 'rgba(255, 206, 98, 0.85)' : 'rgba(230, 238, 250, 0.74)';
          ctx.beginPath();
          ctx.moveTo(x0 - w0 * 0.5, y0);
          ctx.lineTo(x0 + w0 * 0.5, y0);
          ctx.lineTo(x1 + w1 * 0.5, y1);
          ctx.lineTo(x1 - w1 * 0.5, y1);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 3D Concrete & Steel W-Beam Roadside Barriers (narrow at horizon -> wide at bottom)
      const bTopTopW = 6;
      const bBotTopW = 16;
      const bTopSideW = 5;
      const bBotSideW = 14;

      // Left barrier outer shadow, top bevel, inner wall + reflective rail strip
      ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
      ctx.beginPath();
      ctx.moveTo(topB.leftX - bTopTopW - 8, hy);
      ctx.lineTo(topB.leftX, hy);
      ctx.lineTo(botB.leftX, H);
      ctx.lineTo(botB.leftX - bBotTopW - 14, H);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#5c697d';
      ctx.beginPath();
      ctx.moveTo(topB.leftX - bTopTopW, hy);
      ctx.lineTo(topB.leftX, hy);
      ctx.lineTo(botB.leftX, H);
      ctx.lineTo(botB.leftX - bBotTopW, H);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#313b4a';
      ctx.beginPath();
      ctx.moveTo(topB.leftX, hy);
      ctx.lineTo(topB.leftX + bTopSideW, hy);
      ctx.lineTo(botB.leftX + bBotSideW, H);
      ctx.lineTo(botB.leftX, H);
      ctx.closePath();
      ctx.fill();

      // Right barrier
      ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
      ctx.beginPath();
      ctx.moveTo(topB.rightX, hy);
      ctx.lineTo(topB.rightX + bTopTopW + 8, hy);
      ctx.lineTo(botB.rightX + bBotTopW + 14, H);
      ctx.lineTo(botB.rightX, H);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#5c697d';
      ctx.beginPath();
      ctx.moveTo(topB.rightX, hy);
      ctx.lineTo(topB.rightX + bTopTopW, hy);
      ctx.lineTo(botB.rightX + bBotTopW, H);
      ctx.lineTo(botB.rightX, H);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#313b4a';
      ctx.beginPath();
      ctx.moveTo(topB.rightX - bTopSideW, hy);
      ctx.lineTo(topB.rightX, hy);
      ctx.lineTo(botB.rightX, H);
      ctx.lineTo(botB.rightX - bBotSideW, H);
      ctx.closePath();
      ctx.fill();

      // 3D Z-projected Roadside Trees, Guard Posts, Reflectors & Streetlights
      const lampPeriod = 0.68;
      const lampScroll = ((state.roadScroll * 0.0020) % lampPeriod + lampPeriod) % lampPeriod;
      for (let z = 1.02 + lampScroll; z < this.zMax - 0.15; z += lampPeriod) {
        const y = this.zToScreenY(z);
        const b = this.roadBoundsAtY(y);
        const s = b.scale;
        const scenic = state.scenicEvents || [];
        const bayBlockedLeft = scenic.some((ev) => (ev.side || 1) < 0 && Math.abs(ev.y - y) < 88 * s);
        const bayBlockedRight = scenic.some((ev) => (ev.side || 1) > 0 && Math.abs(ev.y - y) < 88 * s);

        // Roadside silhouetted pines/trees outside barriers (skipped inside turnout pockets)
        [b.leftX - 30 * s, b.rightX + 30 * s].forEach((tx, idx) => {
          if (idx === 0 && bayBlockedLeft) return;
          if (idx === 1 && bayBlockedRight) return;
          if (tx < -30 || tx > W + 30) return;
          ctx.fillStyle = 'rgba(13, 28, 28, 0.92)';
          ctx.beginPath();
          ctx.arc(tx, y - 4 * s, 18 * s, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(22, 52, 46, 0.72)';
          ctx.beginPath();
          ctx.arc(tx - 3 * s, y - 9 * s, 11 * s, 0, Math.PI * 2);
          ctx.fill();
        });

        // Amber streetlamps & warm asphalt pools
        [b.leftX + 16 * s, b.rightX - 16 * s].forEach((lx, idx) => {
          if (idx === 0 && bayBlockedLeft) return;
          if (idx === 1 && bayBlockedRight) return;
          const pool = ctx.createRadialGradient(lx, y, 3 * s, lx, y, 76 * s);
          pool.addColorStop(0, 'rgba(255, 174, 66, 0.22)');
          pool.addColorStop(0.55, 'rgba(255, 145, 36, 0.07)');
          pool.addColorStop(1, 'rgba(255, 145, 36, 0)');
          ctx.fillStyle = pool;
          ctx.beginPath();
          ctx.ellipse(lx, y, 76 * s, 42 * s, 0, 0, Math.PI * 2);
          ctx.fill();

          const baseX = idx === 0 ? b.leftX - 13 * s : b.rightX + 13 * s;
          const armEndX = idx === 0 ? b.leftX + 10 * s : b.rightX - 10 * s;
          ctx.strokeStyle = '#7c8ba1';
          ctx.lineWidth = Math.max(1.2, 2.6 * s);
          ctx.beginPath();
          ctx.moveTo(baseX, y + 4 * s);
          ctx.lineTo(baseX, y - 26 * s);
          ctx.lineTo(armEndX, y - 24 * s);
          ctx.stroke();

          ctx.fillStyle = '#ffe08a';
          ctx.beginPath();
          ctx.ellipse(armEndX, y - 23 * s, 5.5 * s, 2.8 * s, 0, 0, Math.PI * 2);
          ctx.fill();
        });

        // Red/amber barrier reflectors
        ctx.fillStyle = '#ff9f1c';
        ctx.fillRect(b.leftX + 1 * s, y - 2 * s, 3.2 * s, 3.2 * s);
        ctx.fillRect(b.rightX - 4.2 * s, y - 2 * s, 3.2 * s, 3.2 * s);
      }

      // Soft horizon atmospheric haze blending asphalt into skyline
      const hazeGrad = ctx.createLinearGradient(0, hy - 4, 0, hy + 28);
      hazeGrad.addColorStop(0, 'rgba(32, 39, 58, 0.72)');
      hazeGrad.addColorStop(1, 'rgba(32, 39, 58, 0)');
      ctx.fillStyle = hazeGrad;
      ctx.fillRect(0, hy - 4, W, 32);
    }

    _drawGantryShadows(ctx, W, H, hy, state) {
      const zPeriod = 2.1;
      const zScroll = ((state.roadScroll * 0.0022) % zPeriod + zPeriod) % zPeriod;

      for (let z = 1.08 + zScroll; z < this.zMax - 0.25; z += zPeriod) {
        const y = this.zToScreenY(z);
        const b = this.roadBoundsAtY(y);
        const s = b.scale;

        ctx.fillStyle = 'rgba(5, 7, 12, 0.28)';
        ctx.beginPath();
        ctx.moveTo(b.leftX - 4 * s, y + 10 * s);
        ctx.lineTo(b.rightX + 4 * s, y + 10 * s);
        ctx.lineTo(b.rightX + 8 * s, y + 32 * s);
        ctx.lineTo(b.leftX - 8 * s, y + 32 * s);
        ctx.closePath();
        ctx.fill();
      }
    }

    _drawOverheadGantries(ctx, W, H, hy, state) {
      const zPeriod = 2.1;
      const zScroll = ((state.roadScroll * 0.0022) % zPeriod + zPeriod) % zPeriod;

      for (let z = 1.08 + zScroll; z < this.zMax - 0.25; z += zPeriod) {
        const y = this.zToScreenY(z);
        const b = this.roadBoundsAtY(y);
        const s = b.scale;

        // Fade completely to 0 when passing over the player so no shadow/truss ghosts across the car
        const distFromPlayer = Math.abs(y - state.player.y);
        const gantryAlpha = clamp((distFromPlayer - 56) / 56, 0, 1);
        if (gantryAlpha <= 0.02) continue;

        ctx.save();
        ctx.globalAlpha = gantryAlpha;

        // Vertical steel support stanchions + cross-truss
        const beamY = y - 42 * s;
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = Math.max(1.5, 4 * s);
        ctx.beginPath();
        ctx.moveTo(b.leftX - 10 * s, y);
        ctx.lineTo(b.leftX - 10 * s, beamY + 4 * s);
        ctx.moveTo(b.rightX + 10 * s, y);
        ctx.lineTo(b.rightX + 10 * s, beamY + 4 * s);
        ctx.stroke();

        ctx.fillStyle = '#26303f';
        ctx.fillRect(b.leftX - 12 * s, beamY, b.roadW + 24 * s, 9 * s);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(b.leftX - 12 * s, beamY, b.roadW + 24 * s, 9 * s);

        // Highway green/blue signs + speed limit 110 badge
        const signW = 84 * s;
        const signH = 23 * s;
        const signY = beamY - 7 * s;
        const signX1 = b.leftX + b.roadW * 0.25 - signW * 0.5;
        const signX2 = b.leftX + b.roadW * 0.75 - signW * 0.5;

        [
          { x: signX1, bg: '#0b6b3e', txt: 'МКАД  ▲' },
          { x: signX2, bg: '#1158a6', txt: 'ЦЕНТР  ▼' },
        ].forEach((sg) => {
          roundedRectPath(ctx, sg.x, signY, signW, signH, 4 * s);
          ctx.fillStyle = sg.bg;
          ctx.fill();
          ctx.strokeStyle = '#e5edf7';
          ctx.lineWidth = 1.3 * s;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = `800 ${Math.max(7, Math.round(9.5 * s))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(sg.txt, sg.x + signW * 0.5, signY + signH * 0.52);
        });

        // Center speed limit 110 sign
        const limR = 11 * s;
        const cx = b.leftX + b.roadW * 0.5;
        const cy = signY + signH * 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, limR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = Math.max(1.5, 2.8 * s);
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.font = `900 ${Math.max(6, Math.round(8.5 * s))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('110', cx, cy + 0.5);

        ctx.restore();
      }
    }

    _drawSkidMarks(ctx, state) {
      if (!state.skidMarks || state.skidMarks.length === 0) return;
      ctx.save();
      for (const sk of state.skidMarks) {
        ctx.strokeStyle = `rgba(10, 12, 16, ${sk.alpha * 0.65})`;
        ctx.lineWidth = 4 * sk.scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sk.x1, sk.y1);
        ctx.lineTo(sk.x2, sk.y2);
        ctx.stroke();
      }
      ctx.restore();
    }

    _drawPickups(ctx, state) {
      const hy = this.horizonY();
      for (const p of state.pickups) {
        if (p.y < hy - 10) continue;
        const b = this.roadBoundsAtY(p.y);
        const s = b.scale;
        const x = this.laneX(p.lane, p.y);
        const bob = Math.sin(state.time * 5 + p.phase) * 3.5 * s;
        const py = p.y + bob;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(x, p.y + 15 * s, 14 * s, 6 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        if (p.type === 'coin') {
          const spin = Math.cos(state.time * 5.2 + p.phase);
          const rx = Math.max(3, Math.abs(spin) * 14 * s);
          const ry = 14 * s;

          const glow = ctx.createRadialGradient(x, py, 2, x, py, 24 * s);
          glow.addColorStop(0, 'rgba(255, 208, 67, 0.38)');
          glow.addColorStop(1, 'rgba(255, 208, 67, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, py, 24 * s, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#d98c00';
          ctx.beginPath();
          ctx.ellipse(x + 2 * s, py, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();

          const coinGrad = ctx.createLinearGradient(x - rx, py - ry, x + rx, py + ry);
          coinGrad.addColorStop(0, '#fff099');
          coinGrad.addColorStop(0.5, '#ffd043');
          coinGrad.addColorStop(1, '#e69500');
          ctx.fillStyle = coinGrad;
          ctx.beginPath();
          ctx.ellipse(x, py, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#fff5bd';
          ctx.lineWidth = 1.4 * s;
          ctx.stroke();

          if (rx > 7 * s) {
            ctx.fillStyle = '#8f5500';
            ctx.font = `900 ${Math.round(13 * s)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('₽', x, py + 1);
          }
        } else if (p.type === 'fuel') {
          const pulse = 0.75 + 0.25 * Math.sin(state.time * 7);
          const glow = ctx.createRadialGradient(x, py, 4, x, py, 32 * s);
          glow.addColorStop(0, `rgba(255, 110, 40, ${0.52 * pulse})`);
          glow.addColorStop(1, 'rgba(255, 60, 30, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, py, 32 * s, 0, Math.PI * 2);
          ctx.fill();

          const cw = 26 * s;
          const ch = 30 * s;
          const cx = x - cw * 0.5;
          const cy = py - ch * 0.5;

          ctx.fillStyle = '#ffbe3d';
          ctx.beginPath();
          ctx.moveTo(cx + cw * 0.72, cy + 2 * s);
          ctx.lineTo(cx + cw + 5 * s, cy - 6 * s);
          ctx.lineTo(cx + cw + 7 * s, cy - 2 * s);
          ctx.lineTo(cx + cw * 0.85, cy + 6 * s);
          ctx.closePath();
          ctx.fill();

          roundedRectPath(ctx, cx, cy, cw, ch, 5 * s);
          const canGrad = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
          canGrad.addColorStop(0, '#ff4d4d');
          canGrad.addColorStop(1, '#b81424');
          ctx.fillStyle = canGrad;
          ctx.fill();
          ctx.strokeStyle = '#ffbf69';
          ctx.lineWidth = 2 * s;
          ctx.stroke();

          roundedRectPath(ctx, cx + 4 * s, cy + 3 * s, cw * 0.45, 4 * s, 2 * s);
          ctx.fillStyle = '#181e28';
          ctx.fill();

          ctx.fillStyle = '#ffe599';
          ctx.font = `900 ${Math.max(8, Math.round(9.5 * s))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('98', x, py + 4 * s);
        } else if (p.type === 'drink') {
          const pulse = 0.75 + 0.25 * Math.sin(state.time * 7.5);
          const glow = ctx.createRadialGradient(x, py, 3, x, py, 30 * s);
          glow.addColorStop(0, `rgba(0, 229, 255, ${0.52 * pulse})`);
          glow.addColorStop(1, 'rgba(57, 255, 156, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, py, 30 * s, 0, Math.PI * 2);
          ctx.fill();

          const cw = 18 * s;
          const ch = 30 * s;
          const cx = x - cw * 0.5;
          const cy = py - ch * 0.5;

          roundedRectPath(ctx, cx, cy, cw, ch, 4 * s);
          const dGrad = ctx.createLinearGradient(cx, cy, cx + cw, cy);
          dGrad.addColorStop(0, '#092638');
          dGrad.addColorStop(0.5, '#00d4ff');
          dGrad.addColorStop(1, '#10a37f');
          ctx.fillStyle = dGrad;
          ctx.fill();
          ctx.strokeStyle = '#99f6ff';
          ctx.lineWidth = 1.6 * s;
          ctx.stroke();

          ctx.fillStyle = '#dce6f2';
          ctx.fillRect(cx + 2 * s, cy + 1 * s, cw - 4 * s, 3 * s);

          ctx.fillStyle = '#d9ff3f';
          ctx.font = `900 ${Math.round(12 * s)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡', x, py + 2 * s);
        } else {
          const pulse = 0.75 + 0.25 * Math.sin(state.time * 7);
          const glow = ctx.createRadialGradient(x, py, 3, x, py, 30 * s);
          glow.addColorStop(0, `rgba(255, 196, 0, ${0.48 * pulse})`);
          glow.addColorStop(1, 'rgba(255, 159, 28, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, py, 30 * s, 0, Math.PI * 2);
          ctx.fill();

          ctx.save();
          ctx.translate(x, py);
          ctx.rotate(-0.26);
          const bw = 30 * s;
          const bh = 16 * s;
          roundedRectPath(ctx, -bw * 0.5, -bh * 0.5, bw, bh, 3 * s);
          const bGrad = ctx.createLinearGradient(-bw * 0.5, 0, bw * 0.5, 0);
          bGrad.addColorStop(0, '#ff9f1c');
          bGrad.addColorStop(0.5, '#ffd043');
          bGrad.addColorStop(1, '#d9534f');
          ctx.fillStyle = bGrad;
          ctx.fill();
          ctx.strokeStyle = '#fff1b8';
          ctx.lineWidth = 1.6 * s;
          ctx.stroke();

          ctx.fillStyle = '#151a22';
          ctx.font = `900 ${Math.max(7, Math.round(7.5 * s))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('PRO', 0, 0.5);
          ctx.restore();
        }
      }
    }

    // ==================== 5 DETAILED 2.5D TRAFFIC ARCHETYPES ====================
    _drawTrafficCar(ctx, car, state) {
      const b = this.roadBoundsAtY(car.y);
      const s = b.scale;
      const x = this.laneX(car.lanePos, car.y);
      const y = car.y;

      const baseW = car.kind === 'van' ? 84 : car.kind === 'suv' ? 82 : car.kind === 'sport' ? 78 : 74;
      const baseH = car.kind === 'van' ? 116 : car.kind === 'suv' ? 108 : 98;
      const w = baseW * s;
      const h = baseH * s;
      const tilt = car.tilt || 0;
      const steerAngle = tilt * 0.34;
      // 1-point vanishing perspective shift (left lanes reveal right flank, right lanes reveal left flank)
      const perspShift = clamp((car.lanePos - 1.5) * 4.2, -7.5, 7.5) * s + tilt * 8.5 * s;

      // Forward downward headlight projection onto asphalt ahead of traffic car
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const fConeLen = (car.kind === 'suv' || car.kind === 'sport' ? 86 : 70) * s;
      const beamAlpha = car.kind === 'sport' ? 0.22 : 0.16;
      [-w * 0.34, w * 0.34].forEach((hx) => {
        const fg = ctx.createLinearGradient(x + hx, y + h * 0.44, x + hx, y + h * 0.44 + fConeLen);
        fg.addColorStop(0, `rgba(255, 244, 212, ${beamAlpha})`);
        fg.addColorStop(1, 'rgba(255, 244, 212, 0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(x + hx - 4.5 * s, y + h * 0.44);
        ctx.lineTo(x + hx + 4.5 * s, y + h * 0.44);
        ctx.lineTo(x + hx + 20 * s, y + h * 0.44 + fConeLen);
        ctx.lineTo(x + hx - 20 * s, y + h * 0.44 + fConeLen);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt * 0.14);

      // Ground cast shadow shifted with perspective
      ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
      trapezoidPath(ctx, perspShift * 0.45, -h * 0.44, w * 0.96, perspShift * 0.55, h * 0.51, w * 1.12, 11 * s);
      ctx.fill();

      // Rear + Steered Front Wheels with Metallic Rim Lips
      const wheelW = 9.5 * s;
      const wheelH = 19 * s;
      ctx.fillStyle = '#0c0f14';
      roundedRectPath(ctx, -w * 0.50, -h * 0.35, wheelW, wheelH, 3 * s);
      ctx.fill();
      roundedRectPath(ctx, w * 0.50 - wheelW, -h * 0.35, wheelW, wheelH, 3 * s);
      ctx.fill();

      [-w * 0.46, w * 0.46].forEach((wx) => {
        ctx.save();
        ctx.translate(wx, h * 0.24);
        ctx.rotate(steerAngle);
        ctx.fillStyle = '#0b0e13';
        roundedRectPath(ctx, -wheelW * 0.5, -wheelH * 0.5, wheelW, wheelH, 3 * s);
        ctx.fill();
        ctx.fillStyle = car.kind === 'sport' ? '#cbd5e1' : '#64748b';
        ctx.fillRect(wx < 0 ? -wheelW * 0.5 : wheelW * 0.22, -wheelH * 0.28, 2.4 * s, wheelH * 0.56);
        ctx.restore();
      });

      // Side Flank Reveal (visible 3/4 profile with side glass & beltline trim on off-center lanes or steering)
      if (Math.abs(perspShift) > 0.7) {
        const sideW = clamp(Math.abs(perspShift) * 1.15, 2 * s, 12.5 * s);
        const onLeft = perspShift > 0;
        const sx = onLeft ? -w * 0.49 - sideW * 0.22 : w * 0.49 - sideW * 0.78;
        ctx.fillStyle = car.colorDark;
        roundedRectPath(ctx, sx, -h * 0.35, sideW, h * 0.66, 3.5 * s);
        ctx.fill();

        // Dark side greenhouse window strip + B-pillar
        ctx.fillStyle = '#0f172a';
        roundedRectPath(ctx, sx + 1.4 * s, -h * 0.28, Math.max(2, sideW - 2.8 * s), h * 0.36, 2 * s);
        ctx.fill();
        ctx.fillStyle = car.colorDark;
        ctx.fillRect(sx + 1 * s, -h * 0.12, Math.max(1.5, sideW - 2 * s), 2.5 * s);

        // Taxi side checker sash or DPS side blue stripe
        if (car.kind === 'taxi') {
          ctx.fillStyle = '#111827';
          ctx.fillRect(sx + 1 * s, h * 0.12, Math.max(1.5, sideW - 2 * s), 5 * s);
        } else if (car.kind === 'dps') {
          ctx.fillStyle = '#1d4ed8';
          ctx.fillRect(sx + 0.5 * s, h * 0.10, Math.max(2, sideW - 1 * s), 12 * s);
        }
      }

      // Lower Front Bumper Skirt (+Y closest to camera)
      trapezoidPath(ctx, 0, h * 0.33, w * 0.98, 0, h * 0.50, w * 0.94, 7 * s);
      ctx.fillStyle = car.kind === 'sport' ? '#090d14' : '#151b24';
      ctx.fill();
      if (car.kind === 'sport') {
        // Carbon front splitter lip
        ctx.fillStyle = '#334155';
        ctx.fillRect(-w * 0.45, h * 0.485, w * 0.90, 2.5 * s);
      }

      // Main 2.5D Trapezoidal Chassis (rear narrow at -Y, wide nose at +Y)
      trapezoidPath(ctx, 0, -h * 0.45, w * 0.84, 0, h * 0.42, w * 1.0, 10 * s);
      const bodyGrad = ctx.createLinearGradient(-w * 0.5, -h * 0.45, w * 0.5, h * 0.42);
      bodyGrad.addColorStop(0, car.colorLight);
      bodyGrad.addColorStop(0.5, car.color);
      bodyGrad.addColorStop(1, car.colorDark);
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1.2 * s;
      ctx.stroke();

      // DPS Blue Hood Stripe / Taxi Checkers on Hood Skirt
      if (car.kind === 'dps') {
        ctx.fillStyle = '#1d4ed8';
        ctx.beginPath();
        ctx.moveTo(-w * 0.34, h * 0.16);
        ctx.lineTo(w * 0.34, h * 0.16);
        ctx.lineTo(w * 0.22, h * 0.31);
        ctx.lineTo(-w * 0.22, h * 0.31);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-w * 0.12, h * 0.21, w * 0.24, 2.2 * s);
      } else if (car.kind === 'taxi') {
        for (let ci = 0; ci < 6; ci++) {
          ctx.fillStyle = ci % 2 === 0 ? '#111827' : '#fef08a';
          ctx.fillRect(-w * 0.30 + ci * (w * 0.10), h * 0.20, w * 0.10, 4 * s);
        }
      }

      // Elevated Tapered Roof AT REAR-TOP (-Y), leaving huge Panoramic Windshield + Hood!
      const roofW = car.kind === 'van' ? w * 0.78 : w * 0.70;
      const roofTopY = -h * 0.46;
      const roofBotY = car.kind === 'van' ? -h * 0.08 : -h * 0.21;
      trapezoidPath(ctx, perspShift, roofTopY, roofW * 0.92, perspShift * 0.88, roofBotY, roofW, 7 * s);
      ctx.fillStyle = car.colorLight;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1 * s;
      ctx.stroke();

      // Roof Hardware (Sunroof, SUV Rails, Van Ribs, Taxi Sign, DPS Strobe Bar, Sport Wing)
      if (car.kind === 'sport') {
        // Dark panoramic sunroof + high rear wing
        roundedRectPath(ctx, perspShift * 0.92 - roofW * 0.30, roofTopY + 5 * s, roofW * 0.60, roofBotY - roofTopY - 9 * s, 3 * s);
        ctx.fillStyle = '#090e17';
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        roundedRectPath(ctx, perspShift * 0.95 - w * 0.38, -h * 0.46, w * 0.76, 5.5 * s, 2 * s);
        ctx.fill();
      } else if (car.kind === 'suv') {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(perspShift * 0.92 - roofW * 0.40, roofTopY + 3 * s, 3 * s, roofBotY - roofTopY - 5 * s);
        ctx.fillRect(perspShift * 0.92 + roofW * 0.40 - 3 * s, roofTopY + 3 * s, 3 * s, roofBotY - roofTopY - 5 * s);
      } else if (car.kind === 'van') {
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
        ctx.lineWidth = 1.3 * s;
        for (let vy = roofTopY + 7 * s; vy < roofBotY - 5 * s; vy += 8 * s) {
          ctx.beginPath();
          ctx.moveTo(perspShift * 0.92 - roofW * 0.38, vy);
          ctx.lineTo(perspShift * 0.92 + roofW * 0.38, vy);
          ctx.stroke();
        }
        // 3 Amber roof clearance marker LEDs on Sprinter cab
        ctx.fillStyle = '#f59e0b';
        [-8 * s, 0, 8 * s].forEach((mx) => {
          ctx.fillRect(perspShift * 0.88 + mx - 1.5 * s, roofBotY - 2.5 * s, 3 * s, 2 * s);
        });
      }

      // A-Pillars & Panoramic Sloped Front Windshield (facing camera, showing NPC driver inside!)
      const wsTopY = roofBotY;
      const wsBotY = car.kind === 'van' ? h * 0.14 : h * 0.12;
      const wsTopW = roofW * 0.96;
      const wsBotW = w * 0.86;

      trapezoidPath(ctx, perspShift * 0.88, wsTopY - 1 * s, wsTopW + 5 * s, perspShift * 0.45, wsBotY + 2 * s, wsBotW + 5 * s, 4 * s);
      ctx.fillStyle = car.colorDark;
      ctx.fill();

      ctx.save();
      trapezoidPath(ctx, perspShift * 0.88, wsTopY, wsTopW, perspShift * 0.45, wsBotY, wsBotW, 3.5 * s);
      const wsGrad = ctx.createLinearGradient(0, wsTopY, 0, wsBotY);
      wsGrad.addColorStop(0, '#0c1524');
      wsGrad.addColorStop(1, '#1e3048');
      ctx.fillStyle = wsGrad;
      ctx.fill();
      ctx.clip();

      // Drawn NPC Driver Silhouette + Steering Wheel inside cabin!
      const npcX = perspShift * 0.56 + w * 0.14;
      const npcY = wsTopY + 13 * s;
      // Headrest + dark torso
      ctx.fillStyle = '#090d14';
      roundedRectPath(ctx, npcX - 9 * s, npcY + 2 * s, 18 * s, 16 * s, 5 * s);
      ctx.fill();
      ctx.fillStyle = car.kind === 'dps' ? '#1e3a8a' : car.kind === 'taxi' ? '#334155' : '#1f2937';
      roundedRectPath(ctx, npcX - 10 * s, npcY + 4 * s, 20 * s, 14 * s, 5 * s);
      ctx.fill();
      // Face / head + cap on DPS
      ctx.fillStyle = '#c28d6a';
      ctx.beginPath();
      ctx.arc(npcX, npcY - 1 * s, 6.2 * s, 0, Math.PI * 2);
      ctx.fill();
      if (car.kind === 'dps') {
        ctx.fillStyle = '#172554';
        roundedRectPath(ctx, npcX - 7 * s, npcY - 8 * s, 14 * s, 5 * s, 2 * s);
        ctx.fill();
      }
      // Steering wheel arc
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.2 * s;
      ctx.beginPath();
      ctx.arc(npcX, wsBotY - 3 * s, 6.5 * s, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      // High-beam warning reflection inside windshield when player flashes!
      if (state.beamTimer > 0 && car.lane === state.player.lane && car.y > state.player.y) {
        ctx.fillStyle = `rgba(180, 238, 255, ${clamp(state.beamTimer * 1.45, 0, 0.72)})`;
        ctx.fillRect(-w, wsTopY, w * 2, wsBotY - wsTopY + 5 * s);
      }

      // Windshield specular sky glare streak
      ctx.fillStyle = 'rgba(224, 242, 254, 0.16)';
      ctx.beginPath();
      ctx.moveTo(perspShift * 0.8 - wsTopW * 0.25, wsTopY);
      ctx.lineTo(perspShift * 0.8 - wsTopW * 0.08, wsTopY);
      ctx.lineTo(perspShift * 0.45 - wsBotW * 0.22, wsBotY);
      ctx.lineTo(perspShift * 0.45 - wsBotW * 0.36, wsBotY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Side Mirrors
      ctx.fillStyle = car.colorDark;
      roundedRectPath(ctx, -w * 0.51 + perspShift * 0.5, -h * 0.04, 7.5 * s, 5.5 * s, 2 * s);
      ctx.fill();
      roundedRectPath(ctx, w * 0.51 - 7.5 * s + perspShift * 0.5, -h * 0.04, 7.5 * s, 5.5 * s, 2 * s);
      ctx.fill();

      // Sculpted Hood Creases (+Y from wsBotY to bumper)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.1 * s;
      ctx.beginPath();
      ctx.moveTo(-w * 0.28, wsBotY + 3 * s);
      ctx.lineTo(-w * 0.22, h * 0.27);
      ctx.moveTo(w * 0.28, wsBotY + 3 * s);
      ctx.lineTo(w * 0.22, h * 0.27);
      ctx.stroke();

      // Model-Specific Front Grille & Headlights at +Y
      const grilleW = car.kind === 'suv' || car.kind === 'van' ? w * 0.42 : w * 0.36;
      const grilleH = car.kind === 'suv' ? 11 * s : 8 * s;
      const grilleY = car.kind === 'van' ? h * 0.27 : h * 0.29;
      roundedRectPath(ctx, -grilleW * 0.5, grilleY, grilleW, grilleH, 2.5 * s);
      ctx.fillStyle = '#090d14';
      ctx.fill();
      if (car.kind === 'suv' || car.kind === 'sedan') {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-grilleW * 0.42, grilleY + 2.5 * s, grilleW * 0.84, 1.8 * s);
        if (car.kind === 'suv') {
          ctx.fillRect(-grilleW * 0.42, grilleY + 6.5 * s, grilleW * 0.84, 1.8 * s);
        }
      }

      // Multi-element Front Headlights + Corner Amber Indicators
      const hlW = 16 * s;
      const hlH = car.kind === 'suv' ? 9.5 * s : 8 * s;
      [-w * 0.43, w * 0.43 - hlW].forEach((hx, idx) => {
        roundedRectPath(ctx, hx, h * 0.27, hlW, hlH, 3 * s);
        ctx.fillStyle = car.kind === 'sport' || car.kind === 'suv' ? '#e0f2fe' : '#fff4cc';
        ctx.fill();
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
        ctx.lineWidth = 1 * s;
        ctx.stroke();
        // LED DRL / Projector detail
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hx + 2 * s, h * 0.27 + hlH - 2.6 * s, hlW - 4 * s, 1.5 * s);
        // Amber corner bulb
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(idx === 0 ? hx + 1.5 * s : hx + hlW - 4.5 * s, h * 0.27 + 2 * s, 3 * s, 4 * s);
      });

      // Lower front air intake + license plate
      roundedRectPath(ctx, -w * 0.28, h * 0.405, w * 0.56, 5 * s, 2 * s);
      ctx.fillStyle = '#090c10';
      ctx.fill();
      roundedRectPath(ctx, -14 * s, h * 0.39, 28 * s, 6.5 * s, 1.5 * s);
      ctx.fillStyle = '#f1f5f9';
      ctx.fill();

      // TAXI Roof Lightbox or DPS Police Flashing Lightbar
      if (car.kind === 'taxi') {
        const signY = roofTopY + (roofBotY - roofTopY) * 0.46;
        const glow = ctx.createRadialGradient(perspShift * 0.9, signY, 2 * s, perspShift * 0.9, signY, 24 * s);
        glow.addColorStop(0, 'rgba(255, 214, 64, 0.36)');
        glow.addColorStop(1, 'rgba(255, 214, 64, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(perspShift * 0.9, signY, 24 * s, 0, Math.PI * 2);
        ctx.fill();

        roundedRectPath(ctx, -11 * s + perspShift * 0.9, signY - 5 * s, 22 * s, 10 * s, 3 * s);
        ctx.fillStyle = '#ffd043';
        ctx.fill();
        ctx.fillStyle = '#111827';
        ctx.font = `900 ${Math.round(6 * s)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TAXI', perspShift * 0.9, signY);
      } else if (car.kind === 'dps') {
        const barY = roofTopY + 5 * s;
        roundedRectPath(ctx, -16 * s + perspShift * 0.92, barY, 32 * s, 7 * s, 2.5 * s);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        const flashPhase = Math.floor(state.time * 10) % 2 === 0;
        ctx.fillStyle = flashPhase ? '#ff2b4a' : '#7f1d1d';
        ctx.fillRect(-15 * s + perspShift * 0.92, barY + 1 * s, 14 * s, 5 * s);
        ctx.fillStyle = flashPhase ? '#1d4ed8' : '#38bdf8';
        ctx.fillRect(1 * s + perspShift * 0.92, barY + 1 * s, 14 * s, 5 * s);

        const lg = ctx.createRadialGradient(perspShift * 0.92, barY + 3 * s, 2 * s, perspShift * 0.92, barY + 3 * s, 30 * s);
        lg.addColorStop(0, flashPhase ? 'rgba(255, 43, 74, 0.38)' : 'rgba(56, 189, 248, 0.38)');
        lg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(perspShift * 0.92, barY + 3 * s, 30 * s, 0, Math.PI * 2);
        ctx.fill();
      }

      // Upper-edge Rear Brake / Tail Light Halo (gameplay braking indicator from player's approach view)
      const tailY = -h * 0.475;
      const tailW = 13 * s;
      const tailH = 4.5 * s;
      const brakeGlow = car.braking ? 0.96 : 0.48;

      [-w * 0.39, w * 0.39 - tailW].forEach((tx) => {
        const tg = ctx.createRadialGradient(tx + tailW * 0.5, tailY + 2 * s, 1, tx + tailW * 0.5, tailY + 2 * s, (car.braking ? 20 : 12) * s);
        tg.addColorStop(0, `rgba(255, 40, 72, ${brakeGlow})`);
        tg.addColorStop(1, 'rgba(255, 40, 72, 0)');
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.arc(tx + tailW * 0.5, tailY + 2 * s, (car.braking ? 20 : 12) * s, 0, Math.PI * 2);
        ctx.fill();

        roundedRectPath(ctx, tx, tailY, tailW, tailH, 2 * s);
        ctx.fillStyle = car.braking ? '#ff5972' : '#dc2626';
        ctx.fill();
      });

      if (car.braking) {
        ctx.fillStyle = '#ff4764';
        ctx.fillRect(-10 * s + perspShift, roofTopY + 1 * s, 20 * s, 2.5 * s);
      }

      // Mirrored Amber Turn Signals (Rear edge + Front bumper corner + Side mirror)
      const blinkOn = Math.floor(state.time * 8) % 2 === 0;
      if (car.turnSignal !== 0 && blinkOn) {
        const isLeft = car.turnSignal < 0;
        const bx = isLeft ? -w * 0.43 : w * 0.34;
        const ag = ctx.createRadialGradient(bx + 4 * s, tailY + 2 * s, 1, bx + 4 * s, tailY + 2 * s, 18 * s);
        ag.addColorStop(0, 'rgba(255, 175, 25, 0.95)');
        ag.addColorStop(1, 'rgba(255, 160, 0, 0)');
        ctx.fillStyle = ag;
        ctx.beginPath();
        ctx.arc(bx + 4 * s, tailY + 2 * s, 18 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffbe33';
        ctx.fillRect(bx, tailY, 8 * s, 4.5 * s);

        // Front corner amber pulse & side mirror repeater
        const fbx = isLeft ? -w * 0.44 : w * 0.44 - 7 * s;
        ctx.beginPath();
        ctx.arc(fbx + 3.5 * s, h * 0.28 + 4 * s, 10 * s, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 190, 51, 0.55)';
        ctx.fill();
        ctx.fillStyle = '#ffd043';
        ctx.fillRect(fbx, h * 0.28 + 2 * s, 7 * s, 5 * s);

        const mx = isLeft ? -w * 0.51 + perspShift * 0.5 : w * 0.51 - 7.5 * s + perspShift * 0.5;
        ctx.fillStyle = '#ffd043';
        ctx.fillRect(mx + 1 * s, -h * 0.04 + 1 * s, 5.5 * s, 3.5 * s);
      }

      ctx.restore();
    }

    // ==================== PLAYER HERO VEHICLES & DRAWN CHARACTERS ====================
    _drawPlayer(ctx, state) {
      const p = state.player;
      const baseScale = this.heroScale(p.y);
      const suspScale = state.isGassing ? 1.018 : state.isBraking ? 0.982 : 1.0;
      const s = baseScale * suspScale;
      const x = this.laneX(p.lanePos, p.y);
      const suspOffset = state.isGassing ? 2.4 * baseScale : state.isBraking ? -2.6 * baseScale : 0;
      const y = p.y + suspOffset;
      const tilt = clamp(p.tilt, -1, 1);

      if (p.charId === 'waldemaree') {
        this._drawBikeWaldemaree(ctx, x, y, s, tilt, state);
      } else if (p.charId === 'drs4hop') {
        this._drawCarGetz(ctx, x, y, s, tilt, state);
      } else if (p.charId === 'zabl') {
        this._drawCarE39(ctx, x, y, s, tilt, state);
      } else {
        this._drawCarLC200(ctx, x, y, s, tilt, state);
      }

      // Invulnerability protective shield aura (post-revive grace window)
      if (state.invulnTimer > 0) {
        const flicker = state.invulnTimer < 0.85 ? (Math.floor(state.time * 16) % 2 === 0 ? 0.85 : 0.25) : 0.85;
        const pulse = 1 + 0.04 * Math.sin(state.time * 12);
        const rx = (p.charId === 'waldemaree' ? 38 : 66) * s * pulse;
        const ry = (p.charId === 'waldemaree' ? 68 : 88) * s * pulse;
        ctx.save();
        ctx.translate(x, y);
        const sg = ctx.createRadialGradient(0, 0, rx * 0.45, 0, 0, ry * 1.05);
        sg.addColorStop(0, 'rgba(0, 212, 255, 0)');
        sg.addColorStop(0.75, `rgba(0, 212, 255, ${(0.18 * flicker).toFixed(2)})`);
        sg.addColorStop(1, `rgba(56, 249, 215, ${(0.48 * flicker).toFixed(2)})`);
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(125, 249, 255, ${(0.92 * flicker).toFixed(2)})`;
        ctx.lineWidth = 2.4 * s;
        ctx.setLineDash([10 * s, 7 * s]);
        ctx.lineDashOffset = -state.time * 48;
        ctx.stroke();
        ctx.restore();
      }
    }

    _drawHeadlightCones(ctx, x, y, w, h, s, state, options) {
      const opts = options || {};
      const beamBoost = state.beamTimer > 0 ? 1.85 : 1.0;
      const coneLen = (opts.length || 205) * s * (state.beamTimer > 0 ? 1.35 : 1.0);
      const spread = (opts.spread || 46) * s * (state.beamTimer > 0 ? 1.25 : 1.0);
      const leftAlpha = (opts.leftAlpha !== undefined ? opts.leftAlpha : 0.36) * (state.beamTimer > 0 ? 1.45 : 1);
      const rightAlpha = (opts.rightAlpha !== undefined ? opts.rightAlpha : 0.36) * (state.beamTimer > 0 ? 1.45 : 1);
      const color = opts.color || '215, 240, 255';
      const rightColor = opts.rightColor || color;

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      const lx = x - w * 0.34;
      const rx = x + w * 0.34;
      const ly = y + h * 0.42;

      [
        { hx: lx, alpha: clamp(leftAlpha, 0, 0.72), col: color },
        { hx: rx, alpha: clamp(rightAlpha, 0, 0.72), col: rightColor },
      ].forEach((beam) => {
        if (beam.alpha <= 0.02) return;
        const grad = ctx.createLinearGradient(beam.hx, ly, beam.hx, ly + coneLen);
        grad.addColorStop(0, `rgba(${beam.col}, ${beam.alpha})`);
        grad.addColorStop(0.55, `rgba(${beam.col}, ${beam.alpha * 0.35 * beamBoost * 0.7})`);
        grad.addColorStop(1, `rgba(${beam.col}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(beam.hx - 7 * s, ly);
        ctx.lineTo(beam.hx + 7 * s, ly);
        ctx.lineTo(beam.hx + spread, ly + coneLen);
        ctx.lineTo(beam.hx - spread, ly + coneLen);
        ctx.closePath();
        ctx.fill();
      });

      ctx.restore();
    }

    _drawWindshieldReflection(ctx, roofCx, topY, roofW, botCx, botY, botW, s, time) {
      const sweep = ((time * 1.15) % 2.4) - 0.7;
      const sx = botCx - botW * 0.5 + botW * sweep;
      ctx.save();
      trapezoidPath(ctx, roofCx, topY, roofW, botCx, botY, botW, 5 * s);
      ctx.clip();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.beginPath();
      ctx.moveTo(sx, topY);
      ctx.lineTo(sx + 13 * s, topY);
      ctx.lineTo(sx - 7 * s, botY);
      ctx.lineTo(sx - 20 * s, botY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(sx + 19 * s, topY);
      ctx.lineTo(sx + 25 * s, topY);
      ctx.lineTo(sx + 5 * s, botY);
      ctx.lineTo(sx - 1 * s, botY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    _draw25DCarChassis(ctx, w, h, s, tilt, colors, options) {
      const opts = options || {};
      const st = this._currentRenderState || {};
      const roofShift = tilt * 10 * s;
      const steerAngle = tilt * 0.38;

      // Cast Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.60)';
      trapezoidPath(ctx, tilt * 5 * s, -h * 0.44, w * 0.96, tilt * 6 * s, h * 0.51, w * 1.12, 12 * s);
      ctx.fill();

      // Rear Wheels + Turning Front Wheels (+ Hot Glowing Brake Discs)
      const wheelW = 10 * s;
      const wheelH = 21 * s;
      ctx.fillStyle = '#0c0f14';
      roundedRectPath(ctx, -w * 0.51, -h * 0.35, wheelW, wheelH, 3 * s);
      ctx.fill();
      roundedRectPath(ctx, w * 0.51 - wheelW, -h * 0.35, wheelW, wheelH, 3 * s);
      ctx.fill();

      const heatLevel = clamp(st.brakeHeat || 0, 0, 1);
      const showHotBrakes = heatLevel > 0.1 || st.isBraking || st.brakeOverheated;

      [-w * 0.47, w * 0.47].forEach((wx) => {
        ctx.save();
        ctx.translate(wx, h * 0.24);
        ctx.rotate(steerAngle);
        ctx.fillStyle = '#0b0e13';
        roundedRectPath(ctx, -wheelW * 0.5, -wheelH * 0.5, wheelW, wheelH, 3 * s);
        ctx.fill();
        ctx.fillStyle = '#64748b';
        ctx.fillRect(wx < 0 ? -wheelW * 0.5 : wheelW * 0.22, -wheelH * 0.28, 2.5 * s, wheelH * 0.56);

        if (showHotBrakes) {
          const glowStr = st.brakeOverheated
            ? 0.65 + 0.32 * Math.sin((st.time || 0) * 24)
            : clamp(0.28 + heatLevel * 0.68, 0.25, 0.95);
          const rotorX = wx < 0 ? -wheelW * 0.35 : wheelW * 0.35;
          const rg = ctx.createRadialGradient(rotorX, 0, 1, rotorX, 0, 14 * s);
          rg.addColorStop(0, `rgba(255, 195, 90, ${glowStr.toFixed(2)})`);
          rg.addColorStop(0.45, `rgba(255, 68, 28, ${(glowStr * 0.78).toFixed(2)})`);
          rg.addColorStop(1, 'rgba(255, 40, 20, 0)');
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(rotorX, 0, 14 * s, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Exhaust Backfire Flames at Rear Bumper Edge (E39 / LC200)
      if (opts.exhaust && ((st.isGassing && (st.speedKmh || 0) > 135) || (st.backfireTimer || 0) > 0)) {
        const flicker = 0.72 + 0.28 * Math.sin((st.time || 0) * 65);
        const isPop = (st.backfireTimer || 0) > 0;
        const tips = opts.exhaust === 'dual' ? [-w * 0.27, w * 0.27] : [-w * 0.27];
        tips.forEach((ex) => {
          const flameLen = (isPop ? 20 : 12) * s * flicker;
          const eg = ctx.createRadialGradient(ex, -h * 0.47, 1, ex, -h * 0.47 - flameLen * 0.4, flameLen);
          eg.addColorStop(0, '#e0f2fe');
          eg.addColorStop(0.35, 'rgba(56, 189, 248, 0.92)');
          eg.addColorStop(0.7, 'rgba(255, 136, 28, 0.78)');
          eg.addColorStop(1, 'rgba(255, 60, 0, 0)');
          ctx.fillStyle = eg;
          ctx.beginPath();
          ctx.moveTo(ex - 4.5 * s, -h * 0.45);
          ctx.lineTo(ex + 4.5 * s, -h * 0.45);
          ctx.lineTo(ex, -h * 0.47 - flameLen);
          ctx.closePath();
          ctx.fill();
        });
      }

      // Lower front bumper skirt (+Y)
      trapezoidPath(ctx, 0, h * 0.33, w * 0.98, 0, h * 0.50, w * 0.94, 7 * s);
      ctx.fillStyle = colors.skirt || colors.dark;
      ctx.fill();

      // Main 2.5D Trapezoidal Body
      trapezoidPath(ctx, 0, -h * 0.45, w * 0.84, 0, h * 0.41, w * 1.0, 11 * s);
      const bodyGrad = ctx.createLinearGradient(-w * 0.5, -h * 0.45, w * 0.5, h * 0.45);
      bodyGrad.addColorStop(0, colors.light);
      bodyGrad.addColorStop(0.5, colors.mid);
      bodyGrad.addColorStop(1, colors.dark);
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.strokeStyle = colors.border || 'rgba(255, 255, 255, 0.24)';
      ctx.lineWidth = 1.4 * s;
      ctx.stroke();

      // Side door / window reveal when turning
      if (Math.abs(roofShift) > 1.0) {
        const sideW = Math.min(12 * s, Math.abs(roofShift));
        const sx = roofShift > 0 ? -w * 0.49 - sideW * 0.25 : w * 0.49 - sideW * 0.75;
        ctx.fillStyle = colors.side || colors.dark;
        roundedRectPath(ctx, sx, -h * 0.34, sideW, h * 0.62, 4 * s);
        ctx.fill();
        ctx.fillStyle = '#101824';
        roundedRectPath(ctx, sx + 1.5 * s, -h * 0.22, Math.max(2, sideW - 3 * s), h * 0.28, 2 * s);
        ctx.fill();
      }

      // Elevated Tapered Roof
      const roofW = w * 0.70;
      const roofTopY = -h * 0.47;
      const roofBotY = -h * 0.23;
      trapezoidPath(ctx, roofShift, roofTopY, roofW * 0.92, roofShift * 0.9, roofBotY, roofW, 8 * s);
      ctx.fillStyle = colors.roof || colors.light;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.24)';
      ctx.lineWidth = 1.1 * s;
      ctx.stroke();

      // Side mirrors
      ctx.fillStyle = colors.mirror || colors.dark;
      roundedRectPath(ctx, -w * 0.52 + roofShift * 0.55, -h * 0.04, 8.5 * s, 6.5 * s, 2.5 * s);
      ctx.fill();
      roundedRectPath(ctx, w * 0.52 - 8.5 * s + roofShift * 0.55, -h * 0.04, 8.5 * s, 6.5 * s, 2.5 * s);
      ctx.fill();

      // A-pillars & Panoramic Sloped Windshield
      const wsTopY = roofBotY;
      const wsBotY = opts.wsBotY || h * 0.14;
      const wsTopW = roofW * 0.96;
      const wsBotW = w * 0.88;

      trapezoidPath(ctx, roofShift * 0.9, wsTopY - 1 * s, wsTopW + 6 * s, roofShift * 0.45, wsBotY + 2 * s, wsBotW + 6 * s, 4 * s);
      ctx.fillStyle = colors.pillar || colors.mid;
      ctx.fill();

      trapezoidPath(ctx, roofShift * 0.9, wsTopY, wsTopW, roofShift * 0.45, wsBotY, wsBotW, 4 * s);
      const wsGrad = ctx.createLinearGradient(0, wsTopY, 0, wsBotY);
      wsGrad.addColorStop(0, '#101b29');
      wsGrad.addColorStop(1, '#1e2f44');
      ctx.fillStyle = wsGrad;
      ctx.fill();
      ctx.strokeStyle = '#080b10';
      ctx.lineWidth = 1.8 * s;
      ctx.stroke();

      return { roofShift, roofW, roofTopY, roofBotY, wsTopY, wsBotY, wsTopW, wsBotW };
    }

    _drawCabinExtras(ctx, shell, s, tilt, driverX, showPetrovichWatch) {
      // Subtle seat headrests behind occupants
      ctx.fillStyle = '#0b1018';
      ctx.fillRect(shell.roofShift * 0.5 - shell.wsBotW * 0.48, shell.wsBotY - 5 * s, shell.wsBotW * 0.96, 6 * s);

      // Rearview mirror at top center
      ctx.fillStyle = '#090d14';
      roundedRectPath(ctx, -6 * s + shell.roofShift * 0.85, shell.wsTopY + 1.5 * s, 12 * s, 3.5 * s, 1.5 * s);
      ctx.fill();

      // Subtle glowing dashboard instrument cluster & turning steering wheel
      ctx.fillStyle = 'rgba(0, 212, 255, 0.35)';
      ctx.fillRect(driverX - 6 * s, shell.wsBotY - 3 * s, 12 * s, 2 * s);

      ctx.save();
      ctx.translate(driverX, shell.wsBotY - 1 * s);
      ctx.rotate(tilt * 0.45);
      ctx.strokeStyle = '#0b0f17';
      ctx.lineWidth = 2.8 * s;
      ctx.beginPath();
      ctx.arc(0, 4 * s, 9.5 * s, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      ctx.fillStyle = '#dfae87';
      ctx.beginPath();
      ctx.arc(-7.5 * s, -1 * s, 2.7 * s, 0, Math.PI * 2);
      ctx.arc(7.5 * s, -1 * s, 2.7 * s, 0, Math.PI * 2);
      ctx.fill();
      if (showPetrovichWatch) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-10 * s, -0.5 * s, 3.8 * s, 2.5 * s);
      }
      ctx.restore();
    }

    _drawWipers(ctx, shell, s) {
      ctx.strokeStyle = '#0a0d13';
      ctx.lineWidth = 1.4 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-18 * s + shell.roofShift * 0.4, shell.wsBotY + 1 * s);
      ctx.lineTo(-2 * s + shell.roofShift * 0.4, shell.wsBotY - 3 * s);
      ctx.moveTo(4 * s + shell.roofShift * 0.4, shell.wsBotY + 1 * s);
      ctx.lineTo(20 * s + shell.roofShift * 0.4, shell.wsBotY - 3 * s);
      ctx.stroke();
    }

    _drawPlate(ctx, x, y, w, h, s, text, style) {
      roundedRectPath(ctx, x - w * 0.5, y - h * 0.5, w, h, 2.5 * s);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.1 * s;
      ctx.stroke();

      let textX = x;
      let maxTextW = w - 4 * s;
      if (style === 'by') {
        const fw = 6.5 * s;
        const fx = x - w * 0.5 + 1.5 * s;
        const fy = y - h * 0.5 + 1.5 * s;
        const fh = h - 3 * s;
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(fx, fy, fw, fh * 0.45);
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(fx, fy + fh * 0.45, fw, fh * 0.25);
        ctx.fillStyle = '#1e293b';
        ctx.font = `900 ${Math.max(4, Math.round(h * 0.34))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BY', fx + fw * 0.5, fy + fh * 0.84);
        textX = x + fw * 0.48;
        maxTextW = w - fw - 5 * s;
      }

      ctx.fillStyle = '#0f172a';
      ctx.font = `900 ${Math.max(6.5, Math.round(h * 0.62))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, textX, y + 0.5 * s, maxTextW);
    }

    // ==================== 1. WALDEMAREE (DRAWN RIDER + S-WORKS BIKE) ====================
    _drawBikeWaldemaree(ctx, x, y, s, tilt, state) {
      const time = state.time;
      const leanAngle = tilt * 0.31;
      const pedalPhase = state.pedalPhase || 0;

      // Headlight cone
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const beamLen = (state.beamTimer > 0 ? 250 : 180) * s;
      const beamSpread = (state.beamTimer > 0 ? 58 : 34) * s;
      const grad = ctx.createLinearGradient(x, y + 34 * s, x, y + 34 * s + beamLen);
      grad.addColorStop(0, state.beamTimer > 0 ? 'rgba(230,250,255,0.68)' : 'rgba(220,245,255,0.42)');
      grad.addColorStop(1, 'rgba(220,245,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x - 6 * s, y + 34 * s);
      ctx.lineTo(x + 6 * s, y + 34 * s);
      ctx.lineTo(x + beamSpread, y + 34 * s + beamLen);
      ctx.lineTo(x - beamSpread, y + 34 * s + beamLen);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.56)';
      ctx.beginPath();
      ctx.ellipse(x + tilt * 10 * s, y + 20 * s, 23 * s, 52 * s, leanAngle * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(leanAngle);

      // Rear wheel peek
      ctx.fillStyle = '#0e121a';
      roundedRectPath(ctx, -4.5 * s, -52 * s, 9 * s, 28 * s, 4 * s);
      ctx.fill();

      // Chameleon blue-indigo Specialized S-WORKS aero frame
      const frameGrad = ctx.createLinearGradient(-15 * s, -12 * s, 15 * s, 50 * s);
      frameGrad.addColorStop(0, '#0284c7');
      frameGrad.addColorStop(0.5, '#1d4ed8');
      frameGrad.addColorStop(1, '#5b21b6');

      ctx.fillStyle = frameGrad;
      roundedRectPath(ctx, -6 * s, -6 * s, 12 * s, 31 * s, 4 * s);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = `900 ${Math.round(4.4 * s)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('S-WORKS', 0, 11 * s);

      // Water bottle in cage
      roundedRectPath(ctx, -4.2 * s, 15 * s, 8.4 * s, 12 * s, 3 * s);
      ctx.fillStyle = '#e2e8f0';
      ctx.fill();
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(-3.2 * s, 19 * s, 6.4 * s, 4.5 * s);

      // Fork blades
      ctx.strokeStyle = frameGrad;
      ctx.lineWidth = 5.2 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-10 * s, 24 * s);
      ctx.lineTo(-5.5 * s, 54 * s);
      ctx.moveTo(10 * s, 24 * s);
      ctx.lineTo(5.5 * s, 54 * s);
      ctx.stroke();

      // Spinning Deep-Section Carbon Front Wheel + Disc Rotor
      ctx.save();
      ctx.translate(0, 50 * s);
      ctx.rotate(tilt * 0.28);
      roundedRectPath(ctx, -6 * s, -20 * s, 12 * s, 40 * s, 5.5 * s);
      ctx.fillStyle = '#0d1016';
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.4 * s;
      ctx.stroke();

      const decalOffset = Math.sin(pedalPhase * 2.2) * 11 * s;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-4.5 * s, decalOffset - 1.5 * s, 9 * s, 3 * s);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-7.5 * s, -5 * s, 2 * s, 10 * s);

      if ((state.brakeHeat || 0) > 0.1 || state.isBraking || state.brakeOverheated) {
        const hg = clamp(0.32 + (state.brakeHeat || 0) * 0.65, 0.3, 0.95);
        const bg = ctx.createRadialGradient(-7 * s, 0, 1, -7 * s, 0, 11 * s);
        bg.addColorStop(0, `rgba(255, 195, 90, ${hg.toFixed(2)})`);
        bg.addColorStop(0.5, `rgba(255, 68, 28, ${(hg * 0.72).toFixed(2)})`);
        bg.addColorStop(1, 'rgba(255, 40, 20, 0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(-7 * s, 0, 11 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Aero drop handlebars + Garmin computer
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 4.8 * s;
      ctx.beginPath();
      ctx.moveTo(-28 * s, 21 * s);
      ctx.quadraticCurveTo(0, 15 * s, 28 * s, 21 * s);
      ctx.stroke();
      ctx.lineWidth = 3.8 * s;
      ctx.beginPath();
      ctx.moveTo(-28 * s, 21 * s);
      ctx.lineTo(-30 * s, 31 * s);
      ctx.moveTo(28 * s, 21 * s);
      ctx.lineTo(30 * s, 31 * s);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      roundedRectPath(ctx, -4 * s, 14 * s, 8 * s, 6 * s, 2 * s);
      ctx.fill();
      ctx.fillStyle = state.beamTimer > 0 ? '#ffffff' : '#bae6fd';
      ctx.beginPath();
      ctx.arc(0, 21 * s, 4.2 * s, 0, Math.PI * 2);
      ctx.fill();

      // Pedaling Legs (navy bib shorts + calves + white socks + crank arms + white road shoes)
      const leftPedalY = Math.sin(pedalPhase) * 9.5 * s;
      const rightPedalY = Math.sin(pedalPhase + Math.PI) * 9.5 * s;

      // Bottom bracket crank spindle & arms
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.6 * s;
      ctx.beginPath();
      ctx.moveTo(-12 * s, 26 * s + leftPedalY * 0.6);
      ctx.lineTo(0, 26 * s);
      ctx.lineTo(12 * s, 26 * s + rightPedalY * 0.6);
      ctx.stroke();

      [
        { lx: -14 * s, py: leftPedalY },
        { lx: 14 * s, py: rightPedalY },
      ].forEach((leg) => {
        ctx.fillStyle = '#172554';
        roundedRectPath(ctx, leg.lx - 6 * s, -2 * s, 12 * s, 17 * s + leg.py * 0.4, 5 * s);
        ctx.fill();
        ctx.fillStyle = '#dfa078';
        roundedRectPath(ctx, leg.lx - 4.2 * s, 13 * s + leg.py * 0.4, 8.4 * s, 10 * s, 3.5 * s);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        roundedRectPath(ctx, leg.lx - 4.2 * s, 21 * s + leg.py * 0.5, 8.4 * s, 8 * s, 3 * s);
        ctx.fill();
        // Dark pedal clip platform under shoe
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(leg.lx - 6 * s, 35 * s + leg.py * 0.6, 12 * s, 3 * s);
        ctx.fillStyle = '#ffffff';
        roundedRectPath(ctx, leg.lx - 5.2 * s, 27 * s + leg.py * 0.6, 10.4 * s, 10.5 * s, 3.5 * s);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1 * s;
        ctx.stroke();
      });

      // Arms gripping hoods
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 7 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-18 * s, -6 * s);
      ctx.lineTo(-27 * s, 20 * s);
      ctx.moveTo(18 * s, -6 * s);
      ctx.lineTo(27 * s, 20 * s);
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-28 * s, 21 * s, 4.6 * s, 0, Math.PI * 2);
      ctx.arc(28 * s, 21 * s, 4.6 * s, 0, Math.PI * 2);
      ctx.fill();

      // Drawn Waldemaree bust (Tinkoff helmet + blue mirror glasses + full grin + orange BIKESTORE jersey)
      const headBob = Math.abs(Math.sin(pedalPhase)) * 1.8 * s;
      global.CharacterIllustrator.drawCharacterPortrait(ctx, 'waldemaree', 0, -34 * s + headBob, s * 1.15, {
        time,
        tilt,
        mood: 'hype',
        showBody: true,
      });

      // BIKESTORE chest label centered cleanly between bib straps
      ctx.fillStyle = '#18181b';
      ctx.font = `900 ${Math.round(4.1 * s)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('BIKESTORE', 0, 0);

      // Sweat drops when Energy < 30%
      if (state.hardMode && state.resource < 30) {
        for (let i = 0; i < 3; i++) {
          const dropPhase = (time * 3.2 + i * 0.33) % 1;
          const dx = (i === 1 ? 1 : -1) * (20 + dropPhase * 12) * s;
          const dy = -42 * s + dropPhase * 20 * s;
          ctx.fillStyle = `rgba(0, 212, 255, ${1 - dropPhase})`;
          ctx.beginPath();
          ctx.arc(dx, dy, 2.5 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    // ==================== 2. DRS4HOP (HYUNDAI GETZ 046 PE 32) ====================
    _drawCarGetz(ctx, x, y, s, tilt, state) {
      const w = 92 * s;
      const h = 118 * s;

      this._drawHeadlightCones(ctx, x, y, w, h, s, state, {
        length: 195,
        spread: 42,
        color: '255, 245, 214',
      });

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt * 0.14);

      const shell = this._draw25DCarChassis(ctx, w, h, s, tilt, {
        light: '#dfe6ef',
        mid: '#b8c3d1',
        dark: '#7c8899',
        roof: '#d3dce8',
        skirt: '#202630',
        side: '#97a3b3',
        border: 'rgba(255, 255, 255, 0.38)',
      }, { wsBotY: h * 0.14 });

      // Panoramic windshield with drawn drs4hop
      ctx.save();
      trapezoidPath(
        ctx,
        shell.roofShift * 0.9,
        shell.wsTopY + 1.5 * s,
        shell.wsTopW - 2 * s,
        shell.roofShift * 0.45,
        shell.wsBotY - 1.5 * s,
        shell.wsBotW - 2 * s,
        3 * s
      );
      ctx.clip();

      const drvX = shell.roofShift * 0.55 + 1 * s;
      const mood = state.hardMode && state.resource < 25 ? 'panic' : 'normal';
      global.CharacterIllustrator.drawCharacterPortrait(ctx, 'drs4hop', drvX, shell.wsTopY + 18 * s, s * 0.88, {
        time: state.time,
        tilt,
        mood,
        showBody: true,
      });
      this._drawCabinExtras(ctx, shell, s, tilt, drvX, false);
      ctx.restore();

      this._drawWindshieldReflection(
        ctx,
        shell.roofShift * 0.9,
        shell.wsTopY,
        shell.wsTopW,
        shell.roofShift * 0.45,
        shell.wsBotY,
        shell.wsBotW,
        s,
        state.time
      );
      this._drawWipers(ctx, shell, s);

      // Sloped Getz hood creases
      ctx.strokeStyle = 'rgba(70, 82, 98, 0.45)';
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(-w * 0.28, h * 0.16);
      ctx.lineTo(-w * 0.22, h * 0.29);
      ctx.moveTo(w * 0.28, h * 0.16);
      ctx.lineTo(w * 0.22, h * 0.29);
      ctx.stroke();

      // Hyundai Getz grille + silver wing + H oval
      roundedRectPath(ctx, -17 * s, h * 0.29, 34 * s, 9 * s, 3 * s);
      ctx.fillStyle = '#14181f';
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1 * s;
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-15 * s, h * 0.328, 30 * s, 1.8 * s);
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, h * 0.335, 4.5 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Clear teardrop halogen headlights with amber turn corners
      [-w * 0.42, w * 0.42 - 18 * s].forEach((hx, idx) => {
        roundedRectPath(ctx, hx, h * 0.27, 18 * s, 10.5 * s, 4 * s);
        ctx.fillStyle = state.beamTimer > 0 ? '#ffffff' : '#fff5d6';
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.1 * s;
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(idx === 0 ? hx + 1.5 * s : hx + 13.5 * s, h * 0.27 + 2.5 * s, 3 * s, 5 * s);
      });

      // Matte black Getz bumper rub strips ("клыки") + round fog lamps
      ctx.fillStyle = '#14181f';
      roundedRectPath(ctx, -w * 0.45, h * 0.385, 16 * s, 4.5 * s, 2 * s);
      ctx.fill();
      roundedRectPath(ctx, w * 0.45 - 16 * s, h * 0.385, 16 * s, 4.5 * s, 2 * s);
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(-w * 0.36, h * 0.455, 2.6 * s, 0, Math.PI * 2);
      ctx.arc(w * 0.36, h * 0.455, 2.6 * s, 0, Math.PI * 2);
      ctx.fill();

      this._drawPlate(ctx, 0, h * 0.43, 50 * s, 11 * s, s, '046 PE 32', 'ru');

      ctx.restore();
    }

    // ==================== 3. ZABL (RUSTY/DAMAGED BMW E39 + PETROVICH) ====================
    _drawCarE39(ctx, x, y, s, tilt, state) {
      const w = 96 * s;
      const h = 124 * s;
      const flicker = Math.sin(state.time * 27) > -0.35 ? 0.16 : 0.04;

      this._drawHeadlightCones(ctx, x, y, w, h, s, state, {
        length: 205,
        spread: 44,
        color: '255, 194, 92',
        rightColor: '255, 224, 165',
        leftAlpha: 0.38,
        rightAlpha: flicker,
      });

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt * 0.14);

      const shell = this._draw25DCarChassis(ctx, w, h, s, tilt, {
        light: '#292e36',
        mid: '#181c22',
        dark: '#0d1014',
        roof: '#222730',
        skirt: '#0d0f14',
        side: '#1c2028',
        border: 'rgba(180, 120, 70, 0.36)',
      }, { wsBotY: h * 0.14, exhaust: 'left' });

      // Jagged multi-tone rust & corrosion patches on hood, fenders & roof corner
      const drawRustCluster = (rx, ry, scaleR) => {
        ctx.fillStyle = 'rgba(128, 50, 16, 0.84)';
        ctx.beginPath();
        ctx.moveTo(rx - 8 * scaleR, ry);
        ctx.lineTo(rx - 2 * scaleR, ry - 5 * scaleR);
        ctx.lineTo(rx + 7 * scaleR, ry - 2 * scaleR);
        ctx.lineTo(rx + 9 * scaleR, ry + 4 * scaleR);
        ctx.lineTo(rx - 3 * scaleR, ry + 6 * scaleR);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(190, 92, 28, 0.68)';
        ctx.fillRect(rx - 3 * scaleR, ry - 1 * scaleR, 7 * scaleR, 4 * scaleR);
      };
      drawRustCluster(-w * 0.34, h * 0.21, s * 1.15);
      drawRustCluster(w * 0.28, h * 0.25, s * 1.0);
      drawRustCluster(-w * 0.14, h * 0.26, s * 0.78);
      drawRustCluster(w * 0.38, -h * 0.18, s * 0.88);

      // Dented hood crease
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.78)';
      ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(-14 * s, h * 0.17);
      ctx.lineTo(-3 * s, h * 0.25);
      ctx.lineTo(12 * s, h * 0.20);
      ctx.stroke();

      // Panoramic windshield: Drawn Passenger PETROVICH (left) + Drawn Driver ZABL (right, lower & chubbier!)
      ctx.save();
      trapezoidPath(
        ctx,
        shell.roofShift * 0.9,
        shell.wsTopY + 1.5 * s,
        shell.wsTopW - 2 * s,
        shell.roofShift * 0.45,
        shell.wsBotY - 1.5 * s,
        shell.wsBotW - 2 * s,
        3 * s
      );
      ctx.clip();

      const showThumbs = state.thumbsUpTimer > 0 || state.isGassing || state.combo >= 2 || state.speedKmh > 144;
      const mood = state.hardMode && state.resource < 25 ? 'panic' : showThumbs ? 'hype' : 'normal';
      const passX = shell.roofShift * 0.55 - w * 0.19 + tilt * 2 * s;
      const drvX = shell.roofShift * 0.55 + w * 0.19 + tilt * 1.5 * s;

      // Passenger PETROVICH
      global.CharacterIllustrator.drawCharacterPortrait(ctx, 'petrovich', passX, shell.wsTopY + 17 * s, s * 0.84, {
        time: state.time,
        tilt,
        mood,
        showBody: true,
      });

      // Driver ZABL (visibly shorter/lower & chubbier + GOLD WATCH thumbs-up!)
      global.CharacterIllustrator.drawCharacterPortrait(ctx, 'zabl', drvX, shell.wsTopY + 23 * s, s * 0.82, {
        time: state.time,
        tilt,
        mood,
        showThumbsUp: showThumbs,
        thumbSide: -1,
        showBody: true,
      });

      this._drawCabinExtras(ctx, shell, s, tilt, drvX, false);
      ctx.restore();

      this._drawWindshieldReflection(
        ctx,
        shell.roofShift * 0.9,
        shell.wsTopY,
        shell.wsTopW,
        shell.roofShift * 0.45,
        shell.wsBotY,
        shell.wsBotW,
        s,
        state.time
      );
      this._drawWipers(ctx, shell, s);

      // Left intact bumper + Exposed inner radiator/rust on smashed right side (refs/3.jpg)
      ctx.fillStyle = '#12151a';
      roundedRectPath(ctx, -w * 0.46, h * 0.39, w * 0.62, 10 * s, 4 * s);
      ctx.fill();

      const droop = Math.sin(state.time * 24) * 1.4 * s;
      ctx.fillStyle = '#3f1508';
      ctx.fillRect(w * 0.16, h * 0.37, w * 0.28, 7 * s);
      ctx.save();
      ctx.translate(w * 0.15, h * 0.42 + droop);
      ctx.rotate(0.18);
      ctx.fillStyle = '#101318';
      roundedRectPath(ctx, 0, -2 * s, w * 0.32, 9 * s, 3 * s);
      ctx.fill();
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(4 * s, 0, 8 * s, 4 * s);
      ctx.restore();

      // BMW twin black kidney grilles with slats + BMW roundel
      [-11 * s, 2 * s].forEach((gx) => {
        roundedRectPath(ctx, gx, h * 0.31, 9 * s, 10 * s, 3 * s);
        ctx.fillStyle = '#07090c';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.1 * s;
        ctx.stroke();
      });
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(0, h * 0.275, 4 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(0, h * 0.275, 2.7 * s, 0, Math.PI * 0.5);
      ctx.lineTo(0, h * 0.275);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, h * 0.275, 2.7 * s, Math.PI, Math.PI * 1.5);
      ctx.lineTo(0, h * 0.275);
      ctx.fill();

      // Asymmetric Headlights: Left Angel Eyes; Right cracked dim flickering lens
      roundedRectPath(ctx, -w * 0.44, h * 0.295, 19 * s, 10 * s, 3.5 * s);
      ctx.fillStyle = '#1f2937';
      ctx.fill();
      ctx.strokeStyle = state.beamTimer > 0 ? '#fffbeb' : '#ffaa2b';
      ctx.lineWidth = 1.8 * s;
      ctx.beginPath();
      ctx.arc(-w * 0.44 + 6 * s, h * 0.295 + 5 * s, 3.3 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-w * 0.44 + 13.5 * s, h * 0.295 + 5 * s, 3.3 * s, 0, Math.PI * 2);
      ctx.stroke();

      roundedRectPath(ctx, w * 0.44 - 19 * s, h * 0.295, 19 * s, 10 * s, 3.5 * s);
      ctx.fillStyle = flicker > 0.1 ? '#8a7246' : '#262420';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(w * 0.44 - 16 * s, h * 0.30);
      ctx.lineTo(w * 0.44 - 6 * s, h * 0.38);
      ctx.stroke();

      ctx.restore();
    }

    // ==================== 4. PETROVICH (LAND CRUISER 200 BY 5555 MC-1 + ZABL) ====================
    _drawCarLC200(ctx, x, y, s, tilt, state) {
      const w = 102 * s;
      const h = 132 * s;

      this._drawHeadlightCones(ctx, x, y, w, h, s, state, {
        length: 230,
        spread: 50,
        color: '225, 245, 255',
      });

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt * 0.12);

      const shell = this._draw25DCarChassis(ctx, w, h, s, tilt, {
        light: '#27303c',
        mid: '#12171f',
        dark: '#07090d',
        roof: '#1b222d',
        skirt: '#0a0d12',
        side: '#181e27',
        border: 'rgba(255, 255, 255, 0.26)',
      }, { wsBotY: h * 0.13, exhaust: 'dual' });

      // Roof Rails + Sunroof
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-shell.roofW * 0.42 + shell.roofShift, shell.roofTopY + 3 * s, 3.5 * s, (shell.roofBotY - shell.roofTopY) - 6 * s);
      ctx.fillRect(shell.roofW * 0.42 - 3.5 * s + shell.roofShift, shell.roofTopY + 3 * s, 3.5 * s, (shell.roofBotY - shell.roofTopY) - 6 * s);
      roundedRectPath(ctx, -14 * s + shell.roofShift, shell.roofTopY + 4 * s, 28 * s, 14 * s, 3 * s);
      ctx.fillStyle = '#0d131c';
      ctx.fill();

      // Panoramic windshield: Drawn Passenger ZABL (left, shorter & chubbier + 👍) + Drawn Driver PETROVICH (right)
      ctx.save();
      trapezoidPath(
        ctx,
        shell.roofShift * 0.9,
        shell.wsTopY + 1.5 * s,
        shell.wsTopW - 2 * s,
        shell.roofShift * 0.45,
        shell.wsBotY - 1.5 * s,
        shell.wsBotW - 2 * s,
        3 * s
      );
      ctx.clip();

      const showThumbs = state.thumbsUpTimer > 0 || state.combo >= 2 || state.isGassing || state.speedKmh > 152;
      const mood = state.hardMode && state.resource < 25 ? 'panic' : showThumbs ? 'hype' : 'normal';
      const passX = shell.roofShift * 0.55 - w * 0.19 + tilt * 2 * s;
      const drvX = shell.roofShift * 0.55 + w * 0.19 + tilt * 1.5 * s;

      // Passenger ZABL (shorter & chubbier + KFC bucket + gold watch thumbs-up)
      global.CharacterIllustrator.drawCharacterPortrait(ctx, 'zabl', passX, shell.wsTopY + 23 * s, s * 0.84, {
        time: state.time,
        tilt,
        mood,
        showKfcBucket: true,
        showThumbsUp: showThumbs,
        thumbSide: 1,
        showBody: true,
      });

      // Driver PETROVICH (taller upright boss)
      global.CharacterIllustrator.drawCharacterPortrait(ctx, 'petrovich', drvX, shell.wsTopY + 17 * s, s * 0.86, {
        time: state.time,
        tilt,
        mood,
        showBody: true,
      });

      this._drawCabinExtras(ctx, shell, s, tilt, drvX, true);
      ctx.restore();

      this._drawWindshieldReflection(
        ctx,
        shell.roofShift * 0.9,
        shell.wsTopY,
        shell.wsTopW,
        shell.roofShift * 0.45,
        shell.wsBotY,
        shell.wsBotW,
        s,
        state.time
      );
      this._drawWipers(ctx, shell, s);

      // Hood power bulges
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(-w * 0.34, h * 0.14);
      ctx.lineTo(-w * 0.29, h * 0.25);
      ctx.moveTo(w * 0.34, h * 0.14);
      ctx.lineTo(w * 0.29, h * 0.25);
      ctx.stroke();

      // 3-bar Chrome radiator grille + Toyota oval
      const grW = 44 * s;
      const grH = 16 * s;
      roundedRectPath(ctx, -grW * 0.5, h * 0.225, grW, grH, 3 * s);
      ctx.fillStyle = '#0b0e14';
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.6 * s;
      ctx.stroke();

      const chromeGrad = ctx.createLinearGradient(-grW * 0.45, 0, grW * 0.45, 0);
      chromeGrad.addColorStop(0, '#94a3b8');
      chromeGrad.addColorStop(0.5, '#ffffff');
      chromeGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = chromeGrad;
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-grW * 0.44, h * 0.242 + i * 4.5 * s, grW * 0.88, 2.2 * s);
      }
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, h * 0.285, 5.5 * s, 3.6 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dual-Projector LED headlights + white DRLs + amber corner blinkers
      [-w * 0.46, w * 0.46 - 22 * s].forEach((hx, idx) => {
        roundedRectPath(ctx, hx, h * 0.23, 22 * s, 11.5 * s, 3 * s);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.1 * s;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hx + 1.5 * s, h * 0.23 + 8 * s, 19 * s, 2.2 * s);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(idx === 0 ? hx + 1.5 * s : hx + 16.5 * s, h * 0.23 + 2 * s, 4 * s, 5 * s);
        ctx.fillStyle = state.beamTimer > 0 ? '#ffffff' : '#dff6ff';
        ctx.beginPath();
        ctx.arc(hx + (idx === 0 ? 13 : 8.5) * s, h * 0.23 + 4.5 * s, 3.2 * s, 0, Math.PI * 2);
        ctx.fill();
      });

      // Exact BY 5555 MC-1 Belarus plate
      this._drawPlate(ctx, 0, h * 0.375, 60 * s, 11.5 * s, s, '5555 MC-1', 'by');

      // Double-Tube Chrome Lower Bullbar (кенгурятник)
      const barGrad = ctx.createLinearGradient(-w * 0.44, 0, w * 0.44, 0);
      barGrad.addColorStop(0, '#64748b');
      barGrad.addColorStop(0.25, '#f8fafc');
      barGrad.addColorStop(0.5, '#cbd5e1');
      barGrad.addColorStop(0.75, '#ffffff');
      barGrad.addColorStop(1, '#64748b');

      ctx.strokeStyle = barGrad;
      ctx.lineWidth = 3.2 * s;
      ctx.beginPath();
      ctx.moveTo(-w * 0.22, h * 0.445);
      ctx.lineTo(w * 0.22, h * 0.445);
      ctx.stroke();

      ctx.lineWidth = 4.6 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-w * 0.37, h * 0.43);
      ctx.lineTo(-w * 0.33, h * 0.485);
      ctx.lineTo(w * 0.33, h * 0.485);
      ctx.lineTo(w * 0.37, h * 0.43);
      ctx.stroke();

      ctx.restore();
    }

    _drawParticles(ctx, state) {
      if (!state.particles || state.particles.length === 0) return;
      for (const pt of state.particles) {
        const alpha = clamp(pt.life / pt.maxLife, 0, 1);
        ctx.fillStyle = pt.color.replace('ALPHA', alpha.toFixed(2));
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    _drawSpeedLines(ctx, W, H, state) {
      const intensity = clamp((state.speedKmh - 92) / 110, 0, 1);
      if (intensity <= 0.04) return;

      ctx.save();
      ctx.strokeStyle = `rgba(180, 235, 255, ${(intensity * 0.25).toFixed(2)})`;
      ctx.lineWidth = 1.6;
      const count = 14;
      for (let i = 0; i < count; i++) {
        const side = i % 2 === 0 ? 0.03 + i * 0.014 : 0.97 - i * 0.014;
        const sx = W * side;
        const speedY = ((state.roadScroll * 2.5 + i * 95) % (H + 120)) - 60;
        const len = 32 + intensity * 56;
        ctx.beginPath();
        ctx.moveTo(sx, speedY);
        ctx.lineTo(sx, speedY - len);
        ctx.stroke();
      }
      ctx.restore();
    }

    _drawFloatingPopups(ctx, state) {
      if (!state.popups || state.popups.length === 0) return;
      ctx.save();
      for (const pop of state.popups) {
        const progress = 1 - pop.life / pop.maxLife;
        const alpha = clamp(1 - progress * 1.15, 0, 1);
        ctx.globalAlpha = alpha;
        ctx.font = `900 ${pop.size || 16}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(8, 11, 16, 0.92)';
        ctx.lineWidth = 4;
        ctx.strokeText(pop.text, pop.x, pop.y);
        ctx.fillStyle = pop.color || '#ffd043';
        ctx.fillText(pop.text, pop.x, pop.y);
      }
      ctx.restore();
    }

    /**
     * Renders the exact in-game 2.5D vehicle + crew onto a Garage preview card thumbnail.
     */
    renderVehicleCardDataURL(charId, width, height) {
      const w = width || 240;
      const h = height || 168;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');

      // Mini night-highway lane stage matching gameplay visuals
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#182132');
      bg.addColorStop(0.55, '#111722');
      bg.addColorStop(1, '#090d14');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Subtle perspective lane dashes on preview stage
      ctx.strokeStyle = 'rgba(230, 238, 250, 0.20)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.moveTo(w * 0.22, 0);
      ctx.lineTo(w * 0.14, h);
      ctx.moveTo(w * 0.78, 0);
      ctx.lineTo(w * 0.86, h);
      ctx.stroke();
      ctx.setLineDash([]);

      const spot = ctx.createRadialGradient(w * 0.5, h * 0.52, 8, w * 0.5, h * 0.52, w * 0.56);
      spot.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
      spot.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, w, h);

      const previewState = {
        time: 0.45,
        speedKmh: 125,
        isGassing: false,
        isBraking: false,
        brakeHeat: 0,
        brakeOverheated: false,
        backfireTimer: 0,
        beamTimer: 0,
        hardMode: false,
        resource: 100,
        pedalPhase: 0.6,
        thumbsUpTimer: 1.0,
        combo: 2,
      };
      const prevState = this._currentRenderState;
      this._currentRenderState = previewState;

      if (charId === 'waldemaree') {
        this._drawBikeWaldemaree(ctx, w * 0.5, h * 0.45, 0.98, 0, previewState);
      } else if (charId === 'drs4hop') {
        this._drawCarGetz(ctx, w * 0.5, h * 0.46, 0.96, 0, previewState);
      } else if (charId === 'zabl') {
        this._drawCarE39(ctx, w * 0.5, h * 0.45, 0.92, 0, previewState);
      } else {
        this._drawCarLC200(ctx, w * 0.5, h * 0.44, 0.88, 0, previewState);
      }

      this._currentRenderState = prevState;
      return c.toDataURL('image/png');
    }
  }

  global.Renderer25D = Renderer25D;
})(window);
