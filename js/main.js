// Settings embedded directly (to avoid CORS issues with file:// protocol)
const SETTINGS = {
    //torque settings
    "torque": 40,
    "torqueMin": 0,
    "torqueMax": 100,
    "torqueButtons": [10, 20, 30, 90, 100],
    //speeed settings
    "speed": 50,
    "speedMin": 0,
    "speedMax": 100,
    "speedButtons": [10, 20, 30, 90, 100],
    //serial settings
    "serial": {
        "baudRate": 9600,
        "dataBits": 8,
        "stopBits": 1,
        "parity": 'none'
    }




};

/**
 * Initialize the UI and application logic.
 *
 * Contract:
 * - Sets up UI controls based on SETTINGS via setupControls().
 * - Logs a ready message when the document is loaded.
 *
 * Side effects:
 * - Mutates DOM elements and registers handlers through setupControls().
 *
 * @returns {Promise<void>} Resolves when initialization completes.
 * @async
 */
async function main() {
    setupControls();
    // Initialize screw management UI and data
    if (typeof initScrewManagement === 'function') {
        initScrewManagement();
    }
    console.log("Document loaded");
}

main();