/**
 * Core Game Loop, Physics, Traffic AI, Progression & Testing Hooks
 * «ШАШКИ НА ДОРОГЕ» — 2.5D Telegram Mini App
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'shashki_doroga_save_v1';

  global.SHASHKI_FIREBASE_CONFIG = global.SHASHKI_FIREBASE_CONFIG || {
    databaseUrl: 'https://puntus-bottle-default-rtdb.europe-west1.firebasedatabase.app',
    path: 'shashki_leaderboard',
  };
  global.SHASHKI_TELEGRAM_CONFIG = global.SHASHKI_TELEGRAM_CONFIG || {
    botUsername: 'shashki_dvor_bot',
    reviveInvoiceUrl: 'https://t.me/$Atn5E-0t8EswFgAAFVU1iwDiZ4o',
  };

  const ILLUSTRATED_ASSETS = {};
  function getIllustratedAssets() {
    if (ILLUSTRATED_ASSETS.ready || !global.CharacterIllustrator) return ILLUSTRATED_ASSETS;
    const CI = global.CharacterIllustrator;
    ['waldemaree', 'drs4hop', 'zabl', 'petrovich'].forEach((id) => {
      ILLUSTRATED_ASSETS[id] = {
        cardImg: CI.generateAvatarDataURL(id, 180, 220),
        vehImg: typeof renderer !== 'undefined' && renderer.renderVehicleCardDataURL
          ? renderer.renderVehicleCardDataURL(id, 240, 168)
          : CI.generateVehicleCardDataURL(id, 240, 168),
        faceImg: CI.generateAvatarDataURL(id, 160, 160),
      };
    });
    ILLUSTRATED_ASSETS.zabl.faceAltImg = CI.generateAvatarDataURL('zabl', 160, 160, 'thumbs');
    ILLUSTRATED_ASSETS.zabl.faceKfcImg = CI.generateAvatarDataURL('zabl', 160, 160, 'kfc');
    ILLUSTRATED_ASSETS.zabl.faceKfcAltImg = CI.generateAvatarDataURL('zabl', 160, 160, 'kfc_thumbs');
    ILLUSTRATED_ASSETS.ready = true;
    return ILLUSTRATED_ASSETS;
  }

  const CHARACTERS = [
    {
      id: 'waldemaree',
      name: 'waldemaree',
      vehicleName: 'Specialized S-WORKS',
      vehicleType: 'bike',
      plate: 'NO PLATE',
      passengerId: null,
      unlockCoins: 0,
      vipStars: 0,
      resourceType: 'energy',
      lore: 'Шоссейный самурай в шлеме Tinkoff и велоочках. Питается энергетиками и батончиками, влетает в зазоры с наклоном 18°.',
      upgradeNames: { engine: 'Ноги', tank: 'Выносливость' },
      baseSpeed: 108,
      maxSpeed: 168,
      handling: 13.8,
      drainRate: 4.5,
      hitboxW: 0.44,
      hitboxH: 78,
      specs: { speed: 0.62, handling: 0.96, endurance: 0.72 },
      quotes: {
        shashka: ['В каденсе!', 'ШАШКА!', 'Узкий зазор — наш профиль!'],
        beam: ['Дзинь-дзинь!', 'Дорогу велосипеду!'],
        low: ['Дай энергетик!', 'Пульс 195, нужен батончик!'],
        crash: 'Погнул карбоновый обод…',
        empty: 'Ноги забились — нужен энергетик и PRO-батончик!',
      },
    },
    {
      id: 'drs4hop',
      name: 'drs4hop',
      vehicleName: 'Hyundai Getz (046 PE 32)',
      vehicleType: 'getz',
      plate: '046 PE 32',
      passengerId: null,
      unlockCoins: 500,
      vipStars: 15,
      resourceType: 'fuel',
      lore: 'Юркий серебристый хэтчбек в футболке PARIS 2024. Пролезает между рядами с олимпийским спокойствием.',
      upgradeNames: { engine: 'Движок', tank: 'Бак' },
      baseSpeed: 120,
      maxSpeed: 188,
      handling: 11.8,
      drainRate: 4.3,
      hitboxW: 0.78,
      hitboxH: 100,
      specs: { speed: 0.74, handling: 0.86, endurance: 0.82 },
      quotes: {
        shashka: ['ШАШКА!', 'Олимпийский манёвр!', 'Чисто прошёл!'],
        beam: ['Жми дальний!', 'Уступите 046-му!'],
        low: ['Где АИ-98?!', 'Лампочка бака горит!'],
        crash: 'Бампер Getz не прощает ошибок!',
        empty: 'Бензобак сухой — катимся накатом!',
      },
    },
    {
      id: 'zabl',
      name: 'zabl',
      vehicleName: 'BMW E39 [ржавая/битая]',
      vehicleType: 'e39',
      plate: 'NO PLATE',
      passengerId: 'petrovich',
      unlockCoins: 1500,
      vipStars: 35,
      resourceType: 'fuel',
      lore: 'Ржавая легенда без правого угла бампера, но с прямым выхлопом M54, золотыми часами и Петровичем рядом.',
      upgradeNames: { engine: 'Движок', tank: 'Бак' },
      baseSpeed: 134,
      maxSpeed: 214,
      handling: 10.6,
      drainRate: 5.0,
      hitboxW: 0.82,
      hitboxH: 106,
      specs: { speed: 0.88, handling: 0.76, endurance: 0.68 },
      quotes: {
        shashka: ['ШАШКА!', 'Держись, Петрович!', 'Золотые часы на удачу!'],
        beam: ['Ангельские глазки в бой!', 'С дороги, бэха летит!'],
        low: ['Петрович, толкать будешь?!', 'Бенза на донышке!'],
        crash: 'Пороги и так гнилые были…',
        empty: 'М54 заглох — ни капли 98-го!',
      },
    },
    {
      id: 'petrovich',
      name: 'petrovich',
      vehicleName: 'Land Cruiser 200 (BY 5555 MC-1)',
      vehicleType: 'lc200',
      plate: 'BY 5555 MC-1',
      passengerId: 'zabl',
      unlockCoins: 3500,
      vipStars: 60,
      resourceType: 'fuel',
      lore: 'Чёрный крузак на хром-кенгурятнике и номерах BY 5555 MC-1. Забл на пассажирском раздаёт лайки.',
      upgradeNames: { engine: 'Движок', tank: 'Бак' },
      baseSpeed: 144,
      maxSpeed: 232,
      handling: 9.8,
      drainRate: 5.4,
      hitboxW: 0.88,
      hitboxH: 114,
      specs: { speed: 0.98, handling: 0.68, endurance: 0.78 },
      quotes: {
        shashka: ['ШАШКА!', 'Крузак держит траекторию!', 'Забл одобряет!'],
        beam: ['Жми дальний!', 'BY 5555 в левом ряду!'],
        low: ['V8 требует топлива!', 'Срочно канистру АИ-98!'],
        crash: 'Даже кенгурятник помялся!',
        empty: 'V8 замолчал — закончился бензин!',
      },
    },
  ];

  const PASSENGERS = {
    petrovich: { id: 'petrovich', name: 'petrovich' },
    zabl: { id: 'zabl', name: 'zabl' },
  };

  const TRAFFIC_STYLES = [
    { kind: 'sedan', color: '#475569', colorLight: '#64748b', colorDark: '#334155' },
    { kind: 'sport', color: '#1d4ed8', colorLight: '#3b82f6', colorDark: '#1e3a8a' },
    { kind: 'suv', color: '#374151', colorLight: '#4b5563', colorDark: '#1f2937' },
    { kind: 'taxi', color: '#d97706', colorLight: '#f59e0b', colorDark: '#92400e' },
    { kind: 'van', color: '#cbd5e1', colorLight: '#e2e8f0', colorDark: '#94a3b8' },
    { kind: 'sport', color: '#991b1b', colorLight: '#dc2626', colorDark: '#7f1d1d' },
    { kind: 'dps', color: '#e2e8f0', colorLight: '#f8fafc', colorDark: '#94a3b8' },
  ];

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getCharById(id) {
    return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
  }

  // ==================== SAVE DATA ====================
  function loadSave() {
    const defaults = {
      coins: 0,
      bestScore: 0,
      selectedCharId: 'waldemaree',
      hardMode: false,
      muted: false,
      unlocked: ['waldemaree'],
      upgrades: {
        waldemaree: { engine: 1, tank: 1 },
        drs4hop: { engine: 1, tank: 1 },
        zabl: { engine: 1, tank: 1 },
        petrovich: { engine: 1, tank: 1 },
      },
    };
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        ...parsed,
        unlocked: Array.isArray(parsed.unlocked) && parsed.unlocked.length ? parsed.unlocked : ['waldemaree'],
        upgrades: { ...defaults.upgrades, ...(parsed.upgrades || {}) },
      };
    } catch (_e) {
      return defaults;
    }
  }

  function persistSave(save) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch (_e) {}
  }

  // ==================== DOM & MODULES ====================
  const stageEl = document.getElementById('app-stage');
  const canvas = document.getElementById('game-canvas');
  const renderer = new global.Renderer25D(canvas);
  const sound = new global.SoundEngine();

  const dom = {
    hudTop: document.getElementById('hud-top'),
    hudControls: document.getElementById('hud-controls'),
    camDriver: document.getElementById('cam-driver'),
    camDriverImg: document.getElementById('cam-driver-img'),
    camDriverName: document.getElementById('cam-driver-name'),
    camPassenger: document.getElementById('cam-passenger'),
    camPassengerImg: document.getElementById('cam-passenger-img'),
    camPassengerName: document.getElementById('cam-passenger-name'),
    hudSpeech: document.getElementById('hud-speech'),
    hudSpeechText: document.getElementById('hud-speech-text'),
    hudCoins: document.getElementById('hud-coins'),
    hudSpeed: document.getElementById('hud-speed'),
    hudScore: document.getElementById('hud-score'),
    hudDist: document.getElementById('hud-dist'),
    hudCombo: document.getElementById('hud-combo'),
    hudTestDriveBadge: document.getElementById('hud-testdrive-badge'),
    hudResourceWrap: document.getElementById('hud-resource-wrap'),
    hudResourceLabel: document.getElementById('hud-resource-label'),
    hudResourcePct: document.getElementById('hud-resource-pct'),
    hudResourceFill: document.getElementById('hud-resource-fill'),

    btnMute: document.getElementById('btn-mute'),
    btnGarageMute: document.getElementById('btn-garage-mute'),
    btnPause: document.getElementById('btn-pause'),
    edgeTapLeft: document.getElementById('edge-tap-left'),
    edgeTapRight: document.getElementById('edge-tap-right'),
    btnGas: document.getElementById('btn-gas'),
    btnBrake: document.getElementById('btn-brake'),
    brakeHeatFill: document.getElementById('brake-heat-fill'),
    brakeStatus: document.getElementById('brake-status'),
    btnBeam: document.getElementById('btn-beam'),
    btnBeamIcon: document.getElementById('btn-beam-icon'),
    btnBeamText: document.getElementById('btn-beam-text'),
    beamCdFill: document.getElementById('beam-cd-fill'),
    beamCdText: document.getElementById('beam-cd-text'),

    garageOverlay: document.getElementById('garage-overlay'),
    garageCoins: document.getElementById('garage-coins'),
    garageCards: document.getElementById('garage-cards'),
    btnLeaderboard: document.getElementById('btn-leaderboard'),
    modeClassic: document.getElementById('mode-classic'),
    modeHard: document.getElementById('mode-hard'),
    modeDesc: document.getElementById('mode-desc'),
    btnStartRun: document.getElementById('btn-start-run'),
    btnStartText: document.getElementById('btn-start-text'),

    pauseOverlay: document.getElementById('pause-overlay'),
    btnResume: document.getElementById('btn-resume'),
    btnPauseGarage: document.getElementById('btn-pause-garage'),

    gameoverOverlay: document.getElementById('gameover-overlay'),
    gameoverFace: document.getElementById('gameover-face'),
    gameoverReason: document.getElementById('gameover-reason'),
    gameoverTitle: document.getElementById('gameover-title'),
    gameoverQuote: document.getElementById('gameover-quote'),
    goDist: document.getElementById('go-dist'),
    goScore: document.getElementById('go-score'),
    goCombo: document.getElementById('go-combo'),
    goCoins: document.getElementById('go-coins'),
    goBest: document.getElementById('go-best'),
    reviveBox: document.getElementById('revive-box'),
    reviveTitle: document.getElementById('revive-title'),
    btnReviveCoins: document.getElementById('btn-revive-coins'),
    btnReviveStars: document.getElementById('btn-revive-stars'),
    btnGoLeaderboard: document.getElementById('btn-go-leaderboard'),
    goTestDriveNote: document.getElementById('go-testdrive-note'),
    btnRetry: document.getElementById('btn-retry'),
    btnToGarage: document.getElementById('btn-to-garage'),

    leaderboardOverlay: document.getElementById('leaderboard-overlay'),
    btnCloseLeaderboard: document.getElementById('btn-close-leaderboard'),
    lbSyncStatus: document.getElementById('lb-sync-status'),
    lbList: document.getElementById('leaderboard-list'),
    lbMe: document.getElementById('leaderboard-me'),
    lbTabs: Array.from(document.querySelectorAll('.lb-tab')),
  };

  // ==================== FIREBASE-READY LEADERBOARD SERVICE ====================
  const LEADERBOARD_KEY = 'shashki_doroga_leaderboard_v3';
  const SEED_LEADERS = [];

  const LeaderboardService = {
    currentFilter: 'all',

    getConfig() {
      return global.SHASHKI_FIREBASE_CONFIG || null;
    },

    getPlayerIdentity() {
      const tg = global.Telegram && global.Telegram.WebApp;
      const user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
      const isMockEnv = !tg
        || String(tg.initData || '').includes('mock_debug_hash_777')
        || !user
        || Number(user.id) === 123456789
        || user.username === 'local_tester'
        || user.username === 'tg_shashki_pro';
      if (!isMockEnv && (user.id || user.username)) {
        return {
          id: `tg_${user.id || user.username}`,
          name: user.username ? `@${user.username}` : `ID ${user.id}`,
          isMock: false,
        };
      }
      let guestId = '';
      try {
        guestId = global.localStorage.getItem('shashki_guest_id') || '';
        if (!guestId) {
          guestId = String(100000 + Math.floor(Math.random() * 900000));
          global.localStorage.setItem('shashki_guest_id', guestId);
        }
      } catch (_e) {
        guestId = '000001';
      }
      return { id: `guest_${guestId}`, name: `ID ${guestId}`, isMock: true };
    },

    loadEntries() {
      try {
        const raw = global.localStorage.getItem(LEADERBOARD_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_e) {}
      const initial = SEED_LEADERS.slice();
      this.saveEntries(initial);
      return initial;
    },

    saveEntries(list) {
      try {
        global.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(list.slice(0, 60)));
      } catch (_e) {}
    },

    async submitScore({ score, distanceM, charId, hardMode }) {
      const cleanScore = Math.max(0, Math.floor(score || 0));
      if (cleanScore <= 0) return;

      const me = this.getPlayerIdentity();
      const modeTag = hardMode ? 'hard' : 'classic';
      const entryId = `${me.id}_${modeTag}`;
      const record = {
        id: entryId,
        name: me.name,
        charId: charId || 'waldemaree',
        score: cleanScore,
        distanceM: Math.max(0, Math.floor(distanceM || 0)),
        hardMode: Boolean(hardMode),
        isMe: true,
        updatedAt: Date.now(),
      };

      const entries = this.loadEntries();
      const idx = entries.findIndex((item) => item.id === entryId);
      if (idx >= 0) {
        if (cleanScore > (entries[idx].score || 0)) {
          entries[idx] = { ...entries[idx], ...record };
        } else {
          entries[idx].name = me.name;
        }
      } else {
        entries.push(record);
      }
      entries.sort((a, b) => b.score - a.score);
      this.saveEntries(entries);

      const bestRecord = entries.find((item) => item.id === entryId) || record;
      const remotePayload = {
        id: bestRecord.id,
        name: bestRecord.name,
        charId: bestRecord.charId,
        score: bestRecord.score,
        distanceM: bestRecord.distanceM,
        hardMode: Boolean(bestRecord.hardMode),
        updatedAt: bestRecord.updatedAt || Date.now(),
      };

      // Sync best record cleanly to configured Firebase Realtime Database path (skip mock browser sessions)
      const fb = this.getConfig();
      if (fb && fb.databaseUrl && !me.isMock) {
        const lbPath = fb.path || 'shashki_leaderboard';
        const url = `${fb.databaseUrl.replace(/\/$/, '')}/${lbPath}/${encodeURIComponent(entryId)}.json`;
        fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(remotePayload),
        }).catch(() => {});
      }
    },

    async fetchTop(filterMode) {
      const localList = this.loadEntries();
      const fb = this.getConfig();
      let merged = localList;
      let syncedOnline = false;

      if (fb && fb.databaseUrl) {
        try {
          const lbPath = fb.path || 'shashki_leaderboard';
          const res = await fetch(`${fb.databaseUrl.replace(/\/$/, '')}/${lbPath}.json`);
          if (res.ok) {
            syncedOnline = true;
            const data = await res.json();
            if (data && typeof data === 'object') {
              const me = this.getPlayerIdentity();
              merged = Object.values(data)
                .filter((item) => item && !String(item.id || '').startsWith('tg_123456789') && item.name !== '@tg_shashki_pro')
                .map((item) => ({
                  ...item,
                  isMe: String(item.id || '').startsWith(me.id),
                }));
            } else {
              merged = [];
            }
            this.saveEntries(merged);
          }
        } catch (_e) {}
      }

      const filtered = merged
        .filter((item) => {
          if (filterMode === 'classic') return !item.hardMode;
          if (filterMode === 'hard') return Boolean(item.hardMode);
          return true;
        })
        .sort((a, b) => (b.score || 0) - (a.score || 0));

      return { rows: filtered, syncedOnline };
    },
  };

  // ==================== GAME STATE ====================
  const save = loadSave();
  sound.setMuted(save.muted);

  const state = {
    mode: 'garage', // 'garage' | 'playing' | 'paused' | 'gameover'
    hardMode: save.hardMode,
    isTestDrive: false,
    activeCharId: save.selectedCharId,
    time: 0,
    roadScroll: 0,
    pedalPhase: 0,

    speedKmh: 110,
    isGassing: false,
    isBraking: false,
    brakeHeat: 0,
    brakeOverheated: false,
    brakeCoolTimer: 0,
    backfireTimer: 0,
    beamTimer: 0,
    beamCooldown: 0,
    beamMaxCooldown: 6.0,
    invulnTimer: 0,
    revivesUsed: 0,
    thumbsUpTimer: 0,
    shake: 0,

    player: {
      charId: save.selectedCharId,
      lane: 1,
      lanePos: 1,
      laneVel: 0,
      tilt: 0,
      x: 200,
      y: 170,
      recentLaneCutTimer: 0,
    },

    resource: 100, // 0..100 (fuel or energy in hardMode)
    lowResourceBeepTimer: 0,
    speechTimer: 0,
    speechText: '',

    score: 0,
    distanceM: 0,
    runCoins: 0,
    bankedRunCoins: 0,
    combo: 1,
    maxCombo: 1,
    comboTimer: 0,
    gameOverReason: 'crash',

    traffic: [],
    pickups: [],
    particles: [],
    skidMarks: [],
    popups: [],
    shockwaves: [],
    scenicEvents: [],

    trafficSpawnTimer: 0.7,
    pickupSpawnTimer: 1.1,
    scenicSpawnTimer: 1.5,
    smokeSpawnTimer: 0,
    lastOpenLane: 1,
    nextEntityId: 1,
  };

  // Telegram WebApp Init
  const tg = global.Telegram && global.Telegram.WebApp;
  if (tg) {
    try {
      tg.ready();
      tg.expand();
    } catch (_e) {}
  }

  function triggerHaptic(type, style) {
    if (!tg || !tg.HapticFeedback) return;
    try {
      if (type === 'impact') tg.HapticFeedback.impactOccurred(style || 'light');
      else if (type === 'notification') tg.HapticFeedback.notificationOccurred(style || 'success');
      else if (type === 'select') tg.HapticFeedback.selectionChanged();
    } catch (_e) {}
  }

  // ==================== RESIZE ====================
  function syncCanvasSize() {
    const rect = stageEl.getBoundingClientRect();
    renderer.resize(rect.width || 440, rect.height || 780);
    state.player.y = Math.round(renderer.height * 0.34);
    state.player.x = renderer.laneX(state.player.lanePos, state.player.y);
  }
  syncCanvasSize();
  global.addEventListener('resize', syncCanvasSize);

  // ==================== STATS & UPGRADES ====================
  function getUpgrades(charId) {
    return save.upgrades[charId] || { engine: 1, tank: 1 };
  }

  function getCharStats(charId) {
    const ch = getCharById(charId);
    const up = getUpgrades(charId);
    const engBonus = up.engine - 1;
    const tankBonus = up.tank - 1;
    return {
      baseSpeed: ch.baseSpeed + engBonus * 7,
      maxSpeed: ch.maxSpeed + engBonus * 11,
      handling: ch.handling + engBonus * 0.75,
      drainRate: ch.drainRate * Math.pow(0.91, tankBonus),
      pickupRestore: 38 + tankBonus * 4,
    };
  }

  function upgradeCost(level) {
    return 150 * level;
  }

  function getSvgIcon(name, sizeClass) {
    const map = global.CharacterIllustrator && global.CharacterIllustrator.SVG_ICONS;
    const svg = map && map[name];
    if (!svg) return '';
    return `<span class="svg-icon ${sizeClass || 'svg-icon-md'}" aria-hidden="true">${svg}</span>`;
  }

  // ==================== GARAGE UI ====================
  function updateMuteIcons() {
    const html = getSvgIcon(sound.muted ? 'soundOff' : 'soundOn', 'svg-icon-md');
    dom.btnMute.innerHTML = html;
    dom.btnGarageMute.innerHTML = html;
  }

  function renderGarage() {
    updateMuteIcons();
    dom.garageCoins.textContent = String(save.coins);

    dom.modeClassic.classList.toggle('is-active', !save.hardMode);
    dom.modeClassic.setAttribute('aria-selected', String(!save.hardMode));
    dom.modeHard.classList.toggle('is-active', save.hardMode);
    dom.modeHard.setAttribute('aria-selected', String(save.hardMode));

    const selectedChar = getCharById(save.selectedCharId);
    dom.btnStartText.textContent = `ПОЕХАЛИ! (${selectedChar.name})`;

    dom.garageCards.innerHTML = '';
    CHARACTERS.forEach((ch) => {
      const unlocked = save.unlocked.includes(ch.id);
      const isSelected = save.selectedCharId === ch.id;
      const up = getUpgrades(ch.id);
      const engCost = upgradeCost(up.engine);
      const tankCost = upgradeCost(up.tank);
      const engMax = up.engine >= 5;
      const tankMax = up.tank >= 5;

      const card = document.createElement('article');
      card.className = `garage-card${isSelected ? ' is-selected' : ''}`;
      card.dataset.charId = ch.id;

      const passBadgeHtml = ch.passengerId
        ? `<div class="card-passenger-tag">+ пасс. ${ch.passengerId}</div>`
        : '';

      const COIN_HTML = '<span class="coin-badge-icon coin-badge-xs" aria-hidden="true">₽</span>';

      const statusBadgeHtml = unlocked
        ? '<span class="card-status-pill is-open">ОТКРЫТ</span>'
        : `<span class="card-status-pill is-locked">${ch.unlockCoins} ${COIN_HTML}</span>`;

      const plateHtml = ch.plate !== 'NO PLATE'
        ? `<span class="card-plate-tag">${ch.plate}</span>`
        : '';

      const ctaHtml = unlocked
        ? `<button type="button" class="btn-select ${isSelected ? 'is-selected' : ''}" data-action="select" data-id="${ch.id}">
             ${isSelected ? 'ВЫБРАН' : 'ВЫБРАТЬ'}
           </button>`
        : `<button type="button" class="btn-buy-coins" data-action="buy-coins" data-id="${ch.id}">
             <span>КУПИТЬ</span><span>(${ch.unlockCoins} ${COIN_HTML})</span>
           </button>
           <button type="button" class="btn-test-drive" data-action="test-drive" data-id="${ch.id}">
             ТЕСТ-ДРАЙВ
           </button>`;

      const engScale = clamp(ch.specs.speed + (up.engine - 1) * 0.04, 0.2, 1);
      const handScale = clamp(ch.specs.handling + (up.engine - 1) * 0.03, 0.2, 1);
      const tankScale = clamp(ch.specs.endurance + (up.tank - 1) * 0.05, 0.2, 1);

      const art = getIllustratedAssets()[ch.id] || {};
      const cardImgSrc = art.cardImg || '';
      const vehImgSrc = art.vehImg || '';

      card.innerHTML = `
        <div class="card-top">
          <div class="card-visuals">
            <div class="card-char-thumb">
              <img src="${cardImgSrc}" alt="${ch.name}" />
            </div>
            <div class="card-veh-thumb">
              <img src="${vehImgSrc}" alt="${ch.vehicleName}" />
            </div>
          </div>
          <div class="card-info">
            <div class="card-title-row">
              <span class="card-driver">${ch.name}</span>
              ${statusBadgeHtml}
            </div>
            <div class="card-vehicle-name">${ch.vehicleName}</div>
            ${passBadgeHtml}
          </div>
        </div>

        <div class="card-specs">
          <div class="spec-item">
            <span class="spec-label">Скорость</span>
            <div class="spec-bar"><div class="spec-bar-fill" style="transform: scaleX(${engScale.toFixed(2)})"></div></div>
          </div>
          <div class="spec-item">
            <span class="spec-label">Манёвр</span>
            <div class="spec-bar"><div class="spec-bar-fill" style="transform: scaleX(${handScale.toFixed(2)})"></div></div>
          </div>
          <div class="spec-item">
            <span class="spec-label">${ch.resourceType === 'energy' ? 'Запас сил' : 'Бак'}</span>
            <div class="spec-bar"><div class="spec-bar-fill" style="transform: scaleX(${tankScale.toFixed(2)})"></div></div>
          </div>
        </div>

        <div class="card-actions">
          <button type="button" class="upgrade-btn" data-action="up-engine" data-id="${ch.id}" ${!unlocked || engMax ? 'disabled' : ''}>
            <span>${ch.upgradeNames.engine} Ур.${up.engine}/5</span>
            <span class="upgrade-cost">${engMax ? 'MAX' : `${engCost} ${COIN_HTML}`}</span>
          </button>
          <button type="button" class="upgrade-btn" data-action="up-tank" data-id="${ch.id}" ${!unlocked || tankMax ? 'disabled' : ''}>
            <span>${ch.upgradeNames.tank} Ур.${up.tank}/5</span>
            <span class="upgrade-cost">${tankMax ? 'MAX' : `${tankCost} ${COIN_HTML}`}</span>
          </button>
        </div>

        <div class="card-cta-row">
          ${ctaHtml}
        </div>
      `;

      dom.garageCards.appendChild(card);
    });
  }

  dom.garageCards.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    sound.unlock();
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const ch = getCharById(id);

    if (action === 'select') {
      if (save.unlocked.includes(id)) {
        save.selectedCharId = id;
        persistSave(save);
        triggerHaptic('select');
        renderGarage();
      }
    } else if (action === 'buy-coins') {
      if (save.coins >= ch.unlockCoins) {
        save.coins -= ch.unlockCoins;
        if (!save.unlocked.includes(id)) save.unlocked.push(id);
        save.selectedCharId = id;
        persistSave(save);
        sound.playShashka(2);
        triggerHaptic('notification', 'success');
        renderGarage();
      } else {
        sound.playLowResource();
        triggerHaptic('notification', 'error');
        btn.textContent = `Не хватает (${save.coins}/${ch.unlockCoins})`;
        setTimeout(renderGarage, 950);
      }
    } else if (action === 'test-drive') {
      triggerHaptic('impact', 'medium');
      startRun(id, true);
    } else if (action === 'up-engine' || action === 'up-tank') {
      if (!save.unlocked.includes(id)) return;
      const key = action === 'up-engine' ? 'engine' : 'tank';
      const up = getUpgrades(id);
      if (up[key] >= 5) return;
      const cost = upgradeCost(up[key]);
      if (save.coins >= cost) {
        save.coins -= cost;
        up[key] += 1;
        save.upgrades[id] = up;
        persistSave(save);
        sound.playCoin();
        triggerHaptic('impact', 'light');
        renderGarage();
      } else {
        sound.playLowResource();
        triggerHaptic('notification', 'error');
      }
    }
  });

  dom.modeClassic.addEventListener('click', () => {
    sound.unlock();
    save.hardMode = false;
    state.hardMode = false;
    persistSave(save);
    triggerHaptic('select');
    renderGarage();
  });

  dom.modeHard.addEventListener('click', () => {
    sound.unlock();
    save.hardMode = true;
    state.hardMode = true;
    persistSave(save);
    triggerHaptic('select');
    renderGarage();
  });

  dom.btnStartRun.addEventListener('click', () => {
    sound.unlock();
    triggerHaptic('impact', 'medium');
    startRun(save.selectedCharId, false);
  });

  // ==================== RUN LIFECYCLE ====================
  function showSpeech(text, duration) {
    state.speechText = text;
    state.speechTimer = duration || 1.7;
    dom.hudSpeechText.textContent = text;
    dom.hudSpeech.classList.remove('is-hidden');
    dom.camDriver.classList.add('is-reacting');
  }

  function setupHudForCharacter(charId) {
    const ch = getCharById(charId);
    const art = getIllustratedAssets();
    dom.camDriverImg.src = (art[ch.id] && art[ch.id].faceImg) || '';
    dom.camDriverName.textContent = ch.name;

    if (ch.passengerId && PASSENGERS[ch.passengerId]) {
      const pass = PASSENGERS[ch.passengerId];
      const passArt = art[pass.id] || {};
      const passSrc = pass.id === 'zabl' ? (passArt.faceKfcImg || passArt.faceImg) : passArt.faceImg;
      dom.camPassengerImg.src = passSrc || '';
      dom.camPassengerName.textContent = pass.name;
      dom.camPassenger.classList.remove('is-hidden');
    } else {
      dom.camPassenger.classList.add('is-hidden');
    }

    const isBike = ch.vehicleType === 'bike';
    const svgMap = (global.CharacterIllustrator && global.CharacterIllustrator.SVG_ICONS) || {};
    dom.btnBeamIcon.innerHTML = isBike ? (svgMap.bell || '') : (svgMap.beam || '');
    dom.btnBeamText.textContent = isBike ? 'ЗВОНОК' : 'ДАЛЬНИЙ';

    dom.hudTestDriveBadge.classList.toggle('is-hidden', !state.isTestDrive);

    if (state.hardMode) {
      dom.hudResourceWrap.classList.remove('is-hidden');
      dom.hudResourceWrap.classList.toggle('is-energy', ch.resourceType === 'energy');
      dom.hudResourceLabel.innerHTML = ch.resourceType === 'energy'
        ? `${getSvgIcon('bolt', 'svg-icon-xs energy-inline-icon')} ЭНЕРГИЯ`
        : '<span class="fuel-pill-tag">АИ-98</span> БЕНЗИН';
    } else {
      dom.hudResourceWrap.classList.add('is-hidden');
    }
  }

  function startRun(charId, isTestDrive) {
    const ch = getCharById(charId);
    const stats = getCharStats(charId);

    state.mode = 'playing';
    state.hardMode = save.hardMode;
    state.isTestDrive = Boolean(isTestDrive);
    state.activeCharId = ch.id;

    state.speedKmh = stats.baseSpeed;
    state.isGassing = false;
    state.isBraking = false;
    state.brakeHeat = 0;
    state.brakeOverheated = false;
    state.brakeCoolTimer = 0;
    state.backfireTimer = 0;
    state.beamTimer = 0;
    state.beamCooldown = 0;
    state.invulnTimer = 0;
    state.revivesUsed = 0;
    state.thumbsUpTimer = 0;
    state.shake = 0;

    state.player.charId = ch.id;
    state.player.lane = 1;
    state.player.lanePos = 1;
    state.player.laneVel = 0;
    state.player.tilt = 0;
    state.player.y = Math.round(renderer.height * 0.34);
    state.player.x = renderer.laneX(1, state.player.y);
    state.player.recentLaneCutTimer = 0;

    state.resource = 100;
    state.lowResourceBeepTimer = 0;
    state.speechTimer = 0;
    state.score = 0;
    state.distanceM = 0;
    state.runCoins = 0;
    state.bankedRunCoins = 0;
    state.combo = 1;
    state.maxCombo = 1;
    state.comboTimer = 0;

    state.traffic = [];
    state.pickups = [];
    state.particles = [];
    state.skidMarks = [];
    state.popups = [];
    state.shockwaves = [];
    state.scenicEvents = [];
    state.trafficSpawnTimer = 0.45;
    state.pickupSpawnTimer = 0.8;
    state.scenicSpawnTimer = 1.1;

    dom.btnGas.classList.remove('is-pressed');
    dom.btnBrake.classList.remove('is-pressed', 'is-overheated');
    dom.garageOverlay.classList.add('is-hidden');
    dom.pauseOverlay.classList.add('is-hidden');
    dom.gameoverOverlay.classList.add('is-hidden');
    dom.hudTop.classList.remove('is-hidden');
    dom.hudControls.classList.remove('is-hidden');

    setupHudForCharacter(ch.id);
    syncHud();

    sound.startEngine(ch.id);
    showSpeech(state.isTestDrive ? 'Тест-драйв погнали!' : 'Поехали в шашки!', 1.6);

    // Seed initial visible traffic & roadside scene ahead so frame 1 is rich and alive
    spawnTrafficWave(renderer.height * 0.88);
    spawnPickupRow(renderer.height * 0.68, false);
    spawnScenicEvent(renderer.height * 0.60, 'dps_post');
  }

  function openGarage() {
    state.mode = 'garage';
    state.isGassing = false;
    state.isBraking = false;
    sound.stopEngine();

    dom.hudTop.classList.add('is-hidden');
    dom.hudControls.classList.add('is-hidden');
    dom.pauseOverlay.classList.add('is-hidden');
    dom.gameoverOverlay.classList.add('is-hidden');
    dom.garageOverlay.classList.remove('is-hidden');
    renderGarage();
  }

  function pauseGame() {
    if (state.mode !== 'playing') return;
    state.mode = 'paused';
    state.isGassing = false;
    state.isBraking = false;
    sound.stopEngine();
    dom.pauseOverlay.classList.remove('is-hidden');
  }

  function resumeGame() {
    if (state.mode !== 'paused') return;
    state.mode = 'playing';
    dom.pauseOverlay.classList.add('is-hidden');
    sound.startEngine(state.activeCharId);
  }

  function getReviveCosts() {
    return {
      coins: 150 * Math.pow(2, state.revivesUsed),
      stars: 1,
    };
  }

  function updateReviveUI() {
    if (!dom.reviveBox) return;
    if (state.isTestDrive) {
      dom.reviveBox.classList.add('is-hidden');
      return;
    }
    dom.reviveBox.classList.remove('is-hidden');
    const costs = getReviveCosts();
    const canAffordCoins = save.coins >= costs.coins;

    dom.reviveTitle.textContent = state.revivesUsed === 0
      ? 'ВТОРОЙ ШАНС — ПРОДОЛЖИТЬ ЗАЕЗД'
      : `ВТОРОЙ ШАНС #${state.revivesUsed + 1} — ЩИТ 3С`;

    dom.btnReviveCoins.disabled = !canAffordCoins;
    dom.btnReviveCoins.innerHTML = `
      <span class="revive-btn-main">${costs.coins} <span class="coin-badge-icon coin-badge-xs" aria-hidden="true">₽</span></span>
      <span class="revive-btn-sub">${canAffordCoins ? 'За монеты' : `Баланс: ${save.coins}`}</span>
    `;

    dom.btnReviveStars.disabled = false;
    dom.btnReviveStars.innerHTML = `
      <span class="revive-btn-main">${costs.stars} ${getSvgIcon('star', 'svg-icon-xs star-inline-icon')}</span>
      <span class="revive-btn-sub">Telegram Stars</span>
    `;
  }

  function reviveRun(method) {
    if (state.mode !== 'gameover' || state.isTestDrive) return;
    const costs = getReviveCosts();

    if (method === 'coins') {
      if (save.coins < costs.coins) {
        sound.playLowResource();
        triggerHaptic('notification', 'error');
        return;
      }
      save.coins -= costs.coins;
      persistSave(save);
    }

    state.revivesUsed += 1;
    state.mode = 'playing';
    state.invulnTimer = 3.0;
    state.resource = 100;
    state.lowResourceBeepTimer = 0;
    state.brakeHeat = 0;
    state.brakeOverheated = false;
    state.brakeCoolTimer = 0;
    state.isGassing = false;
    state.isBraking = false;
    state.shake = 6;

    const stats = getCharStats(state.activeCharId);
    state.speedKmh = Math.max(stats.baseSpeed, state.speedKmh * 0.85);

    // Clear nearby traffic around player for a clean safe resume window
    state.traffic = state.traffic.filter((car) => Math.abs(car.y - state.player.y) > 260);
    state.shockwaves.push({
      x: state.player.x,
      y: state.player.y,
      scale: renderer.heroScale(state.player.y) * 1.25,
      life: 0.65,
      maxLife: 0.65,
      rgb: '56, 249, 215',
    });

    dom.gameoverOverlay.classList.add('is-hidden');
    dom.hudControls.classList.remove('is-hidden');
    dom.btnGas.classList.remove('is-pressed');
    dom.btnBrake.classList.remove('is-pressed', 'is-overheated');

    sound.startEngine(state.activeCharId);
    sound.playShashka(4);
    triggerHaptic('notification', 'success');
    showSpeech('ВТОРОЙ ШАНС! ПОГНАЛИ!', 1.8);
    spawnPopup(state.player.x, state.player.y - 36, 'ВОЗРОЖДЕНИЕ! ЩИТ 3С', '#38f9d7', 16);
    syncHud();
  }

  function triggerGameOver(reason) {
    if (state.mode !== 'playing') return;
    state.mode = 'gameover';
    state.gameOverReason = reason;
    state.isGassing = false;
    state.isBraking = false;
    sound.stopEngine();

    if (reason === 'crash') {
      sound.playCrash();
      state.shake = 18;
      spawnCrashDebris(state.player.x, state.player.y);
      triggerHaptic('notification', 'error');
    } else {
      sound.playLowResource();
      triggerHaptic('notification', 'warning');
    }

    const finalScore = Math.floor(state.score);
    const unbankedCoins = Math.max(0, state.runCoins - (state.bankedRunCoins || 0));
    if (!state.isTestDrive) {
      save.coins += unbankedCoins;
      state.bankedRunCoins = state.runCoins;
      if (finalScore > save.bestScore) {
        save.bestScore = finalScore;
      }
      persistSave(save);
      if (finalScore > 0) {
        LeaderboardService.submitScore({
          score: finalScore,
          distanceM: Math.floor(state.distanceM),
          charId: state.activeCharId,
          hardMode: state.hardMode,
        });
      }
    }

    const ch = getCharById(state.activeCharId);
    const art = getIllustratedAssets();
    dom.gameoverFace.src = (art[ch.id] && art[ch.id].faceImg) || '';

    if (reason === 'crash') {
      dom.gameoverReason.textContent = 'АВАРИЯ!';
      dom.gameoverQuote.textContent = `«${ch.quotes.crash}»`;
    } else if (reason === 'out_of_energy') {
      dom.gameoverReason.textContent = 'ЭНЕРГИЯ НА НУЛЕ!';
      dom.gameoverQuote.textContent = `«${ch.quotes.empty}»`;
    } else {
      dom.gameoverReason.textContent = 'ЗАКОНЧИЛСЯ БЕНЗИН!';
      dom.gameoverQuote.textContent = `«${ch.quotes.empty}»`;
    }

    dom.goDist.textContent = `${Math.floor(state.distanceM)} м`;
    dom.goScore.textContent = String(finalScore);
    dom.goCombo.textContent = `x${state.maxCombo}`;
    dom.goCoins.innerHTML = state.isTestDrive
      ? '0 <span class="coin-badge-icon coin-badge-xs" aria-hidden="true">₽</span>'
      : `+${state.runCoins} <span class="coin-badge-icon coin-badge-xs" aria-hidden="true">₽</span>`;
    dom.goBest.textContent = String(save.bestScore);
    dom.goTestDriveNote.classList.toggle('is-hidden', !state.isTestDrive);
    updateReviveUI();

    dom.hudControls.classList.add('is-hidden');
    dom.gameoverOverlay.classList.remove('is-hidden');
  }

  // ==================== ACTIONS & CONTROLS ====================
  function steerLane(delta) {
    if (state.mode !== 'playing') return;
    const next = clamp(state.player.lane + delta, 0, 3);
    if (next !== state.player.lane) {
      state.player.lane = next;
      state.player.recentLaneCutTimer = 1.15;
      sound.playLaneChange();
      triggerHaptic('select');
    }
  }

  function triggerHighBeam() {
    if (state.mode !== 'playing' || state.beamCooldown > 0) return;
    const ch = getCharById(state.activeCharId);
    state.beamTimer = 0.55;
    state.beamCooldown = state.beamMaxCooldown;
    sound.playBeam(ch.vehicleType === 'bike');
    triggerHaptic('impact', 'light');
    showSpeech(pickRandom(ch.quotes.beam), 1.2);
    spawnPopup(state.player.x, state.player.y + 42, ch.vehicleType === 'bike' ? 'ДЗИНЬ!' : 'ДАЛЬНИЙ!', '#00d4ff', 14);

    // Cars ahead in the player's lane yield safely and grant +10 coins per yielding car
    let scaredCount = 0;
    for (const car of state.traffic) {
      if (car.y > state.player.y + 95 && car.y < renderer.height * 0.92) {
        if (car.lane === state.player.lane) {
          const candidates = [car.lane - 1, car.lane + 1].filter((l) => l >= 0 && l <= 3 && l !== state.player.lane);
          for (const targetLane of candidates) {
            if (isLaneClearNear(targetLane, car.y, 140, car.id)) {
              car.targetLane = targetLane;
              car.turnSignal = targetLane < car.lane ? -1 : 1;
              car.signalTimer = 0.25;
              scaredCount++;
              break;
            }
          }
        } else if (car.targetLane === state.player.lane) {
          car.targetLane = car.lane;
          car.turnSignal = 0;
          car.signalTimer = 0;
        }
      }
    }

    if (scaredCount > 0) {
      const yieldCoins = scaredCount * 10;
      state.runCoins += yieldCoins;
      state.score += scaredCount * 35;
      spawnPopup(state.player.x, state.player.y - 46, `УСТУПИЛ! +${yieldCoins} ₽`, '#2ee59d', 15);
    }
    syncHud();
  }

  function setGas(pressed) {
    if (!pressed && state.isGassing && state.speedKmh > 135) {
      const ch = getCharById(state.activeCharId);
      if (ch.vehicleType === 'e39' || ch.vehicleType === 'lc200') {
        state.backfireTimer = 0.28;
      }
    }
    state.isGassing = pressed;
    dom.btnGas.classList.toggle('is-pressed', pressed);
  }

  function setBrake(pressed) {
    if (pressed && state.brakeOverheated) {
      state.isBraking = false;
      dom.btnBrake.classList.remove('is-pressed');
      return;
    }
    state.isBraking = pressed;
    dom.btnBrake.classList.toggle('is-pressed', pressed);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      (stageEl.requestFullscreen || document.documentElement.requestFullscreen).call(stageEl).catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // Keyboard bindings
  global.addEventListener('keydown', (e) => {
    sound.unlock();
    const key = e.key;
    if (key === 'f' || key === 'F') {
      toggleFullscreen();
      return;
    }
    if (key === 'Escape') {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (state.mode === 'playing') {
        pauseGame();
      } else if (state.mode === 'paused') {
        resumeGame();
      }
      return;
    }
    if (state.mode !== 'playing') return;

    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      if (!e.repeat) steerLane(-1);
      e.preventDefault();
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      if (!e.repeat) steerLane(1);
      e.preventDefault();
    } else if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      setGas(true);
      e.preventDefault();
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
      setBrake(true);
      e.preventDefault();
    } else if (key === ' ') {
      if (!e.repeat) triggerHighBeam();
      e.preventDefault();
    }
  });

  global.addEventListener('keyup', (e) => {
    const key = e.key;
    if (key === 'ArrowUp' || key === 'w' || key === 'W') setGas(false);
    if (key === 'ArrowDown' || key === 's' || key === 'S') setBrake(false);
  });

  // Touch & Mouse HUD button bindings
  function bindHoldButton(btn, onDown, onUp) {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      sound.unlock();
      if (btn.setPointerCapture) {
        try { btn.setPointerCapture(e.pointerId); } catch (_e) {}
      }
      onDown();
    });
    const end = (e) => {
      e.preventDefault();
      if (btn.releasePointerCapture) {
        try { btn.releasePointerCapture(e.pointerId); } catch (_e) {}
      }
      onUp();
    };
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
  }

  dom.btnBeam.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sound.unlock();
    triggerHighBeam();
  });
  bindHoldButton(dom.btnGas, () => setGas(true), () => setGas(false));
  bindHoldButton(dom.btnBrake, () => setBrake(true), () => setBrake(false));

  // Instant Edge-Tap + Multi-Touch Swipe Steering (Left half -> -1, Right half -> +1)
  function flashEdgeZone(dir) {
    const el = dir < 0 ? dom.edgeTapLeft : dom.edgeTapRight;
    if (!el) return;
    el.classList.add('is-active');
    clearTimeout(el._flashTimer);
    el._flashTimer = setTimeout(() => el.classList.remove('is-active'), 160);
  }

  const canvasPointers = new Map();
  canvas.addEventListener('pointerdown', (e) => {
    if (state.mode !== 'playing') return;
    e.preventDefault();
    sound.unlock();
    const rect = canvas.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const tapDir = relX < rect.width * 0.5 ? -1 : 1;
    canvasPointers.set(e.pointerId, { startX: e.clientX, tapDir, swiped: false });
    steerLane(tapDir);
    flashEdgeZone(tapDir);
  });

  canvas.addEventListener('pointermove', (e) => {
    const info = canvasPointers.get(e.pointerId);
    if (!info || info.swiped || state.mode !== 'playing') return;
    const dx = e.clientX - info.startX;
    if (Math.abs(dx) >= 38) {
      const swipeDir = dx > 0 ? 1 : -1;
      if (swipeDir !== info.tapDir) {
        steerLane(swipeDir);
        flashEdgeZone(swipeDir);
      }
      info.swiped = true;
    }
  });

  const endCanvasPointer = (e) => canvasPointers.delete(e.pointerId);
  canvas.addEventListener('pointerup', endCanvasPointer);
  canvas.addEventListener('pointercancel', endCanvasPointer);

  // Leaderboard Modal UI
  async function renderLeaderboard() {
    if (!dom.lbList || !dom.lbMe) return;
    const filter = LeaderboardService.currentFilter || 'all';
    dom.lbTabs.forEach((tab) => {
      const active = tab.dataset.lbFilter === filter;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });

    const { rows, syncedOnline } = await LeaderboardService.fetchTop(filter);
    dom.lbSyncStatus.textContent = syncedOnline
      ? 'Firebase Online • Обновлено'
      : 'Локальный рейтинг • Firebase Ready';

    const art = getIllustratedAssets();
    dom.lbList.innerHTML = '';
    if (rows.length === 0) {
      dom.lbList.innerHTML = `
        <div class="lb-row">
          <div class="lb-info">
            <div class="lb-name">Пока нет рекордов</div>
            <div class="lb-meta"><span>Заверши заезд, чтобы занять 1-е место!</span></div>
          </div>
        </div>
      `;
    } else {
      rows.slice(0, 20).forEach((row, index) => {
        const rank = index + 1;
        const ch = getCharById(row.charId);
        const faceSrc = (art[ch.id] && art[ch.id].faceImg) || '';
        const rowEl = document.createElement('div');
        rowEl.className = `lb-row${row.isMe ? ' is-me' : ''}`;
        const rankCls = rank <= 3 ? ` lb-rank-${rank}` : '';
        rowEl.innerHTML = `
          <div class="lb-rank${rankCls}">${rank}</div>
          <img class="lb-avatar" src="${faceSrc}" alt="${ch.name}" />
          <div class="lb-info">
            <div class="lb-name">${row.name}</div>
            <div class="lb-meta">
              <span>${ch.vehicleName.split('(')[0].trim()}</span>
              <span class="lb-mode-tag${row.hardMode ? ' is-hard' : ''}">${row.hardMode ? 'СЛОЖНЫЙ' : 'КЛАССИКА'}</span>
            </div>
          </div>
          <div class="lb-score-col">
            <span class="lb-score-val">${Math.floor(row.score || 0)}</span>
            <span class="lb-dist-val">${Math.floor(row.distanceM || 0)} м</span>
          </div>
        `;
        dom.lbList.appendChild(rowEl);
      });
    }

    const me = LeaderboardService.getPlayerIdentity();
    const myBestIdx = rows.findIndex((r) => r.isMe);
    dom.lbMe.innerHTML = myBestIdx >= 0
      ? `<span>${me.name} • Место #${myBestIdx + 1}</span><span>Рекорд: ${Math.floor(rows[myBestIdx].score || 0)}</span>`
      : `<span>${me.name}</span><span>Лучший счёт: ${save.bestScore}</span>`;
  }

  function openLeaderboard() {
    if (!dom.leaderboardOverlay) return;
    sound.unlock();
    triggerHaptic('select');
    dom.leaderboardOverlay.classList.remove('is-hidden');
    renderLeaderboard();
  }

  function closeLeaderboard() {
    if (!dom.leaderboardOverlay) return;
    dom.leaderboardOverlay.classList.add('is-hidden');
  }

  // Modal & Header Buttons
  function handleMuteToggle() {
    const muted = sound.toggleMute();
    save.muted = muted;
    persistSave(save);
    updateMuteIcons();
  }
  dom.btnMute.addEventListener('click', handleMuteToggle);
  dom.btnGarageMute.addEventListener('click', handleMuteToggle);
  if (dom.btnLeaderboard) dom.btnLeaderboard.addEventListener('click', openLeaderboard);
  if (dom.btnGoLeaderboard) dom.btnGoLeaderboard.addEventListener('click', openLeaderboard);
  if (dom.btnCloseLeaderboard) dom.btnCloseLeaderboard.addEventListener('click', closeLeaderboard);
  if (dom.leaderboardOverlay) {
    dom.leaderboardOverlay.addEventListener('click', (e) => {
      if (e.target === dom.leaderboardOverlay) closeLeaderboard();
    });
  }
  dom.lbTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      LeaderboardService.currentFilter = tab.dataset.lbFilter || 'all';
      triggerHaptic('select');
      renderLeaderboard();
    });
  });

  dom.btnPause.addEventListener('click', pauseGame);
  dom.btnResume.addEventListener('click', resumeGame);
  dom.btnPauseGarage.addEventListener('click', openGarage);
  dom.btnRetry.addEventListener('click', () => startRun(state.activeCharId, state.isTestDrive));
  dom.btnToGarage.addEventListener('click', openGarage);

  dom.btnReviveCoins.addEventListener('click', () => {
    sound.unlock();
    reviveRun('coins');
  });

  dom.btnReviveStars.addEventListener('click', () => {
    sound.unlock();
    if (state.mode !== 'gameover' || state.isTestDrive) return;
    const costs = getReviveCosts();
    const tgCfg = global.SHASHKI_TELEGRAM_CONFIG || {};
    if (tg && tg.__isMock && typeof tg.openStarsPayment === 'function') {
      tg.openStarsPayment(costs.stars, (status) => {
        if (status === 'paid') reviveRun('stars');
      });
    } else if (tg && typeof tg.openInvoice === 'function' && tgCfg.reviveInvoiceUrl) {
      tg.openInvoice(tgCfg.reviveInvoiceUrl, (status) => {
        if (status === 'paid') reviveRun('stars');
      });
    } else if (tg && typeof tg.showAlert === 'function') {
      tg.showAlert('Оплата Telegram Stars доступна внутри приложения Telegram.');
    }
  });

  // ==================== TRAFFIC, SCENIC EVENTS & PICKUPS SPAWNER ====================
  const SCENIC_KINDS = ['dps_post', 'gas_station', 'roadworks', 'car_meet'];

  function spawnScenicEvent(customY, forceKind) {
    const kind = forceKind || SCENIC_KINDS[Math.floor(Math.random() * SCENIC_KINDS.length)];
    const side = kind === 'gas_station' || kind === 'dps_post'
      ? (Math.random() < 0.72 ? 1 : -1)
      : (Math.random() < 0.5 ? -1 : 1);
    state.scenicEvents.push({
      id: state.nextEntityId++,
      kind,
      side,
      y: customY !== undefined ? customY : renderer.height + 135,
      flashed: false,
      flashTimer: 0,
    });
  }

  function trafficBaseHeight(kind) {
    return kind === 'van' ? 112 : kind === 'suv' ? 102 : 94;
  }

  function isLaneClearNear(lane, y, minGap, ignoreId) {
    for (const car of state.traffic) {
      if (car.id === ignoreId) continue;
      if (Math.abs(car.lanePos - lane) < 0.85 || car.lane === lane || car.targetLane === lane) {
        if (Math.abs(car.y - y) < minGap) return false;
      }
    }
    return true;
  }

  function spawnTrafficWave(customY) {
    const spawnY = customY !== undefined ? customY : renderer.height + 110;
    const difficulty = clamp(state.distanceM / 1800, 0, 1);

    // Pick 1..3 occupied lanes, keeping openLane within ±1 of previous wave so every wave stays escapable!
    const allLanes = [0, 1, 2, 3];
    const openCandidates = allLanes.filter((l) => Math.abs(l - state.lastOpenLane) <= 1);
    const openLane = pickRandom(openCandidates.length ? openCandidates : allLanes);
    state.lastOpenLane = openLane;
    const candidateLanes = allLanes.filter((l) => l !== openLane);

    for (let i = candidateLanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidateLanes[i], candidateLanes[j]] = [candidateLanes[j], candidateLanes[i]];
    }

    const maxCars = difficulty > 0.35 ? 3 : 2;
    const count = 1 + Math.floor(Math.random() * maxCars);

    for (let i = 0; i < count; i++) {
      const lane = candidateLanes[i];
      const yOffset = i * (36 + Math.random() * 52);
      const y = spawnY + yOffset;
      if (!isLaneClearNear(lane, y, 175)) continue;

      const style = pickRandom(TRAFFIC_STYLES);
      // Left fast lanes flow faster than right lanes; cap to any car ahead to prevent catch-up jams
      let cruiseSpeed = 88 - lane * 7 + Math.random() * 10 + difficulty * 12;
      for (const other of state.traffic) {
        if ((Math.abs(other.lanePos - lane) < 0.85 || other.targetLane === lane) && other.y > y && other.y - y < 280) {
          cruiseSpeed = Math.min(cruiseSpeed, other.speedKmh);
        }
      }

      state.traffic.push({
        id: state.nextEntityId++,
        lane,
        targetLane: lane,
        lanePos: lane,
        tilt: 0,
        y,
        speedKmh: cruiseSpeed,
        cruiseSpeed,
        kind: style.kind,
        color: style.color,
        colorLight: style.colorLight,
        colorDark: style.colorDark,
        turnSignal: 0,
        signalTimer: 0,
        braking: false,
        passed: false,
        nearMissed: false,
        canLaneChange: Math.random() < 0.25 + difficulty * 0.18,
      });
    }
  }

  function isLaneClearForPickup(lane, y) {
    for (const car of state.traffic) {
      if (car.lane === lane || car.targetLane === lane) {
        if (Math.abs(car.y - y) < 110) return false;
      }
    }
    return true;
  }

  function spawnPickupRow(customY, forceResource) {
    let spawnY = customY !== undefined ? customY : renderer.height + 70;
    const ch = getCharById(state.activeCharId);
    const shouldSpawnResource =
      state.hardMode && (forceResource || state.resource < 65 || Math.random() < 0.38);

    let lanes = [0, 1, 2, 3].filter((l) => isLaneClearForPickup(l, spawnY));
    if (lanes.length === 0 && shouldSpawnResource) {
      // Never skip urgent fuel/energy spawn: fall back to open wave lane & offset Y clear of cars
      spawnY += 120;
      lanes = [0, 1, 2, 3].filter((l) => isLaneClearForPickup(l, spawnY));
      if (lanes.length === 0) {
        lanes = [state.lastOpenLane];
      }
    }
    if (lanes.length === 0) return;
    const lane = pickRandom(lanes);

    if (shouldSpawnResource) {
      let type = 'fuel';
      if (ch.resourceType === 'energy') {
        type = Math.random() < 0.55 ? 'drink' : 'bar';
      }
      state.pickups.push({
        id: state.nextEntityId++,
        type,
        lane,
        y: spawnY,
        phase: Math.random() * Math.PI * 2,
      });
    } else {
      // Spawn 1..3 coins in a clean line
      const count = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        state.pickups.push({
          id: state.nextEntityId++,
          type: 'coin',
          lane,
          y: spawnY + i * 44,
          phase: i * 0.5,
        });
      }
    }
  }

  // ==================== VFX HELPERS ====================
  function spawnPopup(x, y, text, color, size) {
    state.popups.push({
      x,
      y,
      text,
      color: color || '#ffd043',
      size: size || 16,
      life: 0.95,
      maxLife: 0.95,
    });
  }

  function spawnCrashDebris(x, y) {
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 210;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 3 + Math.random() * 5,
        color: i % 2 === 0 ? 'rgba(255, 159, 28, ALPHA)' : 'rgba(220, 232, 245, ALPHA)',
        life: 0.5 + Math.random() * 0.45,
        maxLife: 0.95,
      });
    }
  }

  // ==================== SIMULATION STEP ====================
  function update(dt) {
    state.time += dt;
    state.shake = Math.max(0, state.shake - dt * 36);

    if (state.mode === 'garage') {
      // Gentle scenic attract-mode highway scroll behind garage overlay
      state.roadScroll += 220 * dt;
      return;
    }
    if (state.mode !== 'playing') return;

    const ch = getCharById(state.activeCharId);
    const stats = getCharStats(state.activeCharId);
    const p = state.player;

    // Cooldowns & timers
    state.beamTimer = Math.max(0, state.beamTimer - dt);
    state.beamCooldown = Math.max(0, state.beamCooldown - dt);
    state.invulnTimer = Math.max(0, state.invulnTimer - dt);
    state.backfireTimer = Math.max(0, state.backfireTimer - dt);
    state.thumbsUpTimer = Math.max(0, state.thumbsUpTimer - dt);
    p.recentLaneCutTimer = Math.max(0, p.recentLaneCutTimer - dt);

    // Brake thermal buildup / overheat lockout balance
    if (state.brakeOverheated) {
      state.isBraking = false;
      state.brakeCoolTimer -= dt;
      state.brakeHeat = Math.max(0, state.brakeHeat - 0.34 * dt);
      if (state.brakeCoolTimer <= 0) {
        state.brakeOverheated = false;
        state.brakeHeat = 0;
        dom.btnBrake.classList.remove('is-overheated');
      }
    } else if (state.isBraking) {
      state.brakeHeat = Math.min(1, state.brakeHeat + 0.42 * dt);
      if (state.brakeHeat >= 1) {
        state.brakeOverheated = true;
        state.brakeCoolTimer = 3.0;
        state.isBraking = false;
        dom.btnBrake.classList.remove('is-pressed');
        dom.btnBrake.classList.add('is-overheated');
        sound.playLowResource();
        triggerHaptic('notification', 'warning');
        spawnPopup(p.x, p.y - 26, 'ПЕРЕГРЕВ ТОРМОЗОВ!', '#ff3b5c', 13);
      }
    } else {
      state.brakeHeat = Math.max(0, state.brakeHeat - 0.42 * dt);
    }

    if (state.speechTimer > 0) {
      state.speechTimer -= dt;
      if (state.speechTimer <= 0) {
        dom.hudSpeech.classList.add('is-hidden');
        dom.camDriver.classList.remove('is-reacting');
      }
    }

    if (state.comboTimer > 0) {
      state.comboTimer -= dt * (state.isBraking ? 1.4 : 1.0);
      if (state.comboTimer <= 0) {
        state.combo = 1;
      }
    }

    // Longitudinal speed control
    const targetSpeed = state.isGassing
      ? stats.maxSpeed
      : state.isBraking
        ? Math.max(62, stats.baseSpeed * 0.62)
        : stats.baseSpeed + Math.min(28, state.distanceM * 0.008);

    const accelRate = state.isGassing ? 95 : state.isBraking ? 150 : 65;
    if (state.speedKmh < targetSpeed) {
      state.speedKmh = Math.min(targetSpeed, state.speedKmh + accelRate * dt);
    } else {
      state.speedKmh = Math.max(targetSpeed, state.speedKmh - accelRate * dt);
    }

    // Distance & Score
    const metersPerSec = state.speedKmh / 3.6;
    const dMeters = metersPerSec * dt;
    state.distanceM += dMeters;
    state.score += dMeters * (1 + (state.combo - 1) * 0.25);

    const pxPerSec = state.speedKmh * 3.8;
    state.roadScroll += pxPerSec * dt;
    state.pedalPhase += dt * (4 + (state.speedKmh / 100) * 8);

    // Smooth critical-damped spring lane interpolation (+25% agile cornering when trail-braking!)
    const effectiveHandling = stats.handling * (state.isBraking && !state.brakeOverheated ? 1.25 : 1.0);
    const laneDiff = p.lane - p.lanePos;
    const springK = effectiveHandling * 11;
    const damping = 2 * Math.sqrt(springK) * 0.92;
    p.laneVel += (laneDiff * springK - p.laneVel * damping) * dt;
    p.lanePos += p.laneVel * dt;
    if (Math.abs(laneDiff) < 0.004 && Math.abs(p.laneVel) < 0.04) {
      p.lanePos = p.lane;
      p.laneVel = 0;
    }

    const targetTilt = clamp(p.laneVel * 0.28, -1, 1);
    p.tilt += (targetTilt - p.tilt) * Math.min(1, dt * 16);
    p.y = Math.round(renderer.height * 0.34);
    p.x = renderer.laneX(p.lanePos, p.y);

    // Tire skid marks on sharp lane cuts
    if (Math.abs(p.tilt) > 0.45 && ch.vehicleType !== 'bike') {
      const heroScale = renderer.heroScale(p.y);
      state.skidMarks.push({
        x1: p.x - 24 * heroScale,
        y1: p.y - 26 * heroScale,
        x2: p.x - 24 * heroScale - p.laneVel * 3,
        y2: p.y - 40 * heroScale,
        alpha: 0.7,
        scale: heroScale,
      });
      state.skidMarks.push({
        x1: p.x + 24 * heroScale,
        y1: p.y - 26 * heroScale,
        x2: p.x + 24 * heroScale - p.laneVel * 3,
        y2: p.y - 40 * heroScale,
        alpha: 0.7,
        scale: heroScale,
      });
    }

    // E39 exhaust smoke & rear-fender sparks (trailing behind vehicle, never on hood)
    if (ch.vehicleType === 'e39') {
      state.smokeSpawnTimer -= dt;
      if (state.smokeSpawnTimer <= 0) {
        state.smokeSpawnTimer = 0.065;
        const heroScale = renderer.heroScale(p.y);
        state.particles.push({
          x: p.x - 24 * heroScale + (Math.random() - 0.5) * 6 * heroScale,
          y: p.y - 56 * heroScale,
          vx: (Math.random() - 0.5) * 16,
          vy: -65 - Math.random() * 40,
          size: (4.2 + Math.random() * 5.2) * heroScale,
          color: 'rgba(130, 140, 155, ALPHA)',
          life: 0.55,
          maxLife: 0.55,
        });
        if (Math.random() < 0.30) {
          state.particles.push({
            x: p.x + 30 * heroScale,
            y: p.y - 34 * heroScale,
            vx: (Math.random() - 0.5) * 42,
            vy: -55 - Math.random() * 35,
            size: 2.0 * heroScale,
            color: 'rgba(255, 160, 40, ALPHA)',
            life: 0.25,
            maxLife: 0.25,
          });
        }
      }
    }

    // Hard Mode Resource Drain
    if (state.hardMode) {
      const drainMult = state.isGassing ? 1.28 : state.isBraking ? 0.72 : 1.0;
      state.resource = Math.max(0, state.resource - stats.drainRate * drainMult * dt);

      if (state.resource > 0 && state.resource < 25) {
        state.lowResourceBeepTimer -= dt;
        if (state.lowResourceBeepTimer <= 0) {
          state.lowResourceBeepTimer = 1.8;
          sound.playLowResource();
          if (state.speechTimer <= 0) {
            showSpeech(pickRandom(ch.quotes.low), 1.4);
          }
        }
      }

      if (state.resource <= 0) {
        triggerGameOver(ch.resourceType === 'energy' ? 'out_of_energy' : 'out_of_fuel');
        return;
      }
    }

    // Traffic Spawning
    state.trafficSpawnTimer -= dt;
    if (state.trafficSpawnTimer <= 0) {
      spawnTrafficWave();
      const speedFactor = clamp(120 / state.speedKmh, 0.55, 1.25);
      const distFactor = clamp(1 - state.distanceM / 3200, 0.58, 1);
      state.trafficSpawnTimer = (0.95 + Math.random() * 0.55) * speedFactor * distFactor;
    }

    // Pickup Spawning (smart guaranteed fuel/energy in Hard Mode)
    state.pickupSpawnTimer -= dt;
    if (state.pickupSpawnTimer <= 0) {
      const urgent = state.hardMode && state.resource < 45;
      spawnPickupRow(undefined, urgent);
      state.pickupSpawnTimer = urgent ? 1.15 : 1.35 + Math.random() * 0.7;
    }

    // Living Roadside Scenic Events Spawner & Speed-Trap Flash
    state.scenicSpawnTimer -= dt;
    if (state.scenicSpawnTimer <= 0) {
      spawnScenicEvent();
      state.scenicSpawnTimer = 4.5 + Math.random() * 3.0;
    }
    const scenicHorizon = renderer.horizonY() - 32;
    for (let i = state.scenicEvents.length - 1; i >= 0; i--) {
      const ev = state.scenicEvents[i];
      ev.y -= pxPerSec * renderer.perspectiveSpeedFactor(ev.y) * dt;
      ev.flashTimer = Math.max(0, ev.flashTimer - dt);
      if (ev.kind === 'dps_post' && !ev.flashed && Math.abs(ev.y - p.y) < 36 && state.speedKmh > 130) {
        ev.flashed = true;
        ev.flashTimer = 0.38;
        state.runCoins += 15;
        state.score += 65;
        sound.playCoin();
        spawnPopup(p.x, p.y + 38, 'КАМЕРА! +15 ₽ ЗА СКОРОСТЬ!', '#38bdf8', 14);
      }
      if (ev.y < scenicHorizon) {
        state.scenicEvents.splice(i, 1);
      }
    }

    // Update Pickups (perspective-synced with asphalt, never skating under traffic ahead!)
    const playerBounds = renderer.roadBoundsAtY(p.y);
    for (let i = state.pickups.length - 1; i >= 0; i--) {
      const item = state.pickups[i];
      const pFactor = renderer.perspectiveSpeedFactor(item.y);
      let stepY = pxPerSec * pFactor * dt;
      for (const car of state.traffic) {
        if ((car.lane === item.lane || Math.abs(car.lanePos - item.lane) < 0.45) && car.y < item.y && item.y - car.y < 76) {
          const carUpSpeed = Math.max(20, (state.speedKmh - car.speedKmh) * 3.8 * pFactor * dt);
          stepY = Math.min(stepY, carUpSpeed);
        }
      }
      item.y -= stepY;

      const itemX = renderer.laneX(item.lane, item.y);
      const hitW = 36 * playerBounds.scale;
      const hitH = ch.hitboxH * 0.55;

      if (Math.abs(item.y - p.y) < hitH && Math.abs(itemX - p.x) < hitW + 20) {
        if (item.type === 'coin') {
          const val = Math.round((state.hardMode ? 1.75 : 1) * 5);
          state.runCoins += val;
          state.score += 15;
          sound.playCoin();
          triggerHaptic('impact', 'light');
          spawnPopup(itemX, item.y, `+${val} ₽`, '#ffd043', 14);
        } else {
          state.resource = clamp(state.resource + stats.pickupRestore, 0, 100);
          sound.playPickup(item.type);
          triggerHaptic('impact', 'medium');
          const label = item.type === 'fuel'
            ? `+${stats.pickupRestore}% АИ-98!`
            : item.type === 'drink'
              ? `+${stats.pickupRestore}% ENERGY!`
              : `+${stats.pickupRestore}% PRO BAR!`;
          const col = item.type === 'fuel' ? '#ff9f1c' : '#2ee59d';
          spawnPopup(itemX, item.y, label, col, 15);
        }
        state.pickups.splice(i, 1);
        continue;
      }

      if (item.y < -80) {
        state.pickups.splice(i, 1);
      }
    }

    // Update Traffic Cars with ACC Car-Following, Continuous Merge Guard & 2-Pass Pairwise Separation
    const heroScale = renderer.heroScale(p.y);
    const pHalfW = (playerBounds.laneW * ch.hitboxW) * 0.5;
    const pHalfH = ch.hitboxH * 0.44 * heroScale;

    for (let i = 0; i < state.traffic.length; i++) {
      const car = state.traffic[i];
      const cb = renderer.roadBoundsAtY(car.y);
      const carHalfH = trafficBaseHeight(car.kind) * 0.5;

      // 1. Adaptive Cruise Control (ACC): scan closest vehicle ahead (+Y) in overlapping lanes
      let leadCar = null;
      let leadDist = Infinity;
      for (let j = 0; j < state.traffic.length; j++) {
        if (i === j) continue;
        const other = state.traffic[j];
        if (other.y <= car.y) continue;
        const sameStream =
          Math.abs(other.lanePos - car.lanePos) < 0.88 ||
          other.lane === car.lane ||
          other.targetLane === car.lane;
        if (!sameStream) continue;
        const d = other.y - car.y;
        if (d < leadDist) {
          leadDist = d;
          leadCar = other;
        }
      }

      if (leadCar) {
        const minSafe = (carHalfH + trafficBaseHeight(leadCar.kind) * 0.5 + 32) * cb.scale;
        if (leadDist < minSafe + 85 * cb.scale) {
          const targetSpd = Math.min(car.cruiseSpeed, leadCar.speedKmh - (leadDist < minSafe ? 12 : 2));
          car.speedKmh = Math.max(42, car.speedKmh + (targetSpd - car.speedKmh) * Math.min(1, dt * 6));
          car.braking = true;
        } else {
          car.speedKmh += (car.cruiseSpeed - car.speedKmh) * Math.min(1, dt * 2.5);
          car.braking = false;
        }
      } else {
        car.speedKmh += (car.cruiseSpeed - car.speedKmh) * Math.min(1, dt * 2.5);
        car.braking = false;
      }

      // Braking guard: overtaken cars receding behind the player never reverse back down into player's rear!
      if (car.y < p.y + 14) {
        const safeBehindSpeed = Math.max(36, state.speedKmh - 12);
        if (car.speedKmh > safeBehindSpeed) {
          car.speedKmh = safeBehindSpeed;
          car.braking = true;
        }
      }

      // Integrate longitudinal motion (-Y relative to player) using unified 1/z perspective speed
      const relSpeedKmh = state.speedKmh - car.speedKmh;
      car.y -= relSpeedKmh * 3.8 * renderer.perspectiveSpeedFactor(car.y) * dt;

      // 2. Initiate signaled lane change only if completely clear
      if (car.canLaneChange && car.lane === car.targetLane && car.y > renderer.height * 0.50 && car.y < renderer.height * 0.86) {
        car.canLaneChange = false;
        const dir = Math.random() < 0.5 ? -1 : 1;
        const nextLane = car.lane + dir;
        if (
          nextLane >= 0 &&
          nextLane <= 3 &&
          isLaneClearNear(nextLane, car.y, 175 * cb.scale, car.id) &&
          !(nextLane === p.lane && Math.abs(car.y - p.y) < 130)
        ) {
          car.targetLane = nextLane;
          car.turnSignal = dir;
          car.signalTimer = 0.95;
        }
      }

      // 3. Continuous Merge Guard: abort lane change immediately if target lane becomes unsafe
      if (car.targetLane !== car.lane) {
        const targetClear = isLaneClearNear(car.targetLane, car.y, 145 * cb.scale, car.id);
        const safeFromPlayer = Math.abs(car.y - p.y) > 105 || car.targetLane !== p.lane;
        if (!targetClear || !safeFromPlayer) {
          car.targetLane = car.lane;
          car.turnSignal = 0;
          car.signalTimer = 0;
        } else if (car.signalTimer > 0) {
          car.signalTimer -= dt;
        } else {
          const diff = car.targetLane - car.lanePos;
          const step = Math.sign(diff) * Math.min(Math.abs(diff), dt * 2.1);
          car.lanePos += step;
          car.tilt = clamp(diff * 1.4, -0.8, 0.8);
          if (Math.abs(car.targetLane - car.lanePos) < 0.03) {
            car.lane = car.targetLane;
            car.lanePos = car.targetLane;
            car.turnSignal = 0;
            car.tilt = 0;
          }
        }
      } else {
        car.tilt *= Math.max(0, 1 - dt * 8);
      }
    }

    // 4. 2-Pass Backward Pairwise Separation Solver — eliminates 3-car stack glitches & never shoves into player
    state.traffic.sort((a, b) => a.y - b.y);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = state.traffic.length - 1; i >= 0; i--) {
        const back = state.traffic[i];
        for (let j = i + 1; j < state.traffic.length; j++) {
          const front = state.traffic[j];
          if (Math.abs(front.lanePos - back.lanePos) >= 0.86) continue;
          const midScale = renderer.roadBoundsAtY((back.y + front.y) * 0.5).scale;
          const minSep = (trafficBaseHeight(back.kind) * 0.5 + trafficBaseHeight(front.kind) * 0.5 + 16) * midScale;
          const gap = front.y - back.y;
          if (gap < minSep) {
            const wouldPushIntoPlayer = front.y - minSep <= p.y + pHalfH + 14 && back.y > p.y;
            if (wouldPushIntoPlayer || (Math.abs(back.y - p.y) < 130 && front.y > p.y)) {
              front.y = back.y + minSep;
            } else {
              back.y = front.y - minSep;
            }
            back.speedKmh = Math.min(back.speedKmh, front.speedKmh);
            back.braking = true;
          }
        }
      }
    }

    // Player collision check, Near-Miss «ШАШКА!» & Horizon/Bottom despawn
    const horizonDespawnY = renderer.horizonY() - 28;
    const bottomDespawnY = renderer.height + 240;
    for (let i = state.traffic.length - 1; i >= 0; i--) {
      const car = state.traffic[i];
      const cb = renderer.roadBoundsAtY(car.y);
      const carX = renderer.laneX(car.lanePos, car.y);
      const cHalfW = (car.kind === 'van' ? 32 : 28) * cb.scale;
      const cHalfH = trafficBaseHeight(car.kind) * 0.44 * cb.scale;

      if (state.invulnTimer <= 0 && Math.abs(car.y - p.y) < pHalfH + cHalfH && Math.abs(carX - p.x) < pHalfW + cHalfW) {
        triggerGameOver('crash');
        return;
      }

      if (!car.nearMissed && Math.abs(car.y - p.y) < 66) {
        const latDist = Math.abs(carX - p.x);
        const nearGap = p.recentLaneCutTimer > 0
          ? Math.max(pHalfW + cHalfW + 34 * cb.scale, cb.laneW * 1.15)
          : pHalfW + cHalfW + 28 * cb.scale;
        if (latDist < nearGap && (p.recentLaneCutTimer > 0 || latDist < pHalfW + cHalfW + 24)) {
          car.nearMissed = true;
          state.combo = Math.min(10, state.combo + 1);
          state.maxCombo = Math.max(state.maxCombo, state.combo);
          state.comboTimer = 3.6;
          state.thumbsUpTimer = 1.4;
          state.beamCooldown = Math.max(0, state.beamCooldown - 1.5);

          const mult = state.hardMode ? 1.75 : 1;
          const bonusCoins = Math.round(2 * state.combo * mult);
          const bonusScore = 55 * state.combo;
          state.runCoins += bonusCoins;
          state.score += bonusScore;

          state.shockwaves.push({
            x: p.x,
            y: p.y,
            scale: renderer.heroScale(p.y),
            life: 0.45,
            maxLife: 0.45,
            rgb: state.combo >= 3 ? '255, 208, 67' : '0, 212, 255',
          });

          sound.playShashka(state.combo);
          triggerHaptic('impact', 'medium');
          showSpeech(pickRandom(ch.quotes.shashka), 1.5);
          spawnPopup(p.x, p.y - 34, `ШАШКА! x${state.combo} (+${bonusCoins} ₽)`, '#ff9f1c', 16);
        }
      }

      if (car.y < horizonDespawnY || car.y > bottomDespawnY) {
        state.traffic.splice(i, 1);
      }
    }

    // Update Particles, Skidmarks, Popups, Shockwaves
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.skidMarks.length - 1; i >= 0; i--) {
      const sk = state.skidMarks[i];
      sk.y1 -= pxPerSec * dt;
      sk.y2 -= pxPerSec * dt;
      sk.alpha -= dt * 1.4;
      if (sk.alpha <= 0 || sk.y1 < -40) state.skidMarks.splice(i, 1);
    }
    for (let i = state.popups.length - 1; i >= 0; i--) {
      const pop = state.popups[i];
      pop.y -= 42 * dt;
      pop.life -= dt;
      if (pop.life <= 0) state.popups.splice(i, 1);
    }
    for (let i = state.shockwaves.length - 1; i >= 0; i--) {
      const sw = state.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) state.shockwaves.splice(i, 1);
    }

    sound.updateDriving(dt, state.speedKmh, state.activeCharId, state.isGassing, state.isBraking);
    syncHud();
  }

  function syncHud() {
    if (state.mode !== 'playing' && state.mode !== 'paused') return;
    dom.hudCoins.textContent = String(state.runCoins);
    dom.hudSpeed.textContent = String(Math.round(state.speedKmh));
    dom.hudScore.textContent = String(Math.floor(state.score));
    dom.hudDist.textContent = `${Math.floor(state.distanceM)} м`;

    if (state.combo > 1 && state.comboTimer > 0) {
      dom.hudCombo.textContent = `x${state.combo} СУЕТА!`;
      dom.hudCombo.classList.remove('is-hidden');
    } else {
      dom.hudCombo.classList.add('is-hidden');
    }

    // Tactical Beam Cooldown & Brake Heat Gauges
    if (dom.beamCdFill && dom.beamCdText) {
      const cdFrac = clamp(1 - state.beamCooldown / (state.beamMaxCooldown || 6.0), 0, 1);
      dom.beamCdFill.style.transform = `scaleX(${cdFrac.toFixed(3)})`;
      dom.beamCdText.textContent = state.beamCooldown > 0.05 ? `${state.beamCooldown.toFixed(1)}с` : 'ГОТОВ';
      dom.btnBeam.classList.toggle('is-cooldown', state.beamCooldown > 0.05);
    }
    if (dom.brakeHeatFill && dom.brakeStatus) {
      dom.brakeHeatFill.style.transform = `scaleX(${clamp(state.brakeHeat, 0, 1).toFixed(3)})`;
      dom.btnBrake.classList.toggle('is-overheated', state.brakeOverheated);
      dom.brakeStatus.textContent = state.brakeOverheated ? 'ПЕРЕГРЕВ' : 'ТОРМОЗ';
    }

    // Live Cabin Cam motion + zabl thumbs-up alt portrait swap
    const tiltDeg = (state.player.tilt * 8).toFixed(1);
    const bounceY = (Math.sin(state.time * 14) * 1.5).toFixed(1);
    dom.camDriverImg.style.transform = `translateY(${bounceY}px) rotate(${tiltDeg}deg) scale(1.06)`;

    if (!dom.camPassenger.classList.contains('is-hidden')) {
      const ch = getCharById(state.activeCharId);
      const pass = PASSENGERS[ch.passengerId];
      const art = getIllustratedAssets();
      if (pass && art[pass.id]) {
        const wantThumbs = Boolean((art[pass.id].faceAltImg || art[pass.id].faceKfcAltImg) && (state.thumbsUpTimer > 0 || state.combo >= 3));
        const targetSrc = pass.id === 'zabl'
          ? (wantThumbs ? (art.zabl.faceKfcAltImg || art.zabl.faceAltImg) : (art.zabl.faceKfcImg || art.zabl.faceImg))
          : (wantThumbs ? (art[pass.id].faceAltImg || art[pass.id].faceImg) : art[pass.id].faceImg);
        if (targetSrc && dom.camPassengerImg.src !== targetSrc) {
          dom.camPassengerImg.src = targetSrc;
        }
      }
      dom.camPassengerImg.style.transform = `translateX(${(state.player.tilt * 3).toFixed(1)}px) rotate(${(-state.player.tilt * 5).toFixed(1)}deg) scale(1.06)`;
    }

    if (state.hardMode) {
      const pct = Math.round(state.resource);
      dom.hudResourcePct.textContent = `${pct}%`;
      dom.hudResourceFill.style.transform = `scaleX(${clamp(state.resource / 100, 0, 1).toFixed(3)})`;
      const isLow = state.resource < 25;
      dom.hudResourceWrap.classList.toggle('is-low', isLow);
      dom.camDriver.classList.toggle('is-danger', isLow);
    }
  }

  function render() {
    renderer.render(state);
  }

  // ==================== MAIN RAF LOOP & TEST HOOKS ====================
  let lastTs = performance.now();
  let manualStepOnly = false;

  function loop(ts) {
    const dt = Math.min(0.05, Math.max(0.001, (ts - lastTs) / 1000));
    lastTs = ts;
    if (!manualStepOnly) {
      update(dt);
      render();
    }
    global.requestAnimationFrame(loop);
  }

  global.advanceTime = function (ms) {
    manualStepOnly = true;
    const stepMs = 1000 / 60;
    const steps = Math.max(1, Math.round(ms / stepMs));
    for (let i = 0; i < steps; i++) {
      update(1 / 60);
    }
    render();
    syncHud();
  };

  global.render_game_to_text = function () {
    const ch = getCharById(state.activeCharId);
    let overlapCount = 0;
    for (let i = 0; i < state.traffic.length; i++) {
      for (let j = i + 1; j < state.traffic.length; j++) {
        const a = state.traffic[i];
        const b = state.traffic[j];
        if (Math.abs(a.lanePos - b.lanePos) < 0.8) {
          const midS = renderer.roadBoundsAtY((a.y + b.y) * 0.5).scale;
          const touchSep = (trafficBaseHeight(a.kind) * 0.5 + trafficBaseHeight(b.kind) * 0.5) * midS;
          if (Math.abs(a.y - b.y) < touchSep - 2) overlapCount++;
        }
      }
    }
    const payload = {
      coordNote: 'Origin top-left (0,0), 3D horizon at y≈0.115*H, player at y≈0.34*H facing +Y downward, traffic approaches from bottom moving -Y and recedes to horizon',
      mode: state.mode,
      hardMode: state.hardMode,
      isTestDrive: state.isTestDrive,
      characterId: state.activeCharId,
      passengerId: ch.passengerId || null,
      lane: state.player.lane,
      x: Math.round(state.player.x),
      y: Math.round(state.player.y),
      speedKmh: Math.round(state.speedKmh),
      beamCooldown: Number(state.beamCooldown.toFixed(2)),
      brakeHeat: Number(state.brakeHeat.toFixed(2)),
      brakeOverheated: state.brakeOverheated,
      invulnTimer: Number(state.invulnTimer.toFixed(2)),
      revivesUsed: state.revivesUsed,
      scenicCount: state.scenicEvents.length,
      resourceType: state.hardMode ? ch.resourceType : 'none',
      resourceValue: state.hardMode ? Math.round(state.resource) : null,
      score: Math.floor(state.score),
      distanceM: Math.floor(state.distanceM),
      coins: save.coins,
      runCoins: state.runCoins,
      combo: state.combo,
      bestScore: save.bestScore,
      trafficOverlapCount: overlapCount,
      traffic: state.traffic.map((t) => ({
        lane: t.lane,
        targetLane: t.targetLane,
        y: Math.round(t.y),
        speedKmh: Math.round(t.speedKmh),
        turnSignal: t.turnSignal,
      })),
      pickups: state.pickups.map((pk) => ({
        type: pk.type,
        lane: pk.lane,
        y: Math.round(pk.y),
      })),
    };
    return JSON.stringify(payload);
  };

  // Boot
  renderGarage();
  render();
  global.requestAnimationFrame(loop);
})(window);
