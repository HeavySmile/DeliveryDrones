class Product {
    constructor(name, quantity = Infinity) {
        this._name = name;
        this._quantity = quantity;
    }

    set quantity(value)
    {
        if (value < 0) throw new Error("Quantity must be a positive number");
        this._quantity = value;
    }

    set name(value)
    {
        if (typeof(value) !== 'string') throw new Error("Name must be a string");
        this._name = value;
    }

    get quantity()
    {
        return this._quantity;
    }
    
    get name()
    {
        return this._name;
    }
}

module.exports = Product;