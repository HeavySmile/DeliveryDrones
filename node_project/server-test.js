const WebSocket = require('ws');

var ws = new WebSocket('ws://localhost:8080');
ws.onmessage = function (event) {
  console.log('Message from server:', event.data);
};
ws.onopen = function (event) {
  ws.send('Hello, server!');
};