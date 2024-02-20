const fs = require('fs');
const Product = require('./Models/Product.js');
const Warehouse = require('./Models/Warehouse.js');
const Coordinates = require('./Models/Coordinates.js');
const Customer = require('./Models/Customer.js');
const Order = require('./Models/Order.js');

let obj = JSON.parse(fs.readFileSync('data.json'));

let products = [];
obj.products.forEach(product => {
    products.push(new Product(product, Infinity));
});

let warehouses = [];
obj.warehouses.forEach(warehouse => {
    const warehouseObj = new Warehouse(new Coordinates(warehouse.x, warehouse.y), warehouse.name);
    warehouses.push(warehouseObj);
});

let customers = [];
obj.customers.forEach(customer => {
    const customerObj = 
        new Customer(customer.id, customer.name, new Coordinates(customer.coordinates.x, customer.coordinates.y));
    customers.push(customerObj);
});

let orders = [];
obj.orders.forEach(order => {
    let productList = [];
    for (const productName in order.productList) {
        if (order.productList.hasOwnProperty(productName)) {
            const productQuantity = order.productList[productName];
            productList.push(new Product(productName, productQuantity));
        }
    }
    const orderObj = new Order(order.customerId, productList);
    orders.push(orderObj);
});

var mapSize = { x: 280, y: 280 };

function calculateDistWithBound(start, end) {
    const dx = Math.min(Math.abs(start.x - end.x), mapSize.x - Math.abs(start.x - end.x));
    const dy = Math.min(Math.abs(start.y - end.y), mapSize.y - Math.abs(start.y - end.y));
    
    return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
}

function findNearestWh(customer, warehouses) {
    let minDistance = Infinity;
    let nearestWh = undefined;
   
    warehouses.forEach(warehouse => {
        const distance = calculateDistWithBound(customer.coordinates, warehouse.coordinates);
        if (distance < minDistance) {
            minDistance = distance;
            nearestWh = warehouse;
        }
    });
    
    return nearestWh;
}

function calculateDeliveryTime(order, warehouses, customers) {
    const customer = customers.find(customer => customer.id === order.customerId);
    const nearestWh = findNearestWh(customer, warehouses);
    const distToWh = calculateDistWithBound(customer.coordinates, nearestWh.coordinates);
    
    return distToWh;
}

function calculateConcurrentDeliveries(order, orders, warehouses, customers) {
    let concurrentDeliveries = 0;
    const deliveryTimeToCustomer = calculateDeliveryTime(order, warehouses, customers);
    
    orders.forEach(otherOrder => {
        if (otherOrder.customerId !== order.customerId) {
            const deliveryTimeToOtherCustomer = calculateDeliveryTime(otherOrder, warehouses, customers);
            const totalDeliveryTime = Math.max(deliveryTimeToCustomer, deliveryTimeToOtherCustomer);
            
            if (totalDeliveryTime <= deliveryTimeToCustomer + deliveryTimeToOtherCustomer) concurrentDeliveries++;
        }
    });
    
    return concurrentDeliveries;
}

let maxDeliveryTime = 0;
let maxConcurrentDeliveries = 0;

orders.forEach(order => {
    const deliveryTime = calculateDeliveryTime(order, warehouses, customers);
    
    if (deliveryTime > maxDeliveryTime) maxDeliveryTime = deliveryTime;
    
    const concurrentDeliveries = calculateConcurrentDeliveries(order, orders, warehouses, customers);
    
    if (concurrentDeliveries > maxConcurrentDeliveries) maxConcurrentDeliveries = concurrentDeliveries;
});
    
console.log(`Total delivery time: ${maxDeliveryTime} minutes`);
console.log(`Number of drones needed: ${maxConcurrentDeliveries}`);