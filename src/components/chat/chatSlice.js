import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  conversations: [],
  messages: {},
  groupConversations: [],
  groupMessages: {},
  activeConversationId: null,
  activeGroupId: null,
  me: null,
  lastSyncedAt: 0,
};

function isSameMsgById(a, b) {
  if (!a || !b) return false;
  if (a.messageId && b.messageId) return a.messageId === b.messageId;
  return (
    a.content === b.content &&
    a.from === b.from &&
    a.to === b.to &&
    Math.abs((a.timestamp || 0) - (b.timestamp || 0)) <= 1000
  );
}

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setMe: (state, action) => {
      state.me = action.payload;
    },

    setConversations: (state, action) => {
      state.conversations = action.payload;
    },

    addOrUpdateConversation: (state, action) => {
      const conv = action.payload;
      const idx = state.conversations.findIndex((c) => c.id === conv.id);
      if (idx >= 0)
        state.conversations[idx] = { ...state.conversations[idx], ...conv };
      else state.conversations.unshift(conv);
    },

    setActiveConversation: (state, action) => {
      state.activeConversationId = action.payload;
      if (action.payload) state.activeGroupId = null;
    },

    /* PRIVATE MESSAGES */
    addMessage: (state, action) => {
      const { convId, message } = action.payload;
      if (!convId) return;
      if (!state.messages[convId]) state.messages[convId] = [];

      // READ RECEIPT
      if (message.type === "READ_RECEIPT") {
        const reader = message.from;
        const conv = state.messages[reader] || [];
        conv.forEach((m) => {
          if (m.from !== reader) {
            m.readAt = message.readAt || message.timestamp || Date.now();
          }
        });
        return;
      }

      const idx = state.messages[convId].findIndex((m) =>
        isSameMsgById(m, message)
      );

      if (idx === -1) {
        state.messages[convId].push(message);
      } else {
        const existing = state.messages[convId][idx];
        if (message.messageId && !existing.messageId)
          existing.messageId = message.messageId;
        if (message.readAt !== undefined)
          existing.readAt = message.readAt;
        if (message.delivered !== undefined)
          existing.delivered = message.delivered;
      }

      state.messages[convId].sort(
        (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
      );

      const cIdx = state.conversations.findIndex((c) => c.id === convId);
      if (cIdx >= 0) {
        state.conversations[cIdx].lastMessage = message.content;
        state.conversations[cIdx].lastAt =
          message.timestamp || Date.now();
      }
    },

    updateMessageStatus: (state, action) => {
      const { convId, messageId, delivered, readAt } = action.payload;
      const msg = state.messages[convId]?.find(
        (m) => m.messageId === messageId
      );
      if (!msg) return;
      if (delivered !== undefined) msg.delivered = delivered;
      if (readAt !== undefined) msg.readAt = readAt;
    },

    /* GROUPS */
    setGroups: (state, action) => {
      state.groupConversations = action.payload;
    },

    addOrUpdateGroup: (state, action) => {
      const g = action.payload;
      const idx = state.groupConversations.findIndex((x) => x.id === g.id);
      if (idx >= 0)
        state.groupConversations[idx] = {
          ...state.groupConversations[idx],
          ...g,
        };
      else state.groupConversations.unshift(g);
    },

    setActiveGroup: (state, action) => {
      state.activeGroupId = action.payload;
      if (action.payload) state.activeConversationId = null;
    },

    /* GROUP SYSTEM MESSAGE */
    addGroupSystemMessage: (state, action) => {
      const { groupId, content } = action.payload;
      if (!groupId || !content) return;
      if (!state.groupMessages[groupId]) state.groupMessages[groupId] = [];
      state.groupMessages[groupId].push({
        messageId: "sys-" + Date.now(),
        content,
        type: "SYSTEM",
        timestamp: Date.now(),
      });
    },

    /* GROUP MESSAGES (FIXED) */
    addGroupMessage: (state, action) => {
      const { groupId, message } = action.payload;
      if (!groupId || !message) return;
      if (!state.groupMessages[groupId])
        state.groupMessages[groupId] = [];

      const normalized = {
        ...message,
        deliveredRecipients: Array.isArray(message.deliveredRecipients)
          ? message.deliveredRecipients
          : [],
        readRecipients: Array.isArray(message.readRecipients)
          ? message.readRecipients
          : [],
      };

      const idx = state.groupMessages[groupId].findIndex(
        (m) => m.messageId === normalized.messageId
      );

      if (idx >= 0) {
        const existing = state.groupMessages[groupId][idx];

        existing.content = normalized.content ?? existing.content;
        existing.timestamp = normalized.timestamp ?? existing.timestamp;
        existing.sender = normalized.sender ?? existing.sender;
        existing.senderName =
          normalized.senderName ?? existing.senderName;
        existing.type = normalized.type ?? existing.type;

        existing.deliveredRecipients = Array.from(
          new Set([
            ...existing.deliveredRecipients,
            ...normalized.deliveredRecipients,
          ])
        );

        const readMap = new Map();
        existing.readRecipients.forEach((r) =>
          readMap.set((r.email || r).toLowerCase(), r)
        );
        normalized.readRecipients.forEach((r) =>
          readMap.set((r.email || r).toLowerCase(), r)
        );
        existing.readRecipients = Array.from(readMap.values());
      } else {
        state.groupMessages[groupId].push(normalized);
      }

      state.groupMessages[groupId].sort(
        (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
      );

      const gIdx = state.groupConversations.findIndex(
        (g) => g.id === groupId
      );
      if (gIdx >= 0) {
        state.groupConversations[gIdx].lastMessage =
          normalized.content;
        state.groupConversations[gIdx].lastAt =
          normalized.timestamp || Date.now();
      }
    },

    updateGroupMessageRecipients: (state, action) => {
      const { groupId, messageId, readRecipients } = action.payload;
      const msg = state.groupMessages[groupId]?.find(
        (m) => m.messageId === messageId
      );
      if (!msg) return;

      const map = new Map();
      msg.readRecipients.forEach((r) =>
        map.set((r.email || r).toLowerCase(), r)
      );
      (readRecipients || []).forEach((r) =>
        map.set((r.email || r).toLowerCase(), r)
      );
      msg.readRecipients = Array.from(map.values());
    },

    updateGroupMessageDelivery: (state, action) => {
      const { groupId, messageId, deliveredRecipients } = action.payload;
      const msg = state.groupMessages[groupId]?.find(
        (m) => m.messageId === messageId
      );
      if (!msg) return;

      msg.deliveredRecipients = Array.from(
        new Set([
          ...msg.deliveredRecipients,
          ...(deliveredRecipients || []).map((e) => e.toLowerCase()),
        ])
      );
    },

    setLastSyncedAt: (state, action) => {
      state.lastSyncedAt = action.payload || 0;
    },

    clearGroupMessages: (state, action) => {
      delete state.groupMessages[action.payload];
    },

    clearChatState: (state) => {
      state.conversations = [];
      state.messages = {};
      state.groupMessages = {};
      state.groupConversations = [];
      state.activeConversationId = null;
      state.activeGroupId = null;
      state.me = null;
      state.lastSyncedAt = 0;
    },
  },
});

export const {
  setMe,
  setConversations,
  addOrUpdateConversation,
  setActiveConversation,
  addMessage,
  updateMessageStatus,
  setGroups,
  addOrUpdateGroup,
  setActiveGroup,
  addGroupMessage,
  addGroupSystemMessage,
  updateGroupMessageRecipients,
  updateGroupMessageDelivery,
  setLastSyncedAt,
  clearGroupMessages,
  clearChatState,
} = chatSlice.actions;

export default chatSlice.reducer;
