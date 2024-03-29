import http from "http";
import express from "express";
import fs from 'fs';
import { WebSocketServer } from "ws";
import { CalculateDeliveries } from './app/calculation.js';
import { Config } from './config.js';

const port = 8080;
const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("Client connected!");

  ws.on("message", async (message) => {
    let data;
    try {
      data = new Config(message);
    }
    catch (error) {
      // If data is corrupted or missing, send logs from the last calculation
      const log = fs.readFileSync('log.txt', 'utf-8');
      ws.send(log);
      console.log(log);
      console.log(error);
    }
    
    const calc = new CalculateDeliveries(data, ws);
    
    // Statuses are sent periodically to the client
    let statusInterval;
    if (data.deliveryStatus.output)
    {
      statusInterval = setInterval(() => {
        calc.sendStatusesToClient();
      }, data.deliveryStatus.frequency / data.output.minutes.program * data.output.minutes.real * 100);
    }
    
    await calc.processOrders();
    clearInterval(statusInterval);
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