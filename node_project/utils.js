const fs = require('fs').promises; // Notice the .promises here

const logFilePath = 'log.txt';

function clearLogFile() {
    fs.writeFile(logFilePath, '');
}

function logToFile(message) {
    const timestamp = new Date().toDateString();
    const logMessage = `${timestamp} - ${message}\n`;
    
    fs.appendFile(logFilePath, logMessage)
}

function calculateDistance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function convertToWatts(capacity) {
    if (capacity.endsWith('kW')) return parseFloat(capacity) * 1000;
    return parseFloat(capacity);
}

function calculateEnergyConsumption(distance, consumptionRate) {
    return distance * consumptionRate;
}

module.exports = {
    calculateDistance,
    convertToWatts,
    calculateEnergyConsumption,
    logToFile,
    clearLogFile
};