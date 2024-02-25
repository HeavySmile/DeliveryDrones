import WebSocket from 'ws';
import fs from 'fs';

const ws = new WebSocket('ws://localhost:8080');
const jsonFilePath = 'data.json';
let sendInterval;

function sendToServer(ws) {
  fs.readFile(jsonFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    const jsonData = JSON.parse(data);

    ws.send(JSON.stringify(jsonData));
  });
}

ws.on('open', function open() {
  console.log('Connected to the server');
  
  sendToServer(ws);
  sendInterval = setInterval(() => {
    sendToServer(ws);
  }, 60000);
});

ws.on('message', function message(data) {
  console.log(data.toString());
});

ws.on('close', function close() {
  console.log('Disconnected from the server');
  clearInterval(sendInterval);
});

ws.on('error', function error(err) {
  console.error(`WebSocket error: ${err}`);
});