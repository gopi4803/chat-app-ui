import React from "react";

const GroupList = ({ groups = [], activeGroupId, onSelect }) => {
  return (
    <div className="px-4 py-4">
      <h3 className="text-gray-600 mb-4">Groups</h3>
      <div className="space-y-3">
        {groups.length === 0 && <div className="text-gray-400">No groups yet</div>}
        {groups.map((g) => (
          <div
            key={g.id}
            onClick={() => onSelect(g)}
            className={`p-3 rounded-lg cursor-pointer flex items-center justify-between ${
              activeGroupId === g.id ? "bg-gray-100" : "hover:bg-gray-50"
            }`}
          >
            <div>
              <div className="font-semibold text-gray-800">{g.name}</div>
              <div className="text-xs text-gray-500">
                {g.members?.length || 0} members
              </div>
            </div>
            <div className="text-sm text-gray-400">{/* placeholder for timestamp */}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupList;
