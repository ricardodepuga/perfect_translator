import os
from openai import OpenAI
from dotenv import load_dotenv
from langdetect import detect, LangDetectException

load_dotenv()

class TranslationService:
    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "openai")
        
        if self.provider == "openai":
            self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            self.model = "gpt-4o"
        elif self.provider == "ollama":
            # Ollama compatibility with OpenAI client
            self.client = OpenAI(
                base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
                api_key="ollama" # Not used but required
            )
            self.model = os.getenv("OLLAMA_MODEL", "gemma3:4b")

    async def translate(self, text: str, source_lang: str, target_lang: str, use_pivot: bool = True):
        """
        Translates text with a Pivot strategy (Source -> English -> Target).
        Returns all three steps.
        Includes Auto-Detection and Auto-Inversion logic.
        """
        print(f"TranslationService: Using provider '{self.provider}' model '{getattr(self, 'model', 'N/A')}'")

        if self.provider == "mock":
            return self._mock_response(text, source_lang, target_lang)

        # 1. Auto-Detect Language if needed
        if source_lang == "auto":
            try:
                detected = detect(text)
                # Map common codes if necessary, but langdetect usually returns 'en', 'pt', 'ja'
                print(f"Detected language: {detected}")
                source_lang = detected
            except LangDetectException:
                print("Could not detect language, defaulting to 'pt'")
                source_lang = "pt"

        # 2. Auto-Inversion Logic (Bidirectional)
        # If the source language turns out to be the same as the target, 
        # assume the interlocutor is speaking and swap target back to 'pt' (default base)
        if source_lang == target_lang:
            print(f"Source ({source_lang}) equals Target. Swapping target to 'pt'.")
            target_lang = "pt"

        # If languages are STILL the same (e.g. PT -> PT), just return
        if source_lang == target_lang:
            return {
                "original": {"text": text, "lang": source_lang},
                "pivot": None,
                "final": {"text": text, "lang": target_lang}
            }

        pivot_text = None
        final_text = text

        if use_pivot:
            # Step 1: Translate to Pivot (English) if source is not English
            pivot_text = text
            if source_lang != "en":
                pivot_text = self._call_llm(text, source_lang, "en")
            
            # Step 2: Translate Pivot to Target if target is not English
            final_text = pivot_text
            if target_lang != "en":
                final_text = self._call_llm(pivot_text, "en", target_lang)
        else:
            # Direct Translation
            final_text = self._call_llm(text, source_lang, target_lang)

        return {
            "original": {"text": text, "lang": source_lang},
            "pivot": {"text": pivot_text, "lang": "en"} if pivot_text and (source_lang != "en" or target_lang != "en") else None,
            "final": {"text": final_text, "lang": target_lang}
        }

    def _call_llm(self, text: str, src: str, tgt: str) -> str:
        prompt = f"Translate the following text from {src} to {tgt}. Return ONLY the translated text, no explanation.\n\nText: {text}"
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional translator. Translate accurately keeping the tone and context. DO NOT output any explanation, only the translation."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"LLM Call Error: {e}")
            return f"[Error: {str(e)}]"

    def _mock_response(self, text: str, source: str, target: str):
        return {
             "original": {"text": text, "lang": source},
             "pivot": {"text": f"[MOCK EN] {text}", "lang": "en"},
             "final": {"text": f"[MOCK {target.upper()}] {text}", "lang": target}
        }
