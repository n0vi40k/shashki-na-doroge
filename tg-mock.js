/**
 * Telegram WebApp & Telegram Stars Emulator for Local Browser Testing
 * Automatically mocks window.Telegram.WebApp when running outside Telegram.
 */
(function () {
  'use strict';

  // Check if real Telegram WebApp is already active with real initData
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData && window.Telegram.WebApp.initData.trim() !== '') {
    console.log('[TG-Mock] Real Telegram environment detected. Mock disabled.');
    return;
  }

  console.log('[TG-Mock] Initializing Telegram WebApp & Stars Mock Environment for PC...');

  const mockUser = {
    id: 123456789,
    first_name: 'LocalTester',
    last_name: 'Gamer',
    username: 'local_tester',
    language_code: 'ru',
    is_premium: true,
    allows_write_to_pm: true,
    photo_url: ''
  };

  const mockInitData = 'query_id=AAHdF6IQAAAAAN0XohD9_mock&user=' + encodeURIComponent(JSON.stringify(mockUser)) + '&auth_date=' + Math.floor(Date.now() / 1000) + '&hash=mock_debug_hash_777';

  const eventListeners = new Map();

  function triggerEvent(eventType, eventData) {
    const list = eventListeners.get(eventType);
    if (list) {
      list.forEach((cb) => {
        try {
          cb(eventData);
        } catch (e) {
          console.error('[TG-Mock] Event handler error:', e);
        }
      });
    }
  }

  // --- Telegram Stars Modal UI ---
  function showStarsPaymentModal(starsAmount, invoiceUrl, callback) {
    const amount = Number(starsAmount) || 1;
    let overlay = document.getElementById('tg-stars-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'tg-stars-modal-overlay';
      overlay.innerHTML = `
        <style>
          #tg-stars-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            animation: tg-stars-fade-in 0.2s ease-out;
          }
          @keyframes tg-stars-fade-in {
            from { opacity: 0; transform: scale(0.96); }
            to { opacity: 1; transform: scale(1); }
          }
          .tg-stars-card {
            background: #1c2733;
            color: #ffffff;
            width: 320px;
            max-width: 90vw;
            border-radius: 20px;
            padding: 24px 20px 20px;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08);
            text-align: center;
            position: relative;
          }
          .tg-stars-icon-wrap {
            width: 68px;
            height: 68px;
            margin: 0 auto 14px;
            border-radius: 50%;
            background: radial-gradient(circle, #ffe169 0%, #ffaa00 70%, #d48800 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 34px;
            box-shadow: 0 0 24px rgba(255, 187, 0, 0.45);
            animation: tg-stars-pulse 2s infinite ease-in-out;
          }
          @keyframes tg-stars-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.06); }
          }
          .tg-stars-title {
            font-size: 19px;
            font-weight: 700;
            margin-bottom: 6px;
            letter-spacing: -0.3px;
          }
          .tg-stars-desc {
            font-size: 13px;
            color: #8293a4;
            margin-bottom: 20px;
            line-height: 1.4;
          }
          .tg-stars-price-tag {
            background: rgba(255, 187, 0, 0.12);
            border: 1px solid rgba(255, 187, 0, 0.25);
            border-radius: 12px;
            padding: 8px 12px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-weight: 700;
            color: #ffd043;
            font-size: 17px;
            margin-bottom: 20px;
          }
          .tg-stars-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .tg-stars-btn-pay {
            background: linear-gradient(135deg, #2ea6ff 0%, #1789e0 100%);
            color: #ffffff;
            border: none;
            border-radius: 12px;
            padding: 13px 16px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.1s, opacity 0.2s;
            box-shadow: 0 4px 14px rgba(24, 140, 228, 0.4);
          }
          .tg-stars-btn-pay:hover { opacity: 0.95; }
          .tg-stars-btn-pay:active { transform: scale(0.98); }
          .tg-stars-btn-cancel {
            background: transparent;
            color: #8c9dae;
            border: none;
            padding: 10px;
            font-size: 14px;
            cursor: pointer;
            transition: color 0.2s;
          }
          .tg-stars-btn-cancel:hover { color: #ffffff; }
        </style>
        <div class="tg-stars-card">
          <div class="tg-stars-icon-wrap">⭐</div>
          <div class="tg-stars-title">Telegram Stars</div>
          <div class="tg-stars-desc">Тестовая оплата товара или действия в игре через Telegram Stars</div>
          <div class="tg-stars-price-tag">
            <span>К оплате:</span>
            <span id="tg-stars-amount">${amount}</span>
            <span>⭐</span>
          </div>
          <div class="tg-stars-actions">
            <button class="tg-stars-btn-pay" id="tg-stars-pay-btn">Оплатить ${amount} ⭐</button>
            <button class="tg-stars-btn-cancel" id="tg-stars-cancel-btn">Отмена</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    } else {
      document.getElementById('tg-stars-amount').textContent = amount;
      document.getElementById('tg-stars-pay-btn').textContent = `Оплатить ${amount} ⭐`;
      overlay.style.display = 'flex';
    }

    const cleanup = () => {
      if (overlay) overlay.style.display = 'none';
    };

    const payBtn = document.getElementById('tg-stars-pay-btn');
    const cancelBtn = document.getElementById('tg-stars-cancel-btn');

    payBtn.onclick = () => {
      cleanup();
      console.log('[TG-Mock] Stars payment SUCCESS. Status: paid');
      triggerEvent('invoiceClosed', { url: invoiceUrl, status: 'paid' });
      if (typeof callback === 'function') callback('paid');
    };

    cancelBtn.onclick = () => {
      cleanup();
      console.log('[TG-Mock] Stars payment CANCELLED. Status: cancelled');
      triggerEvent('invoiceClosed', { url: invoiceUrl, status: 'cancelled' });
      if (typeof callback === 'function') callback('cancelled');
    };
  }

  // --- Construct Mock WebApp Object ---
  const WebAppMock = {
    __isMock: true,
    initData: mockInitData,
    initDataUnsafe: {
      query_id: 'AAHdF6IQAAAAAN0XohD9_mock',
      user: mockUser,
      auth_date: String(Math.floor(Date.now() / 1000)),
      hash: 'mock_debug_hash_777'
    },
    version: '8.0',
    platform: 'tdesktop',
    colorScheme: 'dark',
    themeParams: {
      bg_color: '#17212b',
      text_color: '#ffffff',
      hint_color: '#708499',
      link_color: '#6ab2f2',
      button_color: '#5288c1',
      button_text_color: '#ffffff',
      secondary_bg_color: '#232e3c',
      header_bg_color: '#17212b',
      bottom_bar_bg_color: '#17212b',
      accent_text_color: '#6ab2f2',
      section_bg_color: '#17212b',
      section_header_text_color: '#6ab2f2',
      subtitle_text_color: '#708499',
      destructive_text_color: '#ec3942'
    },
    isExpanded: true,
    viewportHeight: window.innerHeight,
    viewportStableHeight: window.innerHeight,
    isClosingConfirmationEnabled: false,
    headerColor: '#17212b',
    backgroundColor: '#17212b',

    ready: function () {
      console.log('[TG-Mock] Telegram.WebApp.ready() called');
    },
    expand: function () {
      console.log('[TG-Mock] Telegram.WebApp.expand() called');
      this.isExpanded = true;
    },
    close: function () {
      console.log('[TG-Mock] Telegram.WebApp.close() called');
    },

    openInvoice: function (url, callback) {
      console.log('[TG-Mock] openInvoice triggered with url:', url);
      // Extract amount if present in query, default to 1
      let amount = 1;
      try {
        const parsed = new URL(url, window.location.href);
        const qStars = parsed.searchParams.get('stars') || parsed.searchParams.get('amount');
        if (qStars) amount = Number(qStars) || 1;
      } catch (_e) {}
      showStarsPaymentModal(amount, url, callback);
    },

    // Custom helper for easy in-game calls
    openStarsPayment: function (amount, callback) {
      console.log('[TG-Mock] openStarsPayment called with amount:', amount);
      showStarsPaymentModal(amount, 'mock_stars_invoice', callback);
    },

    HapticFeedback: {
      impactOccurred: function (style) {
        console.log('[TG-Mock] Haptic impact:', style);
        if (navigator.vibrate) {
          navigator.vibrate(style === 'heavy' ? 40 : 20);
        }
      },
      notificationOccurred: function (type) {
        console.log('[TG-Mock] Haptic notification:', type);
        if (navigator.vibrate) {
          navigator.vibrate(type === 'error' ? [30, 40, 30] : [20, 20]);
        }
      },
      selectionChanged: function () {
        console.log('[TG-Mock] Haptic selectionChanged');
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      }
    },

    MainButton: {
      text: 'CONTINUE',
      color: '#5288c1',
      textColor: '#ffffff',
      isVisible: false,
      isActive: true,
      isProgressVisible: false,
      setText: function (txt) { this.text = txt; return this; },
      onClick: function (fn) { WebAppMock.onEvent('mainButtonClicked', fn); return this; },
      offClick: function (fn) { WebAppMock.offEvent('mainButtonClicked', fn); return this; },
      show: function () { this.isVisible = true; return this; },
      hide: function () { this.isVisible = false; return this; },
      enable: function () { this.isActive = true; return this; },
      disable: function () { this.isActive = false; return this; },
      showProgress: function () { this.isProgressVisible = true; return this; },
      hideProgress: function () { this.isProgressVisible = false; return this; }
    },

    BackButton: {
      isVisible: false,
      onClick: function (fn) { WebAppMock.onEvent('backButtonClicked', fn); return this; },
      offClick: function (fn) { WebAppMock.offEvent('backButtonClicked', fn); return this; },
      show: function () { this.isVisible = true; return this; },
      hide: function () { this.isVisible = false; return this; }
    },

    openLink: function (url) {
      window.open(url, '_blank');
    },
    openTelegramLink: function (url) {
      window.open(url, '_blank');
    },
    showAlert: function (message, callback) {
      alert(message);
      if (typeof callback === 'function') callback();
    },
    showConfirm: function (message, callback) {
      const ok = confirm(message);
      if (typeof callback === 'function') callback(ok);
    },

    onEvent: function (eventType, eventHandler) {
      if (!eventListeners.has(eventType)) {
        eventListeners.set(eventType, new Set());
      }
      eventListeners.get(eventType).add(eventHandler);
    },
    offEvent: function (eventType, eventHandler) {
      if (eventListeners.has(eventType)) {
        eventListeners.get(eventType).delete(eventHandler);
      }
    },
    sendData: function (data) {
      console.log('[TG-Mock] Telegram.WebApp.sendData:', data);
    }
  };

  window.Telegram = window.Telegram || {};
  window.Telegram.WebApp = WebAppMock;

  console.log('[TG-Mock] Telegram.WebApp mock attached successfully. User:', WebAppMock.initDataUnsafe.user.username);
})();
