import { useState } from "react";

function StatBadge({ label, value, highlight }) {
  return (
    <div className={`stat-badge ${highlight ? "stat-badge--highlight" : ""}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function CostCard({ cost }) {
  return (
    <div className="cost-card">
      <h4 className="cost-title">💰 Estimated Cost Savings (GPT-4 pricing)</h4>
      <div className="cost-grid">
        <div className="cost-item">
          <span className="cost-num">${cost.saving_per_request}</span>
          <span className="cost-desc">per request</span>
        </div>
        <div className="cost-item">
          <span className="cost-num">${cost.saving_1k_calls}</span>
          <span className="cost-desc">per 1,000 calls</span>
        </div>
        <div className="cost-item">
          <span className="cost-num">${cost.saving_10k_calls}</span>
          <span className="cost-desc">per 10,000 calls</span>
        </div>
      </div>
    </div>
  );
}

function ExplanationCard({ explanation, droppedClauses, mode }) {
  const [showDropped, setShowDropped] = useState(false);

  return (
    <div className="explanation-card">
      <div className="explanation-header">
        <span className="explanation-icon">🧠</span>
        <span className="explanation-title">
          {mode === "logical" ? "Entailment Analysis" : "Relevance Analysis"}
        </span>
      </div>
      <p className="explanation-text">{explanation}</p>

      {droppedClauses && droppedClauses.length > 0 && (
        <div className="dropped-section">
          <button
            className="dropped-toggle"
            onClick={() => setShowDropped(!showDropped)}
          >
            {showDropped ? "▼" : "▶"} Show dropped {mode === "logical" ? "clauses" : "sentences"} ({droppedClauses.length})
          </button>
          {showDropped && (
            <div className="dropped-list">
              {droppedClauses.map((clause, i) => (
                <div key={i} className="dropped-item">
                  <span className="dropped-x">✕</span>
                  <span className="dropped-text">{clause}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResultPanel({ result }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(result.compressed_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="result-panel">

      {/* Stats row */}
      <div className="stats-row">
        <StatBadge
          label="Tokens saved"
          value={result.cost_savings?.saved_tokens ?? result.original_tokens - result.compressed_tokens}
          highlight
        />
        <StatBadge label="Compressed" value={`${result.compression_pct}%`} highlight />
        <StatBadge label="Similarity" value={`${result.semantic_similarity}%`} />
        <StatBadge label="Entities kept" value={`${result.entity_retention}%`} />
        {result.mode && (
          <div className="mode-badge">
            {result.mode === "logical" ? "🧠 Logic mode" : "📝 General mode"}
          </div>
        )}
      </div>

      {/* Token bar */}
      <div className="token-bar-wrapper">
        <div className="token-bar-label">
          <span>{result.original_tokens} tokens → {result.compressed_tokens} tokens</span>
        </div>
        <div className="token-bar-bg">
          <div
            className="token-bar-fill"
            style={{ width: `${(result.compressed_tokens / result.original_tokens) * 100}%` }}
          />
        </div>
      </div>

      {/* Explanation — the key differentiator */}
      {result.explanation && (
        <ExplanationCard
          explanation={result.explanation}
          droppedClauses={result.dropped_clauses}
          mode={result.mode}
        />
      )}

      {/* Compressed output */}
      <div className="output-box">
        <div className="output-header">
          <span className="output-label">Compressed Output</span>
          <button className="copy-btn" onClick={copy}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <div className="output-text">{result.compressed_text}</div>
      </div>

      {/* Cost savings */}
      {result.cost_savings && <CostCard cost={result.cost_savings} />}
    </div>
  );
}
