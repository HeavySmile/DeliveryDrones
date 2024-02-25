import { Product } from './product.js';

export class Order {
    constructor(customerId, productList) {
        this.customerId = customerId;
        this._productList = productList;
    }

    set productList(value) {
        if (!Array.isArray(value)) throw new Error("Second argument must be an array");
        if (value.filter(x => typeof(x) !== Product) !== undefined) throw new Error("Second argument array must have only Product type elements");
        this._productList = value;
    }

    get productList() {
        return this._productList;
    }
}