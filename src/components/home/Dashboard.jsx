import { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import ChatList from "../chat/ChatList";
import ChatWindow from "../chat/ChatWindow";
import GroupList from "../chat/GroupList";
import CreateGroupModal from "../chat/CreateGroupModal";
import {
  connectWebsocket,
  disconnectWebsocket,
  isWebsocketConnected,
  sendChatMessage,
  subscribeToGroup,
  sendGroupMessage,
} from "../chat/websocketClient";
import {
  setActiveConversation,
  addMessage,
  setMe,
  addOrUpdateConversation,
  setLastSyncedAt,
  setConversations,
  clearChatState,
  updateMessageStatus,
  setGroups,
  addOrUpdateGroup,
  addGroupSystemMessage,
  addGroupMessage,
  setActiveGroup,
  clearGroupMessages,
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
  const groupMessages = useSelector((s) => s.chat.groupMessages || {});
  const groupsRedux = useSelector((s) => s.chat.groupConversations || []);
  const activeGroupId = useSelector((s) => s.chat.activeGroupId);
  // const lastSyncedAt = useSelector((s) => s.chat.lastSyncedAt);

  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);
  const [typingMap, setTypingMap] = useState({});
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const userMapRef = useRef({});
  const presenceRef = useRef({});

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/users");
      const users = res.data || [];
      setAllUsers(users);
      const map = {};
      users.forEach(
        (u) => (map[u.email.toLowerCase()] = u.username || u.email)
      );
      userMapRef.current = map;
    } catch (e) {
      console.error("Failed to fetch users", e);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await api.get("/groups");
      const list = res.data || [];
      dispatch(setGroups(list));
    } catch (e) {
      console.error("Failed to fetch groups", e);
    }
  }, [dispatch]);

  // ---- Incremental sync for private messages
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
            msg.from = msg.from?.toLowerCase();
            msg.to = msg.to?.toLowerCase();
            const other =
              msg.from === meEmail.toLowerCase() ? msg.to : msg.from;
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
            if (msg.messageId) {
              dispatch(
                updateMessageStatus({
                  convId: other,
                  messageId: msg.messageId,
                  delivered: msg.delivered,
                  readAt: msg.readAt,
                })
              );
            }
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

  const bootstrapConversationsAndMessages = useCallback(
    async (token) => {
      if (!token || !meEmail) return;
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      dispatch(setMe(meEmail.toLowerCase()));

      try {
        const convRes = await api.get("/messages/conversations");
        const convList = convRes.data || [];
        const normalized = convList.map((c) => ({
          id: c.id,
          name: c.name || c.id,
          lastMessage: c.lastMessage,
          lastAt: c.lastAt,
          participants: c.participants || [c.id],
        }));

        dispatch(setConversations(normalized));

        let globalMaxTs = Number(localStorage.getItem("lastSyncedAt") || 0);

        for (const conv of normalized) {
          try {
            const res = await api.get(`/messages/${conv.id}`);
            const history = res.data || [];
            history.forEach((msg) => {
              msg.from = msg.from?.toLowerCase();
              msg.to = msg.to?.toLowerCase();
              dispatch(addMessage({ convId: conv.id, message: msg }));
              if (msg.timestamp && msg.timestamp > globalMaxTs)
                globalMaxTs = msg.timestamp;
              if (msg.messageId) {
                dispatch(
                  updateMessageStatus({
                    convId: conv.id,
                    messageId: msg.messageId,
                    delivered: msg.delivered,
                    readAt: msg.readAt,
                  })
                );
              }
            });
          } catch (e) {
            console.error(`Failed to load messages for ${conv.id}`, e);
          }
        }

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

  // Init dashboard
  useEffect(() => {
    const initDashboard = async () => {
      const token = authToken || getAccessToken();
      if (!token) return;
      if (!meEmail) return;
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      dispatch(setMe(meEmail.toLowerCase()));
      await fetchUsers();
      await fetchGroups();
      await bootstrapConversationsAndMessages(token);
      const storedSince = Number(localStorage.getItem("lastSyncedAt") || 0);
      await syncMessages(storedSince);
    };

    const timeout = setTimeout(initDashboard, 300);
    return () => clearTimeout(timeout);
  }, [
    authToken,
    meEmail,
    dispatch,
    fetchUsers,
    fetchGroups,
    bootstrapConversationsAndMessages,
    syncMessages,
  ]);

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

  const updatePresence = (payload) => {
    if (!payload) return;
    const current = { ...presenceRef.current };
    if (Array.isArray(payload)) {
      const snapshotMap = {};
      payload.forEach((p) => {
        if (!p) return;
        if (typeof p === "string") {
          snapshotMap[p.toLowerCase()] = { online: true, lastSeen: null };
        } else if (typeof p === "object") {
          const email = p.email || p.user || p.id;
          if (!email) return;
          snapshotMap[email.toLowerCase()] = {
            online: !!p.online,
            lastSeen: p.lastSeen ?? null,
          };
        }
      });
      presenceRef.current = snapshotMap;
    } else if (payload.email || payload.user) {
      const email = (payload.email || payload.user || "").toLowerCase();
      if (!email) return;
      current[email] = {
        online: !!payload.online,
        lastSeen: payload.lastSeen ?? current[email]?.lastSeen ?? null,
      };
      presenceRef.current = current;
    }
    setAllUsers((prev) => [...prev]);
  };

  // WebSocket handlers
  useEffect(() => {
    const token = authToken || getAccessToken();
    if (!token || !meEmail) return;

    const handlers = {
      onConnect: () => {
        console.log(" WebSocket connected");
        flushPending();
        setTimeout(async () => {
          try {
            const res = await api.get("/presence");
            const payload = res.data.map((email) => ({ email, online: true }));
            updatePresence(payload);
          } catch (e) {
            console.warn("Presence REST fetch failed", e);
          }
        }, 700);
      },

      onMessagePrivate: (payload) => {
        const msg = {
          type: payload.type,
          content: payload.content,
          from: payload.from?.toLowerCase(),
          to: payload.to?.toLowerCase(),
          timestamp: payload.timestamp || Date.now(),
          messageId: payload.messageId,
          delivered: payload.delivered,
          readAt: payload.readAt,
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

        if (msg.messageId) {
          dispatch(
            updateMessageStatus({
              convId: other,
              messageId: msg.messageId,
              delivered: msg.delivered,
              readAt: msg.readAt,
            })
          );
        }
      },
      onPresence: updatePresence,
      onPresenceSnapshot: updatePresence,
      onTyping: (payload) => {
        const from = payload.from?.toLowerCase();
        if (!from || from === meEmail.toLowerCase()) return;
        setTypingMap((prev) => ({ ...prev, [from]: true }));
        setTimeout(() => {
          setTypingMap((prev) => {
            const updated = { ...prev };
            delete updated[from];
            return updated;
          });
        }, 3000);
      },
      onGroupEvent: (event) => {
        if (event.type === "GROUP_CREATED") {
          const groupId = event.groupId;
          const groupName = event.name;
          const members = event.members || [];
          const createdBy = event.createdBy;
          const avatar = event.avatar || null;

          const normalizedMembers = members.map((m) =>
            typeof m === "string" ? { email: m, role: "MEMBER" } : m
          );

          dispatch(
            addOrUpdateGroup({
              id: groupId,
              name: groupName,
              avatar,
              createdBy,
              members: normalizedMembers,
            })
          );

          subscribeToGroup(groupId, {
            onMessage: (payload) => {
              dispatch(
                addGroupMessage({
                  groupId,
                  message: payload,
                })
              );
            },
          });
        }

        if (event.type === "GROUP_SYSTEM") {
          dispatch(
            addGroupSystemMessage({
              groupId: event.groupId,
              content: event.content,
            })
          );
        }
      },
    };

    connectWebsocket(token, handlers);
    return () => disconnectWebsocket();
  }, [authToken, meEmail, dispatch, syncMessages]);

  // Send private message
  const handleSendMessage = async (toRaw, content, messageId) => {
    if (!toRaw || !content) return;
    const to = toRaw.toLowerCase();
    const timestamp = Date.now();
    const msg = {
      type: "CHAT",
      content,
      from: meEmail.toLowerCase(),
      to,
      timestamp,
      messageId,
    };

    dispatch(
      addMessage({
        convId: to,
        message: { ...msg, delivered: false, readAt: null },
      })
    );
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

  // Send group message
  const handleSendGroupMessage = (groupId, content, messageId) => {
    if (!groupId || !content) return;
    const ts = Date.now();
    const payload = {
      groupId,
      content,
      messageId,
      timestamp: ts,
      type: "CHAT",
    };

    dispatch(
      addGroupMessage({
        groupId,
        message: {
          messageId,
          content,
          sender: meEmail.toLowerCase(),
          timestamp: ts,
          delivered: false,
        },
      })
    );

    const ok = sendGroupMessage(payload);
    if (!ok) console.warn("Failed to send group message");
  };

  // User starts 1:1 chat
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

  //  Select a group: load history & subscribe
  const handleSelectGroup = async (group) => {
    if (!group) return;
    dispatch(setActiveGroup(group.id));
    dispatch(setActiveConversation(null));
    try {
      const res = await api.get(`/groups/${group.id}/messages`);
      const history = res.data || [];
      dispatch(clearGroupMessages(group.id));
      for (const msg of history) {
        dispatch(
          addGroupMessage({
            groupId: group.id,
            message: {
              messageId: msg.messageId,
              content: msg.content,
              sender: msg.sender,       
              senderName: msg.senderName,
              timestamp: msg.timestamp,
              delivered: msg.delivered,
              type: msg.type,
            },
          })
        );
      }

      subscribeToGroup(group.id, {
        onMessage: (payload) => {
          dispatch(
            addGroupMessage({
              groupId: group.id,
              message: {
                messageId: payload.messageId,
                content: payload.content,
                sender: payload.senderEmail || payload.sender, // keep as email (logic)
                senderName: payload.senderName || payload.sender, 
                timestamp: payload.timestamp,
                delivered: payload.delivered,
                type: payload.type,
              },
            })
          );
        },
        onTyping: (payload) => {
          
          // console.log("Group typing:", payload);
        },
      });
    } catch (e) {
      console.error("Failed to load group messages", e);
    }
  };

  const handleLogout = () => {
    dispatch(authLogout());
    dispatch(clearChatState());
    localStorage.removeItem("lastSyncedAt");
    disconnectWebsocket();
    setTimeout(() => (window.location.href = "/log-in"), 150);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 text-gray-600 text-lg">
        Syncing your chats...
      </div>
    );

  const activeConversation = conversations.find((c) => c.id === activeId);
  const activeGroup = groupsRedux.find((g) => g.id === activeGroupId);
  const convMessages = messages[activeId] || [];
  const groupMsgs = groupMessages[activeGroupId] || [];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* LEFT SIDEBAR */}
      <div className="relative w-1/3 bg-white rounded-l-2xl shadow-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6">
          <div className="text-2xl font-bold text-black">Chat App</div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                await fetchUsers();
                setShowUserList(true);
              }}
              className="bg-gray-900 text-white px-3 py-1 rounded-lg hover:opacity-80 transition"
            >
              + New Chat
            </button>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:opacity-80 transition"
            >
              + Group
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ChatList
            conversations={conversations}
            activeId={activeId}
            presenceMap={presenceRef.current}
            onSelect={async (id) => {
              dispatch(setActiveConversation(id));
              dispatch(setActiveGroup(null));
              if (!messages[id] || messages[id].length === 0) {
                try {
                  const res = await api.get(`/messages/${id}`);
                  const history = res.data || [];
                  history.forEach((msg) => {
                    msg.from = msg.from?.toLowerCase();
                    msg.to = msg.to?.toLowerCase();
                    dispatch(addMessage({ convId: id, message: msg }));
                    if (msg.messageId)
                      dispatch(
                        updateMessageStatus({
                          convId: id,
                          messageId: msg.messageId,
                          delivered: msg.delivered,
                          readAt: msg.readAt,
                        })
                      );
                  });
                } catch (e) {
                  console.error("Failed to load conversation messages", e);
                }
              }
            }}
          />
          <div className="border-t mt-2">
            <GroupList
              groups={groupsRedux}
              activeGroupId={activeGroupId}
              onSelect={handleSelectGroup}
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Log Out
          </button>
        </div>

        {showUserList && (
          <div className="absolute inset-0 z-50 bg-black bg-opacity-60 flex justify-center items-center">
            <div className="bg-white rounded-xl p-6 w-3/4 max-w-md shadow-lg">
              <h3 className="text-lg font-bold mb-4 text-gray-800">
                Select a user to chat with
              </h3>
              <div className="max-h-80 overflow-y-auto space-y-3">
                {allUsers.map((u) => (
                  <div
                    key={u.email}
                    onClick={() => handleStartChat(u)}
                    className="flex justify-between items-center p-3 rounded-lg cursor-pointer hover:bg-gray-100"
                  >
                    <div>
                      <div className="font-semibold text-gray-800">
                        {u.username || u.email}
                      </div>
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

        {showCreateGroup && (
          <CreateGroupModal
            visible={showCreateGroup}
            onClose={() => setShowCreateGroup(false)}
            onCreated={async (created) => {
              await fetchGroups();
            }}
            allUsers={allUsers}
            meEmail={meEmail}
          />
        )}
      </div>

      {/* RIGHT: Chat Window */}
      <div className="flex-1 bg-gray-900 text-white rounded-r-2xl">
        {activeGroup ? (
          <ChatWindow
            conversation={{
              id: activeGroup.id,
              name: activeGroup.name,
              participants: activeGroup.members?.map((m) => m.email) || [],
              members: activeGroup.members || [],
              isGroup: true,
            }}
            me={meEmail}
            messages={groupMsgs}
            onSend={(convId, text, messageId) =>
              handleSendGroupMessage(convId, text, messageId)
            }
            isTyping={false}
            presenceRef={presenceRef}
          />
        ) : (
          <ChatWindow
            conversation={activeConversation}
            me={meEmail}
            messages={convMessages}
            onSend={handleSendMessage}
            isTyping={typingMap[activeConversation?.id]}
            presenceRef={presenceRef}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
