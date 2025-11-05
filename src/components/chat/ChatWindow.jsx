import { useState, useRef, useEffect } from "react";
import { publish } from "./websocketClient";

const ChatWindow = ({
  conversation,
  me,
  messages = [],
  onSend,
  isTyping,
  presenceRef,
}) => {
  const [text, setText] = useState("");
  const listRef = useRef();
  const typingTimeout = useRef(null);

  // Always treat conversation.id as string safely
  const convIdStr =
    conversation && conversation.id !== undefined
      ? String(conversation.id)
      : null;

  useEffect(() => {
    if (listRef.current)
      listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, conversation?.id]);

  // Send read receipt when user opens a private chat (skip for groups)
  useEffect(() => {
    if (!conversation || !me || conversation.isGroup) return;
    const convId = convIdStr;
    const myEmail = me.toLowerCase();

    const unread = messages.some(
      (m) => m.from && m.from !== myEmail && !m.readAt
    );
    if (!unread) return;

    const payload = {
      type: "READ_RECEIPT",
      from: convId,
      readAt: Date.now(),
    };

    const ok = publish("/app/chat.read", payload);
    if (!ok) {
      console.warn("Failed to publish read receipt for", convId);
    }
  }, [conversation?.id, me, messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced typing event
  const handleTyping = () => {
    if (!conversation?.id || !me) return;

    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {}, 1500);

    // If it's a group, publish group typing event
    if (conversation.isGroup) {
      publish("/app/group.typing", {
        groupId: Number(convIdStr),
      });
    } else {
      // Private chat typing event
      publish("/app/chat.typing", {
        type: "TYPING",
        from: me.toLowerCase(),
        to: convIdStr.toLowerCase(),
      });
    }
  };

  // Send handler (supports private + group)
  const handleSend = () => {
    if (!text.trim() || !conversation?.id) return;

    const messageId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "msg-" + Math.random().toString(36).slice(2, 9) + "-" + Date.now();

    // Group or private message sending
    if (conversation.isGroup) {
      onSend(Number(convIdStr), text.trim(), messageId);
    } else {
      onSend(convIdStr, text.trim(), messageId);
    }

    setText("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Select a conversation to start chatting
      </div>
    );
  }

  const meEmail = me?.toLowerCase();

  return (
    <div className="flex flex-col h-full px-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-700">
          {conversation.name
            ? conversation.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
            : "?"}
        </div>
        <div>
          <div className="text-lg font-bold">{conversation.name}</div>
          <div className="text-sm text-gray-500">
            {(() => {
              if (conversation.isGroup)
                return `${conversation.members?.length || 0} members`;
              const userPresence = presenceRef?.current?.[conversation.id];
              if (!userPresence) return "";
              if (userPresence.online) return "Online";
              if (userPresence.lastSeen) {
                const last = new Date(userPresence.lastSeen);
                return `Last seen at ${last.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`;
              }
              return "";
            })()}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-4 pb-6 bg-gray-900"
      >
        {messages.map((m, i) => {
          // System or group activity messages (like "X created the group")
          if (m.type === "GROUP_SYSTEM" || m.type === "SYSTEM") {
            return (
              <div
                key={`${
                  m.messageId || `sys-${i}-${m.timestamp}-${m.content.length}`
                }`}
                className="flex justify-center"
              >
                <div className="text-gray-400 italic text-sm text-center bg-gray-800 px-3 py-1 rounded-full">
                  {m.content}
                </div>
              </div>
            );
          }

          const mine = m.from === meEmail || m.sender === meEmail;
          const read = !!m.readAt;
          const delivered = !!m.delivered || !!m.readAt;
          const timeText = m.timestamp
            ? new Date(m.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";

          const StatusIcon = () => {
            if (!mine) return null;
            if (read) return <span className="ml-2 text-blue-400">✓✓</span>;
            if (delivered)
              return <span className="ml-2 text-gray-400">✓✓</span>;
            return <span className="ml-2 animate-pulse">…</span>;
          };

          return (
            <div
              key={`${
                m.messageId ||
                `sys-${i}-${m.timestamp || Date.now()}-${Math.random()
                  .toString(36)
                  .slice(2, 5)}`
              }`}
              className={`flex ${mine ? "justify-end" : ""}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-xl ${
                  mine
                    ? "bg-gray-300 text-gray-900"
                    : "bg-white text-gray-800 shadow-sm"
                }`}
              >
                {conversation.isGroup && !mine && (
                  <div className="text-xs font-semibold text-gray-500 mb-1">
                    {m.senderName?.trim() ||
                      m.displayName ||
                      m.fromName ||
                      m.sender ||
                      m.from}
                  </div>
                )}
                <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                <div className="text-xs mt-1 flex items-center justify-end gap-2">
                  <div className="text-gray-500">{timeText}</div>
                  <StatusIcon />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Typing indicator */}
      {isTyping && (
        <div className="flex items-center mb-2 ml-1">
          <div className="flex space-x-1 bg-gray-800 rounded-full px-3 py-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
          </div>
          <span className="text-gray-400 text-xs italic ml-2">
            {conversation.name || conversation.id} is typing...
          </span>
        </div>
      )}

      {/* Input area */}
      <div>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
          }}
          onKeyDown={onKeyDown}
          placeholder="Type a message..."
          className="w-full p-3 rounded-lg bg-gray-100 text-black resize-none focus:outline-none"
          rows={2}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSend}
            className="px-5 py-2 rounded-full bg-gray-900 text-white font-semibold hover:opacity-90"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
