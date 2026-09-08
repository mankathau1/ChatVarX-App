// Initialize Lucide Icons
if (window.lucide) {
  lucide.createIcons();
}

// 1. Fetch Latest Release Details from Server
async function fetchLatestRelease() {
  try {
    const res = await fetch('/api/apk/latest');
    if (!res.ok) return;
    const data = await res.json();

    if (data && data.versionName) {
      // Update Hero badge
      const heroVersion = document.getElementById('hero-version-text');
      if (heroVersion) heroVersion.textContent = `Latest Release ${data.versionName} Available`;

      // Update Size
      const heroSize = document.getElementById('hero-size-text');
      if (heroSize && data.fileSize) {
        heroSize.innerHTML = `<i data-lucide="hard-drive" style="color: #F43F5E; width:16px; height:16px;"></i> ${data.fileSize}`;
      }

      // Update Download Section
      currentAppVersion = `ChatVarX ${data.versionName} • ${data.fileSize || 'APK'}`;
      const downloadBtnVersion = document.getElementById('download-btn-version');
      if (downloadBtnVersion) {
        downloadBtnVersion.textContent = currentAppVersion;
      }

      // Update Floating Bar
      const floatingVerText = document.getElementById('floating-version-text');
      if (floatingVerText) {
        floatingVerText.textContent = `${data.versionName} Ready`;
      }
    }

    // Refresh icons after dynamic HTML injection
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.log('Using default release display');
  }
}

// 2. Dynamic QR Code generation for current host
function updateQrCode() {
  const qrImg = document.getElementById('download-qr');
  if (qrImg) {
    const currentUrl = `${window.location.origin}/download`;
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(currentUrl)}`;
  }
}

// 3. Heartbeat Interactive Demo
const triggerBtn = document.getElementById('trigger-heartbeat-btn');
const heartCanvas = document.getElementById('interactive-heart');
const heartStatus = document.getElementById('heartbeat-status-msg');
const phoneHeartPill = document.getElementById('phone-heart-pill');

let heartbeatCount = 0;

if (triggerBtn && heartCanvas) {
  triggerBtn.addEventListener('click', () => {
    heartbeatCount++;
    heartCanvas.classList.remove('heart-beating');
    void heartCanvas.offsetWidth; // Trigger reflow
    heartCanvas.classList.add('heart-beating');

    // Phone mockup feedback
    if (phoneHeartPill) {
      phoneHeartPill.style.transform = 'scale(1.08)';
      phoneHeartPill.style.borderColor = '#F43F5E';
      setTimeout(() => {
        phoneHeartPill.style.transform = 'scale(1)';
      }, 400);
    }

    // Haptic feedback if supported on mobile
    if (navigator.vibrate) {
      navigator.vibrate([80, 50, 80]);
    }

    const bpm = Math.floor(70 + Math.random() * 20);
    if (heartStatus) {
      heartStatus.innerHTML = `<strong style="color: #F43F5E;">💓 Heartbeat Resonance Synced (${bpm} BPM)!</strong> Connected Duo feels your touch.`;
    }

    setTimeout(() => {
      heartCanvas.classList.remove('heart-beating');
    }, 2500);
  });
}

// 4. Interactive Chat Sandbox Demo
const sandboxForm = document.getElementById('sandbox-form');
const sandboxInput = document.getElementById('sandbox-input');
const sandboxChat = document.getElementById('sandbox-chat');

const botResponses = [
  "ChatVarX delivers messages in under 20 milliseconds! 🚀",
  "Duo Space keeps your private media locked behind local encryption. 🔒",
  "Try tapping the 'Send Heartbeat' button above to experience the real-time resonance! 💓",
  "No bloatware, clean dark mode, and seamless offline message queueing! ⚡",
  "Ready to test on your Android device? Grab the APK download below! 📲"
];

let botIdx = 0;

if (sandboxForm && sandboxInput && sandboxChat) {
  sandboxForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = sandboxInput.value.trim();
    if (!text) return;

    // Append user message
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble chat-outgoing';
    userBubble.textContent = text;
    sandboxChat.appendChild(userBubble);
    sandboxInput.value = '';
    sandboxChat.scrollTop = sandboxChat.scrollHeight;

    // Simulate instant bot response
    setTimeout(() => {
      const botBubble = document.createElement('div');
      botBubble.className = 'chat-bubble chat-incoming';
      botBubble.textContent = botResponses[botIdx % botResponses.length];
      botIdx++;
      sandboxChat.appendChild(botBubble);
      sandboxChat.scrollTop = sandboxChat.scrollHeight;
    }, 600);
  });
}

// 5. FAQ Accordion Toggle
document.querySelectorAll('.faq-question').forEach(header => {
  header.addEventListener('click', () => {
    const parent = header.parentElement;
    parent.classList.toggle('active');
  });
});

// 6. Mobile Drawer Toggle
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileDrawer = document.getElementById('mobile-drawer');

if (mobileMenuBtn && mobileDrawer) {
  mobileMenuBtn.addEventListener('click', () => {
    mobileDrawer.classList.toggle('open');
    const isOpen = mobileDrawer.classList.contains('open');
    mobileMenuBtn.innerHTML = isOpen 
      ? `<i data-lucide="x"></i>` 
      : `<i data-lucide="menu"></i>`;
    if (window.lucide) lucide.createIcons();
  });

  // Close drawer on clicking any navigation link
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      mobileDrawer.classList.remove('open');
      mobileMenuBtn.innerHTML = `<i data-lucide="menu"></i>`;
      if (window.lucide) lucide.createIcons();
    });
  });
}

// 7. ChatVarX AI Tone & Reply Simulator Demo
const aiPresets = {
  romantic: {
    input: "Where are you? Want to meet tonight?",
    output: "“Every second away from you feels like an eternity. Let's make tonight unforgettable—my heart beats only for your footsteps. 💖✨”"
  },
  witty: {
    input: "Why are you taking so long to reply?",
    output: "“I was actually busy drafting my Nobel prize speech for patience. But since you asked, I'm here! 😎🚀”"
  },
  polite: {
    input: "Send me the project files today.",
    output: "“Good day! Could you please share the latest project documents at your earliest convenience? Thank you so much! 🤝”"
  },
  savage: {
    input: "Do you think you are smarter than me?",
    output: "“I don't think, I have data. And my neural network just laughed in binary. 🔥💀”"
  }
};

let currentTone = 'romantic';
const aiInputSample = document.getElementById('ai-input-sample');
const btnGenerateAi = document.getElementById('btn-generate-ai');
const aiOutputBox = document.getElementById('ai-output-box');
const aiOutputText = document.getElementById('ai-output-text');
const aiOutputLabel = document.getElementById('ai-output-label');

document.querySelectorAll('.btn-ai-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-ai-preset').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTone = btn.getAttribute('data-tone');
    if (aiPresets[currentTone]) {
      aiInputSample.value = aiPresets[currentTone].input;
    }
  });
});

if (btnGenerateAi && aiOutputBox && aiOutputText) {
  btnGenerateAi.addEventListener('click', () => {
    btnGenerateAi.disabled = true;
    btnGenerateAi.innerHTML = `<i data-lucide="loader" class="spin"></i> AI Thinking...`;
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      const presetData = aiPresets[currentTone] || aiPresets.romantic;
      aiOutputLabel.textContent = `CHATVARX AI (${currentTone.toUpperCase()} TONE):`;
      aiOutputText.textContent = presetData.output;
      aiOutputBox.style.display = 'block';
      
      btnGenerateAi.disabled = false;
      btnGenerateAi.innerHTML = `<i data-lucide="sparkles"></i> Generate AI Response`;
      if (window.lucide) lucide.createIcons();
    }, 450);
  });
}

// 8. Sticky Floating Download Bar (Reveals on Scroll)
const floatingBar = document.getElementById('floating-download-bar');

window.addEventListener('scroll', () => {
  if (floatingBar) {
    if (window.scrollY > 380) {
      floatingBar.classList.add('visible');
    } else {
      floatingBar.classList.remove('visible');
    }
  }
});

// 9. Download Feedback & Lock Toasts for User Guidance
const downloadToast = document.getElementById('download-toast');
const lockedToast = document.getElementById('locked-toast');
let toastTimer = null;
let lockedToastTimer = null;

let isDownloadLocked = true;
let remainingDays = 4;
let remainingHours = 0;
let remainingMins = 0;
let remainingSecs = 0;
let currentAppVersion = 'ChatVarX v1.0.4';

function triggerDownloadToast() {
  if (!downloadToast) return;
  downloadToast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    downloadToast.classList.remove('show');
  }, 5000);
}

function showLockedToast(msg) {
  if (!lockedToast) return;
  const msgEl = document.getElementById('locked-toast-message');
  if (msgEl && msg) msgEl.textContent = msg;

  lockedToast.classList.add('show');
  if (lockedToastTimer) clearTimeout(lockedToastTimer);
  lockedToastTimer = setTimeout(() => {
    lockedToast.classList.remove('show');
  }, 5000);
}

function highlightCountdownCard() {
  const cdCard = document.getElementById('launch-countdown-card');
  if (cdCard) {
    cdCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    cdCard.classList.remove('highlight-pulse');
    void cdCard.offsetWidth; // force reflow
    cdCard.classList.add('highlight-pulse');
  }
}

function handleDownloadClick(e) {
  if (isDownloadLocked) {
    e.preventDefault();
    e.stopPropagation();
    const timeRemainingStr = remainingDays > 0 
      ? `${remainingDays} days and ${remainingHours} hours` 
      : `${remainingHours} hours, ${remainingMins} minutes, ${remainingSecs} seconds`;
    showLockedToast(`🔒 ChatVarX APK is currently locked! Official download unlocks in ${timeRemainingStr} once the launch timer hits zero.`);
    highlightCountdownCard();
    return false;
  }
  triggerDownloadToast();
}

// Attach download click handler to all download buttons
document.querySelectorAll('a[href="/download"]').forEach(btn => {
  btn.addEventListener('click', handleDownloadClick);
});

// 10. Real Duo Space Interactive Features (From Screenshots)
// A. Hold to Send Real-Time Heartbeat
const realHeartbeatBtn = document.getElementById('real-heartbeat-btn');
const heartbeatFeedback = document.getElementById('heartbeat-feedback-text');
const heartbeatLabel = document.getElementById('heartbeat-instruction-label');
let holdTimer = null;
let holdCount = 0;

if (realHeartbeatBtn) {
  function startHeartbeatHold() {
    realHeartbeatBtn.classList.add('pressing');
    holdCount = 0;
    if (heartbeatFeedback) heartbeatFeedback.textContent = "Transmitting live pulse to partner...";
    if (heartbeatLabel) heartbeatLabel.textContent = "💓 Sending Heartbeat Resonance...";

    if (navigator.vibrate) {
      navigator.vibrate([100, 60, 100]);
    }

    holdTimer = setInterval(() => {
      holdCount++;
      const bpm = Math.floor(72 + Math.random() * 16);
      if (heartbeatFeedback) {
        heartbeatFeedback.innerHTML = `<strong style="color: #F43F5E;">Connected! ${bpm} BPM</strong> (Resonating for ${holdCount}s)`;
      }
      if (navigator.vibrate) {
        navigator.vibrate([80, 50, 80]);
      }
    }, 1000);
  }

  function stopHeartbeatHold() {
    realHeartbeatBtn.classList.remove('pressing');
    if (holdTimer) clearInterval(holdTimer);
    if (heartbeatLabel) heartbeatLabel.textContent = "Hold to Send Real-Time Heartbeat";
    if (heartbeatFeedback) {
      heartbeatFeedback.innerHTML = `<span style="color: #10B981;">✓ Heartbeat pulse delivered successfully!</span>`;
      setTimeout(() => {
        heartbeatFeedback.textContent = "Tap or hold to test live pulse haptics!";
      }, 3000);
    }
  }

  // Pointer / Touch / Mouse events for true cross-device "Hold" support
  realHeartbeatBtn.addEventListener('pointerdown', startHeartbeatHold);
  realHeartbeatBtn.addEventListener('pointerup', stopHeartbeatHold);
  realHeartbeatBtn.addEventListener('pointerleave', stopHeartbeatHold);
}

// B. Update Your Mood Selector
document.querySelectorAll('.mood-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.mood-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    const mood = pill.getAttribute('data-mood');
    if (heartbeatFeedback) {
      heartbeatFeedback.innerHTML = `Mood updated to: <strong>${pill.textContent}</strong>`;
      setTimeout(() => {
        heartbeatFeedback.textContent = "Tap or hold to test live pulse haptics!";
      }, 2500);
    }
  });
});

// C. Together For Live Clock Ticking
let duoMinutes = 28;
setInterval(() => {
  duoMinutes++;
  const minEl = document.getElementById('duo-mins');
  if (minEl) minEl.textContent = duoMinutes < 60 ? duoMinutes : (duoMinutes % 60);
}, 60000);

// 11. Secret Admin Access (Hidden Mode)
// Normal visitors see no Admin buttons on website.
// You can access anytime via:
// 1. URL: /admin
// 2. Shortcut: Ctrl + Shift + A
// 3. Tap/Click logo 3 times rapidly
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
    window.location.href = '/admin';
  }
});

let logoClicks = 0;
let logoTimer = null;
document.querySelectorAll('.nav-logo').forEach(logo => {
  logo.addEventListener('click', (e) => {
    logoClicks++;
    if (logoTimer) clearTimeout(logoTimer);
    logoTimer = setTimeout(() => { logoClicks = 0; }, 1500);
    if (logoClicks >= 3) {
      window.location.href = '/admin';
    }
  });
});

// 12. Live Launch Countdown Timer
let countdownInterval = null;

async function initLaunchCountdown() {
  try {
    const res = await fetch('/api/launch');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.success || !data.launchConfig) return;

    const config = data.launchConfig;
    const serverTime = data.serverTime ? new Date(data.serverTime).getTime() : Date.now();
    const timeOffset = Date.now() - serverTime; // Adjust for client clock discrepancy

    const badgeTextEl = document.getElementById('countdown-badge-text');
    const titleTextEl = document.getElementById('countdown-title-text');
    const digitsGrid = document.getElementById('countdown-digits-grid');
    const liveBanner = document.getElementById('countdown-live-banner');
    const liveTextEl = document.getElementById('countdown-live-text');

    const cdDays = document.getElementById('cd-days');
    const cdHours = document.getElementById('cd-hours');
    const cdMins = document.getElementById('cd-mins');
    const cdSecs = document.getElementById('cd-secs');

    if (badgeTextEl && config.badgeText) badgeTextEl.textContent = config.badgeText;
    if (titleTextEl && config.title) titleTextEl.textContent = config.title;
    if (liveTextEl && config.liveMessage) liveTextEl.textContent = config.liveMessage;

    function renderCountdown() {
      // If admin explicitly marked launch as live
      if (config.isLive) {
        if (digitsGrid) digitsGrid.style.display = 'none';
        if (liveBanner) liveBanner.style.display = 'flex';
        if (badgeTextEl) badgeTextEl.textContent = '🟢 LIVE NOW';
        updateDownloadButtonsLockState(false, 0, 0, 0, 0);
        if (countdownInterval) clearInterval(countdownInterval);
        return;
      }

      const now = Date.now() - timeOffset;
      const target = new Date(config.targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        // Countdown completed - Auto unlock!
        if (digitsGrid) digitsGrid.style.display = 'none';
        if (liveBanner) liveBanner.style.display = 'flex';
        if (badgeTextEl) badgeTextEl.textContent = '🟢 LIVE NOW';
        updateDownloadButtonsLockState(false, 0, 0, 0, 0);
        if (countdownInterval) clearInterval(countdownInterval);
        return;
      }

      // Active ticking countdown - Keep download buttons locked
      if (digitsGrid) digitsGrid.style.display = 'flex';
      if (liveBanner) liveBanner.style.display = 'none';

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / 1000 / 60) % 60);
      const secs = Math.floor((diff / 1000) % 60);

      if (cdDays) cdDays.textContent = String(days).padStart(2, '0');
      if (cdHours) cdHours.textContent = String(hours).padStart(2, '0');
      if (cdMins) cdMins.textContent = String(mins).padStart(2, '0');
      if (cdSecs) cdSecs.textContent = String(secs).padStart(2, '0');

      updateDownloadButtonsLockState(true, days, hours, mins, secs);
    }

    renderCountdown();
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(renderCountdown, 1000);
  } catch (err) {
    console.error('Countdown init error:', err);
  }
}

let lastLockState = null;

function updateDownloadButtonsLockState(locked, days, hours, mins, secs) {
  isDownloadLocked = locked;
  remainingDays = days;
  remainingHours = hours;
  remainingMins = mins;
  remainingSecs = secs;

  const heroBtn = document.getElementById('hero-download-btn');
  const mainBtn = document.getElementById('main-download-btn');
  const navBtn = document.getElementById('nav-download-btn');
  const floatingBtn = document.getElementById('floating-download-btn');
  const drawerBtn = document.querySelector('#mobile-drawer a[href="/download"]');

  const allBtns = [heroBtn, mainBtn, navBtn, floatingBtn, drawerBtn].filter(Boolean);

  if (locked) {
    allBtns.forEach(btn => btn.classList.add('btn-locked'));

    const timeBrief = days > 0 ? `${days}d ${hours}h` : `${hours}h ${mins}m`;

    if (heroBtn) {
      heroBtn.innerHTML = `<i data-lucide="lock"></i> <span>🔒 Download Locked (Opens in ${timeBrief})</span>`;
    }
    if (mainBtn) {
      mainBtn.innerHTML = `
        <i data-lucide="lock"></i>
        <div style="text-align: left;">
          <div style="font-size: 0.8rem; opacity: 0.9; font-weight: 600; color: #FBBF24;">🔒 Download Locked Until Launch</div>
          <div style="font-size: 0.95rem; font-weight: 700; color: #fff;" id="download-btn-version">Unlocks in ${days}d : ${hours}h : ${mins}m : ${secs}s</div>
        </div>
      `;
    }
    if (navBtn) {
      navBtn.innerHTML = `<i data-lucide="lock"></i> <span>🔒 Locked (${timeBrief})</span>`;
    }
    if (floatingBtn) {
      floatingBtn.innerHTML = `<i data-lucide="lock"></i> <span>🔒 Locked (${timeBrief})</span>`;
    }
    if (drawerBtn) {
      drawerBtn.innerHTML = `<i data-lucide="lock"></i> <span>🔒 Locked (${timeBrief})</span>`;
    }
  } else {
    // Only re-render if it was previously locked or first time
    if (lastLockState !== false) {
      allBtns.forEach(btn => btn.classList.remove('btn-locked'));

      if (heroBtn) {
        heroBtn.innerHTML = `<i data-lucide="download-cloud"></i> <span>Download Android APK</span>`;
      }
      if (mainBtn) {
        mainBtn.innerHTML = `
          <i data-lucide="download"></i>
          <div style="text-align: left;">
            <div style="font-size: 0.8rem; opacity: 0.9; font-weight: 500;">Direct APK Download</div>
            <div id="download-btn-version">${currentAppVersion}</div>
          </div>
        `;
      }
      if (navBtn) {
        navBtn.innerHTML = `<i data-lucide="download"></i> <span>Get APK</span>`;
      }
      if (floatingBtn) {
        floatingBtn.innerHTML = `<i data-lucide="download"></i> <span>Download APK</span>`;
      }
      if (drawerBtn) {
        drawerBtn.innerHTML = `<i data-lucide="download-cloud"></i> <span>Download APK</span>`;
      }
    }
  }

  lastLockState = locked;
  if (window.lucide) lucide.createIcons();
}

// Run initialization on load
document.addEventListener('DOMContentLoaded', () => {
  fetchLatestRelease();
  updateQrCode();
  initLaunchCountdown();
  
  // Check if user was redirected from direct /download access while locked
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('locked')) {
    setTimeout(() => {
      showLockedToast("🔒 APK download is currently locked! Official release will unlock automatically when the countdown finishes.");
      highlightCountdownCard();
    }, 600);
  }

  if (window.lucide) lucide.createIcons();
});
