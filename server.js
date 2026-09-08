const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up storage for APK uploads
const uploadDir = path.join(__dirname, 'uploads', 'apks');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E4);
    cb(null, `${uniqueSuffix}-${cleanName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 250 * 1024 * 1024 }, // Max 250MB APK size
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.apk') || file.mimetype === 'application/vnd.android.package-archive' || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Only .apk files are allowed!'), false);
    }
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory simple auth tokens
const activeAdminTokens = new Set();

function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '') : req.query.token;
  if (token && activeAdminTokens.has(token)) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized. Please login with Admin PIN.' });
  }
}

// Client Visit Tracking Middleware for Landing Page
app.use((req, res, next) => {
  // Only track main HTML routes, exclude static assets like css, js, images
  const isStatic = req.path.match(/\.(css|js|png|jpg|jpeg|svg|ico|woff2?|map)$/i);
  const isAdminApi = req.path.startsWith('/api/admin');
  const isDownload = req.path.startsWith('/download');

  if (!isStatic && !isAdminApi && !isDownload && req.method === 'GET') {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || req.headers['referrer'] || 'Direct';
    db.recordVisit({ ip, userAgent, path: req.path, referrer });
  }
  next();
});

// Serve Public Landing Page
app.use(express.static(path.join(__dirname, 'public')));

// Serve Admin Panel
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ----------------------------------------------------
// Public APIs
// ----------------------------------------------------

// 1. In-App Mobile Update API (Flutter app checks this!)
app.get('/api/apk/latest', (req, res) => {
  const latest = db.getLatestRelease();
  if (!latest) {
    return res.status(404).json({ error: 'No releases found' });
  }

  const host = req.get('host');
  const protocol = req.protocol;
  const downloadUrl = (latest && latest.downloadUrl) ? latest.downloadUrl : `${protocol}://${host}/download`;

  res.json({
    versionName: latest.versionName,
    versionCode: latest.versionCode,
    downloadUrl,
    fileSize: latest.fileSize,
    releaseNotes: latest.releaseNotes,
    isForceUpdate: latest.isForceUpdate,
    releasedAt: latest.createdAt
  });
});

// 2. Download APK Route (Tracks Download & Serves File - Locked until launch)
app.get('/download', (req, res) => {
  const launchConfig = db.getLaunchConfig();
  const isTimeLeft = !launchConfig.isLive && (new Date(launchConfig.targetDate).getTime() > Date.now());

  if (isTimeLeft) {
    // If download is still locked, redirect back to home page countdown
    return res.redirect('/?locked=true');
  }

  const latest = db.getLatestRelease();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || '';

  const version = latest ? latest.versionName : 'v1.0.4';
  db.recordDownload({ version, ip, userAgent });

  if (latest && latest.downloadUrl) {
    // Redirect to high-speed Global CDN (GitHub Releases / Cloudflare)
    return res.redirect(latest.downloadUrl);
  } else if (latest && latest.filePath && fs.existsSync(latest.filePath)) {
    // Stream real uploaded APK
    res.download(latest.filePath, latest.fileName || `chatvarx-${latest.versionName}.apk`, (err) => {
      if (err) console.error('Download transfer error:', err);
    });
  } else {
    // If no custom APK is uploaded yet, serve a friendly bootstrap APK demo
    const dummyApkPath = path.join(__dirname, 'uploads', 'apks', 'chatvarx-starter.apk');
    if (!fs.existsSync(dummyApkPath)) {
      // Create a small placeholder binary container
      fs.writeFileSync(dummyApkPath, Buffer.from('ChatVarX Mobile APK Placeholder Container - Real APK will be streamed here after upload in Admin Panel.'));
    }
    res.download(dummyApkPath, `chatvarx-${version}.apk`);
  }
});

// 3. Client visit tracking pixel/hook
app.post('/api/analytics/visit', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || '';
  const { path: pagePath, referrer } = req.body || {};
  db.recordVisit({ ip, userAgent, path: pagePath, referrer });
  res.json({ success: true });
});

// 4. Public Launch Countdown Configuration API
app.get('/api/launch', (req, res) => {
  const config = db.getLaunchConfig();
  res.json({
    success: true,
    launchConfig: config,
    serverTime: new Date().toISOString()
  });
});

// ----------------------------------------------------
// Admin APIs (Protected)
// ----------------------------------------------------

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ success: false, message: 'PIN is required' });
  }

  if (db.verifyAdminPin(pin)) {
    const token = crypto.randomBytes(32).toString('hex');
    activeAdminTokens.add(token);
    return res.json({ success: true, token, message: 'Login successful' });
  } else {
    return res.status(401).json({ success: false, message: 'Incorrect Admin PIN' });
  }
});

// Admin Logout
app.post('/api/admin/logout', adminAuth, (req, res) => {
  const token = req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : '';
  activeAdminTokens.delete(token);
  res.json({ success: true, message: 'Logged out' });
});

// Admin Change PIN
app.post('/api/admin/change-pin', adminAuth, (req, res) => {
  const { oldPin, newPin } = req.body;
  if (!db.verifyAdminPin(oldPin)) {
    return res.status(400).json({ success: false, message: 'Current PIN is wrong' });
  }
  if (!newPin || newPin.length < 4) {
    return res.status(400).json({ success: false, message: 'New PIN must be at least 4 characters' });
  }
  db.changeAdminPin(newPin);
  res.json({ success: true, message: 'Admin PIN successfully updated' });
});

// Get Admin Analytics Dashboard Stats
app.get('/api/admin/stats', adminAuth, (req, res) => {
  const stats = db.getStats();
  stats.launchConfig = db.getLaunchConfig();
  res.json(stats);
});

// Update Launch Countdown Config
app.post('/api/admin/launch', adminAuth, (req, res) => {
  try {
    const { targetDate, title, subtitle, badgeText, isLive, liveMessage } = req.body;
    const updated = db.updateLaunchConfig({
      targetDate,
      title,
      subtitle,
      badgeText,
      isLive: isLive === true || isLive === 'true',
      liveMessage
    });
    res.json({
      success: true,
      message: 'Launch countdown configuration updated successfully!',
      launchConfig: updated
    });
  } catch (err) {
    console.error('Launch update error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get All Releases
app.get('/api/admin/releases', adminAuth, (req, res) => {
  const releases = db.getAllReleases();
  res.json({ success: true, releases });
});

// Upload New APK Release (Local File or Cloud URL)
app.post('/api/admin/apk/upload', adminAuth, upload.single('apkFile'), (req, res) => {
  try {
    const { versionName, versionCode, releaseNotes, isForceUpdate, downloadUrl } = req.body;

    if (!req.file && (!downloadUrl || !downloadUrl.trim())) {
      return res.status(400).json({ success: false, message: 'Please select an APK file OR enter a direct cloud download URL' });
    }

    if (!versionName) {
      return res.status(400).json({ success: false, message: 'Version Name (e.g. v1.0.5) is required' });
    }

    const cleanUrl = downloadUrl ? downloadUrl.trim() : null;
    const fileName = req.file ? req.file.originalname : (cleanUrl ? cleanUrl.split('/').pop().split('?')[0] || 'chatvarx.apk' : 'chatvarx.apk');
    const filePath = req.file ? req.file.path : null;
    const sizeInMB = req.file ? (req.file.size / (1024 * 1024)).toFixed(1) + ' MB' : 'Cloud CDN';

    const newRelease = db.addRelease({
      versionName: versionName.trim(),
      versionCode: versionCode || 1,
      fileName,
      filePath,
      fileSize: sizeInMB,
      downloadUrl: cleanUrl,
      releaseNotes: releaseNotes || '',
      isForceUpdate: isForceUpdate === 'true' || isForceUpdate === true
    });

    res.json({
      success: true,
      message: `Release ${newRelease.versionName} successfully published!`,
      release: newRelease
    });
  } catch (err) {
    console.error('APK upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete Release
app.delete('/api/admin/releases/:id', adminAuth, (req, res) => {
  const success = db.deleteRelease(req.params.id);
  if (success) {
    res.json({ success: true, message: 'Release deleted' });
  } else {
    res.status(404).json({ success: false, message: 'Release not found' });
  }
});

// Fallback for direct browser URLs
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.use((req, res) => {
  if (req.path.startsWith('/admin')) {
    return res.sendFile(path.join(__dirname, 'admin', 'index.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 ChatVarX Web Platform running at:`);
  console.log(`🌐 Public Landing Page: http://localhost:${PORT}`);
  console.log(`🛡️ Admin Control Panel: http://localhost:${PORT}/admin`);
  console.log(`📱 Latest APK Check API: http://localhost:${PORT}/api/apk/latest`);
  console.log(`🔑 Default Admin PIN: admin123`);
  console.log(`=================================================`);
});
