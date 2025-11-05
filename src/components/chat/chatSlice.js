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
      const id = conv.id;
      const idx = state.conversations.findIndex((c) => c.id === id);
      if (idx >= 0)
        state.conversations[idx] = { ...state.conversations[idx], ...conv };
      else state.conversations.unshift(conv);
    },
    setActiveConversation: (state, action) => {
      state.activeConversationId = action.payload;
      if (action.payload) state.activeGroupId = null;
    },
    addMessage: (state, action) => {
      const { convId, message } = action.payload;
      if (!convId) return;
      if (!state.messages[convId]) state.messages[convId] = [];

      // READ_RECEIPT handling
      if (message.type === "READ_RECEIPT") {
        const reader = message.from;
        const conv = state.messages[reader] || [];
        conv.forEach((m) => {
          if (m.from !== reader) {
            m.readAt = message.readAt || message.timestamp || Date.now();
          }
        });
        const cIdx = state.conversations.findIndex((c) => c.id === reader);
        if (cIdx >= 0) {
          state.conversations[cIdx].lastAt =
            message.timestamp || state.conversations[cIdx].lastAt;
        }
        return;
      }

      // Avoid duplicate by messageId if available
      const exists = state.messages[convId].some((m) =>
        isSameMsgById(m, message)
      );
      if (!exists) {
        if (message.delivered === undefined) message.delivered = false;
        if (message.readAt === undefined) message.readAt = null;
        state.messages[convId].push(message);
      } else {
        // If exists, update delivered/read fields if server sent them
        const idx = state.messages[convId].findIndex((m) =>
          isSameMsgById(m, message)
        );
        if (idx >= 0) {
          const existing = state.messages[convId][idx];
          if (message.delivered !== undefined)
            existing.delivered = message.delivered;
          if (message.readAt !== undefined) existing.readAt = message.readAt;
          if (message.messageId && !existing.messageId)
            existing.messageId = message.messageId;
        }
      }

      //  Always sort ascending by timestamp
      state.messages[convId].sort(
        (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
      );

      const convIdx = state.conversations.findIndex((c) => c.id === convId);
      if (convIdx >= 0) {
        const prev = state.conversations[convIdx].lastAt || 0;
        if ((message.timestamp || 0) >= prev) {
          state.conversations[convIdx].lastMessage = message.content;
          state.conversations[convIdx].lastAt = message.timestamp || Date.now();
        }
      } else {
        state.conversations.unshift({
          id: convId,
          name: convId,
          participants: [convId],
          lastMessage: message.content,
          lastAt: message.timestamp || Date.now(),
        });
      }
    },
    updateMessageStatus: (state, action) => {
      const { convId, messageId, delivered, readAt } = action.payload;
      if (!state.messages[convId]) return;
      const msg = state.messages[convId].find(
        (m) => m.messageId && m.messageId === messageId
      );
      if (msg) {
        if (delivered !== undefined) msg.delivered = delivered;
        if (readAt !== undefined) msg.readAt = readAt;
      }
    },
    setGroups: (state, action) => {
      state.groupConversations = action.payload;
    },
    addGroupSystemMessage: (state, action) => {
      const { groupId, content } = action.payload;
      if (!groupId || !content) return;
      if (!state.groupMessages[groupId]) state.groupMessages[groupId] = [];
      const msg = {
        messageId: "sys-" + Date.now(),
        content,
        type: "SYSTEM",
        timestamp: Date.now(),
      };
      state.groupMessages[groupId].push(msg);
      state.groupMessages[groupId].sort(
        (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
      );
    },

    addOrUpdateGroup: (state, action) => {
      const g = action.payload;
      const id = g.id;
      const idx = state.groupConversations.findIndex((x) => x.id === id);
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
    addGroupMessage: (state, action) => {
      const { groupId, message } = action.payload;
      if (!groupId) return;
      if (!state.groupMessages[groupId]) state.groupMessages[groupId] = [];
      // dedupe by messageId if present
      const exists = state.groupMessages[groupId].some(
        (m) =>
          m.messageId && message.messageId && m.messageId === message.messageId
      );
      if (!exists) state.groupMessages[groupId].push(message);
      state.groupMessages[groupId].sort(
        (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
      );
      // update group last message if exists in list
      const gIdx = state.groupConversations.findIndex((g) => g.id === groupId);
      if (gIdx >= 0) {
        state.groupConversations[gIdx].lastMessage = message.content;
        state.groupConversations[gIdx].lastAt = message.timestamp || Date.now();
      }
    },
    setLastSyncedAt: (state, action) => {
      state.lastSyncedAt = action.payload;
    },
    clearChatState: (state) => {
      state.conversations = [];
      state.messages = {};
      state.activeConversationId = null;
      state.me = null;
      state.lastSyncedAt = 0;
    },
    clearGroupMessages: (state, action) => {
      delete state.groupMessages[action.payload];
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
  setLastSyncedAt,
  clearChatState,
  clearGroupMessages,
} = chatSlice.actions;

export default chatSlice.reducer;
