import { useState, useRef, useEffect } from "react";
import { publish, publishGroupRead } from "./websocketClient";

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
  const lastPrivateReadConvRef = useRef(null);
const lastGroupReadMapRef = useRef({});


  const convIdStr =
    conversation && conversation.id !== undefined
      ? String(conversation.id)
      : null;

  useEffect(() => {
    if (listRef.current)
      listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, conversation?.id]);

  // MARK AS READ (PRIVATE + GROUP)
  useEffect(() => {
  if (!conversation || !me) return;

  const myEmail = me.toLowerCase();
  const convId = conversation.id;
  if (!convId) return;

  /* PRIVATE CHAT (1-to-1) */
  if (!conversation.isGroup) {
    // Prevent repeated reads for the same opened conversation
    if (lastPrivateReadConvRef.current === convId) return;

    const unreadExists = messages.some(
      (m) =>
        m.from?.toLowerCase() !== myEmail &&
        !m.readAt
    );

    if (!unreadExists) return;

    publish("/app/chat.read", {
      type: "READ_RECEIPT",
      from: String(convId),
      readAt: Date.now(),
    });

    // Mark read sent for this conversation
    lastPrivateReadConvRef.current = convId;
    return;
  }

  /* GROUP CHAT */
  const alreadyReadIds =
    lastGroupReadMapRef.current[convId] || new Set();

  const unreadIds = messages
    .filter((m) => {
      const sender = (m.sender || m.from || "").toLowerCase();
      if (!sender || sender === myEmail) return false;

      const messageId = m.messageId;
      if (!messageId) return false;
      if (alreadyReadIds.has(messageId)) return false;
      const alreadyReadOnServer = (m.readRecipients || []).some((r) => {
        const email = (r?.email || r).toLowerCase();
        return email === myEmail;
      });

      return !alreadyReadOnServer;
    })
    .map((m) => m.messageId);

  if (unreadIds.length > 0) {
    publishGroupRead(Number(convId), unreadIds.slice(-50));

    // Remember these reads locally to avoid re-sending
    const updatedSet = new Set(alreadyReadIds);
    unreadIds.forEach((id) => updatedSet.add(id));
    lastGroupReadMapRef.current[convId] = updatedSet;
  }
}, [conversation?.id, me, messages]);


  //TYPING 
  const handleTyping = () => {
    if (!conversation?.id || !me) return;

    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {}, 1500);

    if (conversation.isGroup) {
      publish("/app/group.typing", { groupId: Number(convIdStr) });
    } else {
      publish("/app/chat.typing", {
        type: "TYPING",
        from: me.toLowerCase(),
        to: convIdStr.toLowerCase(),
      });
    }
  };

  //SEND
  const handleSend = () => {
    if (!text.trim() || !conversation?.id) return;

    const messageId =
      crypto?.randomUUID?.() ||
      "msg-" + Math.random().toString(36).slice(2) + "-" + Date.now();

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

  const SmallAvatar = ({ email }) => {
    const initials = email
      ?.split("@")[0]
      ?.split(".")
      ?.map((n) => n[0])
      ?.slice(0, 2)
      ?.join("")
      ?.toUpperCase();
    return (
      <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-semibold">
        {initials || "?"}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full px-8 py-6">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-700">
          {conversation.name
            ?.split(" ")
            ?.map((n) => n[0])
            ?.slice(0, 2)
            ?.join("") || "?"}
        </div>
        <div>
          <div className="text-lg font-bold">{conversation.name}</div>
          <div className="text-sm text-gray-500">
            {conversation.isGroup
              ? `${conversation.members?.length || 0} members`
              : (() => {
                  const p = presenceRef?.current?.[conversation.id];
                  if (!p) return "";
                  if (p.online) return "Online";
                  if (p.lastSeen)
                    return `Last seen at ${new Date(p.lastSeen).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`;
                  return "";
                })()}
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-4 pb-6 bg-gray-900"
      >
        {messages.map((m, i) => {
          if (m.type === "SYSTEM" || m.type === "GROUP_SYSTEM") {
            return (
              <div key={i} className="flex justify-center">
                <div className="text-gray-400 italic text-sm bg-gray-800 px-3 py-1 rounded-full">
                  {m.content}
                </div>
              </div>
            );
          }

          const mine = (m.from || m.sender) === meEmail;
          const readRecipients = m.readRecipients || [];
          const deliveredRecipients = m.deliveredRecipients || [];

          let deliveredAll = false;
          let readAll = false;

          if (conversation.isGroup) {
            const total =
              (conversation.members?.length || 1) - 1;
            deliveredAll =
              total > 0 && deliveredRecipients.length >= total;
            readAll = total > 0 && readRecipients.length >= total;
          }

          const StatusIcon = () => {
            if (!mine) return null;

            //GROUP
            if (conversation.isGroup) {
              if (readAll) return <span className="ml-2 text-blue-400">✓✓</span>;
              if (deliveredAll)
                return <span className="ml-2 text-gray-400">✓✓</span>;
              return <span className="ml-2 text-gray-400">✓</span>;
            }

            //PRIVATE
            if (m.readAt)
              return <span className="ml-2 text-blue-400">✓✓</span>;
            if (m.delivered)
              return <span className="ml-2 text-gray-400">✓✓</span>;
            return <span className="ml-2 text-gray-400">✓</span>;
          };

          return (
            <div
              key={m.messageId || i}
              className={`flex ${mine ? "justify-end" : ""}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-xl ${
                  mine
                    ? "bg-gray-300 text-gray-900"
                    : "bg-white text-gray-800"
                }`}
              >
                {conversation.isGroup && !mine && (
                  <div className="text-xs font-semibold text-gray-500 mb-1">
                    {m.senderName || m.sender}
                  </div>
                )}

                <div className="text-sm whitespace-pre-wrap">{m.content}</div>

                <div className="text-xs mt-1 flex items-center justify-end gap-2">
                  <span className="text-gray-500">
                    {m.timestamp &&
                      new Date(m.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                  </span>

                  {mine &&
                    conversation.isGroup &&
                    readRecipients.length > 0 && (
                      <div className="flex gap-1 mr-2">
                        {readRecipients.slice(0, 3).map((r, idx) => (
                          <SmallAvatar
                            key={idx}
                            email={r.email || r}
                          />
                        ))}
                        {readRecipients.length > 3 && (
                          <span className="text-xs text-gray-600">
                            +{readRecipients.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  <StatusIcon />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* TYPING */}
      {isTyping && (
        <div className="flex items-center mb-2 ml-1">
          <div className="flex space-x-1 bg-gray-800 rounded-full px-3 py-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300" />
          </div>
          <span className="text-gray-400 text-xs italic ml-2">
            {conversation.name} is typing...
          </span>
        </div>
      )}

      {/* INPUT */}
      <div>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
          }}
          onKeyDown={onKeyDown}
          placeholder="Type a message..."
          className="w-full p-3 rounded-lg bg-gray-100 text-black resize-none"
          rows={2}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSend}
            className="px-5 py-2 rounded-full bg-gray-900 text-white font-semibold"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
