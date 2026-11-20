import { ArrowLeft, FileCode2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function WorkspaceHeader({ problem }) {
  return (
    <header className="workspace-topbar">
      <Link to="/problems" className="back-to-problems">
        <ArrowLeft size={17} />
        <span>Problems</span>
      </Link>

      <div className="workspace-breadcrumb">
        <span>/</span>
        <strong>{problem.title}</strong>
      </div>

      <div className="workspace-top-actions">
        <span className="workspace-language-label">
          <FileCode2 size={15} /> JavaScript
        </span>
        <Link to="/" className="workspace-home-link">
          Dashboard
        </Link>
      </div>
    </header>
  );
}
