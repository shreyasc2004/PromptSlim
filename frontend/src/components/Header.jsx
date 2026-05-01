import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "";

export default function Header({ refreshTrigger }) {
  const [count, setCount] = useState(null);

  useEffect(() => {
    fetch(`${API}/count`)
      .then(r => r.json())
      .then(d => setCount(d.count))
      .catch(() => setCount(null));
  }, [refreshTrigger]); // re-fetches after every compression

  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">PromptSlim</span>
          <span className="logo-badge">beta</span>
        </div>
        <p className="header-sub">
          Reduce LLM token costs by up to 60% — without losing meaning
        </p>
        {count !== null && (
          <div className="counter-pill">
            <span className="counter-dot" />
            <span className="counter-text">
              <strong>{count.toLocaleString()}</strong> prompts compressed
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
