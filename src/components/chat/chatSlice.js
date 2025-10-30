import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  conversations: [],
  messages: {},
  activeConversationId: null,
  me: null,
  lastSyncedAt: 0,
};

function isSameMsg(a, b) {
  if (!a || !b) return false;
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

      const exists = state.messages[convId].some((m) => isSameMsg(m, message));
      if (!exists) state.messages[convId].push(message);

      const convIdx = state.conversations.findIndex((c) => c.id === convId);
      if (convIdx >= 0) {
        const prev = state.conversations[convIdx].lastAt || 0;
        if ((message.timestamp || 0) >= prev) {
          state.conversations[convIdx].lastMessage = message.content;
          state.conversations[convIdx].lastAt =
            message.timestamp || Date.now();
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
  setLastSyncedAt,
  clearChatState,
} = chatSlice.actions;

export default chatSlice.reducer;
