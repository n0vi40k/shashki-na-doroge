/**
 * Procedural WebAudio Sound Engine for «ШАШКИ НА ДОРОГЕ»
 * Zero external audio files required; safe autoplay unlock & mute support.
 */
(function (global) {
  'use strict';

  const BGM_FIREBASE_URL = 'https://puntus-bottle-default-rtdb.europe-west1.firebasedatabase.app/shashki_bgm.json';

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.engineGain = null;
      this.musicGain = null;
      this.sfxGain = null;

      this.muted = false;
      this.musicEnabled = true;
      this.unlocked = false;

      // Continuous engine nodes
      this.engineActive = false;
      this.engineOsc1 = null;
      this.engineOsc2 = null;
      this.engineLfo = null;
      this.engineLfoGain = null;
      this.engineFilter = null;
      this.currentCharId = 'waldemaree';

      // Bike cadence / freehub & music timers
      this.freehubAccum = 0;
      this.chainAccum = 0;
      this.musicAccum = 0;
      this.musicStep = 0;
      this.rattleAccum = 0;
      this.noiseBuffer = null;

      // Background gameplay music track ("DJ Бутылыч — ГАЗЯВА")
      this.bgmAudio = null;
      this.bgmBaseVolume = 0.14; // Quiet level so SFX (0.85) & engines remain clear
      this.bgmFailed = false;
      this.bgmBlobUrl = null;
      this._bgmBlobPromise = null;
      this._bgmSrcAssigned = false;

      // Preload base64 MP3 payload silently so playback starts instantly on game start
      if (typeof global.fetch === 'function') {
        this._preloadBgmBlob();
      }
    }

    ensureContext() {
      if (this.ctx) return true;
      const AudioCtx = global.AudioContext || global.webkitAudioContext;
      if (!AudioCtx) return false;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.72;
      this.masterGain.connect(this.ctx.destination);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.85;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled ? 0.16 : 0;
      this.musicGain.connect(this.masterGain);

      this.noiseBuffer = this._createNoiseBuffer(1.0);
      return true;
    }

    _createNoiseBuffer(seconds) {
      const length = Math.floor(this.ctx.sampleRate * seconds);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return buffer;
    }

    unlock() {
      if (!this.ensureContext()) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.unlocked = true;
      this._ensureBgm();
    }

    _preloadBgmBlob() {
      if (this.bgmBlobUrl) return Promise.resolve(this.bgmBlobUrl);
      if (this._bgmBlobPromise) return this._bgmBlobPromise;
      const loc = global.location;
      const isLocal = loc && (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1' || loc.protocol === 'file:');
      if (isLocal) {
        this.bgmBlobUrl = 'gazyava.mp3';
        return Promise.resolve('gazyava.mp3');
      }
      if (typeof global.fetch !== 'function' || typeof global.atob !== 'function' || typeof Blob === 'undefined' || !global.URL || typeof global.URL.createObjectURL !== 'function') {
        return Promise.resolve(null);
      }
      this._bgmBlobPromise = global.fetch(BGM_FIREBASE_URL)
        .then((res) => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then((data) => {
          const b64 = data && data.b64;
          if (!b64) throw new Error('Missing b64 payload');
          const clean = b64.replace(/\s+/g, '');
          const bin = global.atob(clean);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) {
            bytes[i] = bin.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: (data && data.mime) || 'audio/mpeg' });
          this.bgmBlobUrl = global.URL.createObjectURL(blob);
          return this.bgmBlobUrl;
        })
        .catch(() => {
          return null;
        });
      return this._bgmBlobPromise;
    }

    _ensureBgm() {
      if (this.bgmAudio || typeof Audio === 'undefined') return this.bgmAudio;
      try {
        const audio = new Audio();
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = (this.muted || !this.musicEnabled) ? 0 : this.bgmBaseVolume;
        audio.muted = Boolean(this.muted || !this.musicEnabled);
        audio.addEventListener('error', () => {
          this.bgmFailed = true;
        });
        if (this.bgmBlobUrl) {
          audio.src = this.bgmBlobUrl;
          this._bgmSrcAssigned = true;
        } else {
          this._preloadBgmBlob().then((url) => {
            if (!this.bgmAudio) return;
            const targetUrl = url || 'gazyava.mp3';
            if (!this._bgmSrcAssigned) {
              this._bgmSrcAssigned = true;
              this.bgmAudio.src = targetUrl;
            }
            if (!this.muted && this.musicEnabled && this.engineActive && this.bgmAudio.paused) {
              this.bgmAudio.muted = false;
              this.bgmAudio.volume = this.bgmBaseVolume;
              this.bgmAudio.play().catch(() => {});
            }
          });
        }
        this.bgmAudio = audio;
      } catch (_e) {
        this.bgmFailed = true;
      }
      return this.bgmAudio;
    }

    startMusic() {
      const bgm = this._ensureBgm();
      if (!bgm || this.bgmFailed) return;
      bgm.muted = Boolean(this.muted || !this.musicEnabled);
      bgm.volume = (this.muted || !this.musicEnabled) ? 0 : this.bgmBaseVolume;
      if (!this._bgmSrcAssigned) {
        if (this.bgmBlobUrl) {
          this._bgmSrcAssigned = true;
          bgm.src = this.bgmBlobUrl;
        } else {
          this._preloadBgmBlob().then((url) => {
            if (!this.bgmAudio || this.bgmFailed) return;
            const targetUrl = url || 'gazyava.mp3';
            if (!this._bgmSrcAssigned) {
              this._bgmSrcAssigned = true;
              this.bgmAudio.src = targetUrl;
            }
            if (!this.muted && this.musicEnabled && this.engineActive && this.bgmAudio.paused) {
              this.bgmAudio.muted = false;
              this.bgmAudio.volume = this.bgmBaseVolume;
              this.bgmAudio.play().catch(() => {});
            }
          });
          return;
        }
      }
      if (!this.muted && this.musicEnabled && bgm.paused) {
        bgm.play().catch(() => {});
      }
    }

    pauseMusic() {
      if (!this.bgmAudio) return;
      try {
        this.bgmAudio.pause();
      } catch (_e) {}
    }

    setMuted(muted) {
      this.muted = Boolean(muted);
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.72, this.ctx.currentTime, 0.03);
      }
      if (this.bgmAudio) {
        this.bgmAudio.muted = Boolean(this.muted || !this.musicEnabled);
        this.bgmAudio.volume = (this.muted || !this.musicEnabled) ? 0 : this.bgmBaseVolume;
      }
      if (this.muted) {
        this.pauseMusic();
      } else if (this.musicEnabled && this.engineActive) {
        this.startMusic();
      }
      return this.muted;
    }

    toggleMute() {
      this.unlock();
      return this.setMuted(!this.muted);
    }

    setMusicEnabled(enabled) {
      this.musicEnabled = Boolean(enabled);
      if (this.musicGain && this.ctx) {
        this.musicGain.gain.setTargetAtTime(this.musicEnabled ? 0.16 : 0, this.ctx.currentTime, 0.05);
      }
      if (this.bgmAudio) {
        this.bgmAudio.muted = Boolean(this.muted || !this.musicEnabled);
        this.bgmAudio.volume = (this.muted || !this.musicEnabled) ? 0 : this.bgmBaseVolume;
      }
      if (!this.musicEnabled) {
        this.pauseMusic();
      } else if (!this.muted && this.engineActive) {
        this.startMusic();
      }
      return this.musicEnabled;
    }

    toggleMusic() {
      return this.setMusicEnabled(!this.musicEnabled);
    }

    startEngine(charId) {
      this.currentCharId = charId || 'waldemaree';
      if (!this.unlocked) this.unlock();
      if (!this.unlocked || !this.ctx) {
        this.startMusic();
        return;
      }

      this.stopEngine();

      const now = this.ctx.currentTime;
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(320, now);
      this.engineFilter.Q.setValueAtTime(1.8, now);
      this.engineFilter.connect(this.engineGain);

      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineLfo = this.ctx.createOscillator();
      this.engineLfoGain = this.ctx.createGain();

      if (this.currentCharId === 'waldemaree') {
        // Subtle aerodynamic tire/chain hum
        this.engineOsc1.type = 'triangle';
        this.engineOsc2.type = 'sine';
        this.engineOsc1.frequency.setValueAtTime(95, now);
        this.engineOsc2.frequency.setValueAtTime(190, now);
        this.engineFilter.type = 'bandpass';
        this.engineFilter.frequency.setValueAtTime(520, now);
        this.engineLfo.frequency.setValueAtTime(6, now);
        this.engineLfoGain.gain.setValueAtTime(10, now);
        this.engineGain.gain.setTargetAtTime(0.05, now, 0.08);
      } else if (this.currentCharId === 'drs4hop') {
        // Nimble 4-cyl Getz buzz
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc2.type = 'triangle';
        this.engineOsc1.frequency.setValueAtTime(72, now);
        this.engineOsc2.frequency.setValueAtTime(144, now);
        this.engineFilter.frequency.setValueAtTime(420, now);
        this.engineLfo.frequency.setValueAtTime(14, now);
        this.engineLfoGain.gain.setValueAtTime(4, now);
        this.engineGain.gain.setTargetAtTime(0.09, now, 0.08);
      } else if (this.currentCharId === 'zabl') {
        // Raspy rattling straight-pipe BMW M54 inline-6
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc2.type = 'sawtooth';
        this.engineOsc1.frequency.setValueAtTime(62, now);
        this.engineOsc2.frequency.setValueAtTime(93, now);
        this.engineFilter.frequency.setValueAtTime(680, now);
        this.engineFilter.Q.setValueAtTime(3.2, now);
        this.engineLfo.frequency.setValueAtTime(22, now);
        this.engineLfoGain.gain.setValueAtTime(16, now);
        this.engineGain.gain.setTargetAtTime(0.11, now, 0.08);
      } else {
        // Deep commanding LC200 V8 rumble
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc2.type = 'triangle';
        this.engineOsc1.frequency.setValueAtTime(44, now);
        this.engineOsc2.frequency.setValueAtTime(66, now);
        this.engineFilter.frequency.setValueAtTime(260, now);
        this.engineFilter.Q.setValueAtTime(1.4, now);
        this.engineLfo.frequency.setValueAtTime(9, now);
        this.engineLfoGain.gain.setValueAtTime(5, now);
        this.engineGain.gain.setTargetAtTime(0.13, now, 0.08);
      }

      this.engineLfo.connect(this.engineLfoGain);
      this.engineLfoGain.connect(this.engineOsc1.frequency);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);

      this.engineOsc1.start(now);
      this.engineOsc2.start(now);
      this.engineLfo.start(now);
      this.engineActive = true;
      this.startMusic();
    }

    stopEngine() {
      this.pauseMusic();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (this.engineGain) {
        this.engineGain.gain.setTargetAtTime(0, now, 0.04);
      }
      const nodes = [this.engineOsc1, this.engineOsc2, this.engineLfo];
      for (const node of nodes) {
        if (node) {
          try { node.stop(now + 0.06); } catch (_e) {}
        }
      }
      this.engineOsc1 = null;
      this.engineOsc2 = null;
      this.engineLfo = null;
      this.engineLfoGain = null;
      this.engineFilter = null;
      this.engineActive = false;
    }

    updateDriving(dt, speedKmh, charId, isGassing, isBraking) {
      if (!this.unlocked || !this.ctx || this.ctx.state !== 'running') return;
      if (!this.engineActive || this.currentCharId !== charId) {
        this.startEngine(charId);
      }

      const now = this.ctx.currentTime;
      const norm = Math.max(0, Math.min(1.3, (speedKmh - 50) / 170));

      if (charId === 'waldemaree') {
        const freq = 75 + norm * 85;
        this.engineOsc1.frequency.setTargetAtTime(freq, now, 0.06);
        this.engineOsc2.frequency.setTargetAtTime(freq * 2.02, now, 0.06);
        this.engineGain.gain.setTargetAtTime(0.03 + norm * 0.04, now, 0.08);

        // Freehub clicks when coasting/braking; chain tick when pedaling
        if (isBraking || (!isGassing && norm > 0.25)) {
          const rate = 18 + norm * 24;
          this.freehubAccum += dt * rate;
          if (this.freehubAccum >= 1) {
            this.freehubAccum -= 1;
            this._playFreehubClick();
          }
        } else {
          this.chainAccum += dt * (4 + norm * 7);
          if (this.chainAccum >= 1) {
            this.chainAccum -= 1;
            this._playChainTick();
          }
        }
      } else if (charId === 'drs4hop') {
        const base = 66 + norm * 96 + (isGassing ? 14 : 0);
        this.engineOsc1.frequency.setTargetAtTime(base, now, 0.06);
        this.engineOsc2.frequency.setTargetAtTime(base * 2, now, 0.06);
        this.engineFilter.frequency.setTargetAtTime(340 + norm * 620, now, 0.08);
        this.engineGain.gain.setTargetAtTime(0.075 + norm * 0.045, now, 0.08);
      } else if (charId === 'zabl') {
        const base = 54 + norm * 84 + (isGassing ? 18 : 0);
        this.engineOsc1.frequency.setTargetAtTime(base, now, 0.05);
        this.engineOsc2.frequency.setTargetAtTime(base * 1.49, now, 0.05);
        this.engineFilter.frequency.setTargetAtTime(520 + norm * 880, now, 0.06);
        this.engineGain.gain.setTargetAtTime(0.095 + norm * 0.055, now, 0.08);

        // Exhaust rattle / burble on deceleration or high RPM
        if (isBraking || (isGassing && Math.random() < 0.35)) {
          this.rattleAccum += dt * 7;
          if (this.rattleAccum >= 1) {
            this.rattleAccum -= 1;
            this._playExhaustPop();
          }
        }
      } else {
        // LC200 V8
        const base = 40 + norm * 56 + (isGassing ? 10 : 0);
        this.engineOsc1.frequency.setTargetAtTime(base, now, 0.07);
        this.engineOsc2.frequency.setTargetAtTime(base * 1.5, now, 0.07);
        this.engineFilter.frequency.setTargetAtTime(210 + norm * 360, now, 0.08);
        this.engineGain.gain.setTargetAtTime(0.11 + norm * 0.05, now, 0.08);
      }

      // Quiet background BGM ("Газява") or procedural fallback if MP3 fails to load
      if (this.musicEnabled && !this.muted) {
        const bgm = this._ensureBgm();
        if (bgm && !this.bgmFailed) {
          if (this._bgmSrcAssigned && bgm.paused) this.startMusic();
        } else {
          const bpm = 124 + norm * 16;
          const stepDur = 60 / bpm / 2;
          this.musicAccum += dt;
          if (this.musicAccum >= stepDur) {
            this.musicAccum -= stepDur;
            this._playBassStep(this.musicStep++);
          }
        }
      }
    }

    _playBassStep(step) {
      const pattern = [55, 55, 65.41, 55, 73.42, 55, 82.41, 65.41];
      const freq = pattern[step % pattern.length];
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(340, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 0.19);
    }

    _playFreehubClick() {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(2350 + Math.random() * 250, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.016);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.02);
    }

    _playChainTick() {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(980, now);
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.025);
    }

    _playExhaustPop() {
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(280 + Math.random() * 140, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.065);
    }

    playLaneChange() {
      this.unlock();
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;

      // Air swoosh + subtle tire chirp
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(2200, now + 0.09);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.12);
    }

    playShashka(combo) {
      this.unlock();
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      const semitoneBoost = Math.min(10, Math.max(0, (combo || 1) - 1));
      const root = 392 * Math.pow(2, semitoneBoost / 12);
      const ratios = [1, 1.25, 1.5];

      ratios.forEach((ratio, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const t = now + idx * 0.04;
        osc.frequency.setValueAtTime(root * ratio, t);
        osc.frequency.exponentialRampToValueAtTime(root * ratio * 1.04, t + 0.18);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.14, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.25);
      });
    }

    playCoin() {
      this.unlock();
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1174, now);
      osc.frequency.setValueAtTime(1568, now + 0.055);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.23);
    }

    playPickup(type) {
      this.unlock();
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;

      if (type === 'fuel') {
        // Fuel glug-glug bubbly low sweep
        for (let i = 0; i < 3; i++) {
          const t = now + i * 0.075;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220 + i * 45, t);
          osc.frequency.exponentialRampToValueAtTime(420 + i * 60, t + 0.06);
          gain.gain.setValueAtTime(0.16, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(t);
          osc.stop(t + 0.075);
        }
      } else if (type === 'drink') {
        // Aluminum can pop + fizz
        const pop = this.ctx.createOscillator();
        const popGain = this.ctx.createGain();
        pop.type = 'triangle';
        pop.frequency.setValueAtTime(1400, now);
        pop.frequency.exponentialRampToValueAtTime(420, now + 0.045);
        popGain.gain.setValueAtTime(0.22, now);
        popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        pop.connect(popGain);
        popGain.connect(this.sfxGain);
        pop.start(now);
        pop.stop(now + 0.055);

        const fizz = this.ctx.createBufferSource();
        fizz.buffer = this.noiseBuffer;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(3200, now + 0.03);
        const fGain = this.ctx.createGain();
        fGain.gain.setValueAtTime(0.16, now + 0.03);
        fGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        fizz.connect(hp);
        hp.connect(fGain);
        fGain.connect(this.sfxGain);
        fizz.start(now + 0.03);
        fizz.stop(now + 0.3);
      } else {
        // Energy bar crunch
        for (let i = 0; i < 2; i++) {
          const t = now + i * 0.065;
          const src = this.ctx.createBufferSource();
          src.buffer = this.noiseBuffer;
          const bp = this.ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(1600 + i * 400, t);
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.22, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
          src.connect(bp);
          bp.connect(g);
          g.connect(this.sfxGain);
          src.start(t);
          src.stop(t + 0.06);
        }
      }
    }

    playBeam(isBike) {
      this.unlock();
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;

      if (isBike) {
        // Bike bell double ring
        [0, 0.09].forEach((offset) => {
          const t = now + offset;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(2480, t);
          gain.gain.setValueAtTime(0.16, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(t);
          osc.stop(t + 0.23);
        });
      } else {
        // High-beam relay click + electric flash hum
        const click = this.ctx.createOscillator();
        const cGain = this.ctx.createGain();
        click.type = 'square';
        click.frequency.setValueAtTime(880, now);
        click.frequency.exponentialRampToValueAtTime(260, now + 0.03);
        cGain.gain.setValueAtTime(0.15, now);
        cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        click.connect(cGain);
        cGain.connect(this.sfxGain);
        click.start(now);
        click.stop(now + 0.04);

        const hum = this.ctx.createOscillator();
        const hGain = this.ctx.createGain();
        hum.type = 'sine';
        hum.frequency.setValueAtTime(520, now);
        hum.frequency.exponentialRampToValueAtTime(780, now + 0.14);
        hGain.gain.setValueAtTime(0.08, now);
        hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        hum.connect(hGain);
        hGain.connect(this.sfxGain);
        hum.start(now);
        hum.stop(now + 0.19);
      }
    }

    playLowResource() {
      this.unlock();
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      [0, 0.12].forEach((offset) => {
        const t = now + offset;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, t);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.085);
      });
    }

    playCrash() {
      this.unlock();
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;

      // Sub impact thud
      const sub = this.ctx.createOscillator();
      const sGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(140, now);
      sub.frequency.exponentialRampToValueAtTime(34, now + 0.35);
      sGain.gain.setValueAtTime(0.42, now);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      sub.connect(sGain);
      sGain.connect(this.sfxGain);
      sub.start(now);
      sub.stop(now + 0.4);

      // Crunch + glass burst
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.32, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      src.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.45);
    }
  }

  global.SoundEngine = SoundEngine;
})(window);
