import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { getAccessToken } from "../uitility/api";

let client = null;
let connected = false;
let currentToken = null;
let handlersRef = {};

export function isWebsocketConnected() {
  return connected && client && client.connected;
}

/**
 * Establish STOMP WebSocket connection.
 * @param {string} accessToken
 * @param {object} handlers
 */
export function connectWebsocket(accessToken, handlers = {}) {
  if (!accessToken) {
    console.warn("connectWebsocket called without accessToken");
    return;
  }

  handlersRef = handlers;
  currentToken = accessToken;

  // Cleanup existing connection before new one
  if (client && connected) {
    try {
      client.deactivate();
    } catch (e) {
      console.warn("Failed to deactivate old STOMP client", e);
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
      console.info(" STOMP connected");

      // Subscribe channels
      client.subscribe("/topic/public", (msg) => safeHandle(msg, handlers.onMessagePublic));
      client.subscribe("/user/queue/messages", (msg) => safeHandle(msg, handlers.onMessagePrivate));
      client.subscribe("/topic/presence", (msg) => safeHandle(msg, handlers.onPresence));
      client.subscribe("/user/queue/typing", (msg) => safeHandle(msg, handlers.onTyping));


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

  // Safely parse JSON and dispatch
  function safeHandle(msg, handler) {
  try {
    const payload = JSON.parse(msg.body);
    handler && handler(payload);
  } catch (e) {
    console.error("Invalid STOMP message", e, msg.body);
  }
}

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

//  Token-aware reconnect — call this after every token refresh.
export function reconnectWebsocketIfTokenRotated() {
  const token = getAccessToken();
  if (!token) return;
  if (token !== currentToken) {
    console.info("🔄 Token rotated, reconnecting WebSocket with new token...");
    disconnectWebsocket();
    connectWebsocket(token, handlersRef);
  }
}

export function sendChatMessage(payload) {
  if (!client || !connected) {
    console.warn("STOMP not connected, cannot send", payload);
    return false;
  }
  try {
    client.publish({
      destination: "/app/chat.send",
      body: JSON.stringify(payload),
    });
    return true;
  } catch (e) {
    console.error("Failed to publish STOMP message", e);
    return false;
  }
}

export function publish(destination, payload) {
  if (!client || !connected) {
    console.warn("STOMP not connected - cannot publish to", destination);
    return false;
  }
  try {
    client.publish({
      destination,
      body: JSON.stringify(payload),
    });
    return true;
  } catch (e) {
    console.error("Failed to publish STOMP message to", destination, e);
    return false;
  }
}
