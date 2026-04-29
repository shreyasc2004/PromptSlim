export default function CompressPanel({
  prompt, setPrompt,
  conclusion, setConclusion,
  ratio, setRatio,
  loading, onCompress,
}) {
  const tokenCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;

  return (
    <div className="input-panel">
      <div className="field">
        <div className="field-header">
          <label className="field-label">Your Prompt</label>
          <span className="token-count">{tokenCount} tokens</span>
        </div>
        <textarea
          className="textarea"
          placeholder="Paste your long prompt here..."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={10}
        />
      </div>

      <div className="field">
        <label className="field-label">
          Conclusion <span className="optional">(optional — for logical prompts)</span>
        </label>
        <input
          className="input"
          placeholder="e.g. Socrates is mortal"
          value={conclusion}
          onChange={e => setConclusion(e.target.value)}
        />
      </div>

      <div className="field">
        <div className="field-header">
          <label className="field-label">Compression Strength</label>
          <span className="ratio-label">Keep {Math.round(ratio * 100)}% of tokens</span>
        </div>
        <input
          type="range" className="slider"
          min={0.3} max={0.9} step={0.05}
          value={ratio}
          onChange={e => setRatio(parseFloat(e.target.value))}
        />
        <div className="slider-hints">
          <span>Aggressive</span>
          <span>Conservative</span>
        </div>
      </div>

      <button
        className="compress-btn"
        onClick={onCompress}
        disabled={loading || !prompt.trim()}
      >
        {loading ? "Compressing..." : "Compress →"}
      </button>
    </div>
  );
}
