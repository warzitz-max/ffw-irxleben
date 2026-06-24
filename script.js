const STORAGE_KEYS = {
  SAVES: 'feuerwehrPruefungSaved',
  CURRENT: 'feuerwehrPruefungCurrent'
};

const app = document.getElementById('app');
let savedInspections = [];
let currentInspection = null;
let deferredInstallPrompt = null;
let signatureState = { drawing: false, lastX: 0, lastY: 0 };

function loadSavedInspections() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVES) || '[]');
  } catch {
    return [];
  }
}

function loadCurrentInspection() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT));
    if (!saved || !saved.type || !CHECKLISTEN[saved.type]) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT);
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

function persistSaves() {
  localStorage.setItem(STORAGE_KEYS.SAVES, JSON.stringify(savedInspections));
}

function persistCurrentInspection() {
  if (!currentInspection) {
    localStorage.removeItem(STORAGE_KEYS.CURRENT);
    return;
  }
  localStorage.setItem(STORAGE_KEYS.CURRENT, JSON.stringify(currentInspection));
}

function buildInspection(type) {
  const checklist = CHECKLISTEN[type] || [];
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `ins-${Date.now()}`,
    type,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    inspector: '',
    vehicle: '',
    notes: '',
    signature: null,
    categories: checklist.map(category => ({
      category: category.category,
      items: category.items.map(label => ({
        label,
        status: 'unset',
        note: '',
        photo: null,
        photoName: ''
      }))
    }))
  };
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || '-';
  }
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStatusText(status) {
  if (status === 'ok') return 'OK';
  if (status === 'nio') return 'nicht OK';
  return 'unbewertet';
}

function getStatusClass(status) {
  if (status === 'ok') return 'status-ok';
  if (status === 'nio') return 'status-not-ok';
  return 'status-unset';
}

function countStatus(inspection, status) {
  return inspection.categories
    .flatMap(category => category.items)
    .filter(item => item.status === status).length;
}

function countNio(inspection) {
  return countStatus(inspection, 'nio');
}

function renderInstallBanner() {
  if (!deferredInstallPrompt) return '';
  return `
    <section class="install-banner">
      <div>
        <p><strong>Installiere die App</strong> für schnellen Offline-Zugriff und lokale Speicherung.</p>
      </div>
      <div class="button-row">
        <button type="button" class="primary" data-action="installApp">Installieren</button>
        <button type="button" class="secondary" data-action="dismissInstall">Später</button>
      </div>
    </section>
  `;
}

function renderStartCard() {
  const options = Object.keys(CHECKLISTEN)
    .map(type => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`)
    .join('');

  return `
    <section class="card">
      <h2>Neue Fahrzeugprüfung starten</h2>
      <div class="form-grid">
        <div class="form-field">
          <label for="vehicleType">Fahrzeugtyp wählen</label>
          <div class="select-group">
            <select id="vehicleType">
              <option value="">Bitte wählen</option>
              ${options}
            </select>
          </div>
        </div>
      </div>
      <div class="button-row">
        <button type="button" class="primary" data-action="startInspection">Prüfung beginnen</button>
      </div>
    </section>
  `;
}

function renderInspectionForm() {
  const totalItems = currentInspection.categories.reduce((sum, category) => sum + category.items.length, 0);
  const okCount = countStatus(currentInspection, 'ok');
  const nioCount = countNio(currentInspection);
  const unsetCount = totalItems - okCount - nioCount;

  const categoriesHtml = currentInspection.categories
    .map((category, categoryIndex) => `
      <section class="card">
        <h2>${escapeHtml(category.category)}</h2>
        ${category.items.map((item, itemIndex) => {
          const statusClass = getStatusClass(item.status);
          const itemId = `item-${categoryIndex}-${itemIndex}`;
          return `
            <article class="item-card">
              <div class="item-row">
                <div>
                  <div class="item-label">${escapeHtml(item.label)}</div>
                </div>
                <div class="item-actions">
                  <button type="button" class="radio-pill ${item.status === 'ok' ? 'active' : ''}" data-action="setStatus" data-category="${categoryIndex}" data-item="${itemIndex}" data-value="ok">OK</button>
                  <button type="button" class="radio-pill ${item.status === 'nio' ? 'active' : ''}" data-action="setStatus" data-category="${categoryIndex}" data-item="${itemIndex}" data-value="nio">N.i.O.</button>
                </div>
              </div>
              <div class="status-pill ${statusClass}">${getStatusText(item.status)}</div>
              <div class="item-details ${item.status === 'nio' ? 'open' : ''}" id="${itemId}">
                <label for="note-${itemId}">Bemerkung</label>
                <div class="textarea-group">
                  <textarea id="note-${itemId}" rows="3" data-action="itemNote" data-category="${categoryIndex}" data-item="${itemIndex}">${escapeHtml(item.note)}</textarea>
                </div>
                <label>Foto anhängen</label>
                <div class="input-group">
                  <input type="file" accept="image/*" capture="environment" data-action="attachPhoto" data-category="${categoryIndex}" data-item="${itemIndex}" />
                </div>
                ${item.photo ? `
                  <div>
                    <img class="photo-preview" src="${item.photo}" alt="Foto für ${escapeHtml(item.label)}" />
                    <div class="button-row">
                      <button type="button" class="secondary" data-action="removePhoto" data-category="${categoryIndex}" data-item="${itemIndex}">Foto entfernen</button>
                    </div>
                  </div>
                ` : ''}
              </div>
            </article>
          `;
        }).join('')}
      </section>
    `).join('');

  return `
    <section class="card">
      <div class="form-grid">
        <div class="form-field">
          <label for="inspectorName">Prüfende Person</label>
          <div class="input-group">
            <input id="inspectorName" type="text" placeholder="Name eingeben" value="${escapeHtml(currentInspection.inspector)}" data-field="inspector" />
          </div>
        </div>
        <div class="form-field">
          <label for="vehicleNumber">Kennzeichen / Gerät</label>
          <div class="input-group">
            <input id="vehicleNumber" type="text" placeholder="z. B. HLF 20" value="${escapeHtml(currentInspection.vehicle)}" data-field="vehicle" />
          </div>
        </div>
      </div>
      <div class="button-row">
        <button type="button" class="primary" data-action="saveInspection">Speichern</button>
        <button type="button" class="secondary" data-action="printReport">Als PDF exportieren</button>
        <button type="button" class="secondary" data-action="newInspection">Neue Prüfung</button>
      </div>
      <div class="saved-meta" style="margin-top:16px; gap: 14px;">
        <span>${escapeHtml(currentInspection.type)}</span>
        <span>Erstellt: ${formatDate(currentInspection.createdAt)}</span>
        <span>Aktualisiert: ${formatDate(currentInspection.updatedAt)}</span>
        <span class="status-pill status-ok">OK: ${okCount}</span>
        <span class="status-pill status-not-ok">Mängel: ${nioCount}</span>
        <span class="status-pill status-unset">Unbewertet: ${unsetCount}</span>
      </div>
    </section>
    ${nioCount > 0 ? `
      <section class="card mangel-card">
        <h3>Mängelübersicht</h3>
        <ul class="mangel-list">
          ${currentInspection.categories.flatMap((category, categoryIndex) =>
            category.items
              .filter(item => item.status === 'nio')
              .map(item => `
                <li class="mangel-item">
                  <strong>${escapeHtml(category.category)}</strong>: ${escapeHtml(item.label)}
                  ${item.note ? `<div>${escapeHtml(item.note)}</div>` : ''}
                </li>
              `)
          ).join('')}
        </ul>
      </section>
    ` : ''}
    ${categoriesHtml}
    <section class="card">
      <h2>Unterschrift</h2>
      <p class="signature-note">Bitte mit Finger oder Maus signieren. Die Unterschrift wird lokal gespeichert.</p>
      <canvas id="signatureCanvas" class="signature-canvas"></canvas>
      <div class="button-row" style="margin-top: 14px;">
        <button type="button" class="secondary" data-action="clearSignature">Unterschrift löschen</button>
      </div>
      ${currentInspection.signature ? `<img class="photo-preview" src="${currentInspection.signature}" alt="Signaturvorschau" />` : ''}
    </section>
  `;
}

function renderSavedSection() {
  if (!savedInspections.length) {
    return `
      <section class="card">
        <h2>Gespeicherte Prüfungen</h2>
        <p>Keine gespeicherten Prüfungen vorhanden. Speichere einen Bericht, um ihn später wieder zu laden.</p>
      </section>
    `;
  }

  return `
    <section class="card">
      <h2>Gespeicherte Prüfungen</h2>
      <ul class="saved-list">
        ${savedInspections.map(entry => `
          <li class="saved-entry">
            <div class="saved-meta">
              <strong>${escapeHtml(entry.type)}</strong>
              <span>${escapeHtml(entry.inspector || 'Unbekannt')}</span>
              <span>${formatDate(entry.updatedAt)}</span>
              <span>${countNio(entry)} Mängel</span>
            </div>
            <div class="saved-actions">
              <button type="button" class="secondary" data-action="loadSaved" data-id="${entry.id}">Laden</button>
              <button type="button" class="secondary" data-action="deleteSaved" data-id="${entry.id}">Löschen</button>
            </div>
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}

function render() {
  const parts = [];
  if (deferredInstallPrompt) {
    parts.push(renderInstallBanner());
  }

  if (currentInspection) {
    parts.push(renderInspectionForm());
  } else {
    parts.push(renderStartCard());
  }

  parts.push(renderSavedSection());
  app.innerHTML = parts.join('');
  setupSignatureCanvas();
}

function setupSignatureCanvas() {
  const canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1f242d';
  ctx.lineWidth = 3;

  if (currentInspection && currentInspection.signature) {
    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(image, 0, 0, rect.width, rect.height);
    };
    image.src = currentInspection.signature;
  } else {
    ctx.clearRect(0, 0, rect.width, rect.height);
  }

  canvas.addEventListener('pointerdown', event => {
    if (!currentInspection) return;
    signatureState.drawing = true;
    const pos = getCanvasPosition(canvas, event);
    signatureState.lastX = pos.x;
    signatureState.lastY = pos.y;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', event => {
    if (!signatureState.drawing) return;
    const pos = getCanvasPosition(canvas, event);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    signatureState.lastX = pos.x;
    signatureState.lastY = pos.y;
  });

  function endDrawing(event) {
    if (!signatureState.drawing) return;
    signatureState.drawing = false;
    canvas.releasePointerCapture(event.pointerId);
    if (!currentInspection) return;
    currentInspection.signature = canvas.toDataURL('image/png');
    currentInspection.updatedAt = new Date().toISOString();
    persistCurrentInspection();
  }

  canvas.addEventListener('pointerup', endDrawing);
  canvas.addEventListener('pointerleave', endDrawing);
}

function getCanvasPosition(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function handleAppClick(event) {
  const button = event.target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  if (!action) return;

  if (action === 'startInspection') {
    const select = document.getElementById('vehicleType');
    if (!select || !select.value) {
      alert('Bitte wählen Sie zuerst einen Fahrzeugtyp aus.');
      return;
    }
    currentInspection = buildInspection(select.value);
    persistCurrentInspection();
    render();
    return;
  }

  if (action === 'saveInspection') {
    saveInspection();
    return;
  }

  if (action === 'printReport') {
    if (currentInspection) {
      currentInspection.updatedAt = new Date().toISOString();
      persistCurrentInspection();
    }
    window.print();
    return;
  }

  if (action === 'newInspection') {
    if (confirm('Neue Prüfung beginnen? Der aktuelle Entwurf bleibt gespeichert.')) {
      currentInspection = null;
      persistCurrentInspection();
      render();
    }
    return;
  }

  if (action === 'loadSaved') {
    const id = button.dataset.id;
    if (!id) return;
    loadSavedInspection(id);
    return;
  }

  if (action === 'deleteSaved') {
    const id = button.dataset.id;
    if (!id) return;
    deleteSavedInspection(id);
    return;
  }

  if (action === 'installApp') {
    installApp();
    return;
  }

  if (action === 'dismissInstall') {
    deferredInstallPrompt = null;
    render();
    return;
  }

  if (action === 'setStatus') {
    const categoryIndex = Number(button.dataset.category);
    const itemIndex = Number(button.dataset.item);
    const value = button.dataset.value;
    updateItemStatus(categoryIndex, itemIndex, value);
    return;
  }

  if (action === 'clearSignature') {
    if (!currentInspection) return;
    currentInspection.signature = null;
    currentInspection.updatedAt = new Date().toISOString();
    persistCurrentInspection();
    render();
    return;
  }

  if (action === 'removePhoto') {
    const categoryIndex = Number(button.dataset.category);
    const itemIndex = Number(button.dataset.item);
    removeItemPhoto(categoryIndex, itemIndex);
    return;
  }
}

function handleAppChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;

  const action = target.dataset.action;
  if (action === 'attachPhoto') {
    const categoryIndex = Number(target.dataset.category);
    const itemIndex = Number(target.dataset.item);
    const file = target.files?.[0];
    if (file) {
      updateItemPhoto(categoryIndex, itemIndex, file);
    }
  }
}

function handleAppInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;

  const field = target.dataset.field;
  if (field) {
    updateCurrentField(field, target.value);
    return;
  }

  const action = target.dataset.action;
  if (action === 'itemNote') {
    const categoryIndex = Number(target.dataset.category);
    const itemIndex = Number(target.dataset.item);
    updateItemNote(categoryIndex, itemIndex, target.value);
  }
}

function updateCurrentField(field, value) {
  if (!currentInspection) return;
  if (field === 'inspector') {
    currentInspection.inspector = value;
  }
  if (field === 'vehicle') {
    currentInspection.vehicle = value;
  }
  currentInspection.updatedAt = new Date().toISOString();
  persistCurrentInspection();
}

function updateItemStatus(categoryIndex, itemIndex, status) {
  if (!currentInspection) return;
  const item = currentInspection.categories[categoryIndex]?.items[itemIndex];
  if (!item) return;
  item.status = status;
  currentInspection.updatedAt = new Date().toISOString();
  persistCurrentInspection();
  render();
}

function updateItemNote(categoryIndex, itemIndex, note) {
  if (!currentInspection) return;
  const item = currentInspection.categories[categoryIndex]?.items[itemIndex];
  if (!item) return;
  item.note = note;
  currentInspection.updatedAt = new Date().toISOString();
  persistCurrentInspection();
}

function updateItemPhoto(categoryIndex, itemIndex, file) {
  if (!currentInspection) return;
  const item = currentInspection.categories[categoryIndex]?.items[itemIndex];
  if (!item) return;
  const reader = new FileReader();
  reader.onload = () => {
    item.photo = reader.result;
    item.photoName = file.name;
    currentInspection.updatedAt = new Date().toISOString();
    persistCurrentInspection();
    render();
  }; 
  reader.readAsDataURL(file);
}

function removeItemPhoto(categoryIndex, itemIndex) {
  if (!currentInspection) return;
  const item = currentInspection.categories[categoryIndex]?.items[itemIndex];
  if (!item) return;
  item.photo = null;
  item.photoName = '';
  currentInspection.updatedAt = new Date().toISOString();
  persistCurrentInspection();
  render();
}

function saveInspection() {
  if (!currentInspection) return;

  currentInspection.updatedAt = new Date().toISOString();
  const existingIndex = savedInspections.findIndex(entry => entry.id === currentInspection.id);
  if (existingIndex >= 0) {
    savedInspections[existingIndex] = currentInspection;
  } else {
    savedInspections.unshift(currentInspection);
  }

  persistSaves();
  persistCurrentInspection();
  render();
}

function loadSavedInspection(id) {
  const entry = savedInspections.find(item => item.id === id);
  if (!entry) return;
  currentInspection = JSON.parse(JSON.stringify(entry));
  persistCurrentInspection();
  render();
}

function deleteSavedInspection(id) {
  savedInspections = savedInspections.filter(item => item.id !== id);
  persistSaves();
  render();
}

async function installApp() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  render();
  console.log('Install prompt result:', result.outcome);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(error => {
      console.warn('Service Worker registration failed:', error);
    });
  }
}

function init() {
  savedInspections = loadSavedInspections();
  currentInspection = loadCurrentInspection();
  render();
  app.addEventListener('click', handleAppClick);
  app.addEventListener('input', handleAppInput);
  app.addEventListener('change', handleAppChange);
  registerServiceWorker();
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  render();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  render();
});

window.addEventListener('DOMContentLoaded', init);
