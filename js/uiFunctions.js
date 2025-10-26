
const torqueSlider = document.getElementById('torqueSlider');
const speedSlider = document.getElementById('speedSlider');
const torqueDiv = document.getElementById('torqueButtons');
const speedDiv = document.getElementById('speedButtons');
const torqueValueDisplay = document.getElementById('torqueValue');
const speedValueDisplay = document.getElementById('speedValue');
const connectionButton = document.getElementById('connectButton');
const lockButton = document.getElementById('lockButton');
const screwListEl = document.getElementById('screwList');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const exportButton = document.getElementById('exportButton');
const importButton = document.getElementById('importButton');
const importFileInput = document.getElementById('importFile');
const addScrewButton = document.getElementById('addScrewButton');
const deleteScrewButton = document.getElementById('deleteScrewButton');
const screwTitle = document.getElementById('screwTitle');
const screwNameInput = document.getElementById('screwNameInput');

// Global screws state
// Each screw: { id: string, name: string, torque: number, speed: number }
let screws = [];
let currentScrewIndex = -1;

// Controls lock state
let controlsLocked = true;

function setControlsLocked(locked) {
    controlsLocked = !!locked;
    if (torqueSlider) torqueSlider.disabled = !controlsLocked;
    if (speedSlider) speedSlider.disabled = !controlsLocked;
    if (torqueDiv) Array.from(torqueDiv.querySelectorAll('button')).forEach(b => b.disabled = !controlsLocked);
    if (speedDiv) Array.from(speedDiv.querySelectorAll('button')).forEach(b => b.disabled = !controlsLocked);
    // Toggle edit/display for screw name
    if (screwTitle) screwTitle.classList.toggle('d-none', controlsLocked);
    if (screwNameInput) screwNameInput.classList.toggle('d-none', !controlsLocked);
    // Hide actions while unlocked edit mode is active
    if (addScrewButton) addScrewButton.classList.toggle('d-none', !controlsLocked);
    if (deleteScrewButton) deleteScrewButton.classList.toggle('d-none', !controlsLocked);
    if (importButton) importButton.classList.toggle('d-none', !controlsLocked);
    if (exportButton) exportButton.classList.toggle('d-none', !controlsLocked);
    // Disable connection button while unlocked
    if (connectionButton) connectionButton.disabled = !controlsLocked;
    if (lockButton) {
        lockButton.className = !controlsLocked ? 'btn btn-warning' : 'btn btn-outline-secondary';
        lockButton.innerHTML = !controlsLocked
            ? '<i class="bi bi-unlock-fill me-1" aria-hidden="true"></i>Unlock controls'
            : '<i class="bi bi-lock me-1" aria-hidden="true"></i>Lock controls';
    }
}

/**
 * Create a Bootstrap-styled button element.
 *
 * @param {string} label - The text content of the button.
 * @param {() => void} onClick - Click handler invoked when the button is pressed.
 * @returns {HTMLButtonElement} The created button element.
 */
function createButton(label, onClick) {
     const button = document.createElement('button');
     button.textContent = label;
     button.className = 'btn btn-primary m-2';
     button.addEventListener('click', onClick);
     return button;
 }

/**
 * Initialize UI controls for torque and speed based on SETTINGS.
 *
 * Contract:
 * - Sets slider ranges and initial values.
 * - Renders preset buttons and wires their handlers.
 * - Calls setTorque and setSpeed to sync UI and device state.
 *
 * Side effects:
 * - Mutates DOM (sliders, buttons, labels) and triggers serial sends.
 *
 * @returns {void}
 */
 function setupControls() {
    torqueSlider.min = SETTINGS.torqueMin;
    torqueSlider.max = SETTINGS.torqueMax;
    torqueSlider.value = SETTINGS.torque;
    setTorque(SETTINGS.torque);
    torqueDiv.innerHTML = '';
    SETTINGS.torqueButtons.forEach(value => {
        const button = createButton(`${value}`, () => {
            setTorque(value);
        }); 
        torqueDiv.appendChild(button);
    });

    speedSlider.min = SETTINGS.speedMin;
    speedSlider.max = SETTINGS.speedMax;
    speedSlider.value = SETTINGS.speed;
    setSpeed(SETTINGS.speed);
    speedDiv.innerHTML = '';
    SETTINGS.speedButtons.forEach(value => {
        const button = createButton(`${value}`, () => {
            setSpeed(value);
        });
        speedDiv.appendChild(button);
    });
    // Apply lock state to new buttons if needed
    if (controlsLocked) setControlsLocked(controlsLocked);
}

/**
 * Initialize screws management: default data, list rendering, and event wiring.
 */
function initScrewManagement() {
    // Initialize with one default screw using existing SETTINGS values
    screws = [
        {
            id: cryptoRandomId(),
            name: 'Default',
            torque: Number(SETTINGS.torque),
            speed: Number(SETTINGS.speed)
        }
    ];
    renderScrewList();
    selectScrew(0);

    // Wire navigation
    if (prevButton) prevButton.addEventListener('click', () => navigateScrews(-1));
    if (nextButton) nextButton.addEventListener('click', () => navigateScrews(1));

    // Wire import/export
    if (exportButton) exportButton.addEventListener('click', exportScrews);
    if (importButton) importButton.addEventListener('click', () => importFileInput && importFileInput.click());
    if (importFileInput) importFileInput.addEventListener('change', handleImportFileChange);

    // Wire create/delete
    if (addScrewButton) addScrewButton.addEventListener('click', addScrew);
    if (deleteScrewButton) deleteScrewButton.addEventListener('click', deleteCurrentScrew);

    // Wire rename input
    if (screwNameInput) {
        screwNameInput.addEventListener('input', handleScrewNameInput);
    }

    // Wire lock toggle
    if (lockButton) {
        lockButton.addEventListener('click', () => setControlsLocked(!controlsLocked));
        setControlsLocked(false);
    }
}

function cryptoRandomId() {
    // Best-effort unique id without external libs
    try {
        const arr = new Uint32Array(4);
        crypto.getRandomValues(arr);
        return Array.from(arr).map(x => x.toString(16)).join('');
    } catch {
        return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    }
}

function renderScrewList() {
    if (!screwListEl) return;
    screwListEl.innerHTML = '';
    if (!Array.isArray(screws) || screws.length === 0) {
        const li = document.createElement('li');
        li.className = 'list-group-item text-muted';
        li.textContent = 'No screws loaded';
        screwListEl.appendChild(li);
        return;
    }

    screws.forEach((screw, idx) => {
        const li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
        if (idx === currentScrewIndex) li.classList.add('active');
        const title = document.createElement('div');
        title.innerHTML = `<div class="fw-semibold">${escapeHtml(screw.name)}</div><div class="small">T: ${screw.torque} | S: ${screw.speed}</div>`;
        li.appendChild(title);
        li.tabIndex = 0; // better accessibility
        li.addEventListener('click', () => selectScrew(idx));
        screwListEl.appendChild(li);
    });
}

function nextScrewName() {
    // Find next available number
    const base = 'Screw ';
    let maxN = 0;
    screws.forEach(s => {
        const m = String(s.name || '').match(/^Screw\s+(\d+)$/i);
        if (m) {
            const n = parseInt(m[1], 10);
            if (Number.isFinite(n)) maxN = Math.max(maxN, n);
        }
    });
    return `${base}${maxN + 1}`;
}

function addScrew() {
    const torque = Number(torqueSlider?.value ?? SETTINGS.torque);
    const speed = Number(speedSlider?.value ?? SETTINGS.speed);
    const screw = {
        id: cryptoRandomId(),
        name: nextScrewName(),
        torque,
        speed
    };
    screws.push(screw);
    renderScrewList();
    selectScrew(screws.length - 1);
}

function deleteCurrentScrew() {
    if (!Array.isArray(screws) || screws.length === 0) return;
    const delIdx = currentScrewIndex >= 0 ? currentScrewIndex : screws.length - 1;
    screws.splice(delIdx, 1);
    if (screws.length === 0) {
        currentScrewIndex = -1;
        renderScrewList();
        updateNavButtonsState();
        if (screwTitle) screwTitle.textContent = '';
        return;
    }
    const newIndex = Math.min(delIdx, screws.length - 1);
    selectScrew(newIndex);
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}

function selectScrew(index) {
    if (!Array.isArray(screws) || index < 0 || index >= screws.length) return;
    currentScrewIndex = index;
    const screw = screws[index];
    if (screwTitle) screwTitle.textContent = screw.name;
    if (screwNameInput) screwNameInput.value = screw.name;
    // Update controls to this screw
    setTorque(screw.torque);
    setSpeed(screw.speed);
    // Re-render list to update active state and summary values
    renderScrewList();
    updateNavButtonsState();
}

function handleScrewNameInput(e) {
    if (!Array.isArray(screws) || currentScrewIndex < 0 || currentScrewIndex >= screws.length) return;
    let name = String(e.target.value || '').trim();
    if (name.length === 0) name = 'Unnamed';
    screws[currentScrewIndex].name = name;
    if (screwTitle) screwTitle.textContent = name;
    renderScrewList();
}

function updateNavButtonsState() {
    const hasMultiple = Array.isArray(screws) && screws.length > 1;
    if (prevButton) prevButton.disabled = !hasMultiple || currentScrewIndex <= 0;
    if (nextButton) nextButton.disabled = !hasMultiple || currentScrewIndex >= screws.length - 1;
}

function navigateScrews(direction) {
    if (!Array.isArray(screws) || screws.length === 0) return;
    let idx = currentScrewIndex + direction;
    if (idx < 0) idx = 0;
    if (idx > screws.length - 1) idx = screws.length - 1;
    selectScrew(idx);
}

function handleImportFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const text = String(reader.result);
            const json = JSON.parse(text);
            const list = Array.isArray(json) ? json : (Array.isArray(json.screws) ? json.screws : []);
            const normalized = list
                .map((s, i) => ({
                    id: s.id || cryptoRandomId(),
                    name: s.name || `Screw ${i+1}`,
                    torque: Number(s.torque ?? SETTINGS.torque),
                    speed: Number(s.speed ?? SETTINGS.speed)
                }))
                .filter(s => Number.isFinite(s.torque) && Number.isFinite(s.speed));
            if (normalized.length === 0) throw new Error('No valid screws found in file');
            screws = normalized;
            renderScrewList();
            selectScrew(0);
        } catch (err) {
            alert('Failed to import screws: ' + err.message);
        } finally {
            e.target.value = '';
        }
    };
    reader.onerror = () => alert('Failed to read file');
    reader.onload = function(evt) {
        try {
            // Parse Excel file using SheetJS
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            // Expect header row: [Name, Torque, Speed]
            if (!rows || rows.length < 2) throw new Error('No data found');
            const [header, ...body] = rows;
            const nameIdx = header.indexOf('Name');
            const torqueIdx = header.indexOf('Torque');
            const speedIdx = header.indexOf('Speed');
            if (nameIdx === -1 || torqueIdx === -1 || speedIdx === -1) throw new Error('Missing columns');
            screws = body.map(row => ({
                id: cryptoRandomId(),
                name: row[nameIdx] || nextScrewName(),
                torque: Number(row[torqueIdx] ?? SETTINGS.torque),
                speed: Number(row[speedIdx] ?? SETTINGS.speed)
            })).filter(s => s.name);
            renderScrewList();
            selectScrew(0);
        } catch (err) {
            alert('Import failed: ' + err.message);
        } finally {
            e.target.value = '';
        }
    };
    reader.onerror = () => alert('Failed to read file');
    reader.readAsArrayBuffer(file);
}

function exportScrews() {
    // Export screws to Excel (.xlsx) using SheetJS
    if (!Array.isArray(screws) || screws.length === 0) {
        alert('No screws to export.');
        return;
    }
    // Prepare worksheet data
    const wsData = [
        ['Name', 'Torque', 'Speed'],
        ...screws.map(s => [s.name, s.torque, s.speed])
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Screws');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'screws.xlsx';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

/**
 * Update connection UI state (button text and style) and internal flag.
 *
 * @param {boolean} connected - True if connected to the serial device; otherwise false.
 * @returns {void}
 */
function updateConnectionState(connected) {
    connectionState = connected;
    connectionButton.className = connected ? 'btn btn-danger' : 'btn btn-success';
    connectionButton.innerHTML = connected
        ? '<i class="bi bi-plug-fill me-1" aria-hidden="true"></i>Disconnect'
        : '<i class="bi bi-plug me-1" aria-hidden="true"></i>Connect';
}


torqueSlider.addEventListener('input', () => {     
    setTorque(torqueSlider.value);
});

speedSlider.addEventListener('input', () => {
    setSpeed(speedSlider.value);
});

connectionButton.addEventListener('click', async () => {
    if (connectionState) {
        await disconnect();
    } else {
        await connect();
    }
});

// Keep screws summary in sync when values change via controls
const originalSetTorque = typeof setTorque === 'function' ? setTorque : null;
const originalSetSpeed = typeof setSpeed === 'function' ? setSpeed : null;

// Monkey-patch wrappers only if originals exist
if (originalSetTorque) {
    window.setTorque = function(value) {
        originalSetTorque(value);
        if (Array.isArray(screws) && currentScrewIndex >= 0 && currentScrewIndex < screws.length) {
            screws[currentScrewIndex].torque = Number(value);
            renderScrewList();
        }
    };
}

if (originalSetSpeed) {
    window.setSpeed = function(value) {
        originalSetSpeed(value);
        if (Array.isArray(screws) && currentScrewIndex >= 0 && currentScrewIndex < screws.length) {
            screws[currentScrewIndex].speed = Number(value);
            renderScrewList();
        }
    };
}
