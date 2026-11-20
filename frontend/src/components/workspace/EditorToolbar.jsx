import {
  FileCode2,
  RotateCcw,
  Settings2,
} from "lucide-react";

export default function EditorToolbar({
  fontSize,
  setFontSize,
  resetCode,
}) {
  return (
    <div className="editor-toolbar">
      <div className="editor-toolbar-left">
        <span className="editor-file-icon">
          <FileCode2 size={15} />
        </span>
        <span>solution.js</span>
        <span className="editor-language-badge">JavaScript</span>
      </div>

      <div className="editor-toolbar-actions">
        <button
          title="Decrease font size"
          onClick={() => setFontSize((size) => Math.max(11, size - 1))}
        >
          A−
        </button>
        <button
          title="Increase font size"
          onClick={() => setFontSize((size) => Math.min(20, size + 1))}
        >
          A+
        </button>
        <button title="Reset code" onClick={resetCode}>
          <RotateCcw size={15} />
        </button>
        <button title="Editor settings" onClick={() => setFontSize(14)}>
          <Settings2 size={15} />
        </button>
      </div>
    </div>
  );
}
