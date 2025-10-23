import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  conversations: [],
  messages: {},
  activeConversationId: null,
  me: null,
};

function isSameMsg(a, b) {
  if (!a || !b) return false;
  // compare content + from + near-equal timestamp (within 1000ms) to avoid duplicates
  return (
    a.content === b.content &&
    a.from === b.from &&
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
      // Guarantee id is an email string (normalization)
      const id = conv.id;
      const idx = state.conversations.findIndex((c) => c.id === id);
      const toInsert = { ...conv, id };
      if (idx >= 0) state.conversations[idx] = { ...state.conversations[idx], ...toInsert };
      else state.conversations.unshift(toInsert);
    },
    setActiveConversation: (state, action) => {
      state.activeConversationId = action.payload;
    },
    addMessage: (state, action) => {
      const { convId, message } = action.payload;
      if (!convId) return;

      if (!state.messages[convId]) state.messages[convId] = [];

      // Deduplicate: avoid inserting if an equal message is already present
      const existing = state.messages[convId].find((m) => isSameMsg(m, message));
      if (existing) {
        // console.debug("Duplicate message skipped", message);
      } else {
        state.messages[convId].push(message);
      }

      // update conversation's lastMessage & lastAt
      const convIdx = state.conversations.findIndex((c) => c.id === convId);
      if (convIdx >= 0) {
        state.conversations[convIdx].lastMessage = message.content;
        state.conversations[convIdx].lastAt = message.timestamp || Date.now();
      } else {
        // If conversation not present, create a minimal one so UI shows correctly
        state.conversations.unshift({
          id: convId,
          name: convId,
          participants: [convId],
          lastMessage: message.content,
          lastAt: message.timestamp || Date.now(),
        });
      }
    },
    clearChatState: (state) => {
      state.conversations = [];
      state.messages = {};
      state.activeConversationId = null;
    },
  },
});

export const {
  setMe,
  setConversations,
  addOrUpdateConversation,
  setActiveConversation,
  addMessage,
  clearChatState,
} = chatSlice.actions;

export default chatSlice.reducer;
