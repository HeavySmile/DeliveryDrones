import http from "http";
import express from "express";
import fs from 'fs';
import { WebSocketServer } from "ws";
import { CalculateDeliveries } from './calculation.js';
import { Config } from './config.js';

const port = 8080;
const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let data;
let processingDone = false;

let currentWs;

async function processOrders() {
  main();
  processingDone = true;
  resolve();
}

wss.on("connection", (ws) => {
  console.log("Client connected!");
  currentWs = ws;

  ws.on("message", (message) => {
    try {
      data = new Config(message);
    }
    catch (error) {
      const log = fs.readFileSync('log.txt', 'utf-8');
      console.log(log);
      console.log(error);
      //sendToClients(log);
      //return log;
    }

    //const cf = new Config(fs.readFileSync('data.json', 'utf-8'))

    const calc = new CalculateDeliveries(data, ws);
    calc.processOrders();
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