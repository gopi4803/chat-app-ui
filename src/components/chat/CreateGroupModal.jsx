import React, { useState } from "react";
import api, { getAccessToken } from "../uitility/api";

const CreateGroupModal = ({ visible, onClose, onCreated, allUsers = [], meEmail }) => {
  const [name, setName] = useState("");
  const [members, setMembers] = useState([]);
  const [creating, setCreating] = useState(false);

  const toggleMember = (email) => {
    setMembers((prev) => {
      if (prev.includes(email)) return prev.filter((p) => p !== email);
      return [...prev, email];
    });
  };

  const create = async () => {
    if (!name.trim()) return alert("Group name is required");
    setCreating(true);
    try {
      const payload = {
        name: name.trim(),
        members: members.filter((m) => m.toLowerCase() !== meEmail.toLowerCase()),
      };

      const token = getAccessToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      console.log("AccessToken inside CreateGroupModal", getAccessToken());

      const res = await api.post("/groups", payload, { headers });
      onCreated && onCreated(res.data);
      onClose && onClose();
    } catch (e) {
      console.error("Failed to create group", e);
      const msg = e?.response?.data?.error || e?.response?.statusText || e?.message || "Unknown error";
      alert("Failed to create group: " + msg);
    } finally {
      setCreating(false);
    }
  };

  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-50 bg-black bg-opacity-60 flex justify-center items-center">
      <div className="bg-white rounded-xl p-6 w-11/12 max-w-xl shadow-lg">
        <h3 className="text-lg font-bold mb-4">Create Group</h3>
        <div className="mb-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            className="w-full p-2 border rounded"
            disabled={creating}
          />
        </div>
        <div className="mb-3 max-h-48 overflow-y-auto">
          <div className="text-sm text-gray-600 mb-2">Select members (optional)</div>
          <div className="grid grid-cols-2 gap-2">
            {allUsers.map((u) => (
              <label
                key={u.email}
                className="flex items-center gap-2 p-2 border rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={members.includes(u.email)}
                  onChange={() => toggleMember(u.email)}
                  disabled={creating}
                />
                <div className="text-sm">
                  <div className="font-semibold">{u.username || u.email}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded border" disabled={creating}>
            Cancel
          </button>
          <button
            onClick={create}
            className="px-4 py-2 rounded bg-gray-900 text-white"
            disabled={creating}
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
