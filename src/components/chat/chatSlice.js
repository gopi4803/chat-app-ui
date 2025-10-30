import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  conversations: [],
  messages: {},
  activeConversationId: null,
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
  },
});

export const {
  setMe,
  setConversations,
  addOrUpdateConversation,
  setActiveConversation,
  addMessage,
  updateMessageStatus,
  setLastSyncedAt,
  clearChatState,
} = chatSlice.actions;

export default chatSlice.reducer;
