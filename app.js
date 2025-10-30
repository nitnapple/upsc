// Application State
const state = {
  stream: null,
  currentPosition: null,
  photos: [],
  settings: {
    coordinateFormat: 'decimal',
    showAccuracy: true,
    showTimestamp: true,
    imageFormat: 'jpeg',
    imageQuality: 0.92
  },
  permissions: {
    camera: false,
    location: false
  }
};

// Error Messages
const errorMessages = {
  camera_denied: "Camera access is required to take photos. Please enable camera permissions in your browser settings.",
  location_denied: "Location access is required to embed coordinates. Please enable location permissions in your browser settings.",
  camera_unavailable: "No camera detected on this device. Please use a device with a camera.",
  location_unavailable: "Unable to retrieve your location. Please ensure location services are enabled.",
  browser_unsupported: "Your browser does not support camera or geolocation features. Please use a modern mobile browser."
};

// DOM Elements
const elements = {
  cameraView: document.getElementById('cameraView'),
  previewView: document.getElementById('previewView'),
  galleryView: document.getElementById('galleryView'),
  cameraFeed: document.getElementById('cameraFeed'),
  captureBtn: document.getElementById('captureBtn'),
  galleryBtn: document.getElementById('galleryBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  messageOverlay: document.getElementById('messageOverlay'),
  messageTitle: document.getElementById('messageTitle'),
  messageText: document.getElementById('messageText'),
  retryBtn: document.getElementById('retryBtn'),
  latitudeDisplay: document.getElementById('latitudeDisplay'),
  longitudeDisplay: document.getElementById('longitudeDisplay'),
  accuracyDisplay: document.getElementById('accuracyDisplay'),
  photoCount: document.getElementById('photoCount'),
  previewImage: document.getElementById('previewImage'),
  previewLocation: document.getElementById('previewLocation'),
  previewTimestamp: document.getElementById('previewTimestamp'),
  previewAccuracy: document.getElementById('previewAccuracy'),
  closePreviewBtn: document.getElementById('closePreviewBtn'),
  retakeBtn: document.getElementById('retakeBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  galleryGrid: document.getElementById('galleryGrid'),
  closeGalleryBtn: document.getElementById('closeGalleryBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  coordinateFormat: document.getElementById('coordinateFormat'),
  showAccuracy: document.getElementById('showAccuracy'),
  showTimestamp: document.getElementById('showTimestamp')
};

// Initialize App
async function init() {
  setupEventListeners();
  await requestPermissions();
}

// Setup Event Listeners
function setupEventListeners() {
  elements.captureBtn.addEventListener('click', capturePhoto);
  elements.galleryBtn.addEventListener('click', () => switchView('gallery'));
  elements.settingsBtn.addEventListener('click', openSettings);
  elements.retryBtn.addEventListener('click', requestPermissions);
  elements.closePreviewBtn.addEventListener('click', () => switchView('camera'));
  elements.retakeBtn.addEventListener('click', () => switchView('camera'));
  elements.downloadBtn.addEventListener('click', downloadCurrentPhoto);
  elements.closeGalleryBtn.addEventListener('click', () => switchView('camera'));
  elements.closeSettingsBtn.addEventListener('click', closeSettings);
  
  // Settings changes
  elements.coordinateFormat.addEventListener('change', (e) => {
    state.settings.coordinateFormat = e.target.value;
    updateCoordinateDisplay();
  });
  
  elements.showAccuracy.addEventListener('change', (e) => {
    state.settings.showAccuracy = e.target.checked;
    updateCoordinateDisplay();
  });
  
  elements.showTimestamp.addEventListener('change', (e) => {
    state.settings.showTimestamp = e.target.checked;
  });
}

// Request Permissions
async function requestPermissions() {
  hideMessage();
  
  // Check if browser supports required APIs
  if (!navigator.mediaDevices || !navigator.geolocation) {
    showError('browser_unsupported');
    return;
  }
  
  try {
    // Request Camera
    await requestCamera();
    
    // Request Location
    await requestLocation();
    
    // Both permissions granted
    if (state.permissions.camera && state.permissions.location) {
      startApp();
    }
  } catch (error) {
    console.error('Permission error:', error);
  }
}

// Request Camera Permission
async function requestCamera() {
  try {
    const constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };
    
    state.stream = await navigator.mediaDevices.getUserMedia(constraints);
    elements.cameraFeed.srcObject = state.stream;
    state.permissions.camera = true;
  } catch (error) {
    console.error('Camera error:', error);
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      showError('camera_denied');
    } else if (error.name === 'NotFoundError') {
      showError('camera_unavailable');
    } else {
      showError('camera_unavailable');
    }
    state.permissions.camera = false;
  }
}

// Request Location Permission
async function requestLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      showError('browser_unsupported');
      state.permissions.location = false;
      resolve();
      return;
    }
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.currentPosition = position;
        state.permissions.location = true;
        updateCoordinateDisplay();
        
        // Watch position for continuous updates
        navigator.geolocation.watchPosition(
          (pos) => {
            state.currentPosition = pos;
            updateCoordinateDisplay();
          },
          (error) => console.error('Watch position error:', error),
          options
        );
        
        resolve();
      },
      (error) => {
        console.error('Location error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          showError('location_denied');
        } else {
          showError('location_unavailable');
        }
        state.permissions.location = false;
        resolve();
      },
      options
    );
  });
}

// Start App
function startApp() {
  hideMessage();
  updateCoordinateDisplay();
}

// Update Coordinate Display
function updateCoordinateDisplay() {
  if (!state.currentPosition) {
    elements.latitudeDisplay.textContent = 'Latitude: --';
    elements.longitudeDisplay.textContent = 'Longitude: --';
    elements.accuracyDisplay.textContent = 'Accuracy: --';
    return;
  }
  
  const { latitude, longitude, accuracy } = state.currentPosition.coords;
  
  if (state.settings.coordinateFormat === 'decimal') {
    elements.latitudeDisplay.textContent = `Latitude: ${formatDecimalDegrees(latitude, 'lat')}`;
    elements.longitudeDisplay.textContent = `Longitude: ${formatDecimalDegrees(longitude, 'lon')}`;
  } else {
    elements.latitudeDisplay.textContent = `Latitude: ${formatDMS(latitude, 'lat')}`;
    elements.longitudeDisplay.textContent = `Longitude: ${formatDMS(longitude, 'lon')}`;
  }
  
  if (state.settings.showAccuracy) {
    elements.accuracyDisplay.textContent = `Accuracy: ±${Math.round(accuracy)}m`;
    elements.accuracyDisplay.style.display = 'block';
  } else {
    elements.accuracyDisplay.style.display = 'none';
  }
}

// Format Decimal Degrees
function formatDecimalDegrees(value, type) {
  const direction = type === 'lat' 
    ? (value >= 0 ? 'N' : 'S')
    : (value >= 0 ? 'E' : 'W');
  return `${Math.abs(value).toFixed(6)}° ${direction}`;
}

// Format Degrees Minutes Seconds
function formatDMS(value, type) {
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = Math.round((minutesFloat - minutes) * 60);
  const direction = type === 'lat'
    ? (value >= 0 ? 'N' : 'S')
    : (value >= 0 ? 'E' : 'W');
  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

// Capture Photo
function capturePhoto() {
  if (!state.permissions.camera || !state.permissions.location) {
    showError('camera_denied');
    return;
  }
  
  if (!state.currentPosition) {
    alert('Waiting for location data. Please try again in a moment.');
    return;
  }
  
  // Create canvas
  const canvas = document.createElement('canvas');
  const video = elements.cameraFeed;
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  
  // Draw video frame
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Add coordinate overlay
  drawCoordinateOverlay(ctx, canvas.width, canvas.height);
  
  // Convert to image
  const imageData = canvas.toDataURL(`image/${state.settings.imageFormat}`, state.settings.imageQuality);
  
  // Store photo
  const photo = {
    id: Date.now(),
    image: imageData,
    timestamp: new Date(),
    coordinates: {
      latitude: state.currentPosition.coords.latitude,
      longitude: state.currentPosition.coords.longitude,
      accuracy: state.currentPosition.coords.accuracy
    }
  };
  
  state.photos.unshift(photo);
  updatePhotoCount();
  
  // Show preview
  showPhotoPreview(photo);
}

// Draw Coordinate Overlay on Canvas
function drawCoordinateOverlay(ctx, width, height) {
  const { latitude, longitude, accuracy } = state.currentPosition.coords;
  const padding = 20;
  const lineHeight = 35;
  const fontSize = 28;
  
  // Setup text style
  ctx.font = `bold ${fontSize}px -apple-system, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  // Prepare text lines
  const lines = [];
  
  if (state.settings.coordinateFormat === 'decimal') {
    lines.push(`Lat: ${formatDecimalDegrees(latitude, 'lat')}`);
    lines.push(`Lon: ${formatDecimalDegrees(longitude, 'lon')}`);
  } else {
    lines.push(`Lat: ${formatDMS(latitude, 'lat')}`);
    lines.push(`Lon: ${formatDMS(longitude, 'lon')}`);
  }
  
  if (state.settings.showAccuracy) {
    lines.push(`Accuracy: ±${Math.round(accuracy)}m`);
  }
  
  if (state.settings.showTimestamp) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB');
    const timeStr = now.toLocaleTimeString('en-GB');
    lines.push(`${dateStr} ${timeStr}`);
  }
  
  // Calculate background dimensions
  const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
  const bgWidth = maxWidth + (padding * 2);
  const bgHeight = (lines.length * lineHeight) + (padding * 2);
  
  // Draw semi-transparent background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, bgWidth, bgHeight);
  
  // Draw text
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  lines.forEach((line, index) => {
    ctx.fillText(line, padding, padding + (index * lineHeight));
  });
}

// Show Photo Preview
function showPhotoPreview(photo) {
  elements.previewImage.src = photo.image;
  
  const latStr = formatDecimalDegrees(photo.coordinates.latitude, 'lat');
  const lonStr = formatDecimalDegrees(photo.coordinates.longitude, 'lon');
  elements.previewLocation.textContent = `${latStr}, ${lonStr}`;
  
  const dateStr = photo.timestamp.toLocaleDateString('en-GB');
  const timeStr = photo.timestamp.toLocaleTimeString('en-GB');
  elements.previewTimestamp.textContent = `${dateStr} ${timeStr}`;
  
  elements.previewAccuracy.textContent = `±${Math.round(photo.coordinates.accuracy)} meters`;
  
  state.currentPreviewPhoto = photo;
  switchView('preview');
}

// Download Current Photo
function downloadCurrentPhoto() {
  if (!state.currentPreviewPhoto) return;
  
  const link = document.createElement('a');
  const timestamp = state.currentPreviewPhoto.timestamp.getTime();
  link.download = `geo-photo-${timestamp}.${state.settings.imageFormat}`;
  link.href = state.currentPreviewPhoto.image;
  link.click();
}

// Update Photo Count
function updatePhotoCount() {
  elements.photoCount.textContent = state.photos.length || '';
}

// Switch View
function switchView(viewName) {
  // Hide all views
  document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
  
  // Show selected view
  if (viewName === 'camera') {
    elements.cameraView.classList.add('active');
  } else if (viewName === 'preview') {
    elements.previewView.classList.add('active');
  } else if (viewName === 'gallery') {
    elements.galleryView.classList.add('active');
    renderGallery();
  }
}

// Render Gallery
function renderGallery() {
  if (state.photos.length === 0) {
    elements.galleryGrid.innerHTML = `
      <div class="empty-gallery">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <p>No photos captured yet</p>
        <p class="empty-subtitle">Take your first geo-tagged photo!</p>
      </div>
    `;
    return;
  }
  
  elements.galleryGrid.innerHTML = state.photos.map((photo, index) => `
    <div class="gallery-item" data-index="${index}">
      <img src="${photo.image}" alt="Photo ${index + 1}">
      <div class="gallery-item-overlay">
        ${photo.timestamp.toLocaleDateString('en-GB')}
      </div>
      <div class="gallery-item-actions">
        <button class="gallery-item-btn delete" data-action="delete" data-index="${index}" aria-label="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
  
  // Add event listeners
  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="delete"]')) {
        const index = parseInt(e.target.closest('[data-action="delete"]').dataset.index);
        deletePhoto(index);
      } else {
        const index = parseInt(item.dataset.index);
        showPhotoPreview(state.photos[index]);
      }
    });
  });
}

// Delete Photo
function deletePhoto(index) {
  if (confirm('Delete this photo?')) {
    state.photos.splice(index, 1);
    updatePhotoCount();
    renderGallery();
  }
}

// Open Settings
function openSettings() {
  elements.coordinateFormat.value = state.settings.coordinateFormat;
  elements.showAccuracy.checked = state.settings.showAccuracy;
  elements.showTimestamp.checked = state.settings.showTimestamp;
  elements.settingsModal.classList.add('active');
}

// Close Settings
function closeSettings() {
  elements.settingsModal.classList.remove('active');
}

// Show Error
function showError(errorType) {
  elements.messageTitle.textContent = 'Permission Required';
  elements.messageText.textContent = errorMessages[errorType] || 'An error occurred. Please try again.';
  elements.messageOverlay.classList.remove('hidden');
}

// Hide Message
function hideMessage() {
  elements.messageOverlay.classList.add('hidden');
}

// Start the app
init();