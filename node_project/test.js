const fs = require('fs');
const Order = require('./Models/Order.js');
const Coordinates = require('./Models/Coordinates.js');
const Customer = require('./Models/Customer.js');
const Warehouse = require('./Models/Warehouse.js');
const Product = require('./Models/Product.js');
const Drone = require('./Models/Drone.js');
const { logToFile, clearLogFile, calculateDistance, convertToWatts } = require('./utils.js');
const { config } = require('./config.js');

let orders;
let customers;
let warehouses;
let drones;
let loadingTime = 5;
let usedDrones = new Set();
let initialOrderCount;

function deliverToCustomer(drone, order, location) {
    return new Promise((resolve) => {
        console.log(`Delivery init, drone ${drone.capacity / 1000}kW, ${drone.consumption}W; order ${order.customerId}`);
        logToFile(`Delivery init, drone ${drone.capacity / 1000}kW, ${drone.consumption}W; order ${order.customerId}`)

        const distances = warehouses.map((warehouse) => {return calculateDistance(warehouse.coordinates, location)});
        const deliveryTime = Math.min(...distances) + loadingTime; 
        
        setTimeout(() => {
            resolve({
                time: deliveryTime,
                message: `Order ${order.customerId} delivered in ${deliveryTime} minutes, drone ${drone.capacity / 1000}kW, ${drone.consumption}W`
            });
            
        }, deliveryTime / config.minutes.program * config.minutes.real);
    });
}

function returnToWarehouse(drone, order, location) {
    return new Promise((resolve) => {
        const distances = warehouses.map((warehouse) => {return calculateDistance(warehouse.coordinates, location)});
        const deliveryTime = Math.min(...distances); 
        
        setTimeout(() => {
            resolve({
                time: deliveryTime,
                message: `Drone ${drone.capacity / 1000}kW, ${drone.consumption}W has returned to warehouse in ${deliveryTime} minutes`
            });
        }, deliveryTime / config.minutes.program * config.minutes.real);
    });
}

async function handleDelivery(drone, order, location) {
    try {
        const distances = warehouses.map((warehouse) => {return calculateDistance(warehouse.coordinates, location)});
        const deliveryDistance = Math.min(...distances);
        
        if (drone.hasEnoughBattery(deliveryDistance * 2)) {
            const deliveryResult = await deliverToCustomer(drone, order, location);
            const returnResult = await returnToWarehouse(drone, order, location)
            
            drone.consumeBattery(deliveryResult.time + returnResult.time - loadingTime);

            console.log(deliveryResult.message);
            console.log(returnResult.message + " | " + drone.battery);
            logToFile(deliveryResult.message);
            logToFile(returnResult.message + " | " + drone.battery);
            
            return deliveryResult.time + returnResult.time;
        } else {
            const rechargeResult = await drone.recharge();
            console.log(rechargeResult.message);
            logToFile(rechargeResult.message);

            const deliveryResult = await deliverToCustomer(drone, order, location);
            const returnResult = await returnToWarehouse(drone, order, location)
            
            drone.consumeBattery(deliveryResult.time + returnResult.time - loadingTime);
            console.log(deliveryResult.message);
            console.log(returnResult.message + " | " + drone.battery);
            logToFile(deliveryResult.message);
            logToFile(returnResult.message + " | " + drone.battery);

            return rechargeResult.time + deliveryResult.time + returnResult.time;
        }
    } catch (errorMessage) {
        throw new Error(errorMessage);
    }
}

async function deliverAllOrders() {
    let deliveryTimesByDrone = new Array(drones.length).fill(0);

    const deliverOrder = async (drone) => {
        if (orders.length === 0) return;
        
        let customerLocation;
        let distances;
        let deliveryDistance;

        const order = orders.find(order => {
            customerLocation = customers.find(c => c.id === order.customerId).coordinates;
            distances = warehouses.map((warehouse) => {return calculateDistance(warehouse.coordinates, customerLocation)});
            deliveryDistance = Math.min(...distances);
            if (drone.hasEnoughBattery(deliveryDistance * 2) || 
                drone.capacity > drone.consumption * deliveryDistance * 2) return order;
        });
        
        if (order === undefined) 
        {
            drone.available = false;
            return;
        }
        else orders.splice(orders.indexOf(order), 1);

        drone.available = false; 
        let totalOrderTime = await handleDelivery(drone, order, customerLocation);
        usedDrones.add(drone);

        deliveryTimesByDrone[drones.indexOf(drone)] += totalOrderTime;
        drone.available = true;
        await deliverOrder(drones.find(drone => drone.available));
    };

    await Promise.all(drones.map(drone => {
        if (drone.available) return deliverOrder(drone);
    }));

    console.log(`Total delivery time: ${Math.max(...deliveryTimesByDrone)} minutes`);
    console.log(`Total drones used: ${usedDrones.size}`);
    console.log(`Average delivery time: ${deliveryTimesByDrone.reduce((a, b) => a + b, 0) / initialOrderCount} minutes`);
    logToFile(`Total delivery time: ${Math.max(...deliveryTimesByDrone)} minutes`);
    logToFile(`Total drones used: ${usedDrones.size}`);
    logToFile(`Average delivery time: ${deliveryTimesByDrone.reduce((a, b) => a + b, 0) / initialOrderCount} minutes`);

    deliveryTimesByDrone = new Array(drones.length).fill(0);
}


function main() {
    const json = fs.readFileSync('data.json', 'utf8');
    let data;


    try {
        data = JSON.parse(json);
    } catch (error) {
        console.log(fs.readFileSync('log.txt', 'utf-8'));
        return;
    }

    config.poweredOn = data.output.poweredOn;
    config.minutes.program = data.output.minutes.program;
    config.minutes.real = data.output.minutes.real;

    orders = data.orders.map((order) => {
        return new Order(order.customerId, Object.entries(order.productList).map(([productName, quantity]) => {
            return new Product(productName, quantity);
        }));
    });
    initialOrderCount = orders.length;
    customers = data.customers.map((customer) => {
        return new Customer(customer.id, customer.name, new Coordinates(customer.coordinates.x, customer.coordinates.y));
    });
    warehouses = data.warehouses.map((warehouse) => {
        return new Warehouse(new Coordinates(warehouse.x, warehouse.y), warehouse.name);
    });
    drones = data.typesOfDrones.map((drone) => {
        return new Drone(convertToWatts(drone.capacity), drone.consumption.replace('W', ''));
    });

    clearLogFile();
    config.poweredOn ? deliverAllOrders() : console.log("Drones are powered off");

    usedDrones.clear();
}

main();
// Run main function every 60000 milliseconds (1 minute)
setInterval(main, 60000);



