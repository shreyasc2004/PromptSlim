import re
import networkx as nx
import spacy
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from transformers import pipeline

print("Loading spaCy...")
nlp = spacy.load("en_core_web_sm")

print("Loading sentence embeddings...")
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

print("Loading DeBERTa NLI (~180MB)...")
nli_model = pipeline(
    "zero-shot-classification",
    model="cross-encoder/nli-deberta-v3-small"
)
print("All models ready.")

FORCE_LOGIC = {
    "if","then","not","no","all","every","some","none",
    "and","or","but","either","neither","nor","only","unless",
    "therefore","because","always","never","who","which","that",
    "will","would","must","can","cannot","both","when","whenever"
}

def count_tokens(text):
    return len(text.split())

def semantic_similarity(a, b):
    embs = embed_model.encode([a, b])
    return float(cosine_similarity([embs[0]], [embs[1]])[0][0])

def entity_retention(original, compressed):
    e1 = set(ent.text.lower() for ent in nlp(original).ents)
    e2 = set(ent.text.lower() for ent in nlp(compressed).ents)
    return len(e1 & e2) / len(e1) if e1 else 1.0

def estimate_cost_savings(original_tokens, compressed_tokens, price_per_1k=0.015):
    saved   = original_tokens - compressed_tokens
    per_req = (saved / 1000) * price_per_1k
    return {
        "saved_tokens":       saved,
        "saving_per_request": round(per_req, 6),
        "saving_1k_calls":    round(per_req * 1000, 4),
        "saving_10k_calls":   round(per_req * 10000, 4),
    }

def split_into_clauses(text):
    doc     = nlp(text)
    clauses = [s.text.strip() for s in doc.sents if s.text.strip()]
    if len(clauses) == 1:
        connectives = r"\b(and|but|or|therefore|however|moreover|furthermore|unless|although)\b"
        parts = re.split(connectives, text, flags=re.IGNORECASE)
        parts = [
            p.strip() for p in parts
            if p.strip() and p.lower() not in
            {"and","but","or","therefore","however","moreover","furthermore","unless","although"}
        ]
        if len(parts) > 1:
            clauses = parts
    return clauses

def score_clauses_nli(clauses, conclusion):
    scored = []
    for clause in clauses:
        if len(clause.split()) < 3:
            scored.append((clause, 0.0))
            continue
        try:
            result = nli_model(clause, candidate_labels=[conclusion], hypothesis_template="{}")
            score  = result["scores"][0]
        except Exception:
            score = 0.0
        scored.append((clause, score))
    return scored

def detect_prompt_type(clauses, conclusion):
    if not conclusion or len(clauses) < 2:
        return "general"
    scored = score_clauses_nli(clauses, conclusion)
    scores = [s for _, s in scored]
    avg    = sum(scores) / len(scores) if scores else 0
    return "logical" if avg > 0.25 else "general"

def compress_entailment(premises, conclusion, threshold=0.4):
    clauses = split_into_clauses(premises)
    if len(clauses) == 1:
        return premises, [], clauses

    scored  = score_clauses_nli(clauses, conclusion)
    kept    = [(c, s) for c, s in scored if s >= threshold]
    dropped = [(c, s) for c, s in scored if s < threshold]

    if not kept:
        best    = max(scored, key=lambda x: x[1])
        kept    = [best]
        dropped = [(c, s) for c, s in scored if c != best[0]]

    if len(kept) == len(clauses) and len(clauses) > 2:
        new_scored = sorted(scored, key=lambda x: x[1], reverse=True)
        n_keep     = max(1, int(len(clauses) * 0.65))
        kept       = new_scored[:n_keep]
        dropped    = new_scored[n_keep:]

    kept_texts    = [c for c, _ in kept]
    dropped_texts = [c for c, _ in dropped]
    return " ".join(kept_texts), dropped_texts, clauses

def compress_general(text, ratio=0.65):
    doc       = nlp(text)
    sentences = [s.text.strip() for s in doc.sents if s.text.strip()]
    if len(sentences) <= 1:
        return text, [], sentences

    full_emb  = embed_model.encode([text])
    sent_embs = embed_model.encode(sentences)
    scores    = cosine_similarity(sent_embs, full_emb).flatten()

    n_keep    = max(1, int(len(sentences) * ratio))
    ranked    = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
    top_idx   = set(ranked[:n_keep])

    kept    = [sentences[i] for i in sorted(top_idx)]
    dropped = [sentences[i] for i in range(len(sentences)) if i not in top_idx]
    return " ".join(kept), dropped, sentences

def run_compression(prompt, conclusion=None, ratio=0.65):
    original_tokens = count_tokens(prompt)
    clauses         = split_into_clauses(prompt)
    prompt_type     = detect_prompt_type(clauses, conclusion) if conclusion else "general"

    if prompt_type == "logical":
        compressed, dropped_clauses, all_clauses = compress_entailment(prompt, conclusion)
        ratio_achieved = len(compressed.split()) / max(1, original_tokens)
        if ratio_achieved > 0.9:
            compressed, dropped_clauses, all_clauses = compress_general(prompt, ratio)
            prompt_type = "general"
    else:
        compressed, dropped_clauses, all_clauses = compress_general(prompt, ratio)

    compressed_tokens = count_tokens(compressed)
    sim               = semantic_similarity(prompt, compressed)
    entities          = entity_retention(prompt, compressed)
    cost              = estimate_cost_savings(original_tokens, compressed_tokens)

    # Build explanation
    total   = len(all_clauses)
    dropped = len(dropped_clauses)
    kept    = total - dropped

    if prompt_type == "logical":
        if dropped == 0:
            explanation = f"All {total} clauses showed strong entailment signal — nothing was dropped."
        else:
            explanation = (
                f"{dropped} out of {total} clause{'s' if dropped > 1 else ''} "
                f"{'were' if dropped > 1 else 'was'} dropped because "
                f"{'they showed' if dropped > 1 else 'it showed'} low entailment signal "
                f"toward the conclusion. {kept} clause{'s' if kept > 1 else ''} retained."
            )
    else:
        if dropped == 0:
            explanation = f"All {total} sentences were relevant — nothing was dropped."
        else:
            explanation = (
                f"{dropped} out of {total} sentence{'s' if dropped > 1 else ''} "
                f"{'were' if dropped > 1 else 'was'} dropped due to low semantic "
                f"relevance to the overall prompt. {kept} sentence{'s' if kept > 1 else ''} retained."
            )

    return {
        "original_text":       prompt,
        "compressed_text":     compressed,
        "mode":                prompt_type,
        "original_tokens":     original_tokens,
        "compressed_tokens":   compressed_tokens,
        "compression_pct":     round((1 - compressed_tokens / original_tokens) * 100, 1),
        "semantic_similarity": round(sim * 100, 1),
        "entity_retention":    round(entities * 100, 1),
        "cost_savings":        cost,
        "explanation":         explanation,
        "dropped_clauses":     dropped_clauses,
    }