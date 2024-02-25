import fs from 'fs/promises';

const logFilePath = './logs/log.txt';

export function clearLogFile() {
    fs.writeFile(logFilePath, '');
}

export function logToFile(message) {
    const timestamp = new Date().toDateString();
    const logMessage = `${timestamp} - ${message}\n`;
    
    fs.appendFile(logFilePath, logMessage)
}

export function calculateDistance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

export function convertToWatts(capacity) {
    if (capacity.endsWith('kW')) return parseFloat(capacity) * 1000;
    return parseFloat(capacity);
}

export function calculateEnergyConsumption(distance, consumptionRate, weight) {
    const weightInKg = Math.round(weight / 1000);
    return distance * consumptionRate * (weightInKg <= 1 ? 1 : weightInKg);
}