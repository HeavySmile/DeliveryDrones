import { Coordinates } from './Coordinates.js';

//var Coordinates = require('./Coordinates.js')

export class Warehouse {
    constructor(coordinates, name) {
        this._coordinates = coordinates;
        this.name = name;
    }

    set coordinates(value) {
        if (!(value instanceof Coordinates)) throw new Error("Wrong first argument type");
        this._coordinates = value;
    }

    get coordinates() {
        return this._coordinates;
    }
}

//emodule.exports = Warehouse;