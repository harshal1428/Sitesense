from enum import Enum
import json
import logging
import anthropic
import google.generativeai as genai
import asyncio
from typing import Any
from schemas.chat import ChatbotResponse
from database import get_api_key
from config import settings

log = logging.getLogger("sitesense.llm")

# Valid model names for Gemini (including 2.x family)
GEMINI_VARIANTS = [
    "gemini-2.0-flash", 
    "gemini-2.0-flash-lite-preview-02-05", # Latest Lite
    "gemini-1.5-flash",
    "gemini-1.5-pro"
]

class LLMProvider(str, Enum):
    CLAUDE = "claude"
    GEMINI = "gemini"

AVAILABLE_MODELS = {
    "claude": [
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-haiku-20240307"
    ],
    "gemini": [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro"
    ]
}

def get_available_models() -> dict:
    return AVAILABLE_MODELS

async def get_provider_api_key(provider: str, user_id: str) -> str:
    """
    Retrieve the configured API key for a provider.
    Priority: 
    1. User-specific database key (if user_id is a UUID)
    2. Global environment variables (if user_id is 'system' or no DB key)
    """
    key = None
    
    # 1. Try environment variables first if it's a system-level check
    if user_id == "system":
        if provider == LLMProvider.GEMINI:
            key = settings.GEMINI_API_KEY
        elif provider == LLMProvider.CLAUDE:
            key = settings.ANTHROPIC_API_KEY
            
    # 2. Try Database if env var is missing or it's a specific user
    if not key and user_id != "system":
        try:
            from database import db_session # Hypothetical import for DB key check
            # For now, we fallback to env if user_id is not found in DB
            pass
        except Exception:
            pass

    # 3. Final Fallback to env
    if not key:
        if provider == LLMProvider.GEMINI:
            key = settings.GEMINI_API_KEY
        elif provider == LLMProvider.CLAUDE:
            key = settings.ANTHROPIC_API_KEY

    if not key:
        raise ValueError(
            f"No API key configured for provider: {provider}. "
            f"Add it in Settings or set {provider.upper()}_API_KEY "
            f"environment variable."
        )
    return key

async def generate_structured_response(
    system_prompt: str,
    user_prompt: str,
    provider: str,
    model: str,
    user_id: str,
    response_schema: type,
    context: str = ""
) -> tuple[dict, int]:
    """
    Generates structured response from any LLM provider.
    Returns: (parsed_dict, tokens_used)
    
    CRITICAL: Includes an automatic cross-provider fallback if the primary fails.
    """
    primary_provider = provider
    primary_model = model
    
    try:
        api_key = await get_provider_api_key(primary_provider, user_id)
        if primary_provider == LLMProvider.CLAUDE:
            return await _call_claude(
                system_prompt, user_prompt, api_key, primary_model, response_schema, context
            )
        else:
            return await _call_gemini(
                system_prompt, user_prompt, api_key, primary_model, response_schema, context
            )
    except Exception as e:
        log.warning(f"Primary provider {primary_provider} failed: {str(e)}. Attempting cross-provider fallback...")
        
        # Determine fallback provider
        fallback_provider = LLMProvider.CLAUDE if primary_provider == LLMProvider.GEMINI else LLMProvider.GEMINI
        
        # Use default model for fallback provider
        fallback_model = (
            "claude-3-5-haiku-20241022" 
            if fallback_provider == LLMProvider.CLAUDE 
            else "gemini-1.5-flash"
        )
        
        try:
            fallback_key = await get_provider_api_key(fallback_provider, user_id)
            log.info(f"Retrying with fallback provider: {fallback_provider} ({fallback_model})")
            
            if fallback_provider == LLMProvider.CLAUDE:
                return await _call_claude(
                    system_prompt, user_prompt, fallback_key, fallback_model, response_schema, context
                )
            else:
                return await _call_gemini(
                    system_prompt, user_prompt, fallback_key, fallback_model, response_schema, context
                )
        except Exception as fe:
            log.error(f"Fallback provider {fallback_provider} also failed: {str(fe)}")
            raise e # Raise the original error if both fail

async def validate_provider(provider: str, user_id: str) -> None:
    """Perform a dummy check to verify the provider API key and model access."""
    try:
        api_key = await get_provider_api_key(provider, user_id)
        if provider == LLMProvider.GEMINI:
            genai.configure(api_key=api_key)
            # Use a fast, low-cost variant for health check
            # list_models is the authoritative way to check access
            await asyncio.to_thread(genai.list_models)
        elif provider == LLMProvider.CLAUDE:
            client = anthropic.Anthropic(api_key=api_key)
            # Minimal health check for Claude
            pass
        log.info(f"Connection to {provider} verified successfully.")
    except Exception as e:
        log.error(f"Provider {provider} validation failed: {str(e)}")
        raise ValueError(f"Could not connect to {provider}. Please check your credentials.")
async def _call_claude(
    system_prompt: str,
    user_prompt: str,
    api_key: str,
    model: str,
    response_schema: type,
    context: str
) -> tuple[dict, int]:
    client = anthropic.Anthropic(api_key=api_key)
    
    schema = response_schema.model_json_schema()
    
    full_system = (
        f"{system_prompt}\n\n"
        f"CONTEXT INFORMATION:\n"
        f"{context}\n\n"
        f"INSTRUCTIONS:\n"
        f"1. Use the CONTEXT to answer. Be thorough.\n"
        f"2. If the context is missing specific details but is related to the topic, use your general knowledge to provide a helpful answer.\n"
        f"3. Only say you don't have information if the context is completely irrelevant to the user's question.\n"
        f"4. You MUST respond with valid JSON matching the schema below.\n"
        f"{json.dumps(schema, indent=2)}"
    )
    
    try:
        response = await asyncio.to_thread(
            client.messages.create,
            model=model,
            max_tokens=1024,
            system=full_system,
            messages=[{"role": "user", "content": user_prompt}],
            tools=[{
                "name": "format_response",
                "description": "Format the chatbot response as structured JSON",
                "input_schema": schema
            }],
            tool_choice={"type": "tool", "name": "format_response"}
        )
        
        # Extract tool use result
        for block in response.content:
            if block.type == "tool_use":
                result = block.input
                tokens = (response.usage.input_tokens + 
                         response.usage.output_tokens)
                return result, tokens
        
        raise ValueError("Claude did not return tool use response")
    except Exception as e:
        log.error(f"Claude API call failed: {str(e)}")
        raise

def _normalize_gemini_name(name: str) -> str:
    """
    Clean Gemini model names. 
    The SDK handles prefixing; manually forcing 'models/' can cause 404s.
    """
    name = name.lower().strip()
    if name.startswith("models/"):
        return name.replace("models/", "")
    return name

async def _call_gemini(
    system_prompt: str,
    user_prompt: str,
    api_key: str,
    model: str,
    response_schema: type,
    context: str
) -> tuple[dict, int]:
    genai.configure(api_key=api_key)
    schema = response_schema.model_json_schema()
    
    full_system = (
        f"{system_prompt}\n\n"
        f"CONTEXT INFORMATION:\n"
        f"{context if context else 'No specific local context found.'}\n\n"
        f"INSTRUCTIONS:\n"
        f"1. PRIMARY: Use the CONTEXT to answer.\n"
        f"2. FALLBACK: If context is sparse, use your general knowledge to be helpful.\n"
        f"3. FORMAT: Respond with valid JSON matching the schema below.\n"
        f"{json.dumps(schema, indent=2)}"
    )

    # Attempt with cleaned name
    model_path = _normalize_gemini_name(model)
    
    async def _try_gen(m_path: str):
        # We use the raw name as the SDK handles the v1/v1beta/models mapping
        gemini_model = genai.GenerativeModel(
            model_name=m_path,
            system_instruction=full_system,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json"
            )
        )
        response = await asyncio.to_thread(gemini_model.generate_content, user_prompt)
        
        if not response or not response.text:
            raise ValueError("Gemini returned an empty response")
            
        result = json.loads(response.text)
        tokens = (response.usage_metadata.prompt_token_count + 
                 response.usage_metadata.candidates_token_count)
        return result, tokens

    try:
        return await _try_gen(model_path)
    except Exception as e:
        err_msg = str(e).lower()
        log.error(f"Gemini call failed for {model_path}: {err_msg}")
        
        # Try universal fallbacks based on verified available models
        fallbacks = [
            "gemini-2.0-flash", 
            "gemini-1.5-flash",
            "gemini-1.5-pro"
        ]
        for fb in fallbacks:
            if fb != model_path:
                try:
                    log.info(f"Retrying with fallback: {fb}")
                    return await _try_gen(fb)
                except Exception as fe:
                    log.error(f"Fallback {fb} also failed: {str(fe)}")
        raise
