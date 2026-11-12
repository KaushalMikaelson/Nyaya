"""
rag/agent/schemas.py
──────────────────────────────────────────────────────────────
Pydantic schemas for the Nyaay Legal Research Agent.
──────────────────────────────────────────────────────────────
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ClaimVerification(BaseModel):
    text: str = Field(..., description="The factual claim made in the research synthesis.")
    source_doc_id: str = Field(..., description="ID of the document/chunk supporting this claim.")
    quote: str = Field(..., description="Exact verbatim quote extracted from the document.")
    verified: bool = Field(False, description="Whether the quote was verified against source text.")


class ResearchResult(BaseModel):
    query: str
    answer: str = Field(..., description="Comprehensive legal answer synthesizing findings.")
    claims: List[ClaimVerification] = Field(default_factory=list, description="Verified claims with citations.")
    confidence: int = Field(0, description="Overall confidence score from 0 to 100.")
    steps_taken: int = Field(0, description="Total agent loop steps executed.")
    tool_calls_count: int = Field(0, description="Count of tools executed.")
    cost_est_usd: float = Field(0.0, description="Estimated inference cost in USD.")
    citations: List[Dict[str, Any]] = Field(default_factory=list, description="List of unique cited legal sections.")


class ResearchRequest(BaseModel):
    query: str
    max_steps: Optional[int] = 8
    act_filter: Optional[str] = None
