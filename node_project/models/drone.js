import { calculateEnergyConsumption, logToFile } from '../utils/utils.js';

export class Drone {
    constructor(capacity, consumption, timeProgram, timeReal)
    {
        this._capacity = capacity;
        this._consumption = consumption;
        this.battery = capacity;
        this.timeProgram = timeProgram;
        this.timeReal = timeReal;
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

    consumeBattery(distance, weight) {
        const energyConsumed = calculateEnergyConsumption(distance, this._consumption, weight);
        this.battery - energyConsumed < 0 ? this.battery = 0 : this.battery -= energyConsumed;
    }

    hasEnoughBattery(distance, weight) {
        const energyNeeded = calculateEnergyConsumption(distance, this._consumption, weight);
        return this.battery >= energyNeeded;
    }

    recharge() {
        return new Promise((resolve) => {
            const missingBattery = this._capacity - this.battery;
            const rechargeTime = (missingBattery / this._capacity) * 20; 
            
            setTimeout(() => {
                this.battery = this._capacity;
                logToFile(`Drone ${this._capacity / 1000 + "kW, " + this._consumption + "W"} recharged in ${rechargeTime} minutes`);
                resolve(rechargeTime)
            }, rechargeTime / this.timeProgram * this.timeReal);
        });
    }
}