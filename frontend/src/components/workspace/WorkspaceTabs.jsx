import { BookOpen, Clock3 } from "lucide-react";

export default function WorkspaceTabs({
  activeTab,
  setActiveTab,
  fetchSubmissions,
}) {
  return (
    <div className="workspace-tabs">
      <button
        className={activeTab === "description" ? "active" : ""}
        onClick={() => setActiveTab("description")}
      >
        <BookOpen size={16} /> Description
      </button>
      <button
        className={activeTab === "submissions" ? "active" : ""}
        onClick={() => {
          setActiveTab("submissions");
          fetchSubmissions();
        }}
      >
        <Clock3 size={16} /> Submissions
      </button>
    </div>
  );
}
