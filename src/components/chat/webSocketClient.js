import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

let client = null;
let connected = false;

/** Returns whether STOMP is connected */
export function isWebsocketConnected() {
  return connected && client && client.connected;
}


//  Connects to backend WebSocket with provided accessToken.
 
export function connectWebsocket(accessToken, handlers = {}) {
  if (!accessToken) {
    console.warn("connectWebsocket called without accessToken");
    return;
  }

  // If already connected, disconnect first to reset cleanly
  if (client && connected) {
    try {
      client.deactivate();
    } catch (e) {
      console.warn("Failed to deactivate old stomp client", e);
    }
  }

  client = new Client({
    webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
    debug: () => {},
    connectHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 0,
    heartbeatOutgoing: 20000,
    onConnect: (frame) => {
      connected = true;
      console.info(" STOMP connected", frame);

      // Subscribe to public topic
      client.subscribe("/topic/public", (msg) => {
        try {
          const payload = JSON.parse(msg.body);
          handlers.onMessagePublic && handlers.onMessagePublic(payload);
        } catch (e) {
          console.error("Invalid JSON from /topic/public", e);
        }
      });

      // Subscribe to private queue
      client.subscribe("/user/queue/messages", (msg) => {
        try {
          const payload = JSON.parse(msg.body);
          handlers.onMessagePrivate && handlers.onMessagePrivate(payload);
        } catch (e) {
          console.error("Invalid JSON from /user/queue/messages", e);
        }
      });

      handlers.onConnect && handlers.onConnect(frame);
    },
    onStompError: (frame) => {
      console.error("STOMP error", frame);
      handlers.onError && handlers.onError(frame);
    },
    onDisconnect: (frame) => {
      connected = false;
      console.info(" STOMP disconnected", frame);
      handlers.onDisconnect && handlers.onDisconnect(frame);
    },
  });

  client.onWebSocketClose = () => {
    connected = false;
  };

  client.activate();
  return client;
}

/** Disconnect websocket safely */
export function disconnectWebsocket() {
  if (!client) return;
  try {
    client.deactivate();
  } catch (e) {
    console.warn("Error deactivating STOMP client", e);
  } finally {
    client = null;
    connected = false;
  }
}

/** Send chat message payload to backend */
export function sendChatMessage(payload) {
  if (!client || !connected) {
    console.warn("⚠️ STOMP client not connected - cannot send message");
    return false;
  }

  try {
    client.publish({
      destination: "/app/chat.send",
      body: JSON.stringify(payload),
    });
    return true;
  } catch (e) {
    console.error(" Failed to publish STOMP message", e);
    return false;
  }
}
