import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";

const StatusPrivacyModal = ({ isOpen, onClose, defaultPrivacy, onSave }) => {
  const [privacy, setPrivacy] = useState(defaultPrivacy?.visibility || "contacts");
  const [specificUsers, setSpecificUsers] = useState(defaultPrivacy?.specificUsers || []);
  const [contactSearch, setContactSearch] = useState("");
  const [filteredContacts, setFilteredContacts] = useState([]);
  const { allUsers, getAllUsers } = useChatStore();

  useEffect(() => {
    if ((privacy === "contactsExcept" || privacy === "onlyShareWith") && allUsers.length === 0) {
      getAllUsers();
    }
  }, [privacy, allUsers.length, getAllUsers]);

  useEffect(() => {
    if (contactSearch.trim() && allUsers.length > 0) {
      setFilteredContacts(
        allUsers.filter(u =>
          u.fullName.toLowerCase().includes(contactSearch.toLowerCase()) ||
          u.username.toLowerCase().includes(contactSearch.toLowerCase())
        )
      );
    } else {
      setFilteredContacts(allUsers);
    }
  }, [contactSearch, allUsers]);

  useEffect(() => {
    setPrivacy(defaultPrivacy?.visibility || "contacts");
    setSpecificUsers(defaultPrivacy?.specificUsers || []);
  }, [defaultPrivacy]);

  const handleSave = () => {
    onSave({ visibility: privacy, specificUsers });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="status-modal-glass w-full max-w-md max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
          <h2 className="text-xl font-bold tracking-tight">Status Privacy Settings</h2>
          <button onClick={onClose} className="status-action-btn cancel px-3 py-2" type="button" aria-label="Close">✕</button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(92vh-120px)]">
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input type="radio" name="privacy" value="contacts" checked={privacy === "contacts"} onChange={() => setPrivacy("contacts")}
                className="radio radio-primary radio-sm" />
              <span className="text-sm">My contacts</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="privacy" value="contactsExcept" checked={privacy === "contactsExcept"} onChange={() => setPrivacy("contactsExcept")}
                className="radio radio-primary radio-sm" />
              <span className="text-sm">My contacts except...</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="privacy" value="onlyShareWith" checked={privacy === "onlyShareWith"} onChange={() => setPrivacy("onlyShareWith")}
                className="radio radio-primary radio-sm" />
              <span className="text-sm">Only share with...</span>
            </label>
          </div>
          {(privacy === "contactsExcept" || privacy === "onlyShareWith") && (
            <div className="bg-base-200 p-2 rounded mt-4">
              <input type="text" className="input input-bordered w-full text-sm mb-2" placeholder="Search contacts..." value={contactSearch} onChange={e => setContactSearch(e.target.value)} />
              <div className="max-h-40 overflow-y-auto border rounded bg-base-100">
                {filteredContacts.length === 0 && (
                  <div className="p-2 text-xs text-base-content/60">No contacts found.</div>
                )}
                {filteredContacts.map(user => (
                  <label key={user._id} className="flex items-center gap-2 px-2 py-1 hover:bg-base-200 cursor-pointer">
                    <input type="checkbox" checked={specificUsers.includes(user._id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSpecificUsers(prev => [...prev, user._id]);
                        } else {
                          setSpecificUsers(prev => prev.filter(id => id !== user._id));
                        }
                      }}
                      className="checkbox checkbox-sm checkbox-primary"
                    />
                    <img src={user.profilePic} alt={user.fullName} className="w-6 h-6 rounded-full object-cover" />
                    <span className="text-sm">{user.fullName} <span className="text-xs text-base-content/60">@{user.username}</span></span>
                  </label>
                ))}
              </div>
              <div className="mt-2 text-xs text-base-content/60">
                {privacy === 'contactsExcept'
                  ? `All contacts except selected will see your status.`
                  : `Only selected contacts will see your status.`}
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="status-action-btn cancel flex-1">Cancel</button>
            <button onClick={handleSave} className="status-action-btn primary flex-1">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusPrivacyModal;
