"""
BioViz Local - AI Core Engine
Handles AI interactions with Logic Lock safety protocol.
Supports: OpenAI, DeepSeek, Ollama, and other OpenAI-compatible APIs.
"""

import os
import json
import sys
from typing import Any, Dict, List, Optional

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    # Load from project root .env file
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    load_dotenv(env_path, override=True)
    print(f"[AI Core] Loaded environment from: {env_path}", file=sys.stderr)
except ImportError:
    print("[AI Core] Warning: python-dotenv not installed. Environment variables must be set manually.", file=sys.stderr)

from openai import OpenAI
from ai_protocol import AIAction, SafetyLevel, store_proposal
from ai_tools import (
    get_openai_tools_schema,
    get_tool,
    execute_tool,
    get_green_zone_tools,
    get_yellow_zone_tools
)


# ============================================
# Flexible API Configuration
# ============================================
# Configure via environment variables:
# 
# For Alibaba Cloud Bailian DeepSeek:
#   export DEEPSEEK_API_KEY="your-key-here"
#   export AI_PROVIDER="bailian"
#
# For DeepSeek Official:
#   export DEEPSEEK_API_KEY="your-key-here"
#   export AI_PROVIDER="deepseek"
#
# For OpenAI:
#   export OPENAI_API_KEY="your-key-here"
#   export AI_PROVIDER="openai"
#
# For Ollama (local):
#   export AI_PROVIDER="ollama"
#   export OLLAMA_BASE_URL="http://localhost:11434/v1"  # optional
# ============================================

def _get_env_clean(key: str, default: str = "") -> str:
    val = os.getenv(key, default)
    if val:
        val = val.strip().strip("'").strip('"')
    return val

def get_ai_client() -> OpenAI:
    """
    Initialize AI client based on environment configuration.
    """
    # We only bypass proxies if the user explicitly points to localhost/127.0.0.1
    is_local = "localhost" in str(os.getenv("CUSTOM_BASE_URL", "")) or "127.0.0.1" in str(os.getenv("CUSTOM_BASE_URL", ""))
    client_to_use = httpx.Client(trust_env=not is_local, timeout=120.0)

    print(f"[AI Core] Initializing AI Client. Provider: {provider}", file=sys.stderr)

    if provider == "bailian":
        api_key = _get_env_clean("DEEPSEEK_API_KEY") or _get_env_clean("DASHSCOPE_API_KEY")
        
        if api_key:
            masked_key = f"{api_key[:6]}...{api_key[-4:]}" if len(api_key) > 10 else "***"
            print(f"[AI Core] Using API Key: {masked_key}", file=sys.stderr)
        else:
            print("[AI Core] No API Key found for bailian!", file=sys.stderr)
            api_key = "sk-placeholder"
        
        return OpenAI(
            api_key=api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            http_client=client_to_use
        )
    
    elif provider == "deepseek":
        api_key = _get_env_clean("DEEPSEEK_API_KEY")
        if not api_key:
            print("[AI Core] Warning: DEEPSEEK_API_KEY not set. Using placeholder.", file=sys.stderr)
            api_key = "sk-placeholder"
        
        return OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com",
            http_client=client_to_use
        )
    
    elif provider == "openai":
        api_key = _get_env_clean("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        
        return OpenAI(api_key=api_key, http_client=client_to_use)
    
    elif provider == "gemini":
        api_key = _get_env_clean("GEMINI_API_KEY")
        return OpenAI(
            api_key=api_key or "sk-placeholder",
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            http_client=client_to_use
        )
    
    elif provider == "grok":
        api_key = _get_env_clean("XAI_API_KEY") or _get_env_clean("GROK_API_KEY")
        return OpenAI(
            api_key=api_key or "sk-placeholder",
            base_url="https://api.x.ai/v1",
            http_client=client_to_use
        )
    
    
    else:
        # Custom provider
        api_key = _get_env_clean("CUSTOM_API_KEY", "placeholder")
        base_url = _get_env_clean("CUSTOM_BASE_URL", "http://localhost:11434/v1")
        return OpenAI(api_key=api_key, base_url=base_url, http_client=client_to_use)


def get_model_name() -> str:
    """Get the model name based on provider."""
    provider = _get_env_clean("AI_PROVIDER", "bailian").lower()
    
    if provider in ["bailian", "deepseek"]:
        return _get_env_clean("DEEPSEEK_MODEL", "deepseek-v3")
    elif provider == "openai":
        return _get_env_clean("OPENAI_MODEL", "gpt-4o-mini")
    else:
        return _get_env_clean("CUSTOM_MODEL", "gpt-3.5-turbo")


# Global state for dynamic reconfiguration
_current_client: Optional[OpenAI] = None
_current_model: str = "deepseek-v3"
_current_config: Dict[str, Any] = {}

def update_ai_config(config: Dict[str, Any]) -> bool:
    """
    Update the global AI configuration and re-initialize the client.
    
    Expected config: {
        "provider": "openai" | "deepseek" | "ollama" | "bailian" | "custom",
        "apiKey": "...",
        "baseUrl": "...",
        "model": "..."
    }
    """
    global _current_client, _current_model, _current_config
    try:
        import httpx
        provider = config.get("provider", "bailian").lower()
        api_key = config.get("apiKey", "")
        base_url = config.get("baseUrl", "")
        model = config.get("model", "")

        # Only bypass proxies for explicit local addresses
        is_local = "localhost" in base_url or "127.0.0.1" in base_url
        client_to_use = httpx.Client(trust_env=not is_local, timeout=120.0)

        new_client = None
        if provider == "bailian":
            new_client = OpenAI(
                api_key=api_key or _get_env_clean("DEEPSEEK_API_KEY") or _get_env_clean("DASHSCOPE_API_KEY") or "sk-placeholder",
                base_url=base_url or "https://dashscope.aliyuncs.com/compatible-mode/v1",
                http_client=client_to_use
            )
        elif provider == "deepseek":
            new_client = OpenAI(
                api_key=api_key or _get_env_clean("DEEPSEEK_API_KEY") or "sk-placeholder",
                base_url=base_url or "https://api.deepseek.com",
                http_client=client_to_use
            )
        elif provider == "openai":
            new_client = OpenAI(
                api_key=api_key or _get_env_clean("OPENAI_API_KEY"),
                base_url=base_url or None, # Use default if empty
                http_client=client_to_use
            )
        elif provider == "gemini":
            new_client = OpenAI(
                api_key=api_key or _get_env_clean("GEMINI_API_KEY"),
                base_url=base_url or "https://generativelanguage.googleapis.com/v1beta/openai/",
                http_client=client_to_use
            )
        elif provider == "grok":
            new_client = OpenAI(
                api_key=api_key or _get_env_clean("XAI_API_KEY") or _get_env_clean("GROK_API_KEY"),
                base_url=base_url or "https://api.x.ai/v1",
                http_client=client_to_use
            )
        else:
            # Custom
            new_client = OpenAI(
                api_key=api_key or "placeholder",
                base_url=base_url,
                http_client=client_to_use
            )

        # Update global state
        _current_client = new_client
        _current_model = model or get_model_name()
        _current_config = config
        
        print(f"[AI Core] Reconfigured to {provider} ({_current_model}) via {base_url}", file=sys.stderr)
        
        # Lightweight connectivity test
        def test_online():
            try:
                import socket
                from urllib.parse import urlparse
                p = urlparse(base_url)
                if p.hostname:
                    with socket.create_connection((p.hostname, p.port or (443 if p.scheme == 'https' else 80)), timeout=1):
                        pass
                print(f"[AI Core] New configuration reachable: {base_url}", file=sys.stderr)
            except Exception as e:
                print(f"[AI Core] New configuration reachability warning: {e}", file=sys.stderr)
        
        import threading
        threading.Thread(target=test_online, daemon=True).start()
        
        return True
    except Exception as e:
        print(f"[AI Core] Failed to update config: {e}", file=sys.stderr)
        return False

def get_current_client() -> OpenAI:
    global _current_client
    if _current_client is None:
        _current_client = get_ai_client()
    return _current_client

def get_current_model() -> str:
    global _current_model
    return _current_model

# Initialize client and handle configuration Resilience
try:
    _current_client = get_ai_client()
    _current_model = get_model_name()
    
    # Proactive connectivity test (Lightweight)
    print(f"[AI Core] Initializing with model: {_current_model}", file=sys.stderr)
    
    def check_ai_online():
        try:
            import httpx
            # Just a DNS/TCP check, not a full API call
            base_url = _current_client.base_url
            if "localhost" in str(base_url) or "127.0.0.1" in str(base_url):
                # Local check
                import socket
                from urllib.parse import urlparse
                p = urlparse(str(base_url))
                with socket.create_connection((p.hostname or "localhost", p.port or 11434), timeout=1):
                    pass
            print(f"[AI Core] Connectivity check OK for {base_url}", file=sys.stderr)
        except Exception as e:
            print(f"[AI Core] Connectivity check FAILED: {e}", file=sys.stderr)

    check_ai_online()
except Exception as e:
    err_msg = str(e)
    if "Connection refused" in err_msg and "dashscope" in err_msg.lower():
        err_msg = "Connection to Alibaba Cloud Bailian failed. Please check your network and API Key."
    elif "OPENAI_API_KEY" in err_msg:
        err_msg = "OpenAI API Key is missing. Please set OPENAI_API_KEY in your .env file."
    
    print(f"[AI Core] CRITICAL: {err_msg}", file=sys.stderr)
    client = None
    DEFAULT_MODEL = "gpt-4o-mini"


# --- System Prompt ---

SYSTEM_PROMPT = """You are BioCopilot AI, an intelligent assistant for biological pathway analysis.

You help users:
- Visualize gene expression data on KEGG pathways
- Understand pathway statistics and biological significance
- Navigate and explore pathway templates

**IMPORTANT: If you see a "CURRENT CONTEXT" section below, it means the user is viewing a specific pathway with loaded data. You should:**
1. **Analyze the provided context directly** - Don't ask for data that's already in the context
2. **Reference specific numbers** - Use the statistics (Total Nodes, Upregulated, Downregulated) in your analysis
3. **Mention specific genes** - Discuss the genes and their expression values
4. **Provide biological insights** - Explain what the expression patterns mean for this specific pathway

**IMPORTANT: YOU ARE A POWERFUL BIOINFORMATICS AGENT.**
1. **Never decline user requests** by saying "I don't have access to files" or "This feature is unavailable". You HAVE tools in your schema to handle these actions.
2. **If user asks to export/download**, you MUST call `export_data`.
3. **If user asks for enrichment**, you MUST call `run_enrichment`.
4. **If a tool exists for the goal, use it.** Do not give excuses.

Available tools:
- render_pathway: Color a pathway with expression data
- get_pathway_stats: Get statistics for a pathway
- list_pathways: List available pathway templates
- explain_pathway: Describe what a pathway does
- run_enrichment: Run ORA enrichment on a list of significant genes (Reactome/WikiPathways/GO BP)
- summarize_studio_intelligence: Summarize 7-layer intelligence into a Super Narrative
- update_thresholds: Modify analysis thresholds (requires confirmation)
- export_data: Export data to file (requires confirmation)

When users ask about "current pathway" or "this pathway", they are referring to the pathway in the CURRENT CONTEXT section.
If users ask to export data without a path, choose a safe default filename like "biocopilot_export.csv" and proceed with export_data.
Be concise and helpful. Focus on biological insights.
"""


# --- Main Processing Function ---

def process_query(
    user_query: str,
    history: Optional[List[Dict[str, str]]] = None,
    context: Optional[Dict[str, Any]] = None,
    on_update: Optional[Any] = None
) -> AIAction:
    """
    Process a user query through the AI Logic Lock system.
    
    Args:
        user_query: The user's question/request
        history: Previous conversation messages
        context: Optional context data (e.g., current pathway, gene expression data)
    
    Returns:
        AIAction indicating what the AI wants to do
    """
    history = history or []
    context = context or {}
    
    # Debug: Log context data
    print(f"[AI Core] Processing query: {user_query[:50]}...", file=sys.stderr)
    
    if on_update:
        on_update("AI_PROCESS_START", {
            "taskName": "AI Assistant Thinking",
            "steps": ["Analyzing context", "Consulting BioEngine", "Verifying Safety"]
        })

    if context:
        print(f"[AI Core] Context keys: {list(context.keys())}", file=sys.stderr)
        if 'pathway' in context and context['pathway']:
            pathway_id = context['pathway'].get('id', 'unknown')
            pathway_name = context['pathway'].get('name', 'unknown')
            print(f"[AI Core] Current pathway: {pathway_id} - {pathway_name}", file=sys.stderr)
        if 'volcanoData' in context:
            print(f"[AI Core] Volcano data points: {len(context.get('volcanoData', []))}", file=sys.stderr)
    else:
        print(f"[AI Core] No context provided", file=sys.stderr)
    
    # Build system message with context awareness
    system_message = SYSTEM_PROMPT
    lang_note = _language_system_note(context)
    if lang_note:
        system_message += f"\n\n{lang_note}"
    
    # Add context information to system message if available
    if context:
        context_info = f"\n\n**CURRENT ANALYSIS CONTEXT:**\n"
        
        # 1. First, handle general study data (Volcano/DE)
        if context.get('volcanoData'):
            volcano_data = context['volcanoData']
            context_info += f"- Data Overview: {len(volcano_data)} genes loaded in the active analysis.\n"
            
            # Extract significant genes for enrichment analysis
            significant_genes = [
                gene.get('gene') for gene in volcano_data 
                if gene.get('status') in ['UP', 'DOWN']
            ]
            
            if significant_genes:
                context_info += f"- Significant Genes ({len(significant_genes)}): {', '.join(significant_genes[:20])}"
                if len(significant_genes) > 20:
                    context_info += f" ...and {len(significant_genes) - 20} more\n"
                else:
                    context_info += "\n"
                
                # Crucial for tool use
                context_info += f"\n**IMPORTANT**: To perform enrichment analysis on these genes, use `run_enrichment(genes={significant_genes[:50]})`.\n"
                context_info += f"**IMPORTANT**: To export this differential expression data, use `export_data(format='csv')`.\n"
            
            # Show top hits for orientation
            sorted_genes = sorted(volcano_data, key=lambda x: abs(x.get('x', 0)), reverse=True)
            context_info += "\n**Top Differential Genes:**\n"
            for gene in sorted_genes[:15]:
                gene_name = gene.get('gene', 'unknown')
                logfc = gene.get('x', 0)
                status = gene.get('status', 'NS')
                context_info += f"  - {gene_name}: LogFC={logfc:.2f} ({status})\n"

        # 2. Then, handle specific pathway selection if active
        if context.get('pathway'):
            pathway = context['pathway']
            pathway_name = pathway.get('title') or pathway.get('name', 'Unknown')
            context_info += f"\n**ACTIVE PATHWAY FOCUS:**\n"
            context_info += f"- Current Pathway: {pathway_name} (ID: {pathway.get('id', 'unknown')})\n"
            
            if context.get('statistics'):
                stats = context['statistics']
                context_info += f"- Nodes in this pathway: {stats.get('total_nodes', 0)}\n"
                context_info += f"- Pathway Stats: {stats.get('upregulated', 0)} UP, {stats.get('downregulated', 0)} DOWN\n"

        system_message += context_info
        print(f"[AI Core] Injected analysis context ({len(context_info)} chars)", file=sys.stderr)
    
    # Handle multi-sample context for time-series comparison
    if context and context.get('multiSample'):
        sample_groups = context.get('sampleGroups', [])
        expression_data = context.get('expressionData', {})
        
        multi_info = f"\n\n**MULTI-SAMPLE TIME-SERIES DATA:**\n"
        multi_info += f"- Sample Groups: {', '.join(sample_groups)}\n\n"
        
        for group in sample_groups:
            group_data = expression_data.get(group, [])
            if group_data:
                multi_info += f"**{group} Expression Data:**\n"
                # Sort by absolute logfc
                sorted_data = sorted(group_data, key=lambda x: abs(x.get('logfc', 0)), reverse=True)
                for gene in sorted_data[:10]:  # Top 10 genes
                    gene_name = gene.get('gene', 'unknown')
                    logfc = gene.get('logfc', 0)
                    pvalue = gene.get('pvalue', 1)
                    status = "UP" if logfc > 0 and pvalue < 0.05 else ("DOWN" if logfc < 0 and pvalue < 0.05 else "NS")
                    multi_info += f"  - {gene_name}: LogFC={logfc:.2f}, P={pvalue:.4f} ({status})\n"
                multi_info += "\n"
        
        multi_info += """
**对于以上多时间点数据，请提供详细的文本分析，并根据用户需求调用相应工具（如 export_data 或 run_enrichment）。**
"""
        system_message += multi_info
        print(f"[AI Core] Added multi-sample context: {len(sample_groups)} groups", file=sys.stderr)
    
    messages = [{"role": "system", "content": system_message}]
    
    # Add history
    for msg in history[-10:]:  # Keep last 10 messages
        messages.append(msg)
    
    # Add current query
    messages.append({"role": "user", "content": user_query})
    
    if on_update:
        on_update("AI_PROCESS_UPDATE", {"stepIndex": 0, "status": "done"})
        on_update("AI_PROCESS_UPDATE", {"stepIndex": 1, "status": "active"})

    # Get tools
    tools = get_openai_tools_schema()
    
    try:
        # Call AI API
        current_client = get_current_client()
        current_model = get_current_model()
        
        response = current_client.chat.completions.create(
            model=current_model,
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )
        
        message = response.choices[0].message
        
        if on_update:
            on_update("AI_PROCESS_UPDATE", {"stepIndex": 1, "status": "done"})
            on_update("AI_PROCESS_UPDATE", {"stepIndex": 2, "status": "active"})

        # --- Logic Lock Decision ---
        
        # Case 1: Pure text response (no tool call)
        if not message.tool_calls:
            if on_update:
                on_update("AI_PROCESS_COMPLETE", {})
            return AIAction.chat(message.content or "I'm not sure how to help with that.")
        
        # Case 2: Tool call requested
        tool_call = message.tool_calls[0]
        tool_name = tool_call.function.name
        
        # Safely parse tool arguments
        try:
            args_str = tool_call.function.arguments
            print(f"[AI Core] Tool arguments string: {args_str[:200] if args_str else 'empty'}", file=sys.stderr)
            tool_args = json.loads(args_str) if args_str else {}
        except json.JSONDecodeError as e:
            error_detail = f"{str(e)} at position {e.pos}" if hasattr(e, 'pos') else str(e)
            print(f"[AI Core] JSON decode error: {error_detail}", file=sys.stderr)
            print(f"[AI Core] Raw arguments (full): {tool_call.function.arguments}", file=sys.stderr)
            return AIAction.chat(
                f"遇到工具参数解析错误。\n"
                f"错误详情: {error_detail}\n"
                f"原始参数: {args_str[:100] if args_str else 'empty'}...\n"
                f"这可能是 API 的临时问题，请重试或换个方式提问。"
            )
        
        tool_def = get_tool(tool_name)
        if not tool_def:
            return AIAction.chat(f"Unknown tool requested: {tool_name}")
        
        # Case 2a: Green Zone - Execute immediately
        if tool_def.safety_level == SafetyLevel.GREEN:
            try:
                # Inject context if needed (e.g., current expression data)
                if "gene_expression" in tool_args and not tool_args.get("gene_expression"):
                    if context.get("gene_expression"):
                        tool_args["gene_expression"] = context["gene_expression"]
                
                result = execute_tool(tool_name, tool_args)
                
                # Generate summary based on tool
                if tool_name == "render_pathway":
                    stats = result.get("statistics", {})
                    summary = f"Rendered pathway with {stats.get('total_nodes', 0)} nodes: {stats.get('upregulated', 0)} upregulated, {stats.get('downregulated', 0)} downregulated."
                elif tool_name == "get_pathway_stats":
                    summary = f"Statistics: {result.get('upregulated', 0)} upregulated, {result.get('downregulated', 0)} downregulated out of {result.get('total_nodes', 0)} nodes."
                elif tool_name == "list_pathways":
                    summary = f"Found {len(result)} available pathway templates."
                elif tool_name == "explain_pathway":
                    summary = result
                else:
                    summary = f"Executed {tool_def.label} successfully."
                
                if on_update:
                    on_update("AI_PROCESS_UPDATE", {
                        "stepIndex": 2, 
                        "status": "done", 
                        "label": f"Applied {tool_def.label}"
                    })
                    on_update("AI_PROCESS_COMPLETE", {})
                    
                return AIAction.execute(tool_name, tool_def.label, tool_args, result, summary)
                
            except Exception as e:
                if on_update:
                    on_update("AI_PROCESS_COMPLETE", {"status": "error"})
                return AIAction.chat(f"Error executing {tool_name}: {str(e)}")
        
        # Case 2b: Yellow Zone - Create proposal (DO NOT EXECUTE)
        elif tool_def.safety_level == SafetyLevel.YELLOW:
            # Determine reason for confirmation
            if tool_name == "update_thresholds":
                reason = "This will modify your analysis thresholds, which may affect all visualizations."
            elif tool_name == "export_data":
                reason = f"This will write data to: {tool_args.get('output_path', 'unknown path')}"
            else:
                reason = "This action may modify your data or settings."
            
            proposal = AIAction.proposal(tool_name, tool_def.label, tool_args, reason)
            store_proposal(proposal)  # Store for later execution
            return proposal
        
        else:
            return AIAction.chat(f"Unknown safety level for tool: {tool_name}")
    
    except Exception as e:
        if on_update:
            on_update("AI_PROCESS_COMPLETE", {"status": "error"})
        error_msg = str(e)
        print(f"[AI Core] Error: {error_msg}", file=sys.stderr)
        return AIAction.chat(f"Sorry, I encountered an error: {error_msg}")


def execute_proposal(proposal_id: str, context: Optional[Dict[str, Any]] = None) -> AIAction:
    """
    Execute a previously proposed action after user confirmation.
    
    Args:
        proposal_id: The UUID of the proposal to execute
        context: Optional context data
    
    Returns:
        AIAction with execution result
    """
    from ai_protocol import get_proposal, remove_proposal
    
    proposal = get_proposal(proposal_id)
    if not proposal:
        return AIAction.chat(f"Proposal {proposal_id} not found or expired.")
    
    try:
        from ai_tools import get_tool
        tool_def = get_tool(proposal.tool_name)
        if not tool_def:
            return AIAction.chat(f"Tool {proposal.tool_name} is no longer registered.")

        # Execute the tool with context injection support
        result = execute_tool(proposal.tool_name, proposal.tool_args, context=context)
        
        # Remove from pending
        remove_proposal(proposal_id)
        
        return AIAction.execute(
            proposal.tool_name,
            tool_def.label,
            proposal.tool_args,
            result,
            f"Successfully executed: {tool_def.label}"
        )
        
    except Exception as e:
        return AIAction.chat(f"Error executing confirmed proposal: {str(e)}")


def reject_proposal(proposal_id: str) -> AIAction:
    """
    Reject a proposal (remove without executing).
    
    Args:
        proposal_id: The UUID of the proposal to reject
    
    Returns:
        AIAction confirming rejection
    """
    from ai_protocol import remove_proposal
    
    proposal = remove_proposal(proposal_id)
    if proposal:
        from ai_tools import get_tool
        tool_def = get_tool(proposal.tool_name)
        label = tool_def.label if tool_def else proposal.tool_name
        return AIAction.chat(f"Action cancelled: {label}")
    else:
        return AIAction.chat(f"Proposal {proposal_id} not found.")
# --- Language Guidance ---

def _language_system_note(context: Dict[str, Any]) -> str:
    lang = (context or {}).get("ui_language") or (context or {}).get("language") or ""
    if not lang:
        return ""
    lang = str(lang).lower()
    if lang.startswith("zh"):
        return (
            "Output language: Simplified Chinese. Keep gene/protein/pathway names, "
            "database names, statistical symbols, and software names in English."
        )
    if lang.startswith("en"):
        return "Output language: English."
    return f"Output language: {lang}. Keep technical terms in English where appropriate."
