/**
 * Hand-Crafted Vector/Canvas Character & Showcase Illustration Engine
 * «ШАШКИ НА ДОРОГЕ» — Drawn Characters (No Photo Cutouts)
 */
(function (global) {
  'use strict';

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function rr(ctx, x, y, w, h, r) {
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

  function drawEye(ctx, ex, ey, r, irisColor, gazeX, blinkOpen, browSlope) {
    ctx.save();
    // Eye white
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 1.25, Math.max(0.8, r * 0.85 * blinkOpen), 0, 0, Math.PI * 2);
    ctx.fill();

    if (blinkOpen > 0.25) {
      ctx.save();
      ctx.clip();
      // Iris + pupil + specular catchlight
      const ix = ex + gazeX * r * 0.35;
      ctx.fillStyle = irisColor;
      ctx.beginPath();
      ctx.arc(ix, ey, r * 0.68, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#090d14';
      ctx.beginPath();
      ctx.arc(ix, ey, r * 0.36, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ix - r * 0.22, ey - r * 0.22, r * 0.20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Upper eyelid line
    ctx.strokeStyle = '#33221a';
    ctx.lineWidth = Math.max(1, r * 0.28);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex - r * 1.25, ey - r * 0.15 * blinkOpen);
    ctx.quadraticCurveTo(ex, ey - r * 0.95 * blinkOpen, ex + r * 1.25, ey - r * 0.15 * blinkOpen);
    ctx.stroke();

    // Eyebrow
    ctx.strokeStyle = '#2d1e17';
    ctx.lineWidth = Math.max(1.2, r * 0.48);
    ctx.beginPath();
    ctx.moveTo(ex - r * 1.35, ey - r * 1.35 + browSlope * r);
    ctx.quadraticCurveTo(ex, ey - r * 1.65, ex + r * 1.35, ey - r * 1.3 - browSlope * r);
    ctx.stroke();

    ctx.restore();
  }

  function drawGoldWatchThumb(ctx, cx, cy, s, time) {
    const bob = Math.sin(time * 8) * 1.4 * s;
    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.rotate(-0.14);

    // Jacket sleeve
    ctx.fillStyle = '#1c222d';
    rr(ctx, -6 * s, 3 * s, 12 * s, 15 * s, 4 * s);
    ctx.fill();
    ctx.strokeStyle = '#3c4657';
    ctx.lineWidth = 0.9 * s;
    ctx.stroke();

    // Gleaming Gold Watch Bracelet & Green/Gold Dial (refs/1.jpg)
    const wGrad = ctx.createLinearGradient(-7 * s, 0, 7 * s, 0);
    wGrad.addColorStop(0, '#a67400');
    wGrad.addColorStop(0.35, '#ffe885');
    wGrad.addColorStop(0.65, '#f5b700');
    wGrad.addColorStop(1, '#996800');
    ctx.fillStyle = wGrad;
    rr(ctx, -7 * s, 0, 14 * s, 6 * s, 2 * s);
    ctx.fill();

    // Dial center (classic green/gold Rolex-style glint)
    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.ellipse(0, 3 * s, 3.6 * s, 2.3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 0.9 * s;
    ctx.stroke();

    const glint = 0.5 + 0.5 * Math.sin(time * 11);
    ctx.fillStyle = `rgba(255, 255, 225, ${glint.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(-1.2 * s, 2.2 * s, 1.3 * s, 0, Math.PI * 2);
    ctx.fill();

    // Chubby hand fist + raised thumb
    ctx.fillStyle = '#edb995';
    rr(ctx, -5.5 * s, -7.5 * s, 11 * s, 8 * s, 3 * s);
    ctx.fill();
    ctx.strokeStyle = '#b97e59';
    ctx.lineWidth = 0.8 * s;
    ctx.stroke();

    // Finger curls
    ctx.strokeStyle = '#c48660';
    ctx.lineWidth = 0.8 * s;
    for (let fy = -5.5; fy <= -1.5; fy += 2) {
      ctx.beginPath();
      ctx.moveTo(0, fy * s);
      ctx.lineTo(4.5 * s, fy * s);
      ctx.stroke();
    }

    // Raised thumb
    ctx.fillStyle = '#f2c3a2';
    rr(ctx, -2.5 * s, -15.5 * s, 4.8 * s, 9.5 * s, 2.4 * s);
    ctx.fill();
    ctx.strokeStyle = '#b97e59';
    ctx.lineWidth = 0.8 * s;
    ctx.stroke();

    ctx.restore();
  }

  function drawKfcBucket(ctx, bx, by, s, time) {
    const bob = Math.sin(time * 7) * 0.9 * s;
    ctx.save();
    ctx.translate(bx, by + bob);
    ctx.rotate(-0.07);

    // 3 crispy golden fried chicken drumsticks peeking out top of bucket
    [
      { x: -6.2, y: -11.5, rot: -0.34, col: '#b45309', top: '#d97706' },
      { x: 5.8, y: -11.2, rot: 0.32, col: '#c2410c', top: '#ea580c' },
      { x: 0, y: -13.2, rot: 0.04, col: '#d97706', top: '#f59e0b' },
    ].forEach((d) => {
      ctx.save();
      ctx.translate(d.x * s, d.y * s);
      ctx.rotate(d.rot);
      // Crisp white bone handle tip
      ctx.fillStyle = '#fefce8';
      rr(ctx, -1.6 * s, -6.5 * s, 3.2 * s, 5.2 * s, 1.4 * s);
      ctx.fill();
      // Crunchy breaded drumstick meat
      ctx.fillStyle = d.col;
      ctx.beginPath();
      ctx.ellipse(0, 1.4 * s, 4.4 * s, 5.6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = d.top;
      ctx.beginPath();
      ctx.ellipse(-1.1 * s, 0.4 * s, 2.3 * s, 3.1 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Tapered KFC Bucket body clipped for 5 alternating red & white stripes
    const topW = 22 * s;
    const botW = 15 * s;
    const h = 19 * s;
    const bucketPath = () => {
      ctx.beginPath();
      ctx.moveTo(-topW * 0.5, -h * 0.5);
      ctx.lineTo(topW * 0.5, -h * 0.5);
      ctx.lineTo(botW * 0.5, h * 0.5);
      ctx.quadraticCurveTo(0, h * 0.5 + 2.5 * s, -botW * 0.5, h * 0.5);
      ctx.closePath();
    };

    ctx.save();
    bucketPath();
    ctx.clip();
    const stripeW = topW / 5;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#d61f26' : '#f8fafc';
      ctx.fillRect(-topW * 0.5 + i * stripeW, -h * 0.55, stripeW + 0.6 * s, h * 1.25);
    }
    // Subtle cylindrical shading
    const shade = ctx.createLinearGradient(-topW * 0.5, 0, topW * 0.5, 0);
    shade.addColorStop(0, 'rgba(0, 0, 0, 0.28)');
    shade.addColorStop(0.45, 'rgba(255, 255, 255, 0.08)');
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.34)');
    ctx.fillStyle = shade;
    ctx.fillRect(-topW * 0.6, -h * 0.6, topW * 1.2, h * 1.3);
    ctx.restore();

    bucketPath();
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 0.9 * s;
    ctx.stroke();

    // White upper rim lip
    ctx.fillStyle = '#ffffff';
    rr(ctx, -topW * 0.54, -h * 0.56, topW * 1.08, 3.2 * s, 1.4 * s);
    ctx.fill();

    // Bold KFC center emblem
    ctx.fillStyle = '#b91c1c';
    rr(ctx, -7.2 * s, -3.5 * s, 14.4 * s, 7.6 * s, 1.8 * s);
    ctx.fill();
    ctx.strokeStyle = '#fef2f2';
    ctx.lineWidth = 0.8 * s;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.max(4, Math.round(5.4 * s))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('KFC', 0, 0.6 * s);

    // Chubby hand gripping left rim of the bucket
    ctx.fillStyle = '#edb995';
    rr(ctx, -topW * 0.55 - 1.5 * s, -2.5 * s, 5.2 * s, 7.2 * s, 2.4 * s);
    ctx.fill();
    ctx.strokeStyle = '#b97e59';
    ctx.lineWidth = 0.7 * s;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draws an illustrated, multi-layered character bust/head.
   * coords: (cx, cy) is center of face; scale=1 matches ~34px head height for in-cabin use.
   */
  function drawCharacterPortrait(ctx, charId, cx, cy, scale, anim) {
    const opts = anim || {};
    const s = scale || 1;
    const time = opts.time || 0;
    const gazeX = clamp(opts.tilt || 0, -1, 1);
    const mood = opts.mood || 'normal'; // 'normal' | 'hype' | 'panic'
    const blinkCycle = (time * 0.72 + (charId.length * 1.3)) % 4.2;
    const blinkOpen = blinkCycle > 4.08 ? Math.abs(Math.cos((blinkCycle - 4.08) * 26)) : 1;
    const showBody = opts.showBody !== false;

    ctx.save();
    ctx.translate(cx, cy);

    if (charId === 'waldemaree') {
      // ---------- WALDEMAREE: Orange BIKESTORE jersey, Tinkoff yellow/blue helmet, blue mirror glasses, wide grin ----------
      if (showBody) {
        // Neck & Collar
        ctx.fillStyle = '#cf875e';
        rr(ctx, -6 * s, 11 * s, 12 * s, 11 * s, 4 * s);
        ctx.fill();

        // Orange-to-yellow gradient jersey
        const jGrad = ctx.createLinearGradient(-20 * s, 16 * s, 20 * s, 38 * s);
        jGrad.addColorStop(0, '#ea580c');
        jGrad.addColorStop(0.55, '#f97316');
        jGrad.addColorStop(1, '#facc15');
        rr(ctx, -22 * s, 17 * s, 44 * s, 24 * s, 10 * s);
        ctx.fillStyle = jGrad;
        ctx.fill();
        ctx.strokeStyle = '#fed7aa';
        ctx.lineWidth = 1 * s;
        ctx.stroke();

        // Black backpack/bib straps (refs/8.jpg)
        ctx.fillStyle = '#1e293b';
        rr(ctx, -16 * s, 17 * s, 5.5 * s, 23 * s, 2 * s);
        ctx.fill();
        rr(ctx, 10.5 * s, 17 * s, 5.5 * s, 23 * s, 2 * s);
        ctx.fill();

        // Center jersey zip
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 1.2 * s;
        ctx.beginPath();
        ctx.moveTo(0, 18 * s);
        ctx.lineTo(0, 40 * s);
        ctx.stroke();
      }

      // Ears
      ctx.fillStyle = '#d48d65';
      ctx.beginPath();
      ctx.ellipse(-15 * s, 2 * s, 3 * s, 5 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(15 * s, 2 * s, 3 * s, 5 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Athletic tanned face shape
      const skinGrad = ctx.createRadialGradient(-2 * s, -2 * s, 3 * s, 0, 3 * s, 19 * s);
      skinGrad.addColorStop(0, '#f0b893');
      skinGrad.addColorStop(0.7, '#df9970');
      skinGrad.addColorStop(1, '#bf7750');
      ctx.fillStyle = skinGrad;
      ctx.beginPath();
      ctx.moveTo(-14.5 * s, -6 * s);
      ctx.quadraticCurveTo(-15.5 * s, 9 * s, -8.5 * s, 15.5 * s);
      ctx.quadraticCurveTo(0, 19.5 * s, 8.5 * s, 15.5 * s);
      ctx.quadraticCurveTo(15.5 * s, 9 * s, 14.5 * s, -6 * s);
      ctx.closePath();
      ctx.fill();

      // Light chin & mustache stubble
      ctx.fillStyle = 'rgba(92, 54, 34, 0.24)';
      ctx.beginPath();
      ctx.ellipse(0, 13.5 * s, 7.5 * s, 3.6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(78, 45, 28, 0.35)';
      for (let i = -5; i <= 5; i += 2) {
        ctx.fillRect(i * s, 12.8 * s + (Math.abs(i) % 2) * 1.2 * s, 0.9 * s, 0.9 * s);
      }

      // Black helmet chin straps + buckle
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(-14 * s, 0);
      ctx.quadraticCurveTo(-12 * s, 15 * s, 0, 18 * s);
      ctx.quadraticCurveTo(12 * s, 15 * s, 14 * s, 0);
      ctx.stroke();

      // Nose with warm highlight
      ctx.fillStyle = '#c87c56';
      ctx.beginPath();
      ctx.ellipse(0, 2.5 * s, 3.2 * s, 2.3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 224, 200, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-0.6 * s, 1.5 * s, 1.4 * s, 1 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wide joyful toothy grin (signature refs/8.jpg!)
      ctx.fillStyle = '#6b2025';
      ctx.beginPath();
      ctx.moveTo(-9.5 * s, 6.2 * s);
      ctx.quadraticCurveTo(0, 15 * s, 9.5 * s, 6.2 * s);
      ctx.quadraticCurveTo(0, 8.2 * s, -9.5 * s, 6.2 * s);
      ctx.closePath();
      ctx.fill();

      // White upper teeth row
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.moveTo(-8.2 * s, 6.8 * s);
      ctx.quadraticCurveTo(0, 8.6 * s, 8.2 * s, 6.8 * s);
      ctx.quadraticCurveTo(6.5 * s, 11.2 * s, 0, 11.6 * s);
      ctx.quadraticCurveTo(-6.5 * s, 11.2 * s, -8.2 * s, 6.8 * s);
      ctx.closePath();
      ctx.fill();

      // Smile crease lines
      ctx.strokeStyle = '#9f573a';
      ctx.lineWidth = 0.9 * s;
      ctx.beginPath();
      ctx.moveTo(-10.5 * s, 5 * s);
      ctx.quadraticCurveTo(-11.5 * s, 8 * s, -9 * s, 10.5 * s);
      ctx.moveTo(10.5 * s, 5 * s);
      ctx.quadraticCurveTo(11.5 * s, 8 * s, 9 * s, 10.5 * s);
      ctx.stroke();

      // Iridescent Blue-Purple Shield Cycling Glasses + White Temples (refs/8.jpg)
      ctx.fillStyle = '#f8fafc';
      rr(ctx, -17.5 * s, -7.2 * s, 4 * s, 3.2 * s, 1 * s);
      ctx.fill();
      rr(ctx, 13.5 * s, -7.2 * s, 4 * s, 3.2 * s, 1 * s);
      ctx.fill();

      const glassGrad = ctx.createLinearGradient(-15 * s, -10 * s, 15 * s, 2 * s);
      glassGrad.addColorStop(0, '#1e1b4b');
      glassGrad.addColorStop(0.35, '#2563eb');
      glassGrad.addColorStop(0.55, '#00d4ff');
      glassGrad.addColorStop(0.8, '#4f46e5');
      glassGrad.addColorStop(1, '#1e1b4b');

      ctx.beginPath();
      ctx.moveTo(-15.5 * s, -8.5 * s);
      ctx.quadraticCurveTo(0, -11 * s, 15.5 * s, -8.5 * s);
      ctx.lineTo(14.5 * s, -1 * s);
      ctx.quadraticCurveTo(7 * s, 2.5 * s, 1.8 * s, -0.8 * s);
      ctx.lineTo(0, -2.2 * s);
      ctx.lineTo(-1.8 * s, -0.8 * s);
      ctx.quadraticCurveTo(-7 * s, 2.5 * s, -14.5 * s, -1 * s);
      ctx.closePath();
      ctx.fillStyle = glassGrad;
      ctx.fill();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 0.9 * s;
      ctx.stroke();

      // Animated specular sweep across glasses
      ctx.save();
      ctx.clip();
      const sweep = ((time * 1.3) % 2.4) - 0.7;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.beginPath();
      ctx.moveTo(-18 * s + sweep * 36 * s, -11 * s);
      ctx.lineTo(-12 * s + sweep * 36 * s, -11 * s);
      ctx.lineTo(-17 * s + sweep * 36 * s, 3 * s);
      ctx.lineTo(-23 * s + sweep * 36 * s, 3 * s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Neon-Yellow & Royal-Blue Tinkoff / S-WORKS Aero Helmet
      const helmGrad = ctx.createLinearGradient(-18 * s, -24 * s, 18 * s, -8 * s);
      helmGrad.addColorStop(0, '#d9f900');
      helmGrad.addColorStop(0.5, '#facc15');
      helmGrad.addColorStop(1, '#bef200');
      ctx.fillStyle = helmGrad;
      ctx.beginPath();
      ctx.moveTo(-17.5 * s, -8 * s);
      ctx.quadraticCurveTo(-18.5 * s, -22 * s, 0, -24.5 * s);
      ctx.quadraticCurveTo(18.5 * s, -22 * s, 17.5 * s, -8 * s);
      ctx.quadraticCurveTo(0, -10.5 * s, -17.5 * s, -8 * s);
      ctx.closePath();
      ctx.fill();

      // Royal blue Tinkoff trim band along lower helmet edge
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(-17.2 * s, -9.5 * s);
      ctx.quadraticCurveTo(-9 * s, -12.5 * s, 0, -10.5 * s);
      ctx.quadraticCurveTo(9 * s, -12.5 * s, 17.2 * s, -9.5 * s);
      ctx.lineTo(17.5 * s, -7.8 * s);
      ctx.quadraticCurveTo(0, -10.2 * s, -17.5 * s, -7.8 * s);
      ctx.closePath();
      ctx.fill();

      // Helmet aero vents with hair peeking inside
      ctx.fillStyle = '#18181b';
      [
        [-8 * s, -13.5 * s, 4.2 * s, 2.2 * s, -0.2],
        [8 * s, -13.5 * s, 4.2 * s, 2.2 * s, 0.2],
      ].forEach(([vx, vy, rx, ry, rot]) => {
        ctx.beginPath();
        ctx.ellipse(vx, vy, rx, ry, rot, 0, Math.PI * 2);
        ctx.fill();
      });
      // Center V-vent with brown hair tufts
      ctx.beginPath();
      ctx.moveTo(-4.5 * s, -22.5 * s);
      ctx.lineTo(4.5 * s, -22.5 * s);
      ctx.lineTo(0, -13.5 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#6b4c35';
      ctx.fillRect(-1.8 * s, -21.5 * s, 3.6 * s, 4.5 * s);

      // Tiny Tinkoff tag on side of helmet
      ctx.fillStyle = '#0f172a';
      ctx.font = `900 ${Math.max(3.5, Math.round(3.6 * s))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Tinkoff', 10.5 * s, -15 * s);

    } else if (charId === 'drs4hop') {
      // ---------- DRS4HOP: Ash-brown straight fringe/bangs, friendly smirk, PARIS 2024 tee ----------
      if (showBody) {
        // Neck
        ctx.fillStyle = '#d39d7b';
        rr(ctx, -5.5 * s, 11 * s, 11 * s, 11 * s, 3.5 * s);
        ctx.fill();

        // Black crew-neck PARIS 2024 t-shirt
        rr(ctx, -20 * s, 17 * s, 40 * s, 25 * s, 9 * s);
        ctx.fillStyle = '#12151c';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.9 * s;
        ctx.stroke();

        // Collar rim
        ctx.strokeStyle = '#283140';
        ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        ctx.arc(0, 17 * s, 7 * s, 0.1, Math.PI - 0.1);
        ctx.stroke();

        // Gold/silver circular flame crest + PARIS 2024 + Olympic rings
        ctx.strokeStyle = '#d4d4d8';
        ctx.lineWidth = 1.1 * s;
        ctx.beginPath();
        ctx.arc(0, 24.5 * s, 4.2 * s, 0, Math.PI * 2);
        ctx.stroke();
        // Inner flame silhouette
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(0, 21.4 * s);
        ctx.quadraticCurveTo(2.4 * s, 24.5 * s, 0, 27.4 * s);
        ctx.quadraticCurveTo(-2.4 * s, 24.5 * s, 0, 21.4 * s);
        ctx.fill();

        ctx.fillStyle = '#e4e4e7';
        ctx.font = `900 ${Math.max(4, Math.round(4.1 * s))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('PARIS 2024', 0, 32 * s);

        const ringCols = ['#38bdf8', '#facc15', '#f4f4f5', '#4ade80', '#f87171'];
        ringCols.forEach((col, i) => {
          ctx.strokeStyle = col;
          ctx.lineWidth = 0.9 * s;
          ctx.beginPath();
          ctx.arc(-5.6 * s + i * 2.8 * s, 35.6 * s, 1.3 * s, 0, Math.PI * 2);
          ctx.stroke();
        });
      }

      // Ears
      ctx.fillStyle = '#d49d7a';
      ctx.beginPath();
      ctx.ellipse(-13.5 * s, 2 * s, 2.7 * s, 4.6 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(13.5 * s, 2 * s, 2.7 * s, 4.6 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Back hair silhouette behind head
      ctx.fillStyle = '#5c4632';
      ctx.beginPath();
      ctx.ellipse(0, -4 * s, 14.8 * s, 16 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Youthful face
      const skinGrad = ctx.createRadialGradient(-2 * s, 0, 2 * s, 0, 3 * s, 16 * s);
      skinGrad.addColorStop(0, '#f3cbb0');
      skinGrad.addColorStop(0.75, '#e2ac89');
      skinGrad.addColorStop(1, '#c38865');
      ctx.fillStyle = skinGrad;
      ctx.beginPath();
      ctx.moveTo(-13 * s, -7 * s);
      ctx.quadraticCurveTo(-13.5 * s, 8 * s, -7 * s, 14.5 * s);
      ctx.quadraticCurveTo(0, 17.5 * s, 7 * s, 14.5 * s);
      ctx.quadraticCurveTo(13.5 * s, 8 * s, 13 * s, -7 * s);
      ctx.closePath();
      ctx.fill();

      // Subtle chin dimple (refs/6.jpg)
      ctx.strokeStyle = 'rgba(155, 95, 65, 0.45)';
      ctx.lineWidth = 0.8 * s;
      ctx.beginPath();
      ctx.moveTo(0, 13.5 * s);
      ctx.lineTo(0, 15.2 * s);
      ctx.stroke();

      // Friendly warm eyes
      const brow = mood === 'panic' ? -0.25 : 0;
      drawEye(ctx, -5.2 * s, -0.5 * s, 2.2 * s, '#4b3628', gazeX, blinkOpen, brow);
      drawEye(ctx, 5.2 * s, -0.5 * s, 2.2 * s, '#4b3628', gazeX, blinkOpen, -brow);

      // Nose
      ctx.fillStyle = '#cb8b67';
      ctx.beginPath();
      ctx.ellipse(0, 3.6 * s, 2.4 * s, 1.8 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Relaxed friendly smirk
      ctx.strokeStyle = '#8b4e3c';
      ctx.lineWidth = 1.4 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (mood === 'panic') {
        ctx.ellipse(0, 9.2 * s, 2.5 * s, 2 * s, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#6b2025';
        ctx.fill();
      } else {
        ctx.moveTo(-4.8 * s, 8.6 * s);
        ctx.quadraticCurveTo(0.5 * s, 11 * s, 5.2 * s, 7.6 * s);
        ctx.stroke();
      }

      // Signature thick textured ash-brown fringe/bangs covering forehead (refs/6.jpg!)
      const hairGrad = ctx.createLinearGradient(0, -21 * s, 0, -2 * s);
      hairGrad.addColorStop(0, '#785c40');
      hairGrad.addColorStop(0.6, '#624932');
      hairGrad.addColorStop(1, '#4a3523');
      ctx.fillStyle = hairGrad;
      ctx.beginPath();
      ctx.moveTo(-14.5 * s, -3 * s);
      ctx.quadraticCurveTo(-15.5 * s, -19 * s, 0, -20.5 * s);
      ctx.quadraticCurveTo(15.5 * s, -19 * s, 14.5 * s, -3 * s);
      // Jagged natural bang strands down to brow line
      ctx.lineTo(11 * s, -5.5 * s);
      ctx.lineTo(8.5 * s, -2.5 * s);
      ctx.lineTo(5 * s, -5.2 * s);
      ctx.lineTo(2 * s, -2.2 * s);
      ctx.lineTo(-1.5 * s, -5.0 * s);
      ctx.lineTo(-5 * s, -2.3 * s);
      ctx.lineTo(-8.5 * s, -5.2 * s);
      ctx.lineTo(-11.5 * s, -2.6 * s);
      ctx.closePath();
      ctx.fill();

      // Hair texture strokes
      ctx.strokeStyle = 'rgba(165, 130, 95, 0.35)';
      ctx.lineWidth = 0.8 * s;
      for (let hx = -9; hx <= 9; hx += 3.5) {
        ctx.beginPath();
        ctx.moveTo(hx * s * 0.7, -18 * s);
        ctx.quadraticCurveTo(hx * s, -11 * s, hx * s * 1.05, -4 * s);
        ctx.stroke();
      }

    } else if (charId === 'zabl') {
      // ---------- ZABL: Explicitly CHUBBY & SHORT (толстый и невысокий), black jacket + tee, GOLD WATCH 👍 ----------
      if (showBody) {
        // Wide heavy plump shoulders + open black hooded zip jacket over black t-shirt
        rr(ctx, -26 * s, 14 * s, 52 * s, 26 * s, 12 * s);
        ctx.fillStyle = '#1e2430';
        ctx.fill();
        ctx.strokeStyle = '#3b4556';
        ctx.lineWidth = 1.1 * s;
        ctx.stroke();

        // Jacket hood collar bulk around short neck
        ctx.fillStyle = '#272f3d';
        ctx.beginPath();
        ctx.ellipse(0, 14.5 * s, 16 * s, 5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner black crew-neck t-shirt V-panel
        ctx.fillStyle = '#0e1118';
        ctx.beginPath();
        ctx.moveTo(-9 * s, 15 * s);
        ctx.lineTo(9 * s, 15 * s);
        ctx.lineTo(7 * s, 40 * s);
        ctx.lineTo(-7 * s, 40 * s);
        ctx.closePath();
        ctx.fill();

        // Metallic jacket zipper tracks
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1 * s;
        ctx.beginPath();
        ctx.moveTo(-7.5 * s, 16 * s);
        ctx.lineTo(-7 * s, 40 * s);
        ctx.moveTo(7.5 * s, 16 * s);
        ctx.lineTo(7 * s, 40 * s);
        ctx.stroke();

        // Thick short neck
        ctx.fillStyle = '#d39a76';
        rr(ctx, -8 * s, 9 * s, 16 * s, 9 * s, 4 * s);
        ctx.fill();
      }

      // Ears
      ctx.fillStyle = '#d59d78';
      ctx.beginPath();
      ctx.ellipse(-16.5 * s, 1 * s, 2.8 * s, 4.8 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(16.5 * s, 1 * s, 2.8 * s, 4.8 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Round, wide chubby head & full cheeks + double chin (refs/1.jpg & 2.jpg!)
      const skinGrad = ctx.createRadialGradient(-3 * s, -2 * s, 3 * s, 0, 2 * s, 19 * s);
      skinGrad.addColorStop(0, '#f4cab0');
      skinGrad.addColorStop(0.68, '#e3aa87');
      skinGrad.addColorStop(1, '#c38461');
      ctx.fillStyle = skinGrad;
      ctx.beginPath();
      ctx.moveTo(-15.5 * s, -7 * s);
      ctx.quadraticCurveTo(-18 * s, 7 * s, -12 * s, 13.5 * s);
      ctx.quadraticCurveTo(0, 19 * s, 12 * s, 13.5 * s);
      ctx.quadraticCurveTo(18 * s, 7 * s, 15.5 * s, -7 * s);
      ctx.quadraticCurveTo(14 * s, -17 * s, 0, -17.5 * s);
      ctx.quadraticCurveTo(-14 * s, -17 * s, -15.5 * s, -7 * s);
      ctx.closePath();
      ctx.fill();

      // Rosy full-cheek volume & double-chin crease
      ctx.fillStyle = 'rgba(225, 135, 115, 0.22)';
      ctx.beginPath();
      ctx.ellipse(-9 * s, 4.5 * s, 4.8 * s, 3.6 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(9 * s, 4.5 * s, 4.8 * s, 3.6 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(150, 88, 58, 0.52)';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(-6.5 * s, 13.5 * s);
      ctx.quadraticCurveTo(0, 15.8 * s, 6.5 * s, 13.5 * s);
      ctx.stroke();

      // Steel-blue calm eyes (refs/1.jpg, 2.jpg)
      const brow = mood === 'panic' ? -0.3 : 0.05;
      drawEye(ctx, -5.8 * s, -1.5 * s, 2.1 * s, '#476b8c', gazeX, blinkOpen, brow);
      drawEye(ctx, 5.8 * s, -1.5 * s, 2.1 * s, '#476b8c', gazeX, blinkOpen, -brow);

      // Nose
      ctx.fillStyle = '#ca8763';
      ctx.beginPath();
      ctx.ellipse(0, 3.2 * s, 3 * s, 2.1 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Serious / subtle smirk mouth
      ctx.strokeStyle = '#8b4c3d';
      ctx.lineWidth = 1.4 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (mood === 'hype') {
        ctx.moveTo(-4.5 * s, 8.2 * s);
        ctx.quadraticCurveTo(0, 10.6 * s, 5 * s, 7.6 * s);
      } else {
        ctx.moveTo(-4.2 * s, 8.6 * s);
        ctx.quadraticCurveTo(0, 9.2 * s, 4.2 * s, 8.6 * s);
      }
      ctx.stroke();

      // Short side-parted brown hair (refs/1.jpg, 2.jpg)
      const hairGrad = ctx.createLinearGradient(0, -19 * s, 0, -8 * s);
      hairGrad.addColorStop(0, '#4a3525');
      hairGrad.addColorStop(1, '#2c1e15');
      ctx.fillStyle = hairGrad;
      ctx.beginPath();
      ctx.moveTo(-15.5 * s, -4 * s);
      ctx.quadraticCurveTo(-16.5 * s, -18 * s, -2 * s, -18.8 * s);
      ctx.quadraticCurveTo(15.5 * s, -18.5 * s, 15.5 * s, -4 * s);
      ctx.quadraticCurveTo(12 * s, -11.5 * s, 2 * s, -11 * s);
      ctx.quadraticCurveTo(-8 * s, -10.5 * s, -13 * s, -8.5 * s);
      ctx.closePath();
      ctx.fill();

      // KFC bucket in lap when riding shotgun!
      if (opts.showKfcBucket) {
        drawKfcBucket(ctx, -10 * s, 26 * s, s * 0.95, time);
      }

      // Raised Gold-Watch Thumbs-Up!
      if (opts.showThumbsUp) {
        const side = opts.thumbSide || -1;
        drawGoldWatchThumb(ctx, side * 19 * s, 22 * s, s * 0.85, time);
      }

    } else if (charId === 'trofim') {
      // ---------- TROFIM: Blue-grey eyes, furrowed brows, black sporty visor shades on forehead, white tee + dark jacket (refs 11 & 12) ----------
      if (showBody) {
        // Neck & fine black necklace cord (photo 11)
        ctx.fillStyle = '#d7a180';
        rr(ctx, -5.2 * s, 10.5 * s, 10.4 * s, 12 * s, 3.2 * s);
        ctx.fill();

        // Dark charcoal open puffer jacket shoulders over crisp white t-shirt
        rr(ctx, -20.5 * s, 16 * s, 41 * s, 26 * s, 8 * s);
        ctx.fillStyle = '#181c24';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.9 * s;
        ctx.stroke();

        // White crew-neck t-shirt front V/core panel
        ctx.fillStyle = '#f4f6f9';
        ctx.beginPath();
        ctx.moveTo(-10.5 * s, 16 * s);
        ctx.lineTo(10.5 * s, 16 * s);
        ctx.lineTo(8.5 * s, 42 * s);
        ctx.lineTo(-8.5 * s, 42 * s);
        ctx.closePath();
        ctx.fill();

        // Thin black cord necklace
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 1.1 * s;
        ctx.beginPath();
        ctx.arc(0, 15.5 * s, 5.8 * s, 0.15, Math.PI - 0.15);
        ctx.stroke();

        // Puffed jacket lapels
        ctx.fillStyle = '#242934';
        rr(ctx, -18.5 * s, 16 * s, 9 * s, 24 * s, 4 * s);
        ctx.fill();
        rr(ctx, 9.5 * s, 16 * s, 9 * s, 24 * s, 4 * s);
        ctx.fill();
      }

      // Ears
      ctx.fillStyle = '#d59d7a';
      ctx.beginPath();
      ctx.ellipse(-13.2 * s, 1.5 * s, 2.7 * s, 4.7 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(13.2 * s, 1.5 * s, 2.7 * s, 4.7 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Structured angular face with clean square jawline
      const skinGrad = ctx.createRadialGradient(-2 * s, -2 * s, 2 * s, 0, 2 * s, 16 * s);
      skinGrad.addColorStop(0, '#f4cbb0');
      skinGrad.addColorStop(0.7, '#dfb08f');
      skinGrad.addColorStop(1, '#bd8664');
      ctx.fillStyle = skinGrad;
      ctx.beginPath();
      ctx.moveTo(-12.6 * s, -7.5 * s);
      ctx.quadraticCurveTo(-13 * s, 6.5 * s, -6.4 * s, 14.2 * s);
      ctx.quadraticCurveTo(0, 17 * s, 6.4 * s, 14.2 * s);
      ctx.quadraticCurveTo(13 * s, 6.5 * s, 12.6 * s, -7.5 * s);
      ctx.closePath();
      ctx.fill();

      // Subtle brow furrow shadow & cheekbones
      ctx.fillStyle = 'rgba(130, 74, 48, 0.16)';
      ctx.beginPath();
      ctx.ellipse(0, -3.5 * s, 3.2 * s, 1.5 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(-7.5 * s, 4.5 * s, 2.5 * s, 1.7 * s, 0.35, 0, Math.PI * 2);
      ctx.ellipse(7.5 * s, 4.5 * s, 2.5 * s, 1.7 * s, -0.35, 0, Math.PI * 2);
      ctx.fill();

      // Distinct cool blue-grey eyes + firm brows
      const brow = mood === 'panic' ? -0.22 : 0.16;
      drawEye(ctx, -5.2 * s, -0.8 * s, 2.15 * s, '#4b6e8a', gazeX, blinkOpen, brow);
      drawEye(ctx, 5.2 * s, -0.8 * s, 2.15 * s, '#4b6e8a', gazeX, blinkOpen, -brow);

      // Straight defined nose
      ctx.fillStyle = '#c58763';
      ctx.beginPath();
      ctx.ellipse(0, 3.3 * s, 2.3 * s, 2.1 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Composed straight serious mouth
      ctx.strokeStyle = '#7e4738';
      ctx.lineWidth = 1.45 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-3.8 * s, 8.6 * s);
      ctx.quadraticCurveTo(0, 8.2 * s, 3.8 * s, 8.7 * s);
      ctx.stroke();

      // Short textured brown hair (photo 11)
      const hairGrad = ctx.createLinearGradient(0, -19 * s, 0, -6 * s);
      hairGrad.addColorStop(0, '#463224');
      hairGrad.addColorStop(1, '#261a12');
      ctx.fillStyle = hairGrad;
      ctx.beginPath();
      ctx.moveTo(-13.2 * s, -3.5 * s);
      ctx.quadraticCurveTo(-14.2 * s, -17.8 * s, 0, -18.8 * s);
      ctx.quadraticCurveTo(14.2 * s, -17.8 * s, 13.2 * s, -3.5 * s);
      ctx.lineTo(11.4 * s, -8.5 * s);
      ctx.lineTo(6.5 * s, -9.8 * s);
      ctx.lineTo(1 * s, -9.2 * s);
      ctx.lineTo(-4.5 * s, -10 * s);
      ctx.lineTo(-10.8 * s, -8.4 * s);
      ctx.closePath();
      ctx.fill();

      // Sleek black wrap-around sporty shield sunglasses perched on forehead (photo 12)
      ctx.fillStyle = '#07090d';
      rr(ctx, -12.6 * s, -13.2 * s, 25.2 * s, 4.6 * s, 1.8 * s);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      rr(ctx, -11.4 * s, -12.4 * s, 9.8 * s, 3.2 * s, 1.2 * s);
      ctx.fill();
      rr(ctx, 1.6 * s, -12.4 * s, 9.8 * s, 3.2 * s, 1.2 * s);
      ctx.fill();
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
      ctx.lineWidth = 0.9 * s;
      ctx.beginPath();
      ctx.moveTo(-9.5 * s, -12 * s);
      ctx.lineTo(-4.5 * s, -9.5 * s);
      ctx.moveTo(3.5 * s, -12 * s);
      ctx.lineTo(8.5 * s, -9.5 * s);
      ctx.stroke();

    } else if (charId === 'puntus') {
      // ---------- PUNTUS: Tall lean build, center-parted curtain hair, rectangular glasses, white wired earbuds, navy tee (refs 14 & 15) ----------
      if (showBody) {
        // Longer slender neck (reflecting tall stature)
        ctx.fillStyle = '#deb195';
        rr(ctx, -4.6 * s, 10 * s, 9.2 * s, 13 * s, 3 * s);
        ctx.fill();

        // Deep navy blue crew-neck t-shirt
        rr(ctx, -19.5 * s, 16.8 * s, 39 * s, 26 * s, 8 * s);
        const teeGrad = ctx.createLinearGradient(-18 * s, 16 * s, 18 * s, 42 * s);
        teeGrad.addColorStop(0, '#2e457d');
        teeGrad.addColorStop(1, '#1d2d57');
        ctx.fillStyle = teeGrad;
        ctx.fill();
        ctx.strokeStyle = '#3b589c';
        ctx.lineWidth = 0.9 * s;
        ctx.stroke();

        // Collar trim
        ctx.strokeStyle = '#4769b2';
        ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        ctx.arc(0, 17 * s, 6.4 * s, 0.12, Math.PI - 0.12);
        ctx.stroke();
      }

      // Ears + white wired earbuds tucked in
      ctx.fillStyle = '#dcb093';
      ctx.beginPath();
      ctx.ellipse(-12.2 * s, 1.5 * s, 2.5 * s, 4.5 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(12.2 * s, 1.5 * s, 2.5 * s, 4.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Slender elongated oval face with slightly narrower chin (photos 14 & 15)
      const skinGrad = ctx.createRadialGradient(-1.5 * s, -1 * s, 2 * s, 0, 2 * s, 16 * s);
      skinGrad.addColorStop(0, '#fae0ce');
      skinGrad.addColorStop(0.72, '#ecc3ab');
      skinGrad.addColorStop(1, '#cfa187');
      ctx.fillStyle = skinGrad;
      ctx.beginPath();
      ctx.moveTo(-11.8 * s, -8.5 * s);
      ctx.quadraticCurveTo(-11.6 * s, 6.8 * s, -5.2 * s, 14.8 * s);
      ctx.quadraticCurveTo(0, 17.6 * s, 5.2 * s, 14.8 * s);
      ctx.quadraticCurveTo(11.6 * s, 6.8 * s, 11.8 * s, -8.5 * s);
      ctx.closePath();
      ctx.fill();

      // Eyes behind glasses
      const brow = mood === 'panic' ? -0.25 : 0.04;
      drawEye(ctx, -4.8 * s, -0.6 * s, 2.0 * s, '#4a3d33', gazeX, blinkOpen, brow);
      drawEye(ctx, 4.8 * s, -0.6 * s, 2.0 * s, '#4a3d33', gazeX, blinkOpen, -brow);

      // Dark rectangular eyeglasses (signature frames from photos 14 & 15!)
      ctx.strokeStyle = '#181e2c';
      ctx.lineWidth = 1.65 * s;
      ctx.fillStyle = 'rgba(205, 228, 255, 0.14)';
      rr(ctx, -10.4 * s, -4.2 * s, 9.2 * s, 6.4 * s, 1.4 * s);
      ctx.fill();
      ctx.stroke();
      rr(ctx, 1.2 * s, -4.2 * s, 9.2 * s, 6.4 * s, 1.4 * s);
      ctx.fill();
      ctx.stroke();
      // Nose bridge & temple arms
      ctx.beginPath();
      ctx.moveTo(-1.2 * s, -1.6 * s);
      ctx.lineTo(1.2 * s, -1.6 * s);
      ctx.moveTo(-10.4 * s, -2 * s);
      ctx.lineTo(-12.2 * s, -1.4 * s);
      ctx.moveTo(10.4 * s, -2 * s);
      ctx.lineTo(12.2 * s, -1.4 * s);
      ctx.stroke();
      // Glass specular glare
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
      ctx.lineWidth = 0.8 * s;
      ctx.beginPath();
      ctx.moveTo(-8.8 * s, -3.1 * s);
      ctx.lineTo(-6.2 * s, 0.8 * s);
      ctx.moveTo(2.8 * s, -3.1 * s);
      ctx.lineTo(5.4 * s, 0.8 * s);
      ctx.stroke();

      // Slender nose bridge & tip
      ctx.fillStyle = '#cf9e84';
      ctx.beginPath();
      ctx.ellipse(0, 3.6 * s, 2.0 * s, 2.4 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Slightly parted lips (photo 14/15 expression)
      ctx.fillStyle = '#b9696b';
      ctx.beginPath();
      ctx.ellipse(0, 9.2 * s, 3.6 * s, mood === 'hype' ? 2.1 * s : 1.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-2.1 * s, 8.6 * s, 4.2 * s, 0.9 * s);

      // Medium-long chestnut brown center-parted curtain hair flaring outward
      const hairGrad = ctx.createLinearGradient(0, -21 * s, 0, 8 * s);
      hairGrad.addColorStop(0, '#6e4e3a');
      hairGrad.addColorStop(1, '#4a3122');
      ctx.fillStyle = hairGrad;
      // Left curtain sweep
      ctx.beginPath();
      ctx.moveTo(0, -19.2 * s);
      ctx.quadraticCurveTo(-13.5 * s, -19 * s, -16.8 * s, 0.5 * s);
      ctx.quadraticCurveTo(-18.2 * s, 6.2 * s, -13.2 * s, 6.8 * s);
      ctx.quadraticCurveTo(-10.5 * s, -2 * s, -9.8 * s, -7.5 * s);
      ctx.quadraticCurveTo(-5 * s, -11.5 * s, 0, -14.8 * s);
      ctx.closePath();
      ctx.fill();
      // Right curtain sweep
      ctx.beginPath();
      ctx.moveTo(0, -19.2 * s);
      ctx.quadraticCurveTo(13.5 * s, -19 * s, 16.8 * s, 0.5 * s);
      ctx.quadraticCurveTo(18.2 * s, 6.2 * s, 13.2 * s, 6.8 * s);
      ctx.quadraticCurveTo(10.5 * s, -2 * s, 9.8 * s, -7.5 * s);
      ctx.quadraticCurveTo(5 * s, -11.5 * s, 0, -14.8 * s);
      ctx.closePath();
      ctx.fill();

      // White wired earphones hanging down from ears (photos 14 & 15 signature detail!)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(-11.4 * s, 2.2 * s, 1.4 * s, 0, Math.PI * 2);
      ctx.arc(11.4 * s, 2.2 * s, 1.4 * s, 0, Math.PI * 2);
      ctx.fill();
      if (showBody) {
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1.25 * s;
        ctx.beginPath();
        ctx.moveTo(-11.4 * s, 3.2 * s);
        ctx.quadraticCurveTo(-8.5 * s, 14 * s, -4.5 * s, 29 * s);
        ctx.moveTo(11.4 * s, 3.2 * s);
        ctx.quadraticCurveTo(8.5 * s, 14 * s, 4.5 * s, 29 * s);
        ctx.stroke();
      }

    } else if (charId === 'mel') {
      // ---------- MEL: Voluminous curly dark-brown hair, intense dark eyes, beauty mark, charcoal adidas sweatshirt (ref 16) ----------
      if (showBody) {
        ctx.fillStyle = '#dfb59a';
        rr(ctx, -5.2 * s, 10.5 * s, 10.4 * s, 11.5 * s, 3.2 * s);
        ctx.fill();

        // Dark charcoal-grey crew-neck sweatshirt
        rr(ctx, -20 * s, 16 * s, 40 * s, 26 * s, 8 * s);
        const swGrad = ctx.createLinearGradient(-18 * s, 16 * s, 18 * s, 42 * s);
        swGrad.addColorStop(0, '#3a3e46');
        swGrad.addColorStop(1, '#23262c');
        ctx.fillStyle = swGrad;
        ctx.fill();
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 0.9 * s;
        ctx.stroke();

        // Ribbed sweatshirt collar
        ctx.strokeStyle = '#1f2329';
        ctx.lineWidth = 2.0 * s;
        ctx.beginPath();
        ctx.arc(0, 16.5 * s, 7.2 * s, 0.1, Math.PI - 0.1);
        ctx.stroke();

        // Small crisp chest print hint (adidas-style corner print, photo 16)
        ctx.fillStyle = '#e5e7eb';
        ctx.font = `800 ${Math.max(3.5, Math.round(3.6 * s))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('adidas', -7.5 * s, 30 * s);
      }

      // Ears
      ctx.fillStyle = '#dbb196';
      ctx.beginPath();
      ctx.ellipse(-12.6 * s, 1.5 * s, 2.7 * s, 4.6 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(12.6 * s, 1.5 * s, 2.7 * s, 4.6 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Oval youthfully sculpted face
      const skinGrad = ctx.createRadialGradient(-2 * s, -1 * s, 2 * s, 0, 2 * s, 16 * s);
      skinGrad.addColorStop(0, '#f7d8c3');
      skinGrad.addColorStop(0.72, '#e6b89c');
      skinGrad.addColorStop(1, '#c59275');
      ctx.fillStyle = skinGrad;
      ctx.beginPath();
      ctx.moveTo(-12.2 * s, -7 * s);
      ctx.quadraticCurveTo(-12.4 * s, 6.8 * s, -6 * s, 14.2 * s);
      ctx.quadraticCurveTo(0, 16.8 * s, 6 * s, 14.2 * s);
      ctx.quadraticCurveTo(12.4 * s, 6.8 * s, 12.2 * s, -7 * s);
      ctx.closePath();
      ctx.fill();

      // Deep intense dark eyes
      const brow = mood === 'panic' ? -0.24 : 0.08;
      drawEye(ctx, -5 * s, -0.5 * s, 2.2 * s, '#1f1612', gazeX, blinkOpen, brow);
      drawEye(ctx, 5 * s, -0.5 * s, 2.2 * s, '#1f1612', gazeX, blinkOpen, -brow);

      // Straight defined nose
      ctx.fillStyle = '#cf977a';
      ctx.beginPath();
      ctx.ellipse(0, 3.5 * s, 2.2 * s, 2.2 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Small beauty mark to right of lip (mirrored photo 16)
      ctx.fillStyle = '#6c4738';
      ctx.beginPath();
      ctx.arc(5.4 * s, 7.6 * s, 0.7 * s, 0, Math.PI * 2);
      ctx.fill();

      // Full composed lips
      ctx.fillStyle = '#ba6d6e';
      ctx.beginPath();
      ctx.ellipse(0, 8.8 * s, 3.8 * s, mood === 'hype' ? 1.8 * s : 1.35 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7b4344';
      ctx.lineWidth = 0.85 * s;
      ctx.beginPath();
      ctx.moveTo(-3.4 * s, 8.7 * s);
      ctx.lineTo(3.4 * s, 8.7 * s);
      ctx.stroke();

      // Fluffy voluminous curly dark-brown hair dome + layered curls (photo 16!)
      const curlyGrad = ctx.createRadialGradient(0, -13 * s, 3 * s, 0, -11 * s, 19 * s);
      curlyGrad.addColorStop(0, '#4a3326');
      curlyGrad.addColorStop(1, '#22160f');
      ctx.fillStyle = curlyGrad;
      const curls = [
        [-12.5, -5.5, 4.6], [-13.4, -10.2, 5.2], [-9.2, -14.8, 5.6],
        [-3.2, -16.8, 6.0], [3.5, -16.6, 6.0], [9.4, -14.4, 5.6],
        [13.4, -9.8, 5.2], [12.5, -5.4, 4.6],
        [-8.5, -9.2, 4.2], [-3.2, -9.8, 4.4], [2.8, -9.8, 4.4], [8.4, -9.0, 4.2],
      ];
      ctx.beginPath();
      curls.forEach(([cxp, cyp, cr]) => {
        ctx.moveTo((cxp + cr) * s, cyp * s);
        ctx.arc(cxp * s, cyp * s, cr * s, 0, Math.PI * 2);
      });
      ctx.fill();

    } else {
      // ---------- PETROVICH: Taller lean build, Caesar micro-bangs, light-grey rower tee (refs/4.jpg) ----------
      if (showBody) {
        // Neck
        ctx.fillStyle = '#cf9876';
        rr(ctx, -5 * s, 10.5 * s, 10 * s, 11 * s, 3 * s);
        ctx.fill();

        // Crisp light-grey/white crew-neck t-shirt
        rr(ctx, -20 * s, 16 * s, 40 * s, 26 * s, 8 * s);
        ctx.fillStyle = '#dfe5ed';
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.9 * s;
        ctx.stroke();

        // Collar trim
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        ctx.arc(0, 16 * s, 6.5 * s, 0.1, Math.PI - 0.1);
        ctx.stroke();

        // Signature horizontal rowing scull / kayaker silhouette on chest (refs/4.jpg!)
        const ry = 26 * s;
        // Two long horizontal oars/sculls
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.moveTo(-12.5 * s, ry);
        ctx.lineTo(12.5 * s, ry);
        ctx.stroke();
        // Scull blades
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(-12.5 * s, ry, 2.2 * s, 1 * s, 0, 0, Math.PI * 2);
        ctx.ellipse(12.5 * s, ry, 2.2 * s, 1 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // Vertical kayak shell + rower silhouette
        ctx.beginPath();
        ctx.ellipse(0, ry, 2.4 * s, 6.2 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ears
      ctx.fillStyle = '#cf9673';
      ctx.beginPath();
      ctx.ellipse(-13 * s, 1 * s, 2.8 * s, 4.8 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(13 * s, 1 * s, 2.8 * s, 4.8 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sharper angular olive-tan face
      const skinGrad = ctx.createRadialGradient(-2 * s, -1 * s, 2 * s, 0, 2 * s, 16 * s);
      skinGrad.addColorStop(0, '#ecc09f');
      skinGrad.addColorStop(0.72, '#d89d79');
      skinGrad.addColorStop(1, '#b67956');
      ctx.fillStyle = skinGrad;
      ctx.beginPath();
      ctx.moveTo(-12.5 * s, -7 * s);
      ctx.quadraticCurveTo(-12.5 * s, 7 * s, -6.5 * s, 14 * s);
      ctx.quadraticCurveTo(0, 17 * s, 6.5 * s, 14 * s);
      ctx.quadraticCurveTo(12.5 * s, 7 * s, 12.5 * s, -7 * s);
      ctx.closePath();
      ctx.fill();

      // Subtle cheekbone shadow
      ctx.fillStyle = 'rgba(140, 78, 52, 0.16)';
      ctx.beginPath();
      ctx.ellipse(-7 * s, 4 * s, 2.8 * s, 1.8 * s, 0.4, 0, Math.PI * 2);
      ctx.ellipse(7 * s, 4 * s, 2.8 * s, 1.8 * s, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Focused dark eyes
      const brow = mood === 'panic' ? -0.25 : 0.12;
      drawEye(ctx, -5 * s, -1 * s, 2.1 * s, '#2f2118', gazeX, blinkOpen, brow);
      drawEye(ctx, 5 * s, -1 * s, 2.1 * s, '#2f2118', gazeX, blinkOpen, -brow);

      // Nose
      ctx.fillStyle = '#c2815d';
      ctx.beginPath();
      ctx.ellipse(0, 3.2 * s, 2.4 * s, 2 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Composed boss expression
      ctx.strokeStyle = '#7c4335';
      ctx.lineWidth = 1.4 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4 * s, 8.6 * s);
      ctx.quadraticCurveTo(0, 8.2 * s, 4 * s, 8.8 * s);
      ctx.stroke();

      // Signature short dark Caesar crop with straight micro-bangs (refs/4.jpg!)
      const hairGrad = ctx.createLinearGradient(0, -19 * s, 0, -7 * s);
      hairGrad.addColorStop(0, '#27201c');
      hairGrad.addColorStop(1, '#15110f');
      ctx.fillStyle = hairGrad;
      ctx.beginPath();
      ctx.moveTo(-13 * s, -4 * s);
      ctx.quadraticCurveTo(-13.8 * s, -17.5 * s, 0, -18.5 * s);
      ctx.quadraticCurveTo(13.8 * s, -17.5 * s, 13 * s, -4 * s);
      ctx.lineTo(11 * s, -8 * s);
      ctx.lineTo(8 * s, -7.2 * s);
      ctx.lineTo(5 * s, -8.2 * s);
      ctx.lineTo(2 * s, -7.3 * s);
      ctx.lineTo(-1 * s, -8.2 * s);
      ctx.lineTo(-4.5 * s, -7.2 * s);
      ctx.lineTo(-8 * s, -8.1 * s);
      ctx.lineTo(-11 * s, -7.5 * s);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Generates crisp high-DPI illustrated character avatar Data URLs for HUD cams & Garage cards.
   */
  function generateAvatarDataURL(charId, width, height, variant) {
    const w = width || 160;
    const h = height || 180;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');

    // Rich themed backdrop matching each character's vibe
    const bg = ctx.createLinearGradient(0, 0, w, h);
    if (charId === 'waldemaree') {
      bg.addColorStop(0, '#0ea5e9');
      bg.addColorStop(1, '#1e3a8a');
    } else if (charId === 'drs4hop') {
      bg.addColorStop(0, '#334155');
      bg.addColorStop(1, '#0f172a');
    } else if (charId === 'zabl') {
      bg.addColorStop(0, '#2b2018');
      bg.addColorStop(1, '#0f131a');
    } else if (charId === 'trofim') {
      bg.addColorStop(0, '#7f1d1d');
      bg.addColorStop(1, '#18181b');
    } else if (charId === 'puntus') {
      bg.addColorStop(0, '#1e3a8a');
      bg.addColorStop(1, '#090d16');
    } else if (charId === 'mel') {
      bg.addColorStop(0, '#374151');
      bg.addColorStop(1, '#111827');
    } else {
      bg.addColorStop(0, '#1e293b');
      bg.addColorStop(1, '#090d14');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle rim glow behind character
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.42, 6, w * 0.5, h * 0.42, w * 0.55);
    glow.addColorStop(0, 'rgba(255, 210, 120, 0.22)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    const scale = (w / 53) * (charId === 'zabl' ? 0.95 : charId === 'puntus' ? 0.97 : 1.0);
    const offsetY = charId === 'zabl' ? h * 0.41 : h * 0.37;
    const isThumbsVariant = variant === 'thumbs' || variant === 'kfc_thumbs';
    const isKfcVariant = variant === 'kfc' || variant === 'kfc_thumbs';
    drawCharacterPortrait(ctx, charId, w * 0.5, offsetY, scale, {
      time: 0.4,
      tilt: charId === 'petrovich' ? -0.35 : 0,
      mood: isThumbsVariant || charId === 'waldemaree' ? 'hype' : 'normal',
      showKfcBucket: charId === 'zabl' && isKfcVariant,
      showThumbsUp: charId === 'zabl' && isThumbsVariant,
      thumbSide: isKfcVariant ? 0.95 : -0.95,
      showBody: true,
    });

    return c.toDataURL('image/png');
  }

  /**
   * Generates crisp illustrated 3/4 vehicle cards for Garage preview thumbnails (no raw photo files!).
   */
  function generateVehicleCardDataURL(charId, width, height) {
    const w = width || 240;
    const h = height || 160;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');

    // Garage spotlight stage backdrop
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#121a26');
    bg.addColorStop(0.65, '#192232');
    bg.addColorStop(1, '#0c1018');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Spotlight floor reflection
    const floor = ctx.createRadialGradient(w * 0.5, h * 0.78, 8, w * 0.5, h * 0.78, w * 0.52);
    floor.addColorStop(0, 'rgba(56, 189, 248, 0.24)');
    floor.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, 0, w, h);

    // Shadow under vehicle
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.80, w * 0.38, h * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();

    if (charId === 'waldemaree') {
      // Drawn Specialized S-WORKS Chameleon Blue Road Bike side/3-4 showcase!
      const wy = h * 0.65;
      const r = h * 0.18;
      const lx = w * 0.28;
      const rx = w * 0.72;

      // Deep carbon wheels + spokes
      [lx, rx].forEach((wx) => {
        ctx.strokeStyle = '#0b0e14';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(wx, wy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Disc brake rotor
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(wx, wy, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
      });

      // Chameleon blue-indigo carbon aero frame
      const fGrad = ctx.createLinearGradient(lx, wy - 48, rx, wy);
      fGrad.addColorStop(0, '#0284c7');
      fGrad.addColorStop(0.5, '#1d4ed8');
      fGrad.addColorStop(1, '#5b21b6');
      ctx.strokeStyle = fGrad;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lx, wy);
      ctx.lineTo(w * 0.45, wy - 3); // chainstay
      ctx.lineTo(w * 0.38, wy - 44); // seat tube
      ctx.lineTo(lx, wy); // seatstay
      ctx.moveTo(w * 0.38, wy - 44);
      ctx.lineTo(w * 0.65, wy - 46); // top tube
      ctx.lineTo(w * 0.45, wy - 3); // downtube
      ctx.moveTo(w * 0.65, wy - 46);
      ctx.lineTo(rx, wy); // aero fork
      ctx.stroke();

      // Saddle & aero drop bars
      ctx.fillStyle = '#0f172a';
      rr(ctx, w * 0.31, wy - 56, 20, 6, 3);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(w * 0.64, wy - 52);
      ctx.lineTo(w * 0.72, wy - 52);
      ctx.arc(w * 0.72, wy - 42, 10, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();

      // White S-WORKS lettering on downtube
      ctx.save();
      ctx.translate(w * 0.55, wy - 25);
      ctx.rotate(-0.82);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('S-WORKS', 0, 0);
      ctx.restore();
    } else if (charId === 'puntus') {
      // Unicycle Balance Pro fallback showroom preview
      ctx.save();
      ctx.translate(w * 0.5, h * 0.54);
      ctx.fillStyle = '#0d1016';
      ctx.beginPath();
      ctx.ellipse(0, h * 0.14, 24, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.14);
      ctx.lineTo(0, -h * 0.14);
      ctx.stroke();
      ctx.fillStyle = '#dc2626';
      rr(ctx, -15, -h * 0.21, 30, 10, 4);
      ctx.fill();
      ctx.restore();
    } else {
      // Drawn 3/4 Front-Side Showroom Angle (front fascia + full side flank + 2 visible wheels + reflections)
      ctx.save();
      ctx.scale(w / 240, h / 160);

      const isLC = charId === 'petrovich';
      const isE39 = charId === 'zabl';
      const isE30 = charId === 'trofim';
      const isMazda6 = charId === 'mel';
      const isGetz = charId === 'drs4hop';

      // Helper: Draw a foreshortened 3/4 alloy wheel + tire + brake caliper inside wheel well
      const drawWheel34 = (wx, wy, rx, ry, isAlloy, rustyRotor, curbRash) => {
        // Inner dark wheel well shadow
        ctx.fillStyle = '#05070a';
        ctx.beginPath();
        ctx.ellipse(wx, wy - 1.5, rx * 1.18, ry * 1.15, -0.06, 0, Math.PI * 2);
        ctx.fill();

        // Rubber tire sidewall
        ctx.fillStyle = '#11151d';
        ctx.beginPath();
        ctx.ellipse(wx, wy, rx, ry, -0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (!isAlloy) return;

        // Rim lip & metallic dish
        const rimGrad = ctx.createRadialGradient(wx - 1.5, wy - 2, 1, wx, wy, rx * 0.72);
        rimGrad.addColorStop(0, curbRash ? '#94a3b8' : '#e2e8f0');
        rimGrad.addColorStop(0.65, curbRash ? '#475569' : '#94a3b8');
        rimGrad.addColorStop(1, '#334155');
        ctx.fillStyle = '#0b0e14';
        ctx.beginPath();
        ctx.ellipse(wx, wy, rx * 0.68, ry * 0.68, -0.06, 0, Math.PI * 2);
        ctx.fill();

        // Brake disc & caliper peeking behind spokes
        ctx.fillStyle = rustyRotor ? '#7c3a1d' : '#64748b';
        ctx.beginPath();
        ctx.ellipse(wx + 0.5, wy, rx * 0.48, ry * 0.48, -0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isE39 ? '#b91c1c' : isLC ? '#38bdf8' : '#475569';
        ctx.fillRect(wx - rx * 0.35, wy - ry * 0.25, rx * 0.26, ry * 0.34);

        // Spokes
        ctx.strokeStyle = rimGrad;
        ctx.lineWidth = 1.7;
        const spokeCount = isE39 ? 8 : isLC ? 6 : 5;
        for (let i = 0; i < spokeCount; i++) {
          const a = (i / spokeCount) * Math.PI * 2 + 0.25;
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + Math.cos(a) * rx * 0.64, wy + Math.sin(a) * ry * 0.64);
          ctx.stroke();
        }
        ctx.strokeStyle = rimGrad;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(wx, wy, rx * 0.66, ry * 0.66, -0.06, 0, Math.PI * 2);
        ctx.stroke();

        // Center hub cap
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(wx, wy, rx * 0.16, ry * 0.16, -0.06, 0, Math.PI * 2);
        ctx.fill();
      };

      // Coordinates defining true 3/4 hero stance (facing lower-left, flank sweeping upper-right)
      const flX = isLC ? 44 : 46;
      const frX = isLC ? 128 : 126;
      const rrX = isLC ? 214 : isE39 ? 215 : 204;

      const frontBaseY = isLC ? 114 : 119;
      const cornerBaseY = isLC ? 123 : 126;
      const rearBaseY = isLC ? 92 : 95;

      const hoodFrontY = isLC ? 80 : isE39 ? 93 : 92;
      const hoodCornerY = isLC ? 86 : isE39 ? 98 : 98;
      const beltFrontY = isLC ? 73 : 87;
      const beltRearY = isLC ? 66 : 75;

      const roofFrontLY = isLC ? 43 : 60;
      const roofFrontRY = isLC ? 46 : 63;
      const roofRearX = isLC ? 196 : isE39 ? 168 : 186;
      const roofRearY = isLC ? 45 : isE39 ? 58 : 60;

      // Ground contact shadow angled cleanly beneath whole 3/4 footprint
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.beginPath();
      ctx.ellipse(128, 122, 92, 16, -0.14, 0, Math.PI * 2);
      ctx.fill();

      // Far front-left wheel peeking beneath front-left corner
      drawWheel34(flX + 10, frontBaseY - 2, 8.5, 11.5, false, false, false);

      // Paint gradients for front & side (distinct lighting zones create real 3D form!)
      const frontGrad = ctx.createLinearGradient(flX, hoodFrontY, frX, cornerBaseY);
      const sideGrad = ctx.createLinearGradient(frX, beltFrontY, rrX, rearBaseY);
      const hoodGrad = ctx.createLinearGradient(flX + 10, beltFrontY, frX, hoodCornerY);

      if (isLC || isE39) {
        frontGrad.addColorStop(0, '#2a3342');
        frontGrad.addColorStop(0.55, '#131820');
        frontGrad.addColorStop(1, '#080b10');

        sideGrad.addColorStop(0, '#1e2531');
        sideGrad.addColorStop(0.45, '#12161e');
        sideGrad.addColorStop(1, '#090c11');

        hoodGrad.addColorStop(0, '#364152');
        hoodGrad.addColorStop(0.6, '#1a202b');
        hoodGrad.addColorStop(1, '#0f141c');
      } else if (isE30) {
        frontGrad.addColorStop(0, '#f83b3b');
        frontGrad.addColorStop(0.6, '#dc2626');
        frontGrad.addColorStop(1, '#991b1b');

        sideGrad.addColorStop(0, '#ef4444');
        sideGrad.addColorStop(0.55, '#b91c1c');
        sideGrad.addColorStop(1, '#7f1d1d');

        hoodGrad.addColorStop(0, '#ff5252');
        hoodGrad.addColorStop(0.6, '#dc2626');
        hoodGrad.addColorStop(1, '#991b1b');
      } else if (isMazda6) {
        frontGrad.addColorStop(0, '#6e7681');
        frontGrad.addColorStop(0.6, '#4b5058');
        frontGrad.addColorStop(1, '#2b2f36');

        sideGrad.addColorStop(0, '#5a6069');
        sideGrad.addColorStop(0.55, '#40454d');
        sideGrad.addColorStop(1, '#26292f');

        hoodGrad.addColorStop(0, '#7c8490');
        hoodGrad.addColorStop(0.6, '#525760');
        hoodGrad.addColorStop(1, '#34383f');
      } else {
        frontGrad.addColorStop(0, '#e2e8f0');
        frontGrad.addColorStop(0.6, '#b8c3d1');
        frontGrad.addColorStop(1, '#8c97a8');

        sideGrad.addColorStop(0, '#cfd8e4');
        sideGrad.addColorStop(0.55, '#9eaab9');
        sideGrad.addColorStop(1, '#717d8e');

        hoodGrad.addColorStop(0, '#f1f5f9');
        hoodGrad.addColorStop(0.6, '#cbd5e1');
        hoodGrad.addColorStop(1, '#94a3b8');
      }

      // 1. SIDE FLANK BODY (front corner -> rear tail)
      ctx.fillStyle = sideGrad;
      ctx.beginPath();
      ctx.moveTo(frX - 2, beltFrontY + 2);
      if (isE39 || isE30 || isMazda6) {
        // Sedan C-pillar flows into raised trunk deck
        ctx.lineTo(176, beltRearY + 5);
        ctx.lineTo(rrX - 2, beltRearY + 4);
        ctx.lineTo(rrX, rearBaseY - 4);
      } else {
        // Hatchback / SUV vertical rear D-pillar
        ctx.lineTo(rrX - 4, beltRearY);
        ctx.lineTo(rrX, rearBaseY - 4);
      }
      ctx.lineTo(frX - 2, cornerBaseY);
      ctx.closePath();
      ctx.fill();

      // Side specular shoulder crease & beltline highlight
      ctx.strokeStyle = isLC || isE39 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(frX + 4, beltFrontY + 9);
      ctx.lineTo(rrX - 6, beltRearY + 7);
      ctx.stroke();

      // Side door panel seams & handles
      ctx.strokeStyle = isLC || isE39 ? 'rgba(0,0,0,0.55)' : 'rgba(51,65,85,0.35)';
      ctx.lineWidth = 1;
      const midDoorX = (frX + rrX) * 0.51;
      ctx.beginPath();
      ctx.moveTo(midDoorX, beltFrontY - 1);
      ctx.lineTo(midDoorX + 1, (cornerBaseY + rearBaseY) * 0.5 - 3);
      ctx.stroke();

      // Chrome/black door handles
      ctx.fillStyle = isLC ? '#e2e8f0' : '#0f172a';
      rr(ctx, midDoorX - 10, beltFrontY + 8, 7, 2.5, 1);
      ctx.fill();
      rr(ctx, rrX - 36, beltRearY + 9, 6.5, 2.5, 1);
      ctx.fill();

      // Side skirt / LC200 silver running board between wheels
      if (isLC) {
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(156, cornerBaseY - 7);
        ctx.lineTo(192, rearBaseY + 2);
        ctx.lineTo(192, rearBaseY + 6);
        ctx.lineTo(156, cornerBaseY - 2);
        ctx.closePath();
        ctx.fill();
      }

      // Rear-right tail light wrap peeking at tail corner
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(rrX - 2, beltRearY + 6, 3.5, 6.5, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // 2. ROOF & UPPER GREENHOUSE (Windshield + Angled Side Windows)
      // Roof shell
      ctx.fillStyle = isLC ? '#262f3e' : isE39 ? '#222a36' : isE30 ? '#ef4444' : isMazda6 ? '#5a6069' : '#dfe6ef';
      ctx.beginPath();
      ctx.moveTo(flX + 20, roofFrontLY);
      ctx.lineTo(frX - 6, roofFrontRY);
      ctx.lineTo(roofRearX, roofRearY);
      ctx.lineTo(roofRearX - 54, roofRearY - 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (isLC) {
        // LC200 Roof rails
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(frX - 10, roofFrontRY - 2.5);
        ctx.lineTo(roofRearX - 4, roofRearY - 2.5);
        ctx.stroke();
      }

      // Cabin greenhouse frame behind A/B/C pillars
      ctx.fillStyle = isLC ? '#141a24' : isE39 ? '#161c26' : '#adb8c7';
      ctx.beginPath();
      ctx.moveTo(flX + 18, roofFrontLY);
      ctx.lineTo(frX - 5, roofFrontRY);
      ctx.lineTo(roofRearX, roofRearY);
      ctx.lineTo(isE39 ? rrX - 18 : rrX - 5, beltRearY + 2);
      ctx.lineTo(frX - 2, beltFrontY + 2);
      ctx.lineTo(flX + 4, hoodFrontY - 2);
      ctx.closePath();
      ctx.fill();

      // Front sloped windshield
      ctx.fillStyle = '#0c1424';
      ctx.beginPath();
      ctx.moveTo(flX + 21, roofFrontLY + 3);
      ctx.lineTo(frX - 11, roofFrontRY + 3);
      ctx.lineTo(frX - 8, hoodCornerY - 5);
      ctx.lineTo(flX + 7, hoodFrontY - 3);
      ctx.closePath();
      ctx.fill();

      // Windshield sky glare stripe
      ctx.save();
      ctx.clip();
      ctx.fillStyle = 'rgba(186, 230, 253, 0.16)';
      ctx.beginPath();
      ctx.moveTo(flX + 34, roofFrontLY);
      ctx.lineTo(flX + 52, roofFrontLY);
      ctx.lineTo(flX + 32, hoodFrontY);
      ctx.lineTo(flX + 16, hoodFrontY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Angled Side Windows (with B-pillar + dark mafia tint on LC200)
      ctx.fillStyle = isLC ? '#05080f' : '#0f172a';
      ctx.beginPath();
      ctx.moveTo(frX - 1, roofFrontRY + 4);
      ctx.lineTo(roofRearX - 4, roofRearY + 3);
      ctx.lineTo(isE39 ? rrX - 24 : rrX - 10, beltRearY + 1);
      ctx.lineTo(frX - 1, beltFrontY);
      ctx.closePath();
      ctx.fill();

      // Side window glossy slash
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(frX + 12, roofFrontRY + 5);
      ctx.lineTo(frX + 24, roofFrontRY + 5);
      ctx.lineTo(frX + 16, beltFrontY);
      ctx.lineTo(frX + 6, beltFrontY);
      ctx.closePath();
      ctx.fill();

      // B-pillar & C-pillar divider bars
      ctx.fillStyle = '#090d14';
      ctx.beginPath();
      ctx.moveTo(midDoorX - 3, roofFrontRY + 2);
      ctx.lineTo(midDoorX + 2, roofFrontRY + 2);
      ctx.lineTo(midDoorX + 1, beltFrontY - 2);
      ctx.lineTo(midDoorX - 4, beltFrontY - 2);
      ctx.closePath();
      ctx.fill();

      // 3. HOOD (connecting windshield base to front grille header)
      ctx.fillStyle = hoodGrad;
      ctx.beginPath();
      ctx.moveTo(flX + 7, hoodFrontY - 3);
      ctx.lineTo(frX - 8, hoodCornerY - 5);
      ctx.lineTo(frX, hoodCornerY);
      ctx.lineTo(flX, hoodFrontY);
      ctx.closePath();
      ctx.fill();

      // Sculpted hood creases
      ctx.strokeStyle = isLC || isE39 ? 'rgba(255,255,255,0.18)' : 'rgba(51,65,85,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(flX + 18, hoodFrontY - 3);
      ctx.lineTo(flX + 12, hoodFrontY + 2);
      ctx.moveTo(frX - 24, hoodCornerY - 4);
      ctx.lineTo(frX - 18, hoodCornerY + 1);
      ctx.stroke();

      // 4. FRONT FASCIA & BUMPER
      ctx.fillStyle = frontGrad;
      ctx.beginPath();
      ctx.moveTo(flX, hoodFrontY);
      ctx.lineTo(frX, hoodCornerY);
      ctx.lineTo(frX - 2, cornerBaseY);
      ctx.lineTo(flX + 2, frontBaseY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Side mirror on right A-pillar
      ctx.fillStyle = isLC || isE39 ? '#1a202c' : '#94a3b8';
      rr(ctx, frX - 8, beltFrontY - 5, 11, 7, 3);
      ctx.fill();

      // 5. E39 RUST, DUCT TAPE & BEATEN TRIM (before wheels so arch overlaps cleanly)
      if (isE39) {
        // Mismatched brownish-primer front right fender
        ctx.fillStyle = '#5c4d35';
        ctx.beginPath();
        ctx.moveTo(frX - 1, beltFrontY + 4);
        ctx.lineTo(156, beltFrontY + 2);
        ctx.lineTo(152, cornerBaseY - 4);
        ctx.lineTo(frX - 1, cornerBaseY - 2);
        ctx.closePath();
        ctx.fill();

        // Rust patches on hood corner, door sill & rear arch
        ctx.fillStyle = 'rgba(154, 62, 22, 0.88)';
        ctx.beginPath();
        ctx.ellipse(flX + 24, hoodFrontY - 1, 9, 3.5, 0.15, 0, Math.PI * 2);
        ctx.ellipse(174, cornerBaseY - 12, 12, 4, -0.2, 0, Math.PI * 2);
        ctx.ellipse(196, rearBaseY - 6, 8, 4.5, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Grey duct tape strips holding corner bumper!
        ctx.fillStyle = '#94a3b8';
        ctx.save();
        ctx.translate(frX - 5, hoodCornerY + 9);
        ctx.rotate(-0.22);
        ctx.fillRect(-6, -2, 14, 3);
        ctx.rotate(0.45);
        ctx.fillRect(-4, 1, 13, 2.8);
        ctx.restore();
      }

      // 6. FRONT-RIGHT & REAR-RIGHT WHEELS ON FLANK
      const fwY = isLC ? 114 : 119;
      const rwY = isLC ? 95 : 99;
      // Flared fender arch lip
      ctx.strokeStyle = isLC || isE39 ? '#0f172a' : '#64748b';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(145, fwY - 1, 14.5, 17.5, -0.06, Math.PI * 1.05, Math.PI * 1.98);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(196, rwY - 1, 10.5, 13.5, -0.06, Math.PI * 1.05, Math.PI * 1.98);
      ctx.stroke();

      drawWheel34(145, fwY, 12, 15.5, true, isE39, isE39);
      drawWheel34(196, rwY, 8.5, 11.5, true, isE39, false);

      // 7. MODEL-SPECIFIC FRONT GRILLES, HEADLIGHTS, PLATES & BUMPERS
      if (isE39) {
        // Twin BMW Kidney Grilles
        ctx.fillStyle = '#07090d';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        rr(ctx, 69, hoodFrontY + 4, 11, 9, 2.5);
        ctx.fill();
        ctx.stroke();
        rr(ctx, 83, hoodFrontY + 4.5, 12, 9.5, 2.5);
        ctx.fill();
        ctx.stroke();

        // BMW hood roundel
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(82, hoodFrontY + 0.5, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(80, hoodFrontY - 1.5, 2, 2);

        // Amber Angel-Eye quad headlights
        ctx.fillStyle = '#0a0d12';
        rr(ctx, flX + 2, hoodFrontY + 2, 19, 8.5, 2.5);
        ctx.fill();
        rr(ctx, frX - 24, hoodCornerY - 1, 21, 9, 2.5);
        ctx.fill();
        ctx.strokeStyle = '#ffaa2b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(flX + 8, hoodFrontY + 6.2, 3, 0, Math.PI * 2);
        ctx.arc(flX + 15.5, hoodFrontY + 6.2, 3, 0, Math.PI * 2);
        ctx.arc(frX - 18, hoodCornerY + 3.5, 3.2, 0, Math.PI * 2);
        ctx.arc(frX - 9.5, hoodCornerY + 3.5, 3.2, 0, Math.PI * 2);
        ctx.stroke();

        // Drooping loose front lip spoiler
        ctx.fillStyle = '#0b0e14';
        ctx.save();
        ctx.translate(flX + 8, frontBaseY - 1);
        ctx.rotate(0.09);
        rr(ctx, 0, 0, 72, 6.5, 2);
        ctx.fill();
        ctx.restore();
      } else if (isLC) {
        // LC200 Chrome 3-Bar Grille
        ctx.fillStyle = '#090c12';
        rr(ctx, 64, hoodFrontY + 3, 38, 17, 3);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        for (let g = 0; g < 3; g++) {
          ctx.fillRect(67, hoodFrontY + 5.5 + g * 4.5, 32, 2.2);
        }
        // Toyota Oval Badge
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.ellipse(83, hoodFrontY + 11, 5, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wide LED Projector Headlights + DRL underline
        ctx.fillStyle = '#e0f2fe';
        rr(ctx, flX + 2, hoodFrontY + 2, 18, 10.5, 2.5);
        ctx.fill();
        rr(ctx, frX - 24, hoodCornerY - 2, 21, 11.5, 2.5);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(flX + 3, hoodFrontY + 10.5, 16, 2);
        ctx.fillRect(frX - 22, hoodCornerY + 7.5, 19, 2.2);

        // Polished Chrome Bullbar (Кенгурятник)
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(61, cornerBaseY - 7);
        ctx.lineTo(66, hoodFrontY + 7);
        ctx.lineTo(100, hoodCornerY + 3);
        ctx.lineTo(104, cornerBaseY - 2);
        ctx.stroke();
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(64, cornerBaseY - 12);
        ctx.lineTo(102, cornerBaseY - 8);
        ctx.stroke();
      } else {
        // Hyundai Getz Grille + Chrome top bar
        ctx.fillStyle = '#181e28';
        rr(ctx, 68, hoodFrontY + 5, 28, 9, 3);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(70, hoodFrontY + 7.5, 24, 1.8);

        // Large halogen headlights + orange turn corner
        ctx.fillStyle = '#fffbeb';
        rr(ctx, flX + 2, hoodFrontY + 2, 17, 10, 3.5);
        ctx.fill();
        rr(ctx, frX - 23, hoodCornerY - 1, 19, 10.5, 3.5);
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(flX + 2, hoodFrontY + 2, 4, 8);
        ctx.fillRect(frX - 8, hoodCornerY - 1, 4, 9);

        // Black plastic bumper rub strips
        ctx.fillStyle = '#11161f';
        rr(ctx, flX + 2, frontBaseY - 9, 16, 4.5, 2);
        ctx.fill();
        rr(ctx, frX - 22, cornerBaseY - 7, 18, 4.5, 2);
        ctx.fill();
      }

      // Russian License Plate on angled front bumper
      ctx.save();
      ctx.translate(82, isLC ? hoodFrontY + 26 : hoodFrontY + 19);
      ctx.rotate(0.06);
      ctx.fillStyle = '#f8fafc';
      rr(ctx, -14, -4, 28, 7.5, 1.5);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 4.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(isLC ? 'M200AM' : isE39 ? 'E039KX' : 'A404ET', 0, 1.5);
      ctx.restore();

      ctx.restore();
    }

    return c.toDataURL('image/png');
  }

  // Crisp inline SVG vector UI icons (zero emojis across buttons/HUD!)
  const SVG_ICONS = {
    soundOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fill-opacity="0.22"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fill-opacity="0.18"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4.5" height="16" rx="1.4"/><rect x="13.5" y="4" width="4.5" height="16" rx="1.4"/></svg>',
    chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    beam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6c3.8 0 6 2.5 6 6s-2.2 6-6 6H12V6h2z" fill="currentColor" fill-opacity="0.24"/><line x1="3" y1="8" x2="9" y2="8"/><line x1="2" y1="12" x2="9" y2="12"/><line x1="3" y1="16" x2="9" y2="16"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" fill="currentColor" fill-opacity="0.22"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    brake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7.5" fill="currentColor" fill-opacity="0.2"/><path d="M4.5 6.5a10 10 0 0 0 0 11"/><path d="M19.5 6.5a10 10 0 0 1 0 11"/><line x1="12" y1="8.5" x2="12" y2="12.5"/><circle cx="12" cy="15.5" r="0.8" fill="currentColor"/></svg>',
    gas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5" stroke-width="2.4"/><polyline points="6 11 12 5 18 11" stroke-width="2.4"/><path d="M7 19h10" stroke-opacity="0.6"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z" fill="currentColor" fill-opacity="0.22"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    fuel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M3 22h12"/><rect x="6" y="7" width="6" height="5" fill="currentColor" fill-opacity="0.25"/><path d="M15 10h2a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2V9.5L19.5 6"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fill-opacity="0.2"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="currentColor" fill-opacity="0.18"/></svg>',
  };

  global.CharacterIllustrator = {
    drawCharacterPortrait,
    generateAvatarDataURL,
    generateVehicleCardDataURL,
    SVG_ICONS,
  };
})(window);
