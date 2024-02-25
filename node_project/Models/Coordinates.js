export class Coordinates {
    constructor(x, y) {
        this._x = x;
        this._y = y;
    }

    set x(value) {
        if (value < 0) throw new Error("Coordinates must have a positive value");
        this._x = value;
    }

    set y(value) {
        if (value < 0) throw new Error("Coordinates must have a positive value");
        this._y = value;
    }

    get x() {
        return this._x;
    }

    get y() {
        return this._y;
    }
}
