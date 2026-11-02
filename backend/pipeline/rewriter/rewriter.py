from groq import Groq, AuthenticationError

from config import *

from prompts import PROMPTS

def get_groq_client(api_key=None):
    raw_key = api_key or os.getenv("GROQ_API_KEY") or GROQ_API_KEY or DEFAULT_GROQ_API_KEY
    clean_key = clean_env_var(raw_key) or DEFAULT_GROQ_API_KEY
    return Groq(api_key=clean_key)

client = get_groq_client()


def call_groq_completion(groq_client, messages, temperature=0.4, response_format=None):
    target_model = clean_env_var(os.getenv("GROQ_MODEL") or MODEL) or DEFAULT_MODEL
    kwargs = {
        "model": target_model,
        "messages": messages,
        "temperature": temperature,
    }
    if response_format:
        kwargs["response_format"] = response_format

    try:
        return groq_client.chat.completions.create(**kwargs)
    except AuthenticationError:
        # If primary key failed with 401 Invalid API Key, retry with the verified fallback key
        if getattr(groq_client, "api_key", None) != DEFAULT_GROQ_API_KEY:
            fallback_client = Groq(api_key=DEFAULT_GROQ_API_KEY)
            return fallback_client.chat.completions.create(**kwargs)
        raise
    except Exception as e:
        err_msg = str(e)
        # Check if 401 invalid API key error happened
        if ("401" in err_msg or "invalid_api_key" in err_msg or "Invalid API Key" in err_msg) and getattr(groq_client, "api_key", None) != DEFAULT_GROQ_API_KEY:
            fallback_client = Groq(api_key=DEFAULT_GROQ_API_KEY)
            return fallback_client.chat.completions.create(**kwargs)

        if "model_not_found" in err_msg or "does not exist or you do not have access" in err_msg:
            try:
                # Query what models this API key is permitted to use
                models_data = groq_client.models.list().data
                accessible_models = [
                    m.id for m in models_data
                    if not any(x in m.id for x in ["whisper", "guard", "safeguard", "orpheus", "embed"])
                ]

                # Prioritize high quality models first
                priority_order = [
                    "openai/gpt-oss-120b",
                    "openai/gpt-oss-20b",
                    "qwen/qwen3.8-27b",
                    "llama-3.3-70b-versatile",
                    "llama-3.1-8b-instant",
                ]
                candidates = [m for m in priority_order if m in accessible_models] + [
                    m for m in accessible_models if m not in priority_order
                ]

                # Try accessible text models in order of preference
                for candidate in candidates:
                    if candidate != target_model:
                        try:
                            kwargs["model"] = candidate
                            return groq_client.chat.completions.create(**kwargs)
                        except Exception:
                            continue

                all_ids = [m.id for m in models_data]
                if not all_ids:
                    raise Exception(
                        "Your Groq account currently has 0 models enabled. Check Groq Console (console.groq.com) -> Settings -> Organization / Limits or verify your account."
                    )
                else:
                    raise Exception(
                        f"None of your accessible models ({', '.join(all_ids)}) could complete the request. Please check model permissions in Groq Console."
                    )
            except Exception as inner_e:
                if "Groq account" in str(inner_e) or "accessible models" in str(inner_e):
                    raise inner_e
        raise


def rewrite_chunk(chunk, style):
    groq_client = get_groq_client()
    messages = [
        {
            "role": "system",
            "content": PROMPTS[style]
        },
        {
            "role": "user",
            "content": chunk
        }
    ]
    response = call_groq_completion(groq_client, messages, temperature=0.4)
    return response.choices[0].message.content

import json

def generate_metadata(article_text):
    groq_client = get_groq_client()
    messages = [
        {
            "role": "system",
            "content": PROMPTS["metadata_generation"]
        },
        {
            "role": "user",
            "content": article_text
        }
    ]
    response = call_groq_completion(
        groq_client,
        messages,
        temperature=0.1,
        response_format={"type": "json_object"}
    )
    content = response.choices[0].message.content
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {
            "seo_title": "",
            "seo_desc": "",
            "seo_keywords": "",
            "sentiment": "Neutral",
            "readability": 0,
            "seo_score": 0
        }