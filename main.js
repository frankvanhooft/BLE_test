// Canonical lowercase string formatting matching your Zephyr layout definitions
const SERVICE_UUID    = '00000100-a67b-704c-256b-0d9d578dbb6f';
const VOLTAGE_CHAR_UUID = '00000101-a67b-704c-256b-0d9d578dbb6f';
const CURRENT_CHAR_UUID = '00000102-a67b-704c-256b-0d9d578dbb6f';
const TEMP_CHAR_UUID    = '00000103-a67b-704c-256b-0d9d578dbb6f';

// State references
let bleDevice = null;
let gattServer = null;
let telemetryService = null;

// DOM Access Elements
const connectBtn = document.getElementById('connectBtn');
const refreshBtn = document.getElementById('refreshBtn');
const statusStr = document.getElementById('statusStr');

const voltValueEl = document.getElementById('voltValue');
const currValueEl = document.getElementById('currValue');
const tempValueEl = document.getElementById('tempValue');

// Attach Actions
connectBtn.addEventListener('click', handleConnectDisconnect);
refreshBtn.addEventListener('click', readAllTelemetry);

async function handleConnectDisconnect() {
    if (bleDevice && bleDevice.gatt.connected) {
        // Handle explicit manual disconnection
        console.log('Disconnecting from device...');
        bleDevice.gatt.disconnect();
        return;
    }

    try {
        statusStr.textContent = "Status: Scanning...";
        
        // Request connection context filter
        bleDevice = await navigator.bluetooth.requestDevice({
			filters: [{ namePrefix: 'Ace' }],
			optionalServices: [SERVICE_UUID]
		});

        // Track hardware forced physical drop disconnection events
        bleDevice.addEventListener('gattserverdisconnected', onDisconnected);

        statusStr.textContent = "Status: Connecting...";
        gattServer = await bleDevice.gatt.connect();

        statusStr.textContent = "Status: Fetching Service...";
        telemetryService = await gattServer.getPrimaryService(SERVICE_UUID);

        // UI State Transitions
        statusStr.textContent = "Status: Connected";
        statusStr.className = "status-connected";
        connectBtn.textContent = "Disconnect";
        refreshBtn.disabled = false;

        // Perform foundational initial fetch
        await readAllTelemetry();

    } catch (error) {
        console.error('BLE Setup Connection Failed:', error);
        statusStr.textContent = "Status: Connection Failed";
        statusStr.className = "status-disconnected";
        resetUiState();
    }
}

async function readAllTelemetry() {
    if (!telemetryService) return;

    try {
        statusStr.textContent = "Status: Updating metrics...";
        
        // 1. Process Voltage
        const voltChar = await telemetryService.getCharacteristic(VOLTAGE_CHAR_UUID);
        const voltRaw = await voltChar.readValue();
        voltValueEl.textContent = parseBufferToFloat32(voltRaw).toFixed(2);

        // 2. Process Current
        const currChar = await telemetryService.getCharacteristic(CURRENT_CHAR_UUID);
        const currRaw = await currChar.readValue();
        currValueEl.textContent = parseBufferToFloat32(currRaw).toFixed(2);

        // 3. Process Temperature
        const tempChar = await telemetryService.getCharacteristic(TEMP_CHAR_UUID);
        const tempRaw = await tempChar.readValue();
        tempValueEl.textContent = parseBufferToFloat32(tempRaw).toFixed(1);

        statusStr.textContent = "Status: Connected";
    } catch (error) {
        console.error('Failed to update telemetry attributes:', error);
        statusStr.textContent = "Status: Error Reading Characteristics";
    }
}

// Float Decoding Helper Utilities
function parseBufferToFloat32(dataView) {
    // Read 4 raw binary bytes starting at offset position 0 as a Little-Endian float
    return dataView.getFloat32(0, true);
}

function onDisconnected() {
    console.log('BLE Device disconnected safely.');
    statusStr.textContent = "Status: Disconnected";
    statusStr.className = "status-disconnected";
    resetUiState();
}

function resetUiState() {
    connectBtn.textContent = "Connect Device";
    refreshBtn.disabled = true;
    voltValueEl.textContent = "--.--";
    currValueEl.textContent = "--.--";
    tempValueEl.textContent = "--.--";
    bleDevice = null;
    gattServer = null;
    telemetryService = null;
}
