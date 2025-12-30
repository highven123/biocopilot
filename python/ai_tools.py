"""
BioViz Local - AI Tool Definitions
Defines available tools with safety classifications for the Logic Lock system.
"""

import os
import json
from typing import Any, Callable, Dict, List, Optional, Tuple

from ai_protocol import SafetyLevel
import mapper
from prompts import (
    PATHWAY_ENRICHMENT_PROMPT,
    FUSION_ENRICHMENT_PROMPT,
    DE_SUMMARY_PROMPT,
    NL_FILTER_PROMPT,
    VISUALIZATION_PROMPT,
    HYPOTHESIS_PROMPT,
    PATTERN_DISCOVERY_PROMPT,
    STUDIO_INSIGHTS_PROMPT,
    render_prompt,
)
import ai_core


# --- Tool Registry ---

class ToolDefinition:
    """Represents a tool available to the AI."""
    def __init__(
        self,
        name: str,
        label: str,
        description: str,
        parameters: Dict[str, Any],
        safety_level: SafetyLevel,
        handler: Callable[..., Any]
    ):
        self.name = name
        self.label = label
        self.description = description
        self.parameters = parameters  # JSON Schema format
        self.safety_level = safety_level
        self.handler = handler
    
    def to_openai_schema(self) -> Dict[str, Any]:
        """Convert to OpenAI function calling format."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
            "parameters": self.parameters
            }
        }

# --- Shared LLM helpers for structured prompts ---

STRUCTURED_SYSTEM_MESSAGE = (
    "You are BioViz AI. Produce concise, structured scientific outputs. "
    "Use only provided data, cite real statistics, and mark speculative content as 'Hypothesis (not validated)'. "
    "If required fields are missing, say what is needed instead of guessing."
)


def _get_llm_client_and_model() -> Tuple[Any, str]:
    """
    Get the centralized AI client and model from ai_core.
    """
    client = ai_core.get_current_client()
    model = ai_core.get_current_model()
    return client, model


def _invoke_structured_prompt(prompt: str, temperature: float = 0.2, max_tokens: int = 900) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Call the configured LLM with a structured system message.
    Returns (content, model_name, error_message).
    """
    try:
        client, model_name = _get_llm_client_and_model()
    except Exception as e:
        return None, None, str(e)

    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": STRUCTURED_SYSTEM_MESSAGE},
                {"role": "user", "content": prompt}
            ],
            temperature=temperature,
            max_tokens=max_tokens
        )
        content = response.choices[0].message.content or ""
        return content.strip(), model_name, None
    except Exception as e:
        return None, None, str(e)


def _to_float(value: Any, default: Optional[float] = None) -> Optional[float]:
    """Safely convert values (including percentage strings) to float."""
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    try:
        s = str(value).strip().rstrip('%')
        return float(s)
    except (ValueError, TypeError):
        return default


def _normalize_enriched_terms(enrichment_data: Any) -> List[Dict[str, Any]]:
    """
    Normalize enrichment results to a common shape.
    Supports Enrichr/GSEA-like outputs with keys such as term/name/pathway, p_value, adjusted_p_value/fdr, genes.
    """
    terms: List[Dict[str, Any]] = []

    if isinstance(enrichment_data, dict):
        for key in ["enriched_terms", "results", "terms", "pathways"]:
            if enrichment_data.get(key):
                terms = enrichment_data.get(key) or []
                break
        if not terms:
            up = enrichment_data.get("up_regulated") or []
            down = enrichment_data.get("down_regulated") or []
            terms = up + down
    elif isinstance(enrichment_data, list):
        terms = enrichment_data

    normalized: List[Dict[str, Any]] = []
    for term in terms:
        if not isinstance(term, dict):
            continue
        name = (
            term.get("term")
            or term.get("name")
            or term.get("pathway_name")
            or term.get("representative_term")
            or term.get("pathway")
            or term.get("pathway_id")
            or term.get("id")
            or "unknown"
        )
        pval = _to_float(term.get("p_value") or term.get("pvalue") or term.get("p") or term.get("NOM p-val"))
        fdr = _to_float(term.get("adjusted_p_value") or term.get("fdr") or term.get("q_value") or term.get("FDR q-val"))
        genes_raw = term.get("genes") or term.get("hit_genes") or term.get("overlap") or term.get("leadingEdge")
        if isinstance(genes_raw, str):
            genes = [g.strip() for g in genes_raw.replace(";", ",").split(",") if g.strip()]
        elif isinstance(genes_raw, list):
            genes = [str(g) for g in genes_raw]
        else:
            genes = []
        combined_score = _to_float(term.get("combined_score") or term.get("score") or term.get("nes"))

        normalized.append({
            "term": name,
            "p_value": pval,
            "fdr": fdr,
            "combined_score": combined_score,
            "genes": genes
        })

    return normalized


def _is_fusion_enrichment(enrichment_data: Any, metadata: Optional[Dict[str, Any]]) -> bool:
    if isinstance(metadata, dict):
        if metadata.get("gene_set_source") == "fusion":
            return True
        if metadata.get("sources") or metadata.get("sources_analyzed"):
            return True
        auto_enrich = metadata.get("auto_enrich")
        if isinstance(auto_enrich, dict):
            sources = auto_enrich.get("sources") or []
            if "fusion" in sources:
                return True

    terms = []
    if isinstance(enrichment_data, dict):
        if enrichment_data.get("fusion_results"):
            return True
        for key in ["results", "terms", "pathways", "enriched_terms"]:
            if enrichment_data.get(key):
                terms = enrichment_data.get(key) or []
                break
    elif isinstance(enrichment_data, list):
        terms = enrichment_data

    for term in terms:
        if not isinstance(term, dict):
            continue
        if term.get("members") or term.get("isFused") or term.get("representative_term"):
            return True

    return False


def _derive_significant_genes(
    volcano_data: Optional[List[Dict[str, Any]]],
    pvalue_threshold: float = 0.05,
    logfc_threshold: float = 1.0
) -> List[str]:
    """Extract significant gene symbols from volcano data."""
    if not volcano_data:
        return []
    up, down, _ = _split_significant_genes(volcano_data, pvalue_threshold, logfc_threshold)
    genes = [g.get("gene") for g in up + down if g.get("gene")]
    # Keep order but remove duplicates
    seen = set()
    uniq = []
    for gene in genes:
        if gene in seen:
            continue
        seen.add(gene)
        uniq.append(gene)
    return uniq


def _auto_enrich_from_volcano(
    volcano_data: Optional[List[Dict[str, Any]]],
    sources: Optional[List[str]] = None,
    species: str = "auto",
    parameters: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    """Run fusion enrichment when no enrichment results are provided."""
    genes = _derive_significant_genes(volcano_data)
    if len(genes) < 3:
        return None
    try:
        from enrichment.fusion import fusion_pipeline
    except Exception:
        return None

    resolved_sources = sources or ["reactome", "wikipathways"]
    params = parameters or {}
    result = fusion_pipeline.run_fusion_analysis(
        genes=genes,
        method="ORA",
        sources=resolved_sources,
        species=species,
        parameters=params
    )
    if not isinstance(result, dict) or result.get("status") != "ok":
        return None
    return result


def _split_significant_genes(
    volcano_data: Optional[List[Dict[str, Any]]],
    pvalue_threshold: float = 0.05,
    logfc_threshold: float = 1.0
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Split volcano data into up/down/non-significant groups."""
    up: List[Dict[str, Any]] = []
    down: List[Dict[str, Any]] = []
    non_sig: List[Dict[str, Any]] = []

    if not volcano_data:
        return up, down, non_sig

    for row in volcano_data:
        if not isinstance(row, dict):
            continue
        gene = row.get("gene") or row.get("id") or row.get("name") or "unknown"
        logfc = _to_float(row.get("x"), 0.0) or 0.0
        pval = _to_float(row.get("pvalue"), 1.0) or 1.0
        status = str(row.get("status") or "").upper()

        if status not in {"UP", "DOWN"}:
            if pval < pvalue_threshold and abs(logfc) > logfc_threshold:
                status = "UP" if logfc > 0 else "DOWN"
            else:
                status = "NS"

        entry = {
            "gene": gene,
            "log2fc": logfc,
            "pvalue": pval,
            "status": status
        }

        if status == "UP":
            up.append(entry)
        elif status == "DOWN":
            down.append(entry)
        else:
            non_sig.append(entry)

    return up, down, non_sig


# --- Green Zone Tools (Safe, Auto-Execute) ---

def _render_pathway(pathway_id: str, gene_expression: Dict[str, float], data_type: str = "gene") -> Dict:
    """Render a colored KEGG pathway."""
    colored = mapper.color_kegg_pathway(pathway_id, gene_expression, data_type=data_type)
    stats = mapper.get_pathway_statistics(colored)
    return {
        "pathway": colored,
        "statistics": stats
    }


def _get_pathway_stats(pathway_id: str, gene_expression: Dict[str, float], data_type: str = "gene") -> Dict:
    """Get statistics for a pathway without full rendering."""
    colored = mapper.color_kegg_pathway(pathway_id, gene_expression, data_type=data_type)
    return mapper.get_pathway_statistics(colored)


def _list_available_pathways() -> List[Dict[str, str]]:
    """List all available pathway templates."""
    from pathlib import Path
    import sys
    
    templates = []
    
    # Search paths for templates
    search_paths = [
        Path(__file__).parent.parent / 'assets' / 'templates',
        Path.home() / '.bioviz_local' / 'templates',
    ]
    
    if hasattr(sys, '_MEIPASS'):
        search_paths.insert(0, Path(sys._MEIPASS) / 'assets' / 'templates')
    
    seen = set()
    for path in search_paths:
        if path.exists():
            for f in path.glob("*.json"):
                pid = f.stem
                if pid not in seen:
                    seen.add(pid)
                    templates.append({
                        "id": pid,
                        "name": pid.replace("_", " ").title()
                    })
    
    return sorted(templates, key=lambda x: x["id"])


def _explain_pathway(pathway_id: str) -> str:
    """Get description of a pathway."""
    # Simple lookup for common pathways
    descriptions = {
        "hsa04210": "Apoptosis pathway - programmed cell death signaling",
        "hsa04110": "Cell cycle - regulation of cell division",
        "hsa04115": "p53 signaling pathway - tumor suppressor response",
        "hsa04151": "PI3K-Akt signaling pathway - cell survival and growth",
        "hsa04010": "MAPK signaling pathway - cell proliferation and differentiation",
    }
    return descriptions.get(pathway_id, f"KEGG pathway {pathway_id}")


def _run_enrichment(gene_list: List[str], gene_sets: str = "reactome") -> Dict[str,  Any]:
    """
    Run enrichment analysis on a list of genes using the v2.0 pipeline.
    """
    import sys

    if not gene_list or len(gene_list) == 0:
        return {
            "error": "No genes provided for enrichment analysis",
            "enriched_terms": []
        }

    source_map = {
        "reactome": "reactome",
        "wikipathways": "wikipathways",
        "go_bp": "go_bp",
        "kegg": "kegg",
    }
    normalized = gene_sets.lower()
    resolved_source = next((v for k, v in source_map.items() if k in normalized), "reactome")

    if resolved_source == "kegg":
        return {
            "error": "KEGG enrichment requires a custom GMT file (license).",
            "enriched_terms": []
        }

    print(f"[AI Tool] Running enrichment with {len(gene_list)} genes on {resolved_source}", file=sys.stderr)

    try:
        from enrichment.pipeline import EnrichmentPipeline

        pipeline = EnrichmentPipeline()
        result = pipeline.run_ora(
            gene_list=gene_list,
            gene_set_source=resolved_source,
            species="auto",
        )

        enriched_terms = result.get("results", [])
        return {
            "gene_sets": resolved_source,
            "input_genes": len(gene_list),
            "enriched_terms": enriched_terms[:20] if isinstance(enriched_terms, list) else [],
            "total_terms": len(enriched_terms) if isinstance(enriched_terms, list) else 0,
            "metadata": result.get("metadata"),
            "warnings": result.get("warnings", []),
        }
    except Exception as e:
        print(f"[AI Tool] Enrichment error: {e}", file=sys.stderr)
        return {
            "error": str(e),
            "enriched_terms": []
        }


# --- LLM-backed structured analyses ---

def summarize_enrichment(
    enrichment_data: Any,
    volcano_data: Optional[List[Dict[str, Any]]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    ui_language: Optional[str] = None
) -> Dict[str, Any]:
    """Summarize enrichment output into a structured narrative."""
    metadata = metadata or {}
    is_fusion = _is_fusion_enrichment(enrichment_data, metadata)
    normalized_terms = _normalize_enriched_terms(enrichment_data or {})

    if not normalized_terms and volcano_data:
        auto_result = _auto_enrich_from_volcano(
            volcano_data,
            sources=["reactome", "wikipathways"],
            species="auto",
            parameters=metadata.get("parameters") if isinstance(metadata, dict) else None
        )
        if auto_result and auto_result.get("fusion_results"):
            enrichment_data = {"results": auto_result.get("fusion_results", [])}
            normalized_terms = _normalize_enriched_terms(enrichment_data)
            metadata = {
                **metadata,
                "auto_enrich": {
                    "enabled": True,
                    "sources": auto_result.get("sources") or ["reactome", "wikipathways", "fusion"],
                    "total_terms": auto_result.get("total_original_terms"),
                    "total_modules": auto_result.get("total_modules"),
                    "warnings": auto_result.get("warnings", [])
                }
            }

    significant_terms = [
        t for t in normalized_terms
        if (t.get("fdr") is not None and t["fdr"] < 0.05) or (t.get("fdr") is None and t.get("p_value") is not None and t["p_value"] < 0.05)
    ]

    if not normalized_terms:
        return {
            "status": "ok",
            "summary": "No enrichment results were provided and auto-enrichment could not run. Please run enrichment first or provide differential expression data.",
            "terms_used": []
        }

    if not significant_terms:
        return {
            "status": "ok",
            "summary": "No significant enrichment detected (all FDR >= 0.05 or missing). Consider broadening gene sets or adjusting thresholds.",
            "terms_used": []
        }

    payload = {
        "significant_terms": significant_terms[:12],
        "total_terms": len(normalized_terms),
        "cutoffs": {"p_value": 0.05, "fdr": 0.05},
        "metadata": metadata,
        "volcano_preview_genes": [
            g.get("gene") for g in (volcano_data or []) if g.get("status") in {"UP", "DOWN"}
        ][:20]
    }
    if ui_language:
        payload["ui_language"] = ui_language

    prompt = render_prompt(FUSION_ENRICHMENT_PROMPT if is_fusion else PATHWAY_ENRICHMENT_PROMPT, payload)
    content, model, error = _invoke_structured_prompt(prompt, temperature=0.25)

    if error or not content:
        return {"status": "error", "message": f"LLM error: {error or 'empty response'}"}

    return {
        "status": "ok",
        "summary": content,
        "model": model,
        "terms_used": [t.get("term") for t in significant_terms[:12] if isinstance(t, dict)]
    }


def summarize_de_genes(
    volcano_data: Optional[List[Dict[str, Any]]],
    thresholds: Optional[Dict[str, Any]] = None,
    ui_language: Optional[str] = None
) -> Dict[str, Any]:
    """Generate a standardized summary for differential expression results."""
    if not volcano_data:
        return {"status": "error", "message": "No differential expression data provided"}

    thresholds = thresholds or {}
    pvalue_threshold = _to_float(thresholds.get("pvalue_threshold"), 0.05) or 0.05
    logfc_threshold = _to_float(thresholds.get("logfc_threshold"), 1.0) or 1.0

    up, down, _ = _split_significant_genes(volcano_data, pvalue_threshold, logfc_threshold)

    if not up and not down:
        return {
            "status": "ok",
            "summary": f"No significant genes met the thresholds (p<{pvalue_threshold}, |log2FC|>{logfc_threshold}). Consider relaxing cutoffs or providing adjusted p-values.",
            "counts": {"up": 0, "down": 0}
        }

    top_up = sorted(up, key=lambda g: abs(g.get("log2fc", 0)), reverse=True)[:10]
    top_down = sorted(down, key=lambda g: abs(g.get("log2fc", 0)), reverse=True)[:10]

    payload = {
        "thresholds": {"p_value": pvalue_threshold, "log2fc": logfc_threshold},
        "counts": {"up": len(up), "down": len(down)},
        "top_up": top_up,
        "top_down": top_down
    }
    if ui_language:
        payload["ui_language"] = ui_language

    prompt = render_prompt(DE_SUMMARY_PROMPT, payload)
    content, model, error = _invoke_structured_prompt(prompt, temperature=0.2)

    if error or not content:
        return {"status": "error", "message": f"LLM error: {error or 'empty response'}"}

    return {
        "status": "ok",
        "summary": content,
        "model": model,
        "counts": {"up": len(up), "down": len(down)},
        "top_up": [g.get("gene") for g in top_up if isinstance(g, dict)],
        "top_down": [g.get("gene") for g in top_down if isinstance(g, dict)]
    }


def parse_filter_query(
    natural_language_query: str,
    available_fields: Optional[List[str]] = None,
    ui_language: Optional[str] = None
) -> Dict[str, Any]:
    """Translate natural language filters into structured conditions."""
    if not natural_language_query or not natural_language_query.strip():
        return {"status": "error", "message": "Filter query is empty"}

    payload = {
        "query": natural_language_query,
        "available_fields": available_fields or []
    }
    if ui_language:
        payload["ui_language"] = ui_language
    prompt = render_prompt(NL_FILTER_PROMPT, payload, extra_notes="Respond with the JSON object only.")
    content, model, error = _invoke_structured_prompt(prompt, temperature=0.0, max_tokens=700)

    if error or not content:
        return {"status": "error", "message": f"LLM error: {error or 'empty response'}"}

    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()

    parsed = None
    try:
        parsed = json.loads(cleaned)
    except Exception:
        parsed = None

    return {
        "status": "ok",
        "summary": content,
        "parsed": parsed,
        "model": model
    }


def describe_visualization(table_data: Any, ui_language: Optional[str] = None) -> Dict[str, Any]:
    """Describe enrichment/visualization trends without making causal claims."""
    if not table_data:
        return {"status": "ok", "summary": "No visualization data provided to describe."}

    # Keep payload concise to avoid exceeding token limits
    preview = table_data
    if isinstance(table_data, list):
        preview = table_data[:25]

    payload = {"preview": preview}
    if ui_language:
        payload["ui_language"] = ui_language
    prompt = render_prompt(VISUALIZATION_PROMPT, payload)
    content, model, error = _invoke_structured_prompt(prompt, temperature=0.2, max_tokens=600)

    if error or not content:
        return {"status": "error", "message": f"LLM error: {error or 'empty response'}"}

    return {"status": "ok", "summary": content, "model": model}


def generate_hypothesis(
    significant_genes: Optional[List[str]] = None,
    pathways: Optional[Any] = None,
    volcano_data: Optional[List[Dict[str, Any]]] = None,
    ui_language: Optional[str] = None
) -> Dict[str, Any]:
    """Produce Phase 3 exploratory hypotheses with explicit disclaimers."""
    gene_list = significant_genes or []
    if not gene_list and volcano_data:
        gene_list = _derive_significant_genes(volcano_data)

    normalized_pathways = _normalize_enriched_terms(pathways or [])
    if not normalized_pathways and volcano_data:
        auto_result = _auto_enrich_from_volcano(
            volcano_data,
            sources=["reactome", "wikipathways"],
            species="auto",
            parameters=None
        )
        if auto_result and auto_result.get("fusion_results"):
            normalized_pathways = _normalize_enriched_terms(auto_result.get("fusion_results", []))

    if not gene_list and not normalized_pathways:
        return {
            "status": "ok",
            "summary": "No significant genes or pathways were provided. Supply differential expression results or enrichment hits to generate a hypothesis."
        }

    payload = {
        "significant_genes": gene_list[:40],
        "pathways": normalized_pathways[:10]
    }
    if ui_language:
        payload["ui_language"] = ui_language
    prompt = render_prompt(HYPOTHESIS_PROMPT, payload, extra_notes="Always prefix speculative content with 'Hypothesis (not validated)'.")
    content, model, error = _invoke_structured_prompt(prompt, temperature=0.35, max_tokens=800)

    if error or not content:
        return {"status": "error", "message": f"LLM error: {error or 'empty response'}"}

    return {
        "status": "ok",
        "summary": content,
        "model": model
    }



def discover_patterns(expression_matrix: Any, ui_language: Optional[str] = None) -> Dict[str, Any]:
    """Exploratory pattern discovery for Phase 3."""
    if not expression_matrix:
        return {"status": "ok", "summary": "No expression matrix provided. Provide DE results or expression values to discover patterns."}

    preview = expression_matrix
    if isinstance(expression_matrix, list):
        # Trim to keep payload small
        preview = expression_matrix[:60]

    payload = {"expression_preview": preview}
    if ui_language:
        payload["ui_language"] = ui_language
    prompt = render_prompt(PATTERN_DISCOVERY_PROMPT, payload, extra_notes="Treat all findings as exploratory.")
    content, model, error = _invoke_structured_prompt(prompt, temperature=0.3, max_tokens=850)

    if error or not content:
        return {"status": "error", "message": f"LLM error: {error or 'empty response'}"}

    return {"status": "ok", "summary": content, "model": model}


def summarize_studio_intelligence(
    intelligence_data: Dict[str, Any],
    ui_language: Optional[str] = None,
    **_kwargs: Any
) -> Dict[str, Any]:
    """
    [Phase 6] Generate a 'Super Narrative' by synthesizing all 7 analytical layers.
    This provides the cohesive executive summary for the Intelligence Dashboard.
    """
    if not intelligence_data:
        return {"status": "error", "message": "No intelligence data provided"}

    # Extract core layers for synthesis
    # Handle both direct layers or nested under 'intelligence_data'
    if "intelligence_data" in intelligence_data:
        root = intelligence_data["intelligence_data"]
    else:
        root = intelligence_data

    layers = root.get("layers", {})
    summary = root.get("summary", "Standard overview")
    drivers = root.get("drivers", [])
    if not ui_language:
        ui_language = intelligence_data.get("ui_language") or root.get("ui_language")

    payload = {
        "multi_omics": layers.get("multi_omics", {}),
        "temporal": layers.get("temporal", {}),
        "druggability": layers.get("druggability", {}),
        "topology": layers.get("topology", {}),
        "qc": layers.get("qc", {}),
        "lab": layers.get("lab", {}),
        "knowledge_hub": layers.get("rag_hints", {}),
        "summary_stats": summary,
        "key_drivers": drivers[:20] if isinstance(drivers, list) else []
    }
    if ui_language:
        payload["ui_language"] = ui_language

    prompt = render_prompt(STUDIO_INSIGHTS_PROMPT, payload)
    content, model, error = _invoke_structured_prompt(prompt, temperature=0.3, max_tokens=1500)

    if error or not content:
        return {"status": "error", "message": f"LLM error: {error or 'empty response'}"}

    return {
        "status": "ok",
        "super_narrative": content,
        "model": model
    }


# --- Yellow Zone Tools (Require Confirmation) ---

def _update_analysis_thresholds(
    pvalue_threshold: Optional[float] = None,
    logfc_threshold: Optional[float] = None
) -> Dict[str, Any]:
    """
    Update analysis thresholds.
    This is a Yellow Zone action - requires user confirmation.
    """
    result = {"updated": []}
    if pvalue_threshold is not None:
        result["pvalue_threshold"] = pvalue_threshold
        result["updated"].append("pvalue_threshold")
    if logfc_threshold is not None:
        result["logfc_threshold"] = logfc_threshold
        result["updated"].append("logfc_threshold")
    return result


def _export_analysis_data(
    output_path: Optional[str] = None,
    format: str = "csv",
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Export analysis data to file.
    This is a Yellow Zone action - requires user confirmation.
    """
    try:
        import csv
        import os
        from pathlib import Path
        import time
        import json
        import sys
        import traceback
        
        # 1. Resolve Path
        default_dir = Path.home() / "BioViz_Exports"
        default_dir.mkdir(parents=True, exist_ok=True)
        
        raw_path = output_path
        if not raw_path:
            raw_path = str(default_dir / f"bioviz_export_{int(time.time())}.{format}")
        
        # Handle simple names like "Desktop" or "~/Desktop"
        if "desktop" in raw_path.lower():
            desktop = Path.home() / "Desktop"
            if desktop.exists():
                if "/" not in raw_path and "\\" not in raw_path:
                    # Just the word desktop, add filename
                    raw_path = str(desktop / f"bioviz_export.{format}")
                elif raw_path.startswith("desktop") or raw_path.startswith("Desktop"):
                    # Relative to desktop
                    raw_path = str(desktop / raw_path.split("/")[-1])
        
        resolved_path = str(Path(os.path.expanduser(raw_path)).absolute())
        
        # Ensure directory exists
        Path(resolved_path).parent.mkdir(parents=True, exist_ok=True)
        
        # 2. Get Data
        data = []
        if context and context.get('volcanoData'):
            data = context.get('volcanoData', [])
        elif context and context.get('data') and isinstance(context.get('data'), list):
            data = context.get('data')
            
        if not data:
            return {
                "status": "error",
                "message": "No data found in context to export. Please ensure analysis is loaded."
            }
            
        # 3. Perform Export
        if format.lower() == "csv":
            with open(resolved_path, 'w', encoding='utf-8', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['Gene', 'Log2FC', 'PValue', 'Status'])
                for item in data:
                    writer.writerow([
                        item.get('gene', ''),
                        item.get('x', 0),
                        item.get('pvalue', 1.0),
                        item.get('status', 'NS')
                    ])
        elif format.lower() == "json":
            with open(resolved_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4)
        else:
             # Fallback to CSV if format not supported yet (Excel requires extra libs)
             if not resolved_path.endswith(".csv"):
                 resolved_path += ".csv"
             with open(resolved_path, 'w', encoding='utf-8', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['Gene', 'Log2FC', 'PValue', 'Status'])
                for item in data:
                    writer.writerow([item.get('gene', ''), item.get('x', 0), item.get('pvalue', 1.0), item.get('status', 'NS')])

        # 4. Generate Preview
        rows = ["gene,log2FoldChange,status"]
        for item in data[:10]:
            rows.append(f"{item.get('gene')},{item.get('x', 0):.4f},{item.get('status', 'NS')}")
        if len(data) > 10:
            rows.append(f"... and {len(data)-10} more rows")
        data_summary = "\n".join(rows)

        print(f"[AI Tool] Exported {len(data)} rows to {resolved_path}", file=sys.stderr)

        return {
            "action": "export",
            "output_path": resolved_path,
            "format": format,
            "status": "success",
            "data_preview": data_summary,
            "message": f"Data successfully saved to {resolved_path}"
        }
    except Exception as e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        return {
            "status": "error",
            "message": f"Failed to export data: {str(e)}"
        }


# --- Tool Registry ---

TOOLS: List[ToolDefinition] = [
    # Green Zone - Safe to auto-execute
    ToolDefinition(
        name="render_pathway",
        label="Pathway Visualization",
        description="Render and color a KEGG pathway with gene expression data. Returns the colored pathway and statistics.",
        parameters={
            "type": "object",
            "properties": {
                "pathway_id": {
                    "type": "string",
                    "description": "KEGG pathway ID (e.g., 'hsa04210' for Apoptosis)"
                },
                "gene_expression": {
                    "type": "object",
                    "description": "Dictionary mapping gene symbols to expression values (log2 fold change)",
                    "additionalProperties": {"type": "number"}
                },
                "data_type": {
                    "type": "string",
                    "enum": ["gene", "protein", "cell"],
                    "description": "Type of biological data",
                    "default": "gene"
                }
            },
            "required": ["pathway_id", "gene_expression"]
        },
        safety_level=SafetyLevel.GREEN,
        handler=_render_pathway
    ),
    
    ToolDefinition(
        name="get_pathway_stats",
        label="Pathway Statistics",
        description="Get statistics for a pathway (upregulated, downregulated, unchanged counts) without full rendering.",
        parameters={
            "type": "object",
            "properties": {
                "pathway_id": {
                    "type": "string",
                    "description": "KEGG pathway ID"
                },
                "gene_expression": {
                    "type": "object",
                    "description": "Gene expression data",
                    "additionalProperties": {"type": "number"}
                },
                "data_type": {
                    "type": "string",
                    "enum": ["gene", "protein", "cell"],
                    "default": "gene"
                }
            },
            "required": ["pathway_id", "gene_expression"]
        },
        safety_level=SafetyLevel.GREEN,
        handler=_get_pathway_stats
    ),
    
    ToolDefinition(
        name="list_pathways",
        label="Pathway Portfolio",
        description="List all available KEGG pathway templates.",
        parameters={
            "type": "object",
            "properties": {},
            "required": []
        },
        safety_level=SafetyLevel.GREEN,
        handler=_list_available_pathways
    ),
    
    ToolDefinition(
        name="explain_pathway",
        label="Pathway Explainer",
        description="Get a brief description of what a pathway does.",
        parameters={
            "type": "object",
            "properties": {
                "pathway_id": {
                    "type": "string",
                    "description": "KEGG pathway ID to explain"
                }
            },
            "required": ["pathway_id"]
        },
        safety_level=SafetyLevel.GREEN,
        handler=_explain_pathway
    ),
    
    ToolDefinition(
        name="run_enrichment",
        label="Enrichment Analysis",
        description="Run enrichment analysis (ORA) on a list of significant genes using local gene set sources.",
        parameters={
            "type": "object",
            "properties": {
                "gene_list": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of gene symbols to analyze (e.g., ['LDHA', 'PKM', 'ENO1'])"
                },
                "gene_sets": {
                    "type": "string",
                    "enum": ["reactome", "wikipathways", "go_bp"],
                    "description": "Gene set database to use",
                    "default": "reactome"
                }
            },
            "required": ["gene_list"]
        },
        safety_level=SafetyLevel.GREEN,
        handler=_run_enrichment
    ),

    ToolDefinition(
        name="summarize_studio_intelligence",
        label="Studio Report Generator",
        description="Synthesize the 7 analytical layers into a cohesive 'Super Narrative'. Use this for full-width BioViz Studio reports.",
        parameters={
            "type": "object",
            "properties": {
                "intelligence_data": {
                    "type": "object",
                    "description": "The complete 7-layer intelligence report object."
                }
            },
            "required": ["intelligence_data"]
        },
        safety_level=SafetyLevel.GREEN,
        handler=summarize_studio_intelligence
    ),
    
    # Yellow Zone - Requires confirmation
    ToolDefinition(
        name="update_thresholds",
        label="Update Thresholds",
        description="Update analysis thresholds for significance (p-value) and effect size (log fold change). REQUIRES USER CONFIRMATION.",
        parameters={
            "type": "object",
            "properties": {
                "pvalue_threshold": {
                    "type": "number",
                    "description": "New p-value threshold for significance (e.g., 0.05)"
                },
                "logfc_threshold": {
                    "type": "number",
                    "description": "New log2 fold change threshold (e.g., 1.0)"
                }
            },
            "required": []
        },
        safety_level=SafetyLevel.YELLOW,
        handler=_update_analysis_thresholds
    ),
    
    ToolDefinition(
        name="export_data",
        label="Export Data",
        description="Export analysis data to a file. REQUIRES USER CONFIRMATION.",
        parameters={
            "type": "object",
            "properties": {
                "output_path": {
                    "type": "string",
                    "description": "Path where the file will be saved"
                },
                "format": {
                    "type": "string",
                    "enum": ["csv", "xlsx", "json"],
                    "description": "Output file format",
                    "default": "csv"
                }
            },
            "required": []
        },
        safety_level=SafetyLevel.YELLOW,
        handler=_export_analysis_data
    ),
]


# --- Helper Functions ---

def get_tool(name: str) -> Optional[ToolDefinition]:
    """Get a tool by name."""
    for tool in TOOLS:
        if tool.name == name:
            return tool
    return None


def get_openai_tools_schema() -> List[Dict[str, Any]]:
    """Get all tools in OpenAI API format."""
    return [tool.to_openai_schema() for tool in TOOLS]


def get_green_zone_tools() -> List[str]:
    """Get names of all Green Zone tools."""
    return [t.name for t in TOOLS if t.safety_level == SafetyLevel.GREEN]


def get_yellow_zone_tools() -> List[str]:
    """Get names of all Yellow Zone tools."""
    return [t.name for t in TOOLS if t.safety_level == SafetyLevel.YELLOW]


def execute_tool(name: str, args: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> Any:
    """Execute a tool by name with given arguments and optional context."""
    tool = get_tool(name)
    if not tool:
        raise ValueError(f"Unknown tool: {name}")
    
    # Try to inject context if the handler accepts it
    import inspect
    try:
        sig = inspect.signature(tool.handler)
        if 'context' in sig.parameters:
            return tool.handler(**args, context=context)
    except Exception:
        pass
        
    return tool.handler(**args)
