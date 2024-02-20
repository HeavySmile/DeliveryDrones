class Product {
    constructor(name, quantity) {
        this.name = name;
        this._quantity = quantity;
    }

    set quantity(value)
    {
        if (value < 0) throw new Error("Quantity must be a positive number");
        this._quantity = value;
    }
}

module.exports = Product;