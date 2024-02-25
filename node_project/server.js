import http from "http";
import express from "express";
import fs from 'fs';
import { WebSocketServer, WebSocket } from "ws";

import { logToFile, clearLogFile, calculateDistance, convertToWatts } from './utils/utils.js';
import { config } from './config.js';

const port = 8080;
const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let data;
let orderStatuses;
let processingDone = false;

let orders = [];
let customers;
let warehouses;
let drones;
let loadingTime = 5;
let usedDrones = new Set();
let initialOrderCount;
let currentWs;

function deliverToCustomer(drone, order, location) {
  return new Promise((resolve) => {
    const messageStart = `Delivery init, drone ${drone.capacity / 1000}kW, ${drone.consumption}W; order ${order.customerId}`;

    //console.log(messageStart);
    logToFile(messageStart)
    orderStatuses.set(order, "Currently in delivery");

    const distances = warehouses.map((warehouse) => { return calculateDistance(warehouse.coordinates, location) });
    const deliveryTime = Math.min(...distances) + loadingTime;

    const messageEnd = `Order ${order.customerId} delivered in ${deliveryTime} minutes, drone ${drone.capacity / 1000}kW, ${drone.consumption}W`;
    setTimeout(() => {
      resolve({
        time: deliveryTime,
        message: messageEnd
      });
    }, deliveryTime / config.minutes.program * config.minutes.real);
  });
}

function returnToWarehouse(drone, order, location) {
  return new Promise((resolve) => {
    const distances = warehouses.map((warehouse) => { return calculateDistance(warehouse.coordinates, location) });
    const deliveryTime = Math.min(...distances);

    const messageEnd = `Drone ${drone.capacity / 1000}kW, ${drone.consumption}W has returned to warehouse in ${deliveryTime} minutes`;
    setTimeout(() => {
      resolve({
        time: deliveryTime,
        message: messageEnd
      });
    }, deliveryTime / config.minutes.program * config.minutes.real);
  });
}

async function handleDelivery(drone, order, location) {
  try {
    const distances = warehouses.map((warehouse) => { return calculateDistance(warehouse.coordinates, location) });
    const deliveryDistance = Math.min(...distances);

    if (drone.hasEnoughBattery(deliveryDistance * 2)) {
      const deliveryResult = await deliverToCustomer(drone, order, location);
      const returnResult = await returnToWarehouse(drone, order, location)

      drone.consumeBattery(deliveryResult.time + returnResult.time - loadingTime);

      const messageStart = deliveryResult.message;
      const messageEnd = returnResult.message + " | battery: " + drone.battery;

      //console.log(messageStart);
      //console.log(messageEnd);
      logToFile(messageStart);
      logToFile(messageEnd);
      orderStatuses.set(order, "Delivered");

      return deliveryResult.time + returnResult.time;
    } else {
      const rechargeResult = await drone.recharge();
      console.log(rechargeResult.message);
      logToFile(rechargeResult.message);

      const deliveryResult = await deliverToCustomer(drone, order, location);
      const returnResult = await returnToWarehouse(drone, order, location)

      drone.consumeBattery(deliveryResult.time + returnResult.time - loadingTime);

      const messageStart = deliveryResult.message;
      const messageEnd = returnResult.message + " | battery: " + drone.battery;

      console.log(messageStart);
      console.log(messageEnd);
      logToFile(messageStart);
      logToFile(messageEnd);
      // sendToClients(messageStart);
      // sendToClients(messageEnd);
      ws.send(messageStart);
      ws.send(messageEnd);

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
      distances = warehouses.map((warehouse) => { return calculateDistance(warehouse.coordinates, customerLocation) });
      deliveryDistance = Math.min(...distances);
      if (drone.hasEnoughBattery(deliveryDistance * 2) ||
        drone.capacity > drone.consumption * deliveryDistance * 2) return order;
    });

    if (order === undefined) {
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

  const totalDeliveryTime = `Total delivery time: ${Math.max(...deliveryTimesByDrone)} minutes`;
  const totalDronesUsed = `Total drones used: ${usedDrones.size}`;
  const averageDeliveryTime = `Average delivery time: ${deliveryTimesByDrone.reduce((a, b) => a + b, 0) / initialOrderCount} minutes`;

  // console.log(totalDeliveryTime);
  // console.log(totalDronesUsed);
  // console.log(averageDeliveryTime);
  logToFile(totalDeliveryTime);
  logToFile(totalDronesUsed);
  logToFile(averageDeliveryTime);
  currentWs.send(totalDeliveryTime);
  currentWs.send(totalDronesUsed);
  currentWs.send(averageDeliveryTime);
  // sendToClients(totalDeliveryTime);
  // sendToClients(totalDronesUsed);
  // sendToClients(averageDeliveryTime);

  deliveryTimesByDrone = new Array(drones.length).fill(0);
}

async function main() {
  try {
    data = new config(fs.readFileSync('data.json', 'utf-8'));
    //   config.poweredOn = data.output.poweredOn;
    //   config.minutes.program = data.output.minutes.program;
    //   config.minutes.real = data.output.minutes.real;
    //   config.deliveryStatus = data.deliveryStatus.output;
    //   config.frequency = data.deliveryStatus.frequency;

    //   orders = data.orders.map((order) => {
    //     return new Order(order.customerId, Object.entries(order.productList).map(([productName, quantity]) => {
    //       return new Product(productName, quantity);
    //     }));
    //   });

    //   initialOrderCount = orders.length;
    //   orderStatuses = new Map(orders.map(order => [order, "To be delivered"]));

    //   customers = data.customers.map((customer) => {
    //     return new Customer(customer.id, customer.name, new Coordinates(customer.coordinates.x, customer.coordinates.y));
    //   });
    //   warehouses = data.warehouses.map((warehouse) => {
    //     return new Warehouse(new Coordinates(warehouse.x, warehouse.y), warehouse.name);
    //   });
    //   drones = data.typesOfDrones.map((drone) => {
    //     return new Drone(convertToWatts(drone.capacity), drone.consumption.replace('W', ''));
    //   });
  }
  catch (error) {
    const log = fs.readFileSync('log.txt', 'utf-8');

    console.log(error);
    //sendToClients(log);
    //return log;
  }

  clearLogFile();
  usedDrones.clear();

  config.poweredOn ? await deliverAllOrders() : console.log("Drones are powered off");
}

async function processOrders() {
  main();
  processingDone = true;
  resolve();
}

wss.on("connection", (ws) => {
  console.log("Client connected!");
  currentWs = ws;

  ws.on("message", (message) => {
    data = JSON.parse(message);

    // const sendStatuses = setInterval(() => {
    //   ws.send("\n");
    //   orderStatuses.forEach((status, order) => ws.send('Order ' + order.customerId + ' status: ' + status));
    // }, config.frequency / config.minutes.program * config.minutes.real);

    processOrders();
  });

  ws.on('close', function () {
    console.log('Client disconnected');
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});