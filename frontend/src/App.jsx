import { useState, useRef } from "react";
import CompressPanel from "./components/CompressPanel";
import ResultPanel from "./components/ResultPanel";
import Header from "./components/Header";

const API = import.meta.env.VITE_API_URL || "";

export default function App() {
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState(null);
  const [prompt, setPrompt]         = useState("");
  const [conclusion, setConclusion] = useState("");
  const [ratio, setRatio]           = useState(0.65);
  const [refreshCount, setRefreshCount] = useState(0);

  async function handleCompress() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API}/compress`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          conclusion: conclusion.trim() || null,
          ratio,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Server error");
      }
      const data = await res.json();
      setResult(data);
      // Trigger header counter refresh
      setRefreshCount(c => c + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <Header refreshTrigger={refreshCount} />
      <main className="main">
        <div className="workspace">
          <CompressPanel
            prompt={prompt}         setPrompt={setPrompt}
            conclusion={conclusion} setConclusion={setConclusion}
            ratio={ratio}           setRatio={setRatio}
            loading={loading}
            onCompress={handleCompress}
          />
          <div className="result-area">
            {error && <div className="error-box">Error: {error}</div>}
            {!result && !loading && !error && (
              <div className="placeholder">
                <div className="placeholder-icon">⚡</div>
                <p>Paste a prompt and hit Compress</p>
                <p className="placeholder-sub">Your compressed output appears here</p>
              </div>
            )}
            {loading && (
              <div className="placeholder">
                <div className="spinner" />
                <p>Compressing...</p>
              </div>
            )}
            {result && !loading && <ResultPanel result={result} />}
          </div>
        </div>
      </main>
    </div>
  );
}
