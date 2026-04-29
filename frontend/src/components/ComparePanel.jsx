import { useState } from "react";

function MethodCard({ name, tag, data, color }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(data.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="method-card" style={{ borderTopColor: color }}>
      <div className="method-card-header">
        <div>
          <span className="method-card-name">{name}</span>
          <span className="method-card-tag" style={{ background: color }}>{tag}</span>
        </div>
        <button className="copy-btn" onClick={copy}>
          {copied ? "✓" : "Copy"}
        </button>
      </div>

      <div className="method-stats">
        <div className="method-stat">
          <span className="method-stat-val">{data.compression_pct}%</span>
          <span className="method-stat-key">saved</span>
        </div>
        <div className="method-stat">
          <span className="method-stat-val">{data.tokens}</span>
          <span className="method-stat-key">tokens</span>
        </div>
        <div className="method-stat">
          <span className="method-stat-val">{data.semantic_similarity}%</span>
          <span className="method-stat-key">similarity</span>
        </div>
        {data.entity_retention && (
          <div className="method-stat">
            <span className="method-stat-val">{data.entity_retention}%</span>
            <span className="method-stat-key">entities</span>
          </div>
        )}
      </div>

      <div className="method-output">{data.text}</div>

      {data.cost_savings && (
        <div className="method-cost">
          💰 ${data.cost_savings.saving_1k_calls} saved per 1k calls
        </div>
      )}
    </div>
  );
}

export default function ComparePanel({ result }) {
  const methods = [
    { key: "ours",      name: "Ours (Entailment)", tag: "Recommended", color: "#f59e0b" },
    { key: "bc",        name: "BC Model",           tag: "Baseline",    color: "#6366f1" },
    { key: "llmlingua", name: "LLMLingua",          tag: "SOTA",        color: "#10b981" },
  ];

  return (
    <div className="compare-panel">
      <div className="compare-header">
        <span className="compare-original">
          Original: <strong>{result.original_tokens} tokens</strong>
        </span>
      </div>

      {/* Bar chart comparison */}
      <div className="compare-bars">
        {methods.map(m => {
          const d = result[m.key];
          if (!d) return null;
          return (
            <div key={m.key} className="compare-bar-row">
              <span className="compare-bar-label">{m.name}</span>
              <div className="compare-bar-track">
                <div
                  className="compare-bar-fill"
                  style={{
                    width: `${(d.tokens / result.original_tokens) * 100}%`,
                    background: m.color
                  }}
                />
              </div>
              <span className="compare-bar-stat">{d.tokens} tokens ({d.compression_pct}% saved)</span>
            </div>
          );
        })}
      </div>

      {/* Method cards */}
      <div className="method-cards">
        {methods.map(m => {
          const d = result[m.key];
          if (!d) return null;
          return (
            <MethodCard
              key={m.key}
              name={m.name}
              tag={m.tag}
              data={d}
              color={m.color}
            />
          );
        })}
      </div>
    </div>
  );
}
