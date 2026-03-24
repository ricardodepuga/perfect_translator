import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from execution.services.translation_service import TranslationService

async def test_round_trip():
    print("Initializing Translation Service...")
    try:
        service = TranslationService()
    except Exception as e:
        print(f"Failed to initialize service: {e}")
        return

    original_text = "O sol brilha sobre o mar azul."
    print(f"\nOriginal: {original_text}")

    # 1. PT -> JP
    print("\n--- Step 1: PT -> JP ---")
    try:
        result_pt_jp = await service.translate(original_text, "pt", "ja")
        if result_pt_jp['pivot']:
            print(f"Pivot (EN): {result_pt_jp['pivot']['text']}")
        print(f"Final (JA): {result_pt_jp['final']['text']}")
        
        ja_text = result_pt_jp['final']['text']
    except Exception as e:
        print(f"Translation PT->JP failed: {e}")
        return

    # 2. JP -> PT (Round Trip)
    print("\n--- Step 2: JP -> PT (Round Trip) ---")
    try:
        result_jp_pt = await service.translate(ja_text, "ja", "pt")
        if result_jp_pt['pivot']:
            print(f"Pivot (EN): {result_jp_pt['pivot']['text']}")
        print(f"Final (PT): {result_jp_pt['final']['text']}")
        
        final_pt = result_jp_pt['final']['text']
    except Exception as e:
        print(f"Translation JP->PT failed: {e}")
        return

    print("\nTest Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(test_round_trip())
