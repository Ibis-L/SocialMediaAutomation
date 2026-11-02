import polars as pl
import numpy as np
from datasketch import MinHash, MinHashLSH

try:
    from sentence_transformers import SentenceTransformer
    import faiss
except ImportError:
    raise ImportError("Please install semantic dependencies: pip install sentence-transformers faiss-cpu")


class EnterpriseDataDeduplicator:
    def __init__(self,
                 jaccard_threshold: float = 0.85,
                 semantic_threshold: float = 0.88,
                 model_name: str = "all-MiniLM-L6-v2",
                 num_perm: int = 128,
                 min_tokens_for_lsh: int = 5,
                 semantic_date_window_days: int = 5,
                 semantic_neighbors_k: int = 5,
                 tracking_params: set | None = None):
        self.jaccard_threshold = jaccard_threshold
        self.semantic_threshold = semantic_threshold
        self.num_perm = num_perm
        self.model_name = model_name
        self.min_tokens_for_lsh = min_tokens_for_lsh
        self.semantic_date_window_days = semantic_date_window_days
        self.semantic_neighbors_k = semantic_neighbors_k
        self.tracking_params = tracking_params or {
            "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
            "fbclid", "gclid", "ref", "cmpid", "source"
        }
        self.model = None
        self.audit_log = []  # dicts: dropped_id, kept_id, tier, score, reason

    # ---------- helpers ----------

    def _strip_tracking_params_expr(self, url_col: str) -> pl.Expr:
        # Normalize baseline string
        base = pl.col(url_col).cast(pl.String).fill_null("").str.strip_chars().str.to_lowercase()
        
        # Safe extraction via regex: capture everything before '?'
        no_query = base.str.extract(r"^([^?]+)").fill_null(base)
        
        # Safe extraction via regex: capture everything after '?' (returns null if no '?')
        query_part = base.str.extract(r"\?(.*)$").fill_null("")

        def _clean_query(q: str) -> str:
            if not q:
                return ""
            # Strip out parameters found in our blacklisted tracking set
            kept = [kv for kv in q.split("&") if kv.split("=")[0] not in self.tracking_params]
            return "&".join(kept)

        # Map tracking parameter removal safely over query segments
        cleaned_query = query_part.map_elements(_clean_query, return_dtype=pl.String)
        
        return (
            pl.when(cleaned_query == "")
            .then(no_query)
            .otherwise(no_query + pl.lit("?") + cleaned_query)
        ).alias("clean_url")

    def _get_minhash(self, text: str):
        if not isinstance(text, str):
            return None
        tokens = text.lower().split()
        if len(tokens) < self.min_tokens_for_lsh:
            return None
        m = MinHash(num_perm=self.num_perm)
        for i in range(len(tokens) - 2):
            m.update(" ".join(tokens[i:i + 3]).encode("utf-8"))
        return m

    def _record_dropped(self, dropped_id, kept_id, tier: str, score: float, reason: str):
        self.audit_log.append({
            "dropped_id": dropped_id, "kept_id": kept_id,
            "tier": tier, "score": score, "reason": reason,
        })

    # ---------- tiers ----------

    def run_url_filter(self, df: pl.DataFrame, url_col: str,
                        id_col: str, body_col: str, date_col: str) -> pl.DataFrame:
        """TIER 1: fully vectorized — no per-row Python loop over the whole dataset.
        Winner per clean_url = longest body, ties broken by earliest date."""
        print(f"[Start] Total ingested records: {df.height}")

        df = df.with_columns(self._strip_tracking_params_expr(url_col))
        has_url = df.filter(pl.col("clean_url") != "")
        no_url = df.filter(pl.col("clean_url") == "")

        has_url = has_url.with_columns(
            pl.col(body_col).fill_null("").str.len_chars().alias("_body_len")
        )
        ranked = has_url.sort(by=["clean_url", "_body_len", date_col], descending=[False, True, False])
        ranked = ranked.with_columns(pl.int_range(pl.len()).over("clean_url").alias("_rank"))

        winners = ranked.filter(pl.col("_rank") == 0).drop(["_body_len", "_rank"])
        losers = ranked.filter(pl.col("_rank") != 0)

        if losers.height > 0:
            loser_ids = losers.get_column(id_col).to_numpy()
            loser_urls = losers.get_column("clean_url").to_numpy()
            win_map = dict(zip(
                winners.get_column("clean_url").to_numpy(),
                winners.get_column(id_col).to_numpy(),
            ))
            for lid, url in zip(loser_ids, loser_urls):
                self._record_dropped(lid, win_map[url], "tier1_url", 1.0, "duplicate normalized URL")

        df = pl.concat([winners, no_url])
        print(f"[Tier 1] Remaining after URL filtering: {df.height}")
        return df

    def run_fuzzy_lsh_filter(self, df: pl.DataFrame, id_col: str, subheading_col: str,
                              body_col: str, date_col: str) -> pl.DataFrame:
        """TIER 2: LSH is inherently sequential (datasketch has no vectorized API),
        but iterates over flat lists pulled once from Polars columns instead of
        materializing row dicts via .to_dicts()."""
        lsh = MinHashLSH(threshold=self.jaccard_threshold, num_perm=self.num_perm)
        kept_signatures = {}  # doc_id -> (minhash, body_len)
        dropped = set()

        ids = df.get_column(id_col).to_list()
        subheadings = df.get_column(subheading_col).to_list()
        bodies = df.get_column(body_col).to_list()

        for doc_id, subheading, body in zip(ids, subheadings, bodies):
            subheading = subheading or ""
            body = body or ""
            combined_text = f"{subheading} {body}".strip()
            body_len = len(body)

            m_hash = self._get_minhash(combined_text)
            if m_hash is None:
                continue

            matches = lsh.query(m_hash)
            if matches:
                rival_id = matches[0]
                rival_hash, rival_len = kept_signatures[rival_id]
                if body_len > rival_len:
                    lsh.remove(rival_id)
                    lsh.insert(doc_id, m_hash)
                    kept_signatures[doc_id] = (m_hash, body_len)
                    del kept_signatures[rival_id]
                    dropped.add(rival_id)
                    dropped.discard(doc_id)
                    self._record_dropped(rival_id, doc_id, "tier2_lsh", self.jaccard_threshold, "lexical near-duplicate")
                else:
                    dropped.add(doc_id)
                    self._record_dropped(doc_id, rival_id, "tier2_lsh", self.jaccard_threshold, "lexical near-duplicate")
            else:
                lsh.insert(doc_id, m_hash)
                kept_signatures[doc_id] = (m_hash, body_len)

        df_cleaned = df.filter(~pl.col(id_col).is_in(list(dropped)))
        print(f"[Tier 2] Remaining after Lexical Word checking: {df_cleaned.height}")
        return df_cleaned

    def run_semantic_ai_filter(self, df: pl.DataFrame, id_col: str, title_col: str,
                                subheading_col: str, date_col: str) -> pl.DataFrame:
        """TIER 3: progressive rolling FAISS index via IndexIDMap2, processed in
        chronological order so cascading duplicate chains (A~B~C) resolve correctly
        instead of being computed from one static neighbor snapshot.

        Stability note on IDs: IndexIDMap2 maintains its own external-id -> internal
        FAISS-slot mapping. We assign each row's *original sort-position* (0..n-1) as
        its permanent external id when it's first added via add_with_ids. That id
        never changes and never gets reused, even as remove_ids() reshuffles FAISS's
        internal storage during cascades — so `neighbor_id` coming back from search()
        can always be used directly to index into the flat `dates` / `title_lens` /
        `ids` numpy arrays without any re-derivation. There is no "raw row number in
        the live index" anywhere in this code; only the fixed external id space is
        used, so removals never desynchronize the lookup.
        """
        if df.height == 0:
            return df

        if self.model is None:
            print(f"Loading embedding model ({self.model_name})...")
            self.model = SentenceTransformer(self.model_name)

        print("Vectorizing titles and subheadings...")

        df_combined = df.select([
            id_col,
            # Safely extract 'DD Month YYYY' from the messy string and parse it
            pl.col(date_col)
              .cast(pl.String)
              .fill_null("")
              .str.extract(r"(\d{2}\s+[a-zA-Z]+\s+\d{4})")
              .str.strptime(pl.Datetime, format="%d %B %Y", strict=False)
              .alias("_parsed_date"),
            (pl.coalesce(pl.col(title_col), pl.lit("")) + pl.lit(" ") +
             pl.coalesce(pl.col(subheading_col), pl.lit(""))).str.strip_chars().alias("semantic_text"),
            pl.col(title_col).fill_null("").str.len_chars().alias("_title_len"),
        ]).sort("_parsed_date")


        ids = df_combined.get_column(id_col).to_numpy()
        dates = df_combined.get_column("_parsed_date").to_numpy()  # datetime64[us] or NaT
        title_lens = df_combined.get_column("_title_len").to_numpy()
        corpus_text = df_combined.get_column("semantic_text").to_list()

        embeddings = self.model.encode(corpus_text, show_progress_bar=True, normalize_embeddings=True)
        embeddings = np.asarray(embeddings, dtype="float32")

        dimension = embeddings.shape[1]
        base_index = faiss.IndexFlatIP(dimension)
        index = faiss.IndexIDMap2(base_index)  # supports add_with_ids / remove_ids

        dropped = set()
        day = np.timedelta64(1, "D")
        n = len(ids)

        for i in range(n):
            current_id = ids[i]
            vec = embeddings[i:i + 1]

            if index.ntotal > 0:
                k = min(self.semantic_neighbors_k, index.ntotal)
                scores, neighbor_ext_ids = index.search(vec, k)

                best_match = None
                for score, neighbor_pos in zip(scores[0], neighbor_ext_ids[0]):
                    if neighbor_pos == -1 or score < self.semantic_threshold:
                        continue
                    neighbor_pos = int(neighbor_pos)  # stable external id == original sort-position

                    d1, d2 = dates[i], dates[neighbor_pos]
                    if not np.isnat(d1) and not np.isnat(d2):
                        if abs((d1 - d2) / day) > self.semantic_date_window_days:
                            continue

                    best_match = (neighbor_pos, float(score))
                    break

                if best_match is not None:
                    neighbor_pos, score = best_match
                    neighbor_id_val = ids[neighbor_pos]
                    if title_lens[i] > title_lens[neighbor_pos]:
                        index.remove_ids(np.array([neighbor_pos], dtype="int64"))
                        index.add_with_ids(vec, np.array([i], dtype="int64"))
                        dropped.add(neighbor_id_val)
                        self._record_dropped(neighbor_id_val, current_id, "tier3_semantic", score, "semantic near-duplicate")
                    else:
                        dropped.add(current_id)
                        self._record_dropped(current_id, neighbor_id_val, "tier3_semantic", score, "semantic near-duplicate")
                    continue

            index.add_with_ids(vec, np.array([i], dtype="int64"))

        df_cleaned = df.filter(~pl.col(id_col).is_in(list(dropped)))
        print(f"[Tier 3] Remaining after AI Semantic filtering: {df_cleaned.height}")
        return df_cleaned

    # ---------- orchestration ----------

    def execute_pipeline(self, csv_path: str, output_parquet_path: str,
                          audit_log_path: str | None = None):
        self.audit_log = []  # reset in case the same instance is reused across runs

        df = pl.read_csv(csv_path)
        total_ingested = df.height

        TEMP_ID = "internal_index"
        df = df.with_row_index(name=TEMP_ID)

        df = self.run_url_filter(df, url_col="source_origin_url", id_col=TEMP_ID,
                                  body_col="body_content", date_col="published_updated_date")
        df = self.run_fuzzy_lsh_filter(df, id_col=TEMP_ID, subheading_col="subheading",
                                        body_col="body_content", date_col="published_updated_date")
        df = self.run_semantic_ai_filter(df, id_col=TEMP_ID, title_col="title",
                                          subheading_col="subheading", date_col="published_updated_date")

        df = df.drop(TEMP_ID)
        df.write_parquet(output_parquet_path)

        if audit_log_path and self.audit_log:
            pl.DataFrame(self.audit_log).write_csv(audit_log_path)

        self._print_summary(total_ingested, df.height, output_parquet_path, audit_log_path)

    def _print_summary(self, total_ingested: int, final_count: int,
                        output_parquet_path: str, audit_log_path: str | None):
        """Prints hit counts per tier plus the final unique article count."""
        url_hits = sum(1 for e in self.audit_log if e["tier"] == "tier1_url")
        content_hits = sum(1 for e in self.audit_log if e["tier"] == "tier2_lsh")
        ai_hits = sum(1 for e in self.audit_log if e["tier"] == "tier3_semantic")
        total_removed = url_hits + content_hits + ai_hits

        print("\n" + "=" * 50)
        print("DEDUPLICATION SUMMARY")
        print("=" * 50)
        print(f"Total ingested records:        {total_ingested}")
        print(f"URL comparison hits (Tier 1):   {url_hits}")
        print(f"Content similarity hits (Tier 2): {content_hits}")
        print(f"AI similarity hits (Tier 3):     {ai_hits}")
        print(f"Total duplicates removed:       {total_removed}")
        print(f"Number of final unique articles: {final_count}")
        print("=" * 50)

        print(f"\n[Success] Data serialized cleanly to {output_parquet_path}")
        if audit_log_path and self.audit_log:
            print(f"[Audit] Dedup decisions logged to {audit_log_path} ({len(self.audit_log)} entries)")
        elif audit_log_path:
            print(f"[Audit] No duplicates found — {audit_log_path} not written")
