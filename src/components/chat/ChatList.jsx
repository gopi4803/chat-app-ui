const Avatar = ({ name, online }) => {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";
  return (
    <div className="relative">
      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-semibold">
        {initials}
      </div>
      <div
        className={`absolute right-0 bottom-0 w-3 h-3 rounded-full border-2 border-white ${
          online ? "bg-green-400" : "bg-gray-400"
        }`}
      />
    </div>
  );
};

const ChatList = ({ conversations = [], activeId, onSelect, presenceMap = {} }) => {
  return (
    <div className="w-full h-full px-6 py-6">
      <h3 className="text-gray-600 mb-4">Conversations</h3>

      <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-2">
        {conversations.length === 0 && (
          <div className="text-gray-400">No conversations yet</div>
        )}
        {conversations.map((c) => {
          const presence = presenceMap[c.id];
          const online = presence?.online || false;

          return (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                activeId === c.id ? "bg-gray-100" : "hover:bg-gray-50"
              }`}
            >
              <Avatar name={c.name || c.id} online={online} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-800">{c.name || c.id}</div>
                  <div className="text-sm text-gray-400">
                    {c.lastAt ? formatTime(c.lastAt) : ""}
                  </div>
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {c.lastMessage || "Say hi!"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function formatTime(ts) {
  try {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay)
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

export default ChatList;
