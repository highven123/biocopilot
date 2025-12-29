"""
BioViz Local - AI Safety Protocol Definitions
Defines safety levels and action models for the Logic Lock system.
"""

from enum import Enum
from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, Field
import uuid


class SafetyLevel(str, Enum):
    """Safety classification for AI tools."""
    GREEN = "green"   # Safe to auto-execute (read-only, non-destructive)
    YELLOW = "yellow" # Requires user confirmation before execution


class AIAction(BaseModel):
    """
    Represents the AI's intent/response.
    
    - CHAT: Pure text response, no tool execution
    - EXECUTE: Tool was executed (Green Zone only)
    - PROPOSAL: Tool execution proposed, awaiting confirmation (Yellow Zone)
    """
    type: Literal["CHAT", "EXECUTE", "PROPOSAL"]
    content: str = Field(description="Message to display to user")
    
    # Only for EXECUTE/PROPOSAL actions:
    tool_name: Optional[str] = None
    tool_args: Optional[Dict[str, Any]] = None
    tool_result: Optional[Any] = None  # Only for EXECUTE
    
    # Only for PROPOSAL actions:
    proposal_id: Optional[str] = None
    proposal_reason: Optional[str] = None  # Why this needs confirmation
    
    @classmethod
    def chat(cls, content: str) -> "AIAction":
        """Create a simple chat response."""
        return cls(type="CHAT", content=content)
    
    @classmethod
    def execute(cls, tool_name: str, tool_label: str, tool_args: Dict[str, Any], result: Any, summary: str) -> "AIAction":
        """Create an executed action response (Green Zone)."""
        return cls(
            type="EXECUTE",
            content=summary,
            tool_name=tool_name,
            tool_args=tool_args,
            tool_result=result
        )
    
    @classmethod
    def proposal(cls, tool_name: str, tool_label: str, tool_args: Dict[str, Any], reason: str) -> "AIAction":
        """Create a proposal for user confirmation (Yellow Zone)."""
        return cls(
            type="PROPOSAL",
            content=f"I'd like to {tool_label}. {reason}",
            tool_name=tool_name,
            tool_args=tool_args,
            proposal_id=str(uuid.uuid4()),
            proposal_reason=reason
        )


class PendingProposal(BaseModel):
    """Stores a pending proposal awaiting user confirmation."""
    proposal_id: str
    tool_name: str
    tool_args: Dict[str, Any]
    created_at: float  # timestamp
    
    
# In-memory store for pending proposals (simple approach for desktop app)
_pending_proposals: Dict[str, PendingProposal] = {}


def store_proposal(proposal: AIAction) -> None:
    """Store a proposal for later execution upon user confirmation."""
    if proposal.type != "PROPOSAL" or not proposal.proposal_id:
        return
    import time
    _pending_proposals[proposal.proposal_id] = PendingProposal(
        proposal_id=proposal.proposal_id,
        tool_name=proposal.tool_name or "",
        tool_args=proposal.tool_args or {},
        created_at=time.time()
    )


def get_proposal(proposal_id: str) -> Optional[PendingProposal]:
    """Retrieve a pending proposal by ID."""
    return _pending_proposals.get(proposal_id)


def remove_proposal(proposal_id: str) -> Optional[PendingProposal]:
    """Remove and return a pending proposal (after execution or rejection)."""
    return _pending_proposals.pop(proposal_id, None)


def cleanup_old_proposals(max_age_seconds: float = 3600) -> int:
    """Remove proposals older than max_age_seconds. Returns count removed."""
    import time
    now = time.time()
    to_remove = [
        pid for pid, p in _pending_proposals.items()
        if now - p.created_at > max_age_seconds
    ]
    for pid in to_remove:
        del _pending_proposals[pid]
    return len(to_remove)
