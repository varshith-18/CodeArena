import Editor from "@monaco-editor/react";

export default function CodeEditor({ code, setCode, fontSize }) {
  return (
    <div className="monaco-container">
      <Editor
        height="100%"
        language="javascript"
        theme="vs-dark"
        value={code}
        onChange={(value) => setCode(value ?? "")}
        options={{
          fontSize,
          minimap: { enabled: false },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: { top: 18, bottom: 18 },
          wordWrap: "on",
          tabSize: 2,
          lineNumbers: "on",
          renderLineHighlight: "all",
          roundedSelection: false,
          contextmenu: true,
          suggestOnTriggerCharacters: true,
        }}
      />
    </div>
  );
}
