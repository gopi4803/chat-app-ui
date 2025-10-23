import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import ChatList from "../chat/ChatList";
import ChatWindow from "../chat/ChatWindow";
import { connectWebsocket, disconnectWebsocket } from "../chat/websocketClient";
import { isWebsocketConnected, sendChatMessage } from "../chat/websocketClient";

import {
  setActiveConversation,
  addMessage,
  setMe,
  addOrUpdateConversation,
} from "../chat/chatSlice";
import api, { getAccessToken } from "../uitility/api";

const Dashboard = () => {
  const dispatch = useDispatch();
  const authToken = useSelector((s) => s.auth.token);
  const meEmail = useSelector((s) => s.auth.email);
  const conversations = useSelector((s) => s.chat.conversations);
  const activeId = useSelector((s) => s.chat.activeConversationId);
  const messages = useSelector((s) => s.chat.messages);

  const [allUsers, setAllUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);

  //  Global user map for username lookup
  const [userMap, setUserMap] = useState({});

  /** Fetch user list - include logged-in user (so UI consistent) */
  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/users"); 
      const users = res.data || [];
      setAllUsers(users);
      // create lookup { email: username }
      const map = {};
      users.forEach((u) => {
        map[u.email] = u.username || u.email;
      });
      setUserMap(map);
    } catch (e) {
      console.error("Failed to fetch users", e);
    }
  }, []);

  useEffect(() => {
    if (meEmail) fetchUsers();
  }, [meEmail, fetchUsers]);

  /** Connect WebSocket */
  useEffect(() => {
    // determine token
    const token = authToken || getAccessToken();
    if (!token) return;

    if (meEmail) dispatch(setMe(meEmail));

    const handlers = {
      onConnect: () => console.log("✅ WebSocket connected"),
      onMessagePrivate: (payload) => {
        // Normalize message object
        const msg = {
          type: payload.type,
          content: payload.content,
          from: payload.from,
          to: payload.to,
          timestamp: payload.timestamp || Date.now(),
        };

        // Determine convId (other user's email). We always use email as conversation id.
        // If I am the sender (payload.from === meEmail), then the other is payload.to
        // Otherwise other is payload.from
        const otherUser = payload.from === meEmail ? payload.to : payload.from;
        if (!otherUser) {
          console.warn("Received private message with no identifiable other user", payload);
          return;
        }

        const convName = userMap[otherUser] || otherUser;

        // add/update conversation entry
        dispatch(
          addOrUpdateConversation({
            id: otherUser,
            name: convName,
            participants: [otherUser],
            lastMessage: msg.content,
            lastAt: msg.timestamp,
          })
        );

        // store message under convId (otherUser)
        dispatch(addMessage({ convId: otherUser, message: msg }));
      },
      onError: (e) => console.error("WebSocket error:", e),
    };

    connectWebsocket(token, handlers);
    // keep cleanup to disconnect
    return () => disconnectWebsocket();
  }, [authToken, meEmail, userMap, dispatch]);

  /** Start a new chat */
  const handleStartChat = (user) => {
    const convId = user.email;
    dispatch(
      addOrUpdateConversation({
        id: convId,
        name: user.username || user.email,
        participants: [user.email],
        lastMessage: "",
        lastAt: null,
      })
    );
    dispatch(setActiveConversation(convId));
    setShowUserList(false);
  };

  const onSelectConversation = (id) => {
    dispatch(setActiveConversation(id));
  };

  // Provide messages for active conversation
  const activeConversation = conversations.find((c) => c.id === activeId);
  const convMessages = messages[activeId] || [];

  // send message handler (optimistic + send)
  const handleSendMessage = (to, content) => {
  if (!to || !content) return;

  const timestamp = Date.now();
  const localMsg = {
    type: "CHAT",
    content,
    from: meEmail,
    to,
    timestamp,
  };

  // Optimistic update
  dispatch(addMessage({ convId: to, message: localMsg }));
  dispatch(
    addOrUpdateConversation({
      id: to,
      name: userMap[to] || to,
      participants: [to],
      lastMessage: content,
      lastAt: timestamp,
    })
  );

  //  Check connection before sending
  if (!isWebsocketConnected()) {
    console.warn("WebSocket not connected yet — retrying shortly...");
    setTimeout(() => {
      if (isWebsocketConnected()) {
        sendChatMessage(localMsg);
      } else {
        console.error("❌ Still not connected, message not sent");
      }
    }, 800);
  } else {
    sendChatMessage(localMsg);
  }
};


  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left panel */}
      <div className="w-1/3 bg-white rounded-l-2xl shadow-lg overflow-hidden relative">
        <div className="flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="black"
              viewBox="0 0 24 24"
              className="w-8 h-8"
            >
              <path d="M12 2C6.48 2 2 6.02 2 10.5C2 13.11 3.53 15.42 6 16.93V22L10.38 19.47C10.9 19.49 11.44 19.5 12 19.5C17.52 19.5 22 15.98 22 11.5C22 7.02 17.52 2 12 2Z" />
            </svg>
            <div className="text-2xl font-bold text-black">Chat App</div>
          </div>
          <button
            onClick={() => {
              // make sure latest users list is fetched
              fetchUsers();
              setShowUserList(true);
            }}
            className="bg-gray-900 text-white px-3 py-1 rounded-lg hover:opacity-80 transition"
          >
            + New Chat
          </button>
        </div>

        <ChatList
          conversations={conversations}
          activeId={activeId}
          onSelect={onSelectConversation}
        />

        {/* User List Modal */}
        {showUserList && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center">
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
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-gray-900 text-white rounded-r-2xl">
        <ChatWindow
          conversation={activeConversation}
          me={meEmail}
          messages={convMessages}
          onSend={handleSendMessage}
        />
      </div>
    </div>
  );
};

export default Dashboard;
