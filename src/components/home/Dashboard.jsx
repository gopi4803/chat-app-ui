import { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import ChatList from "../chat/ChatList";
import ChatWindow from "../chat/ChatWindow";
import {
  connectWebsocket,
  disconnectWebsocket,
  isWebsocketConnected,
  sendChatMessage,
} from "../chat/websocketClient";
import {
  setActiveConversation,
  addMessage,
  setMe,
  addOrUpdateConversation,
  setLastSyncedAt,
  setConversations,
  clearChatState,
} from "../chat/chatSlice";
import { logout as authLogout } from "../../components/redux/authSlice";
import api, { getAccessToken } from "../uitility/api";

const Dashboard = () => {
  const dispatch = useDispatch();
  const authToken = useSelector((s) => s.auth.token);
  const meEmail = useSelector((s) => s.auth.email);
  const conversations = useSelector((s) => s.chat.conversations);
  const activeId = useSelector((s) => s.chat.activeConversationId);
  const messages = useSelector((s) => s.chat.messages);
  const lastSyncedAt = useSelector((s) => s.chat.lastSyncedAt);

  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);
  const userMapRef = useRef({});

  // 1. Fetch Users 
  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/users");
      const users = res.data || [];
      setAllUsers(users);
      const map = {};
      users.forEach((u) => (map[u.email.toLowerCase()] = u.username || u.email));
      userMapRef.current = map;
    } catch (e) {
      console.error("Failed to fetch users", e);
    }
  }, []);

  // 2. Incremental sync
  const syncMessages = useCallback(
    async (since = 0) => {
      if (!meEmail) {
        console.warn("Skipping sync: meEmail not ready");
        return;
      }

      try {
        const res = await api.get(`/messages/sync?since=${since}`);
        const newMsgs = res.data || [];

        if (newMsgs.length) {
          let maxTs = since;
          for (const msg of newMsgs) {
            const from = msg.from?.toLowerCase();
            const to = msg.to?.toLowerCase();
            msg.from = from;
            msg.to = to;
            const other = from === meEmail.toLowerCase() ? to : from;
            dispatch(addMessage({ convId: other, message: msg }));
            dispatch(
              addOrUpdateConversation({
                id: other,
                name: userMapRef.current[other] || other,
                participants: [other],
                lastMessage: msg.content,
                lastAt: msg.timestamp,
              })
            );
            if (msg.timestamp > maxTs) maxTs = msg.timestamp;
          }
          dispatch(setLastSyncedAt(maxTs));
          localStorage.setItem("lastSyncedAt", String(maxTs));
        } else {
          console.log("No new messages from incremental sync");
        }
      } catch (e) {
        console.error("Incremental sync failed", e);
      }
    },
    [dispatch, meEmail]
  );

  //3.Boot-time full load of conversations & messages
  const bootstrapConversationsAndMessages = useCallback(
    async (token) => {
      if (!token || !meEmail) return;

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      dispatch(setMe(meEmail.toLowerCase()));

      try {
        // 1) Fetch conversations (backend returns `id`, `lastMessage`, `lastAt`, and `name`)
        const convRes = await api.get("/messages/conversations");
        const convList = convRes.data || [];
        // Normalize conversation objects to ensure they contain `name`
        const normalized = convList.map((c) => ({
          id: c.id,
          name: c.name || c.id,
          lastMessage: c.lastMessage,
          lastAt: c.lastAt,
          participants: c.participants || [c.id],
        }));

        // Store conversations in redux
        dispatch(setConversations(normalized));

        // For each conversation fetch the full history (ensures full chat history regardless of lastSyncedAt)
        let globalMaxTs = Number(localStorage.getItem("lastSyncedAt") || 0);

        for (const conv of normalized) {
          try {
            const res = await api.get(`/messages/${conv.id}`);
            const history = res.data || [];
            history.forEach((msg) => {
              msg.from = msg.from?.toLowerCase();
              msg.to = msg.to?.toLowerCase();
              dispatch(addMessage({ convId: conv.id, message: msg }));
              if (msg.timestamp && msg.timestamp > globalMaxTs) {
                globalMaxTs = msg.timestamp;
              }
            });
          } catch (e) {
            console.error(`Failed to load messages for ${conv.id}`, e);
          }
        }

        // Persist the max timestamp seen
        if (globalMaxTs > 0) {
          dispatch(setLastSyncedAt(globalMaxTs));
          localStorage.setItem("lastSyncedAt", String(globalMaxTs));
        }
      } catch (e) {
        console.error("Failed during bootstrap conversations/messages", e);
      } finally {
        setLoading(false);
      }
    },
    [dispatch, meEmail]
  );

  // 4. Mount logic
  useEffect(() => {
    const initDashboard = async () => {
      const token = authToken || getAccessToken();
      if (!token) {
        console.warn("Waiting for token...");
        return;
      }
      if (!meEmail) {
        console.warn("Waiting for user email...");
        return;
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      dispatch(setMe(meEmail.toLowerCase()));

      fetchUsers().catch((e) => console.warn("fetchUsers failed", e));

      await bootstrapConversationsAndMessages(token);

      // After full bootstrap, run an incremental sync from stored timestamp to catch any missed messages
      const storedSince = Number(localStorage.getItem("lastSyncedAt") || 0);
      console.log(`After bootstrap, running incremental sync since ${storedSince}`);
      await syncMessages(storedSince);
    };

    const timeout = setTimeout(initDashboard, 300);
    return () => clearTimeout(timeout);
  }, [authToken, meEmail, dispatch, fetchUsers, bootstrapConversationsAndMessages, syncMessages]);

  //5. Pending queue
  const pendingQueueKey = "pending_chat_messages";

  const enqueuePending = (msg) => {
    try {
      const arr = JSON.parse(localStorage.getItem(pendingQueueKey) || "[]");
      arr.push(msg);
      localStorage.setItem(pendingQueueKey, JSON.stringify(arr));
    } catch (e) {
      console.warn("Failed to enqueue pending message", e);
    }
  };

  const flushPending = async () => {
    try {
      const arr = JSON.parse(localStorage.getItem(pendingQueueKey) || "[]");
      if (!arr.length) return;
      for (const m of arr) {
        const ok = isWebsocketConnected() && sendChatMessage(m);
        if (!ok) {
          console.warn("WS disconnected, stopping flush");
          return;
        }
      }
      localStorage.removeItem(pendingQueueKey);
      console.info("Flushed pending messages");
    } catch (e) {
      console.error("Failed to flush pending messages", e);
    }
  };

  //  6. WebSocket Setup 
  useEffect(() => {
    const token = authToken || getAccessToken();
    if (!token || !meEmail) return;

    const handlers = {
      onConnect: () => {
        console.log(" WebSocket connected");
        flushPending();

        // Force incremental sync once WS confirms (catch any missed)
        const storedSince = Number(localStorage.getItem("lastSyncedAt") || 0);
        syncMessages(storedSince);
      },
      onMessagePrivate: (payload) => {
        const msg = {
          type: payload.type,
          content: payload.content,
          from: payload.from?.toLowerCase(),
          to: payload.to?.toLowerCase(),
          timestamp: payload.timestamp || Date.now(),
        };

        const other = msg.from === meEmail.toLowerCase() ? msg.to : msg.from;
        const convName = userMapRef.current[other] || other;
        dispatch(
          addOrUpdateConversation({
            id: other,
            name: convName,
            participants: [other],
            lastMessage: msg.content,
            lastAt: msg.timestamp,
          })
        );
        dispatch(addMessage({ convId: other, message: msg }));
      },
    };

    connectWebsocket(token, handlers);
    return () => disconnectWebsocket();
  }, [authToken, meEmail, dispatch, syncMessages]);

  // 7. Start New Chat 
  const handleStartChat = (user) => {
    const convId = user.email.toLowerCase();
    dispatch(
      addOrUpdateConversation({
        id: convId,
        name: user.username || user.email,
        participants: [user.email],
      })
    );
    dispatch(setActiveConversation(convId));
    setShowUserList(false);
  };

  // 8. Send Message
  const handleSendMessage = async (toRaw, content) => {
    if (!toRaw || !content) return;
    const to = toRaw.toLowerCase();
    const timestamp = Date.now();
    const msg = { type: "CHAT", content, from: meEmail.toLowerCase(), to, timestamp };

    dispatch(addMessage({ convId: to, message: msg }));
    dispatch(
      addOrUpdateConversation({
        id: to,
        name: userMapRef.current[to] || to,
        participants: [to],
        lastMessage: content,
        lastAt: timestamp,
      })
    );

    if (isWebsocketConnected()) {
      const ok = sendChatMessage(msg);
      if (!ok) enqueuePending(msg);
    } else {
      enqueuePending(msg);
    }
  };

  // 9. Logout 
  const handleLogout = () => {
    dispatch(authLogout());
    dispatch(clearChatState());
    localStorage.removeItem("lastSyncedAt");
    disconnectWebsocket();
    setTimeout(() => (window.location.href = "/log-in"), 150);
  };

  // 10. Render
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 text-gray-600 text-lg">
        Syncing your chats...
      </div>
    );

  const activeConversation = conversations.find((c) => c.id === activeId);
  const convMessages = messages[activeId] || [];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="relative w-1/3 bg-white rounded-l-2xl shadow-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6">
          <div className="text-2xl font-bold text-black">Chat App</div>
          <button
            onClick={async () => {
              await fetchUsers();
              setShowUserList(true);
            }}
            className="bg-gray-900 text-white px-3 py-1 rounded-lg hover:opacity-80 transition"
          >
            + New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ChatList
            conversations={conversations}
            activeId={activeId}
            onSelect={async (id) => {
              dispatch(setActiveConversation(id));
              if (!messages[id] || messages[id].length === 0) {
                try {
                  const res = await api.get(`/messages/${id}`);
                  const history = res.data || [];
                  history.forEach((msg) => {
                    msg.from = msg.from?.toLowerCase();
                    msg.to = msg.to?.toLowerCase();
                    dispatch(addMessage({ convId: id, message: msg }));
                  });
                } catch (e) {
                  console.error("Failed to load conversation messages", e);
                }
              }
            }}
          />
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Log Out
          </button>
        </div>

        {/* User Picker Modal */}
        {showUserList && (
          <div className="absolute inset-0 z-50 bg-black bg-opacity-60 flex justify-center items-center">
            <div className="bg-white rounded-xl p-6 w-3/4 max-w-md shadow-lg">
              <h3 className="text-lg font-bold mb-4 text-gray-800">Select a user to chat with</h3>
              <div className="max-h-80 overflow-y-auto space-y-3">
                {allUsers.map((u) => (
                  <div
                    key={u.email}
                    onClick={() => handleStartChat(u)}
                    className="flex justify-between items-center p-3 rounded-lg cursor-pointer hover:bg-gray-100"
                  >
                    <div>
                      <div className="font-semibold text-gray-800">{u.username || u.email}</div>
                      <div className="text-sm text-gray-500">{u.email}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowUserList(false)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:opacity-90"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Window */}
      <div className="flex-1 bg-gray-900 text-white rounded-r-2xl">
        <ChatWindow conversation={activeConversation} me={meEmail} messages={convMessages} onSend={handleSendMessage} />
      </div>
    </div>
  );
};

export default Dashboard;
