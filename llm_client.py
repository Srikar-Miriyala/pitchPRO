"""
llm_client.py
Fixed version that handles empty Gemini responses.
"""

import os
import json
import logging
from typing import Optional, Any
import re

log = logging.getLogger("llm_client")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

GEMINI_MODEL_ENV = "GEMINI_MODEL"
GEMINI_API_KEY_ENV = "GEMINI_API_KEY"

def _normalize_model(model_name: Optional[str]) -> str:
    if not model_name:
        model_name = os.getenv(GEMINI_MODEL_ENV, "")
    if not model_name.startswith("models/"):
        model_name = f"models/{model_name}"
    return model_name.strip()

def _extract_text_from_response(response: Any) -> Optional[str]:
    """
    Recursively extract text from various Gemini response formats.
    """
    try:
        # If it's already a string, return it
        if isinstance(response, str) and response.strip():
            return response.strip()
        
        # Handle the case where response has candidates but they're empty
        if hasattr(response, 'candidates'):
            candidates = response.candidates
            if candidates:
                for candidate in candidates:
                    if hasattr(candidate, 'content') and candidate.content:
                        if hasattr(candidate.content, 'parts'):
                            for part in candidate.content.parts:
                                if hasattr(part, 'text') and part.text:
                                    return part.text.strip()
        
        # Try to access text directly (some versions have this)
        if hasattr(response, 'text') and response.text:
            return response.text.strip()
            
        # Convert to string representation and look for text
        response_str = str(response)
        if "text:" in response_str:
            # Try to extract from string representation
            match = re.search(r"text:\s*[\"']([^\"']+)[\"']", response_str)
            if match:
                return match.group(1).strip()
        
        return None
        
    except Exception as e:
        log.warning("Error extracting text: %s", e)
        return None

def _try_genai_library(prompt: str, model: str, temperature: float, max_tokens: int, system: Optional[str] = None) -> str:
    """Try modern Gemini SDK patterns."""
    try:
        import google.generativeai as genai
    except ImportError as e:
        log.error("google.generativeai not installed: %s", e)
        raise RuntimeError("Install google-generativeai: pip install google-generativeai")

    api_key = os.getenv(GEMINI_API_KEY_ENV)
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable required")

    try:
        genai.configure(api_key=api_key)
    except Exception as e:
        log.warning("Configure failed: %s", e)

    # Try GenerativeModel approach
    try:
        generative_model = genai.GenerativeModel(model)
        response = generative_model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )
        )
        
        text = _extract_text_from_response(response)
        if text:
            return text
        else:
            # Check if there's a blocking reason
            if hasattr(response, 'prompt_feedback') and response.prompt_feedback:
                if hasattr(response.prompt_feedback, 'block_reason'):
                    block_reason = response.prompt_feedback.block_reason
                    return json.dumps({
                        "_debug_blocked": f"Content blocked: {block_reason}",
                        "note": "Gemini blocked the prompt content"
                    })
            
            # Check finish reason
            if hasattr(response, 'candidates') and response.candidates:
                for candidate in response.candidates:
                    if hasattr(candidate, 'finish_reason'):
                        finish_reason = candidate.finish_reason
                        if finish_reason == 1:  # STOP
                            return json.dumps({
                                "_debug_empty": "Model returned STOP with no content",
                                "note": "Try a different prompt or model"
                            })
                        elif finish_reason == 3:  # SAFETY
                            return json.dumps({
                                "_debug_safety": "Content blocked by safety filters",
                                "note": "Prompt triggered safety filters"
                            })
            
            # Generic debug info
            debug_info = {
                "_debug_no_content": {
                    "model": model,
                    "has_candidates": hasattr(response, 'candidates'),
                    "candidates_count": len(response.candidates) if hasattr(response, 'candidates') else 0,
                },
                "note": "Model returned no content - try simpler prompt"
            }
            return json.dumps(debug_info)
            
    except Exception as e:
        log.error("GenerativeModel approach failed: %s", e)
        raise

def _try_rest_generate(model_name: str, prompt: str, temperature: float, max_tokens: int, system: Optional[str] = None) -> str:
    """REST fallback for Gemini."""
    try:
        import requests
    except ImportError:
        raise RuntimeError("requests package required for REST fallback")

    api_key = os.getenv(GEMINI_API_KEY_ENV)
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY required for REST fallback")

    clean_model = model_name.replace("models/", "")
    endpoint = f"https://generativelanguage.googleapis.com/v1/models/{clean_model}:generateContent?key={api_key}"
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        }
    }

    try:
        response = requests.post(
            endpoint,
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Extract text from REST response
            if "candidates" in result and result["candidates"]:
                candidate = result["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    parts = candidate["content"]["parts"]
                    if parts and "text" in parts[0]:
                        text = parts[0]["text"]
                        if text.strip():
                            return text.strip()
            
            # No extractable text
            debug_info = {
                "_debug_rest_empty": {
                    "status_code": response.status_code,
                    "candidates_count": len(result.get("candidates", [])),
                    "has_parts": bool(result.get("candidates", [{}])[0].get("content", {}).get("parts", []))
                },
                "note": "REST API returned empty content"
            }
            return json.dumps(debug_info)
        else:
            raise RuntimeError(f"REST API error {response.status_code}: {response.text}")
            
    except Exception as e:
        raise RuntimeError(f"REST request failed: {e}")

def generate(prompt: str, temperature: float = 0.0, max_tokens: int = 256, system: Optional[str] = None) -> str:
    """Main generate function."""
    model = _normalize_model(os.getenv(GEMINI_MODEL_ENV))
    if not model:
        raise RuntimeError("Set GEMINI_MODEL env var (e.g. 'gemini-2.5-flash')")

    log.info("Trying SDK with model: %s", model)
    
    try:
        return _try_genai_library(prompt, model, temperature, max_tokens, system)
    except Exception as sdk_error:
        log.warning("SDK failed: %s", sdk_error)
        log.info("Trying REST fallback")
        try:
            return _try_rest_generate(model, prompt, temperature, max_tokens, system)
        except Exception as rest_error:
            log.error("REST fallback also failed: %s", rest_error)
            raise RuntimeError(f"All generation methods failed. SDK: {sdk_error}, REST: {rest_error}")

if __name__ == "__main__":
    # Test with a very simple, safe prompt
    test_prompt = "Hello, how are you today?"
    
    try:
        result = generate(test_prompt, temperature=0.0, max_tokens=60)
        print("Result:", result)
    except Exception as e:
        print("Error:", e)