
let torqueValue = 0;
let speedValue = 0;
let connectionState = false;
let port = null;
let reader = null;
let writer = null;

/**
 * Set the current torque value and send it to the device over serial.
 *
 * @param {number|string} value - New torque value to apply. Strings will be coerced to number by the slider.
 * @returns {void}
 *
 * Side effects:
 * - Updates slider and on-screen value.
 * - Sends a command via serial if connected.
 */
function setTorque(value) {
    torqueSlider.value = value;
    torqueValue = value;
    torqueValueDisplay.textContent = value;
    // Send command string to set torque
    const cmd = `SET TORQUE ${value}\r\n`;
    sendSerialData(cmd);
}

/**
 * Set the current speed value and send it to the device over serial.
 *
 * @param {number|string} value - New speed value to apply. Strings will be coerced to number by the slider.
 * @returns {void}
 *
 * Side effects:
 * - Updates slider and on-screen value.
 * - Sends a command via serial if connected.
 */
function setSpeed(value) {
    speedSlider.value = value;
    speedValue = value;
    speedValueDisplay.textContent = value;
    // Send command string to set speed
    const cmd = `SET SPEED ${value}\r\n`;
    sendSerialData(cmd);
}   

/**
 * Request and open a serial port using the Web Serial API, then start reading.
 *
 * Requirements:
 * - Browser must support navigator.serial (Chrome/Edge/Opera).
 * - SETTINGS.serial provides port configuration.
 *
 * Side effects:
 * - Prompts user to select a serial port.
 * - Updates connection state and UI.
 * - Starts background read loop.
 *
 * @returns {Promise<void>}
 * @async
 */
async function connect() {
    try {
        // Check if Web Serial API is supported
        if (!('serial' in navigator)) {
            alert('Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.');
            return;
        }

        // Request a port and open the connection
        port = await navigator.serial.requestPort();
        
        // Open the port with common serial settings
        await port.open({ 
            baudRate: SETTINGS.serial.baudRate, 
            dataBits: SETTINGS.serial.dataBits,
            stopBits: SETTINGS.serial.stopBits,
            parity: SETTINGS.serial.parity
        });

        // Get the reader and writer
        reader = port.readable.getReader();
        writer = port.writable.getWriter();

        connectionState = true;
        updateConnectionState(true);
        
        // Start reading data from the serial port
        readSerialData();

        console.log('Connected to serial device');
    } catch (error) {
        console.error('Error connecting to serial device:', error);
        alert('Failed to connect to serial device: ' + error.message);
        connectionState = false;
        updateConnectionState(false);
    }
}

/**
 * Close the serial port and release reader/writer locks.
 *
 * Side effects:
 * - Cancels the read loop, releases resources, and updates UI state.
 *
 * @returns {Promise<void>}
 * @async
 */
async function disconnect() {
    try {
        if (reader) {
            await reader.cancel();
            reader.releaseLock();
            reader = null;
        }
        
        if (writer) {
            writer.releaseLock();
            writer = null;
        }
        
        if (port) {
            await port.close();
            port = null;
        }
        
        connectionState = false;
        updateConnectionState(false);
        console.log('Disconnected from serial device');
    } catch (error) {
        console.error('Error disconnecting:', error);
    }
}

/**
 * Continuously read incoming data from the serial device and dispatch to handler.
 *
 * Notes:
 * - Runs until reader is canceled or an error occurs.
 * - Decodes bytes as UTF-8 text.
 *
 * @returns {Promise<void>}
 * @async
 */
async function readSerialData() {
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                break;
            }
            
            // Convert the received data to text
            const text = new TextDecoder().decode(value);
            console.log('Received:', text);
            
            // Handle incoming data here
            handleSerialData(text);
        }
    } catch (error) {
        console.error('Error reading serial data:', error);
        connectionState = false;
        updateConnectionState(false);
    }
}

/**
 * Send a text command to the serial device.
 *
 * @param {string} data - The UTF-8 command string to send.
 * @returns {Promise<void>}
 * @async
 */
async function sendSerialData(data) {
    if (!writer) {
        console.error('Serial port not connected');
        return;
    }
    
    try {
        const encoder = new TextEncoder();
        await writer.write(encoder.encode(data));
        console.log('Sent:', data);
    } catch (error) {
        console.error('Error sending data:', error);
    }
}

/**
 * Process incoming serial data from the device.
 *
 * @param {string} data - Decoded textual data chunk received from the serial port.
 * @returns {void}
 */
function handleSerialData(data) {
    // Process incoming serial data
    // This function can be customized based on your protocol
    console.log('Processing data:', data);
}