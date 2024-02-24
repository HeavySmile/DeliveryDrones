const WebSocket = require('ws');

// Create a new WebSocket server on port 8080
const wss = new WebSocket.Server({ port: 8080 });

// Handle connections
wss.on('connection', function connection(ws) {
  console.log('A new client connected.');

  // Handle messages from clients
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);

    // Broadcast the message to all connected clients
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  // Send a welcome message to the newly connected client
  ws.send('Welcome to the WebSocket server!');
});

console.log('WebSocket server is running on ws://localhost:8080');