import { calculateEnergyConsumption } from '../utils/utils.js';
import { config } from '../config.js';

// const { calculateEnergyConsumption } = require('../utils.js');
// const { config } = require('../config.js');

export class Drone {
    constructor(capacity, consumption, battery = capacity, available = true)
    {
        this._capacity = capacity;
        this._consumption = consumption;
        this._available = available;
        this._battery = battery;
    }

    set battery(value)
    {
        this._battery = value;
    }

    get battery()
    {
        return this._battery;
    }

    set capacity(value)
    {
        if (value < 0) throw new Error("Capacity must be a positive number");
        this._capacity = value;
    }

    set consumption(value)
    {
        if (value < 0) throw new Error("Consumption must be a positive number");
        this._consumption = value;
    }

    get capacity()
    {
        return this._capacity;
    }

    get consumption()
    {
        return this._consumption;
    }

    get available()
    {
        return this._available;
    }

    set available(value)
    {
        if (typeof(value) !== 'boolean') throw new Error("Available must be a boolean");
        this._available = value;
    }

    consumeBattery(distance) {
        const energyConsumed = calculateEnergyConsumption(distance, this._consumption);
        this._battery - energyConsumed < 0 ? this._battery = 0 : this._battery -= energyConsumed;
    }

    hasEnoughBattery(distance) {
        const energyNeeded = calculateEnergyConsumption(distance, this._consumption);
        return this._battery >= energyNeeded;
    }

    recharge() {
        return new Promise((resolve) => {
            const missingBattery = this._capacity - this._battery;
            const rechargeTime = (missingBattery / this._capacity) * 20; 
            
            setTimeout(() => {
                this._battery = this._capacity;
                resolve({
                    time: rechargeTime,
                    message: `Drone ${this._capacity / 1000 + "kW, " + this._consumption + "W"} recharged in ${rechargeTime} minutes`
                })
            }, rechargeTime / config.minutes.program * config.minutes.real);
        });
    }
}

//module.exports = Drone;