const WebSocket = require('ws');
const JWT = require('jsonwebtoken');
const config = require('./config');

const wss = new WebSocket.Server({ port: config.WS_PORT, maxPayload: 1000000 });

const AUTHENTICATED_CLIENTS = new Map();

const sendMessage = (client, type, payload) => {
  client.send(JSON.stringify({ type, payload }));
};

const broadcastToAll = (type, payload) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) sendMessage(client, type, payload);
  });
};

const broadcastToUser = (user, type, payload) => {
  if (AUTHENTICATED_CLIENTS.has(user)) {
    const clients = AUTHENTICATED_CLIENTS.get(user);

    if (clients.size > 0) {
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) sendMessage(client, type, payload);
      });
    }
  }
};

function toEvent(message) {
  try {
    const { type, payload } = JSON.parse(message);
    this.emit(type, payload || message);
  } catch (ignore) {
    this.emit(undefined, message);
  }
}

function noop() { }

function heartbeat() {
  this.isAlive = true;
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.authenticated = false;
  ws.connection_time = Date.now();

  ws.on('pong', heartbeat);

  ws.on('message', toEvent);

  ws.on('authenticate', (data) => {
    const { token } = data;

    if (token) {
      try {
        const decoded = JWT.verify(token, config.JWT_SECRET);

        ws.username = decoded.sub;
        ws.authenticated = true;

        if (AUTHENTICATED_CLIENTS.has(ws.username)) {
          const clients = AUTHENTICATED_CLIENTS.get(ws.username);
          clients.add(ws);

          AUTHENTICATED_CLIENTS.set(ws.username, clients);
        } else {
          const clients = new Set();
          clients.add(ws);

          AUTHENTICATED_CLIENTS.set(ws.username, clients);
        }

        sendMessage(ws, 'status', { authenticated: true });
      } catch (e) {
        ws.authenticated = false;
        sendMessage(ws, 'status', { authenticated: false });
      }
    } else {
      sendMessage(ws, 'status', { authenticated: false });
    }
  });
});

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      if (ws.username) {
        const clients = AUTHENTICATED_CLIENTS.get(ws.username);

        if (clients) {
          clients.delete(ws);
        }

        if (clients.size === 0) {
          AUTHENTICATED_CLIENTS.delete(ws.username);
        }
      }

      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);

wss.on('error', (err) => {
  console.error(err.message);
});

wss.on('listening', () => {
  console.log(`WebSocket server is running on Port: ${wss.address().port}`);
});

wss.on('close', () => {
  clearInterval(interval);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught error', err);
  process.exit(1);
});

module.exports = {
  broadcastToAll,
  broadcastToUser,
};
