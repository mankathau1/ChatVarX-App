// Admin Panel Logic
let adminToken = localStorage.getItem('chatvarx_admin_token') || '';

// Initialize Lucide Icons
function refreshIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}

// Check Auth state on load
document.addEventListener('DOMContentLoaded', () => {
  refreshIcons();

  const overlay = document.getElementById('login-overlay');
  if (adminToken) {
    overlay.style.display = 'none';
    loadDashboard();
  } else {
    overlay.style.display = 'flex';
  }

  setupEventListeners();
});

function setupEventListeners() {
  // 1. Login Form Submit
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const pinInput = document.getElementById('admin-pin');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    const pin = pinInput.value.trim();

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        adminToken = data.token;
        localStorage.setItem('chatvarx_admin_token', adminToken);
        document.getElementById('login-overlay').style.display = 'none';
        pinInput.value = '';
        loadDashboard();
      } else {
        loginError.textContent = data.message || 'Incorrect PIN';
        loginError.style.display = 'block';
      }
    } catch (err) {
      loginError.textContent = 'Server connection failed';
      loginError.style.display = 'block';
    }
  });

  // 2. Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('chatvarx_admin_token');
    adminToken = '';
    document.getElementById('login-overlay').style.display = 'flex';
  });

  // 3. Refresh Stats button
  document.getElementById('refresh-stats-btn').addEventListener('click', () => {
    loadDashboard();
  });

  // Mobile Sidebar Toggle
  const adminMobileToggle = document.getElementById('admin-mobile-toggle');
  const sidebarBody = document.getElementById('sidebar-body');
  if (adminMobileToggle && sidebarBody) {
    adminMobileToggle.addEventListener('click', () => {
      sidebarBody.classList.toggle('open');
      const isOpen = sidebarBody.classList.contains('open');
      adminMobileToggle.innerHTML = isOpen ? `<i data-lucide="x"></i>` : `<i data-lucide="menu"></i>`;
      refreshIcons();
    });

    // Close menu when clicking sidebar item on mobile
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          sidebarBody.classList.remove('open');
          adminMobileToggle.innerHTML = `<i data-lucide="menu"></i>`;
          refreshIcons();
        }
      });
    });
  }

  // 4. Dropzone & File Input Handling
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('apkFile');
  const dropzoneLabel = document.getElementById('dropzone-label');

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#8B5CF6';
    dropzone.style.background = 'rgba(139, 92, 246, 0.12)';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'rgba(139, 92, 246, 0.4)';
    dropzone.style.background = 'rgba(139, 92, 246, 0.03)';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'rgba(139, 92, 246, 0.4)';
    dropzone.style.background = 'rgba(139, 92, 246, 0.03)';
    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      handleFileSelected(fileInput.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFileSelected(fileInput.files[0]);
    }
  });

  const clearFileBtn = document.getElementById('clear-file-btn');

  function handleFileSelected(file) {
    if (!file.name.endsWith('.apk')) {
      alert('Please select a valid .apk file');
      fileInput.value = '';
      return;
    }
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    dropzoneLabel.innerHTML = `✅ <strong>${file.name}</strong> (${sizeMB} MB ready to upload)`;
    dropzone.style.borderColor = '#10B981';
    if (clearFileBtn) clearFileBtn.style.display = 'inline-block';
  }

  if (clearFileBtn) {
    clearFileBtn.addEventListener('click', () => {
      fileInput.value = '';
      dropzoneLabel.innerHTML = 'Click or Drag & Drop .apk file here';
      dropzone.style.borderColor = 'rgba(139, 92, 246, 0.4)';
      clearFileBtn.style.display = 'none';
    });
  }

  // 5. Upload APK Form Submit
  const uploadForm = document.getElementById('apk-upload-form');
  const uploadStatus = document.getElementById('upload-status');
  const submitUploadBtn = document.getElementById('submit-upload-btn');

  uploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const directUrl = document.getElementById('downloadUrl') ? document.getElementById('downloadUrl').value.trim() : '';
    const hasFile = fileInput.files && fileInput.files.length > 0;

    if (!hasFile && !directUrl) {
      alert('Please select an APK file OR paste a direct cloud download URL!');
      return;
    }

    const formData = new FormData(uploadForm);
    
    // If a direct high-speed cloud CDN URL is provided, omit the local file binary to avoid heavy 150MB upload
    if (directUrl && hasFile) {
      formData.delete('apkFile');
    }

    submitUploadBtn.disabled = true;
    submitUploadBtn.innerHTML = `<i data-lucide="loader" class="spin"></i> Publishing...`;
    refreshIcons();
    uploadStatus.style.color = '#8B5CF6';
    uploadStatus.textContent = hasFile && !directUrl ? 'Starting upload... Please wait.' : 'Publishing release...';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/apk/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${adminToken}`);

    if (xhr.upload && hasFile && !directUrl) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          const loadedMB = (event.loaded / (1024 * 1024)).toFixed(1);
          const totalMB = (event.total / (1024 * 1024)).toFixed(1);
          uploadStatus.textContent = `Uploading APK: ${loadedMB}MB / ${totalMB}MB (${percent}%)... Please do not close this tab.`;
        }
      };
    }

    xhr.onload = () => {
      submitUploadBtn.disabled = false;
      submitUploadBtn.innerHTML = `<i data-lucide="send"></i> Publish APK Live`;
      refreshIcons();

      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          uploadStatus.style.color = '#10B981';
          uploadStatus.textContent = `🚀 ${data.message}`;
          uploadForm.reset();
          dropzoneLabel.innerHTML = 'Click or Drag & Drop .apk file here';
          dropzone.style.borderColor = 'rgba(139, 92, 246, 0.4)';
          if (clearFileBtn) clearFileBtn.style.display = 'none';
          loadDashboard(); // Refresh UI with new release
        } else {
          uploadStatus.style.color = '#F43F5E';
          uploadStatus.textContent = data.message || `Upload failed with status ${xhr.status}`;
        }
      } catch (err) {
        uploadStatus.style.color = '#F43F5E';
        uploadStatus.textContent = 'Server response error: ' + xhr.responseText.slice(0, 100);
      }
    };

    xhr.onerror = () => {
      submitUploadBtn.disabled = false;
      submitUploadBtn.innerHTML = `<i data-lucide="send"></i> Publish APK Live`;
      refreshIcons();
      uploadStatus.style.color = '#F43F5E';
      uploadStatus.textContent = 'Network error or connection timeout during upload. For large files (>100MB), please use GitHub Releases CDN URL.';
    };

    xhr.send(formData);
  });

  // 6. Launch Countdown Form and Presets
  const launchForm = document.getElementById('launch-config-form');
  const launchStatus = document.getElementById('launch-update-status');
  const saveLaunchBtn = document.getElementById('save-launch-btn');
  const dateInput = document.getElementById('admin-launch-date');

  // Quick preset buttons
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const days = btn.getAttribute('data-days');
      const hours = btn.getAttribute('data-hours');
      let targetMs = Date.now();
      if (days) targetMs += parseInt(days, 10) * 24 * 60 * 60 * 1000;
      if (hours) targetMs += parseInt(hours, 10) * 60 * 60 * 1000;
      dateInput.value = toDatetimeLocalString(new Date(targetMs));
    });
  });

  if (launchForm) {
    launchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const targetDateVal = dateInput.value;
      if (!targetDateVal) {
        alert('Please pick a target launch date');
        return;
      }

      saveLaunchBtn.disabled = true;
      saveLaunchBtn.innerHTML = `<i data-lucide="loader" class="spin"></i> Saving...`;
      refreshIcons();
      launchStatus.style.color = '#06B6D4';
      launchStatus.textContent = 'Saving launch configuration...';

      try {
        const payload = {
          targetDate: new Date(targetDateVal).toISOString(),
          title: document.getElementById('admin-launch-title').value.trim(),
          badgeText: document.getElementById('admin-launch-badge').value.trim(),
          liveMessage: document.getElementById('admin-launch-message').value.trim(),
          isLive: document.getElementById('admin-launch-is-live').checked
        };

        const res = await fetch('/api/admin/launch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
          launchStatus.style.color = '#10B981';
          launchStatus.textContent = '🚀 Launch countdown updated successfully!';
          currentLaunchConfig = data.launchConfig;
          startAdminPreviewCountdown();
          setTimeout(() => {
            launchStatus.textContent = '';
          }, 4000);
        } else {
          launchStatus.style.color = '#F43F5E';
          launchStatus.textContent = data.message || 'Failed to update countdown';
        }
      } catch (err) {
        launchStatus.style.color = '#F43F5E';
        launchStatus.textContent = 'Network error occurred while saving';
      } finally {
        saveLaunchBtn.disabled = false;
        saveLaunchBtn.innerHTML = `<i data-lucide="save"></i> Save Launch Countdown`;
        refreshIcons();
      }
    });
  }

  // 7. Clear All Downloads
  const clearDownloadsBtn = document.getElementById('clear-downloads-btn');
  if (clearDownloadsBtn) {
    clearDownloadsBtn.addEventListener('click', async () => {
      if (!confirm('⚠️ Are you sure you want to delete ALL APK download activity logs? This cannot be undone.')) {
        return;
      }
      try {
        const res = await fetch('/api/admin/downloads', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          loadDashboard();
        } else {
          alert(data.message || 'Failed to clear downloads');
        }
      } catch (err) {
        alert('Network error while clearing downloads');
      }
    });
  }

  // 8. Clear All Visitors
  const clearVisitorsBtn = document.getElementById('clear-visitors-btn');
  if (clearVisitorsBtn) {
    clearVisitorsBtn.addEventListener('click', async () => {
      if (!confirm('⚠️ Are you sure you want to delete ALL website visitor logs? This cannot be undone.')) {
        return;
      }
      try {
        const res = await fetch('/api/admin/visitors', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          loadDashboard();
        } else {
          alert(data.message || 'Failed to clear visitors');
        }
      } catch (err) {
        alert('Network error while clearing visitors');
      }
    });
  }

  // 9. Change Admin PIN Form
  const changePinForm = document.getElementById('change-pin-form');
  const changePinStatus = document.getElementById('change-pin-status');
  const changePinBtn = document.getElementById('change-pin-btn');

  if (changePinForm) {
    changePinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const oldPin = document.getElementById('old-pin').value;
      const newPin = document.getElementById('new-pin').value;

      if (!newPin || newPin.length < 4) {
        changePinStatus.style.color = '#F43F5E';
        changePinStatus.textContent = 'New password must be at least 4 characters';
        return;
      }

      changePinBtn.disabled = true;
      changePinBtn.innerHTML = `<i data-lucide="loader" class="spin"></i> Updating...`;
      refreshIcons();
      changePinStatus.textContent = '';

      try {
        const res = await fetch('/api/admin/change-pin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({ oldPin, newPin })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          changePinStatus.style.color = '#10B981';
          changePinStatus.textContent = '✅ ' + data.message;
          changePinForm.reset();
          setTimeout(() => {
            changePinStatus.textContent = '';
          }, 4000);
        } else {
          changePinStatus.style.color = '#F43F5E';
          changePinStatus.textContent = '❌ ' + (data.message || 'Failed to change password');
        }
      } catch (err) {
        changePinStatus.style.color = '#F43F5E';
        changePinStatus.textContent = 'Network error while updating password';
      } finally {
        changePinBtn.disabled = false;
        changePinBtn.innerHTML = `<i data-lucide="key"></i> Update Admin Password`;
        refreshIcons();
      }
    });
  }
}

// Fetch and render all dashboard metrics
async function loadDashboard() {
  if (!adminToken) return;

  try {
    const res = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (res.status === 401) {
      // Session expired or invalid
      localStorage.removeItem('chatvarx_admin_token');
      adminToken = '';
      document.getElementById('login-overlay').style.display = 'flex';
      return;
    }

    const data = await res.json();
    renderStats(data);
    loadReleases();
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

function renderStats(data) {
  // Stat 1: Visits
  document.getElementById('stat-total-visits').textContent = data.totalVisits.toLocaleString();
  document.getElementById('stat-today-visits').textContent = data.todayVisits.toLocaleString();

  // Stat 2: Downloads
  document.getElementById('stat-total-downloads').textContent = data.totalDownloads.toLocaleString();
  document.getElementById('stat-today-downloads').textContent = data.todayDownloads.toLocaleString();

  // Stat 3: Device Ratio
  const totalDev = (data.devices.Mobile || 0) + (data.devices.Desktop || 0);
  const mobilePct = totalDev > 0 ? Math.round((data.devices.Mobile / totalDev) * 100) : 0;
  document.getElementById('stat-device-ratio').textContent = `${mobilePct}% Mobile`;
  document.getElementById('stat-device-detail').textContent = `${data.devices.Mobile} Mobile • ${data.devices.Desktop} Desktop`;

  // Stat 4: Active Release
  if (data.latestRelease) {
    document.getElementById('stat-active-version').textContent = data.latestRelease.versionName;
    document.getElementById('stat-active-size').textContent = data.latestRelease.fileSize || 'Ready';
  }

  // Render Visitors Table
  const visitorsTbody = document.getElementById('visitors-table-body');
  if (data.recentVisits && data.recentVisits.length > 0) {
    visitorsTbody.innerHTML = data.recentVisits.map(v => {
      const time = new Date(v.timestamp).toLocaleString();
      let badgeClass = 'badge-desktop';
      if (v.os === 'Android') badgeClass = 'badge-android';
      else if (v.os === 'iOS') badgeClass = 'badge-ios';

      return `
        <tr>
          <td><span style="color: var(--text-muted); font-size: 0.8rem;">${time}</span></td>
          <td><span class="badge-pill ${badgeClass}">${v.device}</span></td>
          <td><strong>${v.os}</strong></td>
          <td>${v.browser}</td>
          <td style="color: var(--text-muted);">${v.referrer}</td>
          <td><code>${v.ip}</code></td>
          <td style="text-align: center;">
            <button type="button" class="btn-action-delete" onclick="deleteVisitor('${v.id}')" title="Delete this record">
              <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } else {
    visitorsTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No visitors recorded yet.</td></tr>`;
  }

  // Render Downloads Table
  const downloadsTbody = document.getElementById('downloads-table-body');
  if (data.recentDownloads && data.recentDownloads.length > 0) {
    downloadsTbody.innerHTML = data.recentDownloads.map(d => {
      const time = new Date(d.timestamp).toLocaleString();
      let badgeClass = d.os === 'Android' ? 'badge-android' : 'badge-desktop';
      return `
        <tr>
          <td><span style="color: var(--text-muted); font-size: 0.8rem;">${time}</span></td>
          <td><strong style="color: #F43F5E;">${d.version}</strong></td>
          <td><span class="badge-pill ${badgeClass}">${d.os} (${d.device})</span></td>
          <td>${d.browser}</td>
          <td><code>${d.ip}</code></td>
          <td style="text-align: center;">
            <button type="button" class="btn-action-delete" onclick="deleteDownload('${d.id}')" title="Delete this log">
              <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } else {
    downloadsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">No downloads recorded yet.</td></tr>`;
  }

  // Populate Launch Countdown Form & Preview
  if (data.launchConfig) {
    currentLaunchConfig = data.launchConfig;
    const dateInput = document.getElementById('admin-launch-date');
    const titleInput = document.getElementById('admin-launch-title');
    const badgeInput = document.getElementById('admin-launch-badge');
    const messageInput = document.getElementById('admin-launch-message');
    const isLiveCheck = document.getElementById('admin-launch-is-live');

    if (dateInput && currentLaunchConfig.targetDate) {
      dateInput.value = toDatetimeLocalString(currentLaunchConfig.targetDate);
    }
    if (titleInput && currentLaunchConfig.title) {
      titleInput.value = currentLaunchConfig.title;
    }
    if (badgeInput && currentLaunchConfig.badgeText) {
      badgeInput.value = currentLaunchConfig.badgeText;
    }
    if (messageInput && currentLaunchConfig.liveMessage) {
      messageInput.value = currentLaunchConfig.liveMessage;
    }
    if (isLiveCheck) {
      isLiveCheck.checked = !!currentLaunchConfig.isLive;
    }

    startAdminPreviewCountdown();
  }

  refreshIcons();
}

let currentLaunchConfig = null;
let adminPreviewInterval = null;

function toDatetimeLocalString(date) {
  const d = new Date(date);
  const pad = n => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function startAdminPreviewCountdown() {
  if (!currentLaunchConfig) return;

  const cdDays = document.getElementById('admin-cd-days');
  const cdHours = document.getElementById('admin-cd-hours');
  const cdMins = document.getElementById('admin-cd-mins');
  const cdSecs = document.getElementById('admin-cd-secs');
  const statusEl = document.getElementById('admin-preview-status');
  const digitsEl = document.getElementById('admin-preview-digits');

  function tick() {
    if (!currentLaunchConfig) return;

    if (currentLaunchConfig.isLive) {
      if (statusEl) statusEl.innerHTML = `<span style="color:#10B981;font-weight:700;">🟢 OFFICIALLY LIVE (Celebration Mode)</span>`;
      if (digitsEl) digitsEl.style.opacity = '0.4';
      return;
    }

    const diff = new Date(currentLaunchConfig.targetDate).getTime() - Date.now();
    if (diff <= 0) {
      if (statusEl) statusEl.innerHTML = `<span style="color:#10B981;font-weight:700;">🟢 TIME REACHED - LIVE</span>`;
      if (digitsEl) digitsEl.style.opacity = '0.4';
      return;
    }

    if (digitsEl) digitsEl.style.opacity = '1';
    if (statusEl) statusEl.textContent = `Ticking down (${Math.ceil(diff / (1000 * 60 * 60 * 24))} days left)`;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / 1000 / 60) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    if (cdDays) cdDays.textContent = String(days).padStart(2, '0');
    if (cdHours) cdHours.textContent = String(hours).padStart(2, '0');
    if (cdMins) cdMins.textContent = String(mins).padStart(2, '0');
    if (cdSecs) cdSecs.textContent = String(secs).padStart(2, '0');
  }

  tick();
  if (adminPreviewInterval) clearInterval(adminPreviewInterval);
  adminPreviewInterval = setInterval(tick, 1000);
}

// Load Releases List
async function loadReleases() {
  try {
    const res = await fetch('/api/admin/releases', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    const tbody = document.getElementById('releases-table-body');

    if (data.success && data.releases && data.releases.length > 0) {
      tbody.innerHTML = data.releases.map((r, index) => {
        const isLatest = index === 0;
        const dateStr = new Date(r.createdAt).toLocaleDateString();
        return `
          <tr>
            <td>
              <strong>${r.versionName}</strong> 
              ${isLatest ? '<span class="badge-pill badge-android" style="margin-left: 6px;">LATEST</span>' : ''}
              <div style="font-size: 0.75rem; color: var(--text-muted);">Code: ${r.versionCode}</div>
            </td>
            <td><code>${r.fileName}</code></td>
            <td>${r.fileSize}</td>
            <td><strong style="color: #10B981;">📥 ${r.downloadCount || 0}</strong></td>
            <td>${dateStr}</td>
            <td>${r.isForceUpdate ? '<span style="color:#F43F5E; font-weight:700;">Mandatory</span>' : '<span style="color:var(--text-muted);">Optional</span>'}</td>
            <td>
              ${!isLatest ? `
                <button onclick="deleteRelease('${r.id}')" style="background:none; border:none; color:#F43F5E; cursor:pointer;" title="Delete Build">
                  <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                </button>
              ` : '<span style="color: var(--text-muted); font-size: 0.8rem;">Active</span>'}
            </td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No releases found.</td></tr>`;
    }

    refreshIcons();
  } catch (err) {
    console.error('Error loading releases:', err);
  }
}

// Delete Release helper
window.deleteRelease = async function(id) {
  if (!confirm('Are you sure you want to delete this release version?')) return;
  try {
    const res = await fetch(`/api/admin/releases/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.ok) {
      loadDashboard();
    }
  } catch (e) {
    alert('Failed to delete release');
  }
};

// Delete single visitor log
window.deleteVisitor = async function(id) {
  if (!confirm('Are you sure you want to delete this visitor record?')) return;
  try {
    const res = await fetch(`/api/admin/visitors/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.ok) {
      loadDashboard();
    } else {
      alert('Failed to delete visitor log');
    }
  } catch (e) {
    alert('Failed to delete visitor record');
  }
};

// Delete single download log
window.deleteDownload = async function(id) {
  if (!confirm('Are you sure you want to delete this download record?')) return;
  try {
    const res = await fetch(`/api/admin/downloads/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.ok) {
      loadDashboard();
    } else {
      alert('Failed to delete download log');
    }
  } catch (e) {
    alert('Failed to delete download record');
  }
};

