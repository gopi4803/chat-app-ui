// src/components/chat/ChatWindow.jsx
import React, { useState, useRef, useEffect } from "react";

const ChatWindow = ({ conversation, me, messages = [], onSend }) => {
  const [text, setText] = useState("");
  const listRef = useRef();

  // Scroll on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, conversation?.id]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Select a conversation to start chatting
      </div>
    );
  }

  const handleSend = () => {
    if (!text.trim()) return;
    if (!onSend || !conversation?.id) return;

    onSend(conversation.id, text.trim());
    setText("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
          <div className="text-sm text-gray-500">{conversation.id}</div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-4 pb-6 bg-gray-900"
      >
        {messages.map((m, i) => {
          const mine = m.from === me;
          return (
            <div key={i + "-" + (m.timestamp || 0)} className={`flex ${mine ? "justify-end" : ""}`}>
              <div
                className={`max-w-[70%] p-3 rounded-xl ${mine ? "bg-gray-300 text-gray-900" : "bg-white text-gray-800 shadow-sm"}`}
              >
                <div className="text-sm">{m.content}</div>
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {new Date(m.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="mt-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
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
