const Coordinates = require('./Coordinates.js');

class Customer {
    constructor(id, name, coordinates) {
        this.id = id;
        this.name = name;
        this._coordinates = coordinates;
    }

    set coordinates(value) {
        if (!(value instanceof Coordinates)) throw new Error("Wrong third argument type");
        this._coordinates = value;
    }
    get coordinates() {
        return this._coordinates;
    }
}

module.exports = Customer;