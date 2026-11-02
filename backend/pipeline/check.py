import os
from deduplicator import EnterpriseDataDeduplicator

def main():
    # Define paths relative to your news_crawler project root
    INPUT_CSV = "C:/Users/acer/OneDrive/Desktop/mediatechtemple/Mediatech/news-portal/output/Master_ledger.csv"
    OUTPUT_PARQUET = "output/news_deduplicated.parquet"

    # Verify input file existence to prevent runtime failure
    if not os.path.exists(INPUT_CSV):
        print(f"[Error] Source CSV file not found at: {INPUT_CSV}")
        print("Please verify the file path or ensure your network scraper has saved its outputs.")
        return

    # Automatically construct the target output directory if missing
    output_dir = os.path.dirname(OUTPUT_PARQUET)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    print("--- Launching 3-Tier News Deduplication Pipeline ---")
    print(f"Source Input File:  {INPUT_CSV}")
    print(f"Parquet Target Path: {OUTPUT_PARQUET}\n")

    # Instantiate the pipeline with optimized configurations
    # - jaccard_threshold=0.80: Catches cross-domain syndicated content with subtle formatting differences
    # - semantic_threshold=0.88: High precision filter for finding contextually identical headlines
    deduper = EnterpriseDataDeduplicator(
        jaccard_threshold=0.80, 
        semantic_threshold=0.88,
        model_name="all-MiniLM-L6-v2"
    )

    try:
        # Execute the self-contained processing passes
        deduper.execute_pipeline(
            csv_path=INPUT_CSV,
            output_parquet_path=OUTPUT_PARQUET
        )
        print("\n[Success] Deduplication pipeline completed without errors.")
    except Exception as e:
        print(f"\n[Pipeline Failure] An error occurred during execution: {str(e)}")

if __name__ == "__main__":
    main()