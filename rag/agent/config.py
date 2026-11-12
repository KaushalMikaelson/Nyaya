"""
rag/agent/config.py
──────────────────────────────────────────────────────────────
Configuration parameters and limits for the Research Agent.
──────────────────────────────────────────────────────────────
"""

import os

MAX_AGENT_STEPS = int(os.getenv("NYAAY_AGENT_MAX_STEPS", "8"))
PER_TOOL_TIMEOUT_SECONDS = float(os.getenv("NYAAY_TOOL_TIMEOUT", "10.0"))
MAX_COST_BUDGET_USD = float(os.getenv("NYAAY_AGENT_MAX_COST", "0.10"))

# ─────────────────────────────────────────────────────────────
# Official Groq Cloud Model Pricing (USD per 1,000,000 tokens)
# Prices verified from https://groq.com/pricing on 2026-10-25.
#
# Budget Computation Rationale ($0.10 USD Cap):
#   For our primary model `llama-3.3-70b-versatile` ($0.59 / 1M prompt tokens,
#   $0.79 / 1M completion tokens), average cost is ~$0.69 per 1M blended tokens.
#   A $0.10 USD budget allows up to ~145,000 tokens per research task.
#   Divided across MAX_AGENT_STEPS (8 steps), each step can process ~18,000 tokens
#   of legal text, search results, and chain-of-thought synthesis.
#   If total cumulative token spend reaches or exceeds $0.10 USD, the agent
#   immediately halts further LLM calls and synthesizes with gathered context.
# ─────────────────────────────────────────────────────────────
GROQ_MODEL_PRICING = {
    "llama-3.3-70b-versatile": {"input_per_m": 0.59, "output_per_m": 0.79},
    "llama-3.1-70b-versatile": {"input_per_m": 0.59, "output_per_m": 0.79},
    "llama-3.1-8b-instant":    {"input_per_m": 0.05, "output_per_m": 0.08},
    "mixtral-8x7b-32768":      {"input_per_m": 0.24, "output_per_m": 0.24},
    "qwen/qwen3.6-27b":        {"input_per_m": 0.20, "output_per_m": 0.20},
    "qwen/qwen3.8-27b":        {"input_per_m": 0.20, "output_per_m": 0.20},
    "openai/gpt-oss-120b":     {"input_per_m": 0.59, "output_per_m": 0.79},
    "openai/gpt-oss-20b":      {"input_per_m": 0.15, "output_per_m": 0.20},
    "groq/compound":           {"input_per_m": 0.59, "output_per_m": 0.79},
    "default":                 {"input_per_m": 0.59, "output_per_m": 0.79},
}

COST_PER_1M_PROMPT_TOKENS = 0.59
COST_PER_1M_COMPLETION_TOKENS = 0.79


def calculate_cost(tokens_in: int, tokens_out: int, model: str = "default") -> float:
    """Calculate inference cost estimate in USD based on per-model token prices."""
    pricing = GROQ_MODEL_PRICING.get(model or "default") or GROQ_MODEL_PRICING["default"]
    cost = (tokens_in * pricing["input_per_m"] / 1_000_000.0) + \
           (tokens_out * pricing["output_per_m"] / 1_000_000.0)
    return round(cost, 6)

