import { logToFile, clearLogFile, calculateDistance, convertToWatts } from './utils/utils.js';

export class CalculateDeliveries {
    constructor(config, ws) {
        this.config = config;
        this.ws = ws;
        this.drones = config.drones;
        this.orders = config.orders;
        this.customers = config.customers;
        this.warehouses = config.warehouses;
        this.orderStatuses = new Map(this.orders.map(order => [order, "To be delivered"]));
        this.initialOrderCount = this.orders.length;
        this.loadingTime = 5;
        this.usedDrones = new Set();
        this.processingDone = false;
    }

    deliverToCustomer(drone, order, location) {
        return new Promise((resolve) => {
            const messageStart = `Delivery init, drone ${drone.capacity / 1000}kW, ${drone.consumption}W; order ${order.customerId}`;

            //console.log(messageStart);
            logToFile(messageStart)
            this.orderStatuses.set(order, "Currently in delivery");

            const distances = this.warehouses.map((warehouse) => { return calculateDistance(warehouse.coordinates, location) });
            const deliveryTime = Math.min(...distances) + this.loadingTime;

            const messageEnd = `Order ${order.customerId} delivered in ${deliveryTime} minutes, drone ${drone.capacity / 1000}kW, ${drone.consumption}W`;
            setTimeout(() => {
                resolve({
                    time: deliveryTime,
                    message: messageEnd
                });
            }, deliveryTime / drone.timeProgram * drone.timeReal);
        });
    }

    returnToWarehouse(drone, order, location) {
        return new Promise((resolve) => {
            const distances = this.warehouses.map((warehouse) => { return calculateDistance(warehouse.coordinates, location) });
            const deliveryTime = Math.min(...distances);

            const messageEnd = `Drone ${drone.capacity / 1000}kW, ${drone.consumption}W has returned to warehouse in ${deliveryTime} minutes`;
            setTimeout(() => {
                resolve({
                    time: deliveryTime,
                    message: messageEnd
                });
            }, deliveryTime / drone.timeProgram * drone.timeReal);
        });
    }

    async handleDelivery(drone, order, location) {

        const distances = this.warehouses.map((warehouse) => { return calculateDistance(warehouse.coordinates, location) });
        const deliveryDistance = Math.min(...distances);

        if (drone.hasEnoughBattery(deliveryDistance * 2)) {
            const deliveryResult = await this.deliverToCustomer(drone, order, location);
            const returnResult = await this.returnToWarehouse(drone, order, location)

            drone.consumeBattery(deliveryResult.time + returnResult.time - this.loadingTime);

            const messageStart = deliveryResult.message;
            const messageEnd = returnResult.message + " | battery: " + drone.battery;

            //console.log(messageStart);
            //console.log(messageEnd);
            logToFile(messageStart);
            logToFile(messageEnd);
            this.orderStatuses.set(order, "Delivered");

            return deliveryResult.time + returnResult.time;
        } else {
            const rechargeResult = await drone.recharge();
            console.log(rechargeResult.message);
            logToFile(rechargeResult.message);

            const deliveryResult = await this.deliverToCustomer(drone, order, location);
            const returnResult = await this.returnToWarehouse(drone, order, location)

            drone.consumeBattery(deliveryResult.time + returnResult.time - this.loadingTime);

            const messageStart = deliveryResult.message;
            const messageEnd = returnResult.message + " | battery: " + drone.battery;

            console.log(messageStart);
            console.log(messageEnd);
            logToFile(messageStart);
            logToFile(messageEnd);
            // sendToClients(messageStart);
            // sendToClients(messageEnd);
            this.ws.send(messageStart);
            this.ws.send(messageEnd);

            return rechargeResult.time + deliveryResult.time + returnResult.time;
        }

    }

    async deliverAllOrders() {
        let deliveryTimesByDrone = new Array(this.drones.length).fill(0);

        const deliverOrder = async (drone) => {
            if (this.orders.length === 0) return;

            let customerLocation;
            let distances;
            let deliveryDistance;

            const order = this.orders.find(order => {
                customerLocation = this.customers.find(c => c.id === order.customerId).coordinates;
                distances = this.warehouses.map((warehouse) => { return calculateDistance(warehouse.coordinates, customerLocation) });
                deliveryDistance = Math.min(...distances);
                if (drone.hasEnoughBattery(deliveryDistance * 2) ||
                    drone.capacity > drone.consumption * deliveryDistance * 2) return order;
            });

            if (order === undefined) {
                drone.available = false;
                return;
            }
            else this.orders.splice(this.orders.indexOf(order), 1);

            drone.available = false;
            let totalOrderTime = await this.handleDelivery(drone, order, customerLocation);
            this.usedDrones.add(drone);

            deliveryTimesByDrone[this.drones.indexOf(drone)] += totalOrderTime;
            drone.available = true;
            await deliverOrder(this.drones.find(drone => drone.available));
        };

        await Promise.all(this.drones.map(drone => {
            if (drone.available) return deliverOrder(drone);
        }));

        const totalDeliveryTime = `Total delivery time: ${Math.max(...deliveryTimesByDrone)} minutes`;
        const totalDronesUsed = `Total drones used: ${this.usedDrones.size}`;
        const averageDeliveryTime = `Average delivery time: ${deliveryTimesByDrone.reduce((a, b) => a + b, 0) / this.initialOrderCount} minutes`;

        // console.log(totalDeliveryTime);
        // console.log(totalDronesUsed);
        // console.log(averageDeliveryTime);
        logToFile(totalDeliveryTime);
        logToFile(totalDronesUsed);
        logToFile(averageDeliveryTime);
        this.ws.send(totalDeliveryTime);
        this.ws.send(totalDronesUsed);
        this.ws.send(averageDeliveryTime);
        // sendToClients(totalDeliveryTime);
        // sendToClients(totalDronesUsed);
        // sendToClients(averageDeliveryTime);

        deliveryTimesByDrone = new Array(this.drones.length).fill(0);
    }

    async processOrders() {
        clearLogFile();

        await this.deliverAllOrders();
    }
}