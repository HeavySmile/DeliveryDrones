import { logToFile, clearLogFile, calculateDistance } from './utils/utils.js';

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
        this.deliveryTimesByDrone = new Array(this.drones.length).fill(0);
        this.deliveryTimes = [];
    }

    sendStatusesToClient() {
        this.ws.send("");
        this.orderStatuses.forEach((status, order) => {
            this.ws.send(`Order ${order.customerId} status: ${status}`);
        });
    }

    deliverToCustomer(drone, order, location) {
        return new Promise((resolve) => {
            const messageStart = `Delivery init, drone ${drone.capacity / 1000}kW, ${drone.consumption}W; order ${order.customerId}`;

            logToFile(messageStart)
            this.orderStatuses.set(order, "Currently in delivery");

            const distances = this.warehouses.map((warehouse) => { return calculateDistance(warehouse.coordinates, location) });
            const deliveryTime = Math.min(...distances) + this.loadingTime;

            const messageEnd = `Order ${order.customerId} delivered in ${deliveryTime} minutes, drone ${drone.capacity / 1000}kW, ${drone.consumption}W`;
            setTimeout(() => {
                logToFile(messageEnd);
                resolve(deliveryTime);
            }, deliveryTime / drone.timeProgram * drone.timeReal);
        });
    }

    returnToWarehouse(drone, location) {
        return new Promise((resolve) => {
            const distances = this.warehouses.map((warehouse) => { return calculateDistance(warehouse.coordinates, location) });
            const deliveryTime = Math.min(...distances);

            const messageEnd = `Drone ${drone.capacity / 1000}kW, ${drone.consumption}W has returned to warehouse in ${deliveryTime} minutes`;
            setTimeout(() => {
                logToFile(messageEnd);
                resolve(deliveryTime);
            }, deliveryTime / drone.timeProgram * drone.timeReal);
        });
    }

    async handleDelivery(drone, order, location) {
        const distances = this.warehouses.map((warehouse) => { return calculateDistance(warehouse.coordinates, location) });
        const deliveryDistance = Math.min(...distances);
        const rechargeTime = 0;

        if (!drone.hasEnoughBattery(deliveryDistance * 2)) rechargeTime = await drone.recharge();

        const deliveryTime = await this.deliverToCustomer(drone, order, location);
        const returnTime = await this.returnToWarehouse(drone, location)

        drone.consumeBattery(deliveryTime + returnTime - this.loadingTime);

        this.orderStatuses.set(order, "Delivered");

        return deliveryTime + returnTime + rechargeTime;
    }

    isDroneEligibleForOrder(drone, order) {
        let customerLocation = this.customers.find(c => c.id === order.customerId).coordinates;
        let distances = this.warehouses.map((warehouse) => { return calculateDistance(warehouse.coordinates, customerLocation) });
        let deliveryDistance = Math.min(...distances);
        return drone.capacity > drone.consumption * deliveryDistance * 2;
    }

    async deliverOrder(drone) {
        if (this.orders.length === 0) return;

        const order = this.orders.find(order => this.isDroneEligibleForOrder(drone, order));

        if (order === undefined) return;

        else this.orders.splice(this.orders.indexOf(order), 1);

        let customerLocation = this.customers.find(c => c.id === order.customerId).coordinates;
        let totalOrderTime = await this.handleDelivery(drone, order, customerLocation);
        this.usedDrones.add(drone);

        this.deliveryTimesByDrone[this.drones.indexOf(drone)] += totalOrderTime;
        this.deliveryTimes.push(totalOrderTime);
        // why not?
        await this.deliverOrder(drone);
    };

    async deliverAllOrders() {
        await Promise.all(this.drones.map(drone => {
            return this.deliverOrder(drone);
        }));

        const totalDeliveryTime = `Total delivery time: ${Math.max(...this.deliveryTimesByDrone)} minutes`;
        const totalDronesUsed = `Total drones used: ${this.usedDrones.size}`;
        const averageDeliveryTime = `Average delivery time: ${Math.min(...this.deliveryTimes)} minutes`;

        logToFile(totalDeliveryTime);
        logToFile(totalDronesUsed);
        logToFile(averageDeliveryTime);
        this.ws.send(
                    "---------------------------------------------------------\n" + 
                    totalDeliveryTime + "\n" +
                    totalDronesUsed + "\n" +
                    averageDeliveryTime + "\n" +
                    "---------------------------------------------------------");
    }

    async processOrders(statusInterval) {
        clearLogFile();

        await this.deliverAllOrders();

        clearInterval(statusInterval);
    }
}