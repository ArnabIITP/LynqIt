import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAIStore } from "../store/useAIStore";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const { selectedGroup } = useGroupStore();
  const { isSelected: isAISelected } = useAIStore();

  return (
    <div className="h-screen bg-base-100">
      <div className="flex h-full">
        <div className="bg-base-100 w-full h-full border border-base-200/50">
          <div className="flex h-full overflow-hidden">
            <Sidebar />

            {!selectedUser && !selectedGroup && !isAISelected ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>
      </div>
    </div>
  );
};
export default HomePage;