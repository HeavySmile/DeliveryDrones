import { Order } from './Models/Order.js';
import { Coordinates } from './Models/Coordinates.js';
import { Customer } from './Models/Customer.js';
import { Warehouse } from './Models/Warehouse.js';
import { Product } from './Models/Product.js';
import { Drone } from './Models/Drone.js';
import { convertToWatts } from './utils/utils.js';

export class Config {
    constructor(json) {
        this.json = JSON.parse(json);
        this.output = this.json.output ?? { poweredOn: true, minutes: { program: 1, real: 1 } };
        this.deliveryStatus = json.deliveryStatus ?? { output: true , frequency: 1 };
        this.orders = this.json.orders.map((order) => {
            return new Order(order.customerId, Object.entries(order.productList).map(([productName, quantity]) => {
                return new Product(productName, quantity);
            }));
        });
        this.customers = this.json.customers.map((customer) => {
            return new Customer(customer.id, customer.name, new Coordinates(customer.coordinates.x, customer.coordinates.y));
        });
        this.warehouses = this.json.warehouses.map((warehouse) => {
            return new Warehouse(new Coordinates(warehouse.x, warehouse.y), warehouse.name);
        });
        this.drones = this.json.typesOfDrones.map((drone) => {
            return new Drone(
                convertToWatts(drone.capacity), 
                drone.consumption.replace('W', ''), 
                this.output.poweredOn ? this.output.minutes.program : 1,
                this.output.poweredOn ? this.output.minutes.real : 1
            );
        });
    }
}