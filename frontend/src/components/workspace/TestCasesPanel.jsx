export default function TestCasesPanel({
  testCases,
  selectedTest,
  setSelectedTest,
}) {
  return (
    <div className="test-cases-content">
      <div className="test-case-selector">
        {testCases.map((testCase, index) => (
          <button
            key={index}
            className={selectedTest === index ? "selected-test" : ""}
            onClick={() => setSelectedTest(index)}
          >
            {`Case ${index + 1}`}
          </button>
        ))}
      </div>

      <div className="test-input-group">
        <label>Input</label>
        <div className="test-input-value">
          {testCases[selectedTest]?.input}
        </div>
      </div>

      <div className="test-input-group">
        <label>Expected output</label>
        <div className="test-input-value">
          {testCases[selectedTest]?.expected}
        </div>
      </div>
    </div>
  );
}
