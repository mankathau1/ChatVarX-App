const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, 'data.json');

const defaultData = {
  adminPin: 'admin123', // Default admin password
  launchConfig: {
    targetDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Official Global Android Launch',
    subtitle: 'ChatVarX with Duo Space & Real-Time Heartbeat goes live worldwide.',
    badgeText: '🚀 LAUNCHING IN',
    isLive: false,
    liveMessage: '🎉 ChatVarX is Officially LIVE! Download APK Now.'
  },
  releases: [
    {
      id: 'default-rel-1',
      versionName: 'v1.0.4',
      versionCode: 4,
      fileName: 'chatvarx-v1.0.4.apk',
      filePath: null, // Will use sample download until real apk uploaded
      fileSize: '28.4 MB',
      releaseNotes: '• Duo Space private heartbeat vibe\n• Real-time high-speed messaging\n• Enhanced media preview and end-to-end security',
      isForceUpdate: false,
      createdAt: new Date().toISOString(),
      downloadCount: 42
    }
  ],
  visits: [],
  downloads: []
};

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
      return JSON.parse(JSON.stringify(defaultData));
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    
    // Auto-migrate launchConfig if missing
    if (!data.launchConfig) {
      data.launchConfig = {
        targetDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        title: 'Official Global Android Launch',
        subtitle: 'ChatVarX with Duo Space & Real-Time Heartbeat goes live worldwide.',
        badgeText: '🚀 LAUNCHING IN',
        isLive: false,
        liveMessage: '🎉 ChatVarX is Officially LIVE! Download APK Now.'
      };
      writeDB(data);
    }
    return data;
  } catch (err) {
    console.error('Error reading DB:', err);
    return JSON.parse(JSON.stringify(defaultData));
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing DB:', err);
    return false;
  }
}

// Helpers for parsing User-Agent
function parseUserAgent(ua = '') {
  let device = 'Desktop';
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  if (/android/i.test(ua)) {
    device = 'Mobile';
    os = 'Android';
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    device = 'Mobile';
    os = 'iOS';
  } else if (/windows/i.test(ua)) {
    device = 'Desktop';
    os = 'Windows';
  } else if (/macintosh|mac os x/i.test(ua)) {
    device = 'Desktop';
    os = 'macOS';
  } else if (/linux/i.test(ua)) {
    device = 'Desktop';
    os = 'Linux';
  }

  if (/chrome|crios/i.test(ua) && !/edg/i.test(ua) && !/opr/i.test(ua)) {
    browser = 'Chrome';
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Firefox';
  } else if (/edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/opera|opr/i.test(ua)) {
    browser = 'Opera';
  }

  return { device, os, browser };
}

const db = {
  recordVisit({ ip, userAgent, path: reqPath, referrer }) {
    const data = readDB();
    const { device, os, browser } = parseUserAgent(userAgent);
    const visit = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ip: ip || '127.0.0.1',
      userAgent: (userAgent || '').substring(0, 150),
      device,
      os,
      browser,
      path: reqPath || '/',
      referrer: referrer || 'Direct'
    };

    data.visits.unshift(visit);
    // Keep max 2000 visits in memory to stay fast
    if (data.visits.length > 2000) {
      data.visits = data.visits.slice(0, 2000);
    }
    writeDB(data);
    return visit;
  },

  recordDownload({ version, ip, userAgent }) {
    const data = readDB();
    const { device, os, browser } = parseUserAgent(userAgent);
    const download = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: version || 'Latest',
      ip: ip || '127.0.0.1',
      userAgent: (userAgent || '').substring(0, 150),
      device,
      os,
      browser
    };

    data.downloads.unshift(download);
    if (data.downloads.length > 2000) {
      data.downloads = data.downloads.slice(0, 2000);
    }

    // Increment release downloadCount
    if (data.releases && data.releases.length > 0) {
      const rel = data.releases.find(r => r.versionName === version) || data.releases[0];
      if (rel) {
        rel.downloadCount = (rel.downloadCount || 0) + 1;
      }
    }

    writeDB(data);
    return download;
  },

  getLatestRelease() {
    const data = readDB();
    if (!data.releases || data.releases.length === 0) return null;
    return data.releases[0]; // First release is latest
  },

  getAllReleases() {
    const data = readDB();
    return data.releases || [];
  },

  addRelease({ versionName, versionCode, fileName, filePath, fileSize, releaseNotes, isForceUpdate, downloadUrl }) {
    const data = readDB();
    const newRelease = {
      id: crypto.randomUUID(),
      versionName,
      versionCode: parseInt(versionCode, 10) || 1,
      fileName,
      filePath,
      fileSize,
      downloadUrl: downloadUrl || null,
      releaseNotes: releaseNotes || 'Bug fixes and performance enhancements.',
      isForceUpdate: !!isForceUpdate,
      createdAt: new Date().toISOString(),
      downloadCount: 0
    };

    // Prepend as latest
    data.releases.unshift(newRelease);
    writeDB(data);
    return newRelease;
  },

  deleteRelease(id) {
    const data = readDB();
    const idx = data.releases.findIndex(r => r.id === id);
    if (idx !== -1) {
      const removed = data.releases.splice(idx, 1)[0];
      // remove file if exists
      if (removed.filePath && fs.existsSync(removed.filePath)) {
        try { fs.unlinkSync(removed.filePath); } catch (e) { console.error(e); }
      }
      writeDB(data);
      return true;
    }
    return false;
  },

  verifyAdminPin(pin) {
    const data = readDB();
    return data.adminPin === pin;
  },

  changeAdminPin(newPin) {
    const data = readDB();
    data.adminPin = newPin;
    writeDB(data);
    return true;
  },

  getLaunchConfig() {
    const data = readDB();
    return data.launchConfig || defaultData.launchConfig;
  },

  updateLaunchConfig({ targetDate, title, subtitle, badgeText, isLive, liveMessage }) {
    const data = readDB();
    if (!data.launchConfig) {
      data.launchConfig = { ...defaultData.launchConfig };
    }
    if (targetDate !== undefined) data.launchConfig.targetDate = targetDate;
    if (title !== undefined) data.launchConfig.title = title;
    if (subtitle !== undefined) data.launchConfig.subtitle = subtitle;
    if (badgeText !== undefined) data.launchConfig.badgeText = badgeText;
    if (isLive !== undefined) data.launchConfig.isLive = !!isLive;
    if (liveMessage !== undefined) data.launchConfig.liveMessage = liveMessage;

    writeDB(data);
    return data.launchConfig;
  },

  getStats() {
    const data = readDB();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const totalVisits = data.visits.length;
    const todayVisits = data.visits.filter(v => v.timestamp.slice(0, 10) === todayStr).length;

    const totalDownloads = data.downloads.length;
    const todayDownloads = data.downloads.filter(d => d.timestamp.slice(0, 10) === todayStr).length;

    // Device breakdown
    const devices = { Mobile: 0, Desktop: 0, Tablet: 0 };
    data.visits.forEach(v => {
      if (v.device === 'Mobile') devices.Mobile++;
      else devices.Desktop++;
    });

    // OS breakdown
    const osCounts = {};
    data.visits.forEach(v => {
      osCounts[v.os] = (osCounts[v.os] || 0) + 1;
    });

    // Browser breakdown
    const browserCounts = {};
    data.visits.forEach(v => {
      browserCounts[v.browser] = (browserCounts[v.browser] || 0) + 1;
    });

    // Last 7 days download trends
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const vCount = data.visits.filter(v => v.timestamp.slice(0, 10) === dStr).length;
      const dCount = data.downloads.filter(dl => dl.timestamp.slice(0, 10) === dStr).length;
      dailyStats.push({
        date: dStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        visits: vCount,
        downloads: dCount
      });
    }

    return {
      totalVisits,
      todayVisits,
      totalDownloads,
      todayDownloads,
      devices,
      osCounts,
      browserCounts,
      dailyStats,
      latestRelease: this.getLatestRelease(),
      recentVisits: data.visits.slice(0, 30),
      recentDownloads: data.downloads.slice(0, 30)
    };
  }
};

module.exports = db;
