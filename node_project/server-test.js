import WebSocket from 'ws';
import fetch from 'node-fetch';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import FileReader from 'filereader';

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', function open() {
  console.log('Connected to the server');
  fs.readFile('data.json', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }

    // Parse the JSON data from the file
    const jsonData = JSON.parse(data);

    // Send the JSON data to the server
    ws.send(JSON.stringify(jsonData));
  });
});

ws.on('message', function message(data) {
  console.log(data.toString());
});

ws.on('close', function close() {
  console.log('Disconnected from the server');
});

ws.on('error', function error(err) {
  console.error(`WebSocket error: ${err}`);
});