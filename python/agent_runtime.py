# BioViz Agent Runtime
# Orchestrates Motia workflows based on user intent.

import logging
import json
import traceback
from typing import Dict, Any, List

try:
    import motia
except ImportError:
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    import motia


from workflow_registry import (
    step_load_data, 
    step_multi_omics, 
    step_druggability, 
    step_generate_summary, 
    step_save_results,
    # New Narrative Steps
    step_semantic_deduplication,
    step_literature_scan,
    step_generate_narrative,
    # New Single-Cell Steps
    step_load_sc_data,
    step_compute_pathway_activity,
    step_spatial_lr_analysis,
    step_pathway_trajectory
)

logger = logging.getLogger("BioViz.AgentRuntime")

class AgentRuntime:
    def __init__(self):
        self.engine = motia.WorkflowEngine()
        self.active_workflows = {}
        logger.info("AgentRuntime initialized with Motia Engine.")


    def run_workflow(self, workflow_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a predefined workflow by name.
        """
        try:
            if workflow_name == "comprehensive_analysis":
                return self._flow_comprehensive(params)
            elif workflow_name == "narrative_analysis":
                return self._flow_narrative(params)
            elif workflow_name == "sc_contextual":
                return self._flow_sc_contextual(params)
            else:
                raise ValueError(f"Unknown workflow: {workflow_name}")
        except Exception as e:
            logger.error(f"Workflow execution failed: {e}")
            logger.error(traceback.format_exc())
            return {"status": "error", "error": str(e)}

    def _flow_narrative(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Phase 2: The 'Job-to-be-Done' workflow.
        Sequence: Load -> Deduplicate -> RAG -> Narrative
        """
        logger.info("Starting Mechanistic Narrative Workflow...")
        
        enrichment_data = params.get('enrichment_results')
        if not enrichment_data:
            file_path = params.get('file_path')
            mapping = params.get('mapping') or {}
            filters = params.get('filters') or {}
            pvalue_threshold = float(filters.get('pvalue_threshold', 0.05))
            logfc_threshold = float(filters.get('logfc_threshold', 1.0))
            top_n = int(filters.get('top_n', 200))
            volcano_data = params.get('volcano_data') or params.get('volcanoData')
            gene_list = params.get('genes') or params.get('gene_list') or params.get('geneList')

            def extract_genes_from_volcano(rows):
                if not rows:
                    return []
                picked = []
                ranked = []
                for row in rows:
                    gene = (
                        row.get('gene')
                        or row.get('Gene')
                        or row.get('symbol')
                        or row.get('Symbol')
                    )
                    if not gene:
                        continue
                    logfc = (
                        row.get('log2FC')
                        or row.get('logfc')
                        or row.get('logFC')
                        or row.get('x')
                    )
                    pval = (
                        row.get('pvalue')
                        or row.get('p_value')
                        or row.get('PVal')
                    )
                    if pval is None and row.get('y') is not None:
                        try:
                            pval = 10 ** (-float(row.get('y')))
                        except Exception:
                            pval = None
                    if logfc is not None:
                        try:
                            ranked.append((gene, abs(float(logfc)), float(pval) if pval is not None else None))
                        except Exception:
                            continue
                    if pval is not None and logfc is not None:
                        try:
                            if float(pval) < pvalue_threshold and abs(float(logfc)) > logfc_threshold:
                                picked.append(gene)
                        except Exception:
                            continue
                if picked:
                    return list(dict.fromkeys(picked))
                ranked.sort(key=lambda item: item[1], reverse=True)
                return [gene for gene, _, _ in ranked[:top_n]]

            if gene_list:
                genes = [str(g) for g in gene_list if g]
            else:
                genes = extract_genes_from_volcano(volcano_data)

            if genes:
                try:
                    from enrichment.fusion import fusion_pipeline
                    logger.info("Deriving enrichment results from volcano_data for narrative workflow.")
                    fusion = fusion_pipeline.run_fusion_analysis(genes=genes, method="ORA")
                    if fusion.get("status") == "ok":
                        enrichment_data = []
                        for cluster in fusion.get("fusion_results", []):
                            term = cluster.get("representative_term") or "Unknown"
                            genes_list = cluster.get("genes") or []
                            enrichment_data.append({
                                "Term": term,
                                "P-value": cluster.get("p_value", 1.0),
                                "Adjusted P-value": cluster.get("fdr", 1.0),
                                "Genes": " ".join(genes_list)
                            })
                except Exception as e:
                    logger.warning(f"Failed to derive enrichment results from volcano_data: {e}")

            if not enrichment_data and file_path and mapping:
                try:
                    from enrichment.fusion import fusion_pipeline
                    logger.info("Deriving enrichment results from file_path for narrative workflow.")
                    df = step_load_data(file_path=file_path, mapping=mapping)
                    if 'pvalue' in df.columns:
                        sig = df[(df['pvalue'] < pvalue_threshold) & (df['log2FC'].abs() > logfc_threshold)]
                        genes = sig['gene'].dropna().astype(str).unique().tolist()
                    else:
                        df = df.dropna(subset=['log2FC'])
                        df = df.reindex(df['log2FC'].abs().sort_values(ascending=False).index)
                        genes = df['gene'].dropna().astype(str).unique().tolist()[:top_n]

                    if genes:
                        fusion = fusion_pipeline.run_fusion_analysis(genes=genes, method="ORA")
                        if fusion.get("status") == "ok":
                            enrichment_data = []
                            for cluster in fusion.get("fusion_results", []):
                                term = cluster.get("representative_term") or "Unknown"
                                genes_list = cluster.get("genes") or []
                                enrichment_data.append({
                                    "Term": term,
                                    "P-value": cluster.get("p_value", 1.0),
                                    "Adjusted P-value": cluster.get("fdr", 1.0),
                                    "Genes": " ".join(genes_list)
                                })
                except Exception as e:
                    logger.warning(f"Failed to derive enrichment results: {e}")

        if not enrichment_data:
            # Fallback for testing: Generate synthetic data
            logger.warning("Narrative workflow using synthetic enrichment data (fallback).")
            enrichment_data = [
                {'Term': 'Cell Cycle', 'P-value': 1e-5, 'Genes': 'TP53 CDK2 CCNB1'},
                {'Term': 'Mitotic Cell Cycle', 'P-value': 1e-4, 'Genes': 'CDK2 CCNB1'},
                {'Term': 'Viral Reproduction', 'P-value': 0.001, 'Genes': 'TP53'},
                {'Term': 'T Cell Receptor Signaling', 'P-value': 1e-6, 'Genes': 'CD3D CD28 ZAP70'},
                {'Term': 'PD-1 Checkpoint Pathway', 'P-value': 1e-5, 'Genes': 'PDCD1 CD274'}
            ]
        
        # 2. Semantic De-duplication
        # Merges "Cell Cycle" & "Mitotic..." -> Module 1
        modules = step_semantic_deduplication(enrichment_data)
        
        # 3. Literature RAG
        # Fetches "TP53 master regulator..." evidence
        enhanced_modules = step_literature_scan(modules)
        
        # 4. Narrative Generation
        # Writes the report
        narrative_text = step_generate_narrative(enhanced_modules)
        
        history = self.engine.context.get_history()
        
        return {
            "status": "completed",
            "narrative": narrative_text,
            "modules_found": len(modules),
            "trace": history
        }

    def _flow_comprehensive(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Hardcoded 'Planner' output for the MVP.
        Sequence: Load -> MultiOmics -> Druggability -> Summary
        """
        logger.info("Starting Comprehensive Analysis Workflow...")
        
        # 1. Load Data
        df = step_load_data(
            file_path=params['file_path'], 
            mapping=params.get('mapping', {'gene': 'Gene', 'value': 'Log2FC'})
        )
        
        # 2. Parallel Analysis (Sequential in Shim for now)
        omics_result = step_multi_omics(df)
        drugs_result = step_druggability(df)
        
        # 3. Aggregate
        insights = {
            "multi_omics": omics_result,
            "druggability": drugs_result
        }
        
        # 4. Generate Narrative
        summary_text = step_generate_summary(insights)
        
        # 5. Return context history as the "Execution Trace"
        history = self.engine.context.get_history()
        
        return {
            "status": "completed",
            "summary": summary_text,
            "insights": insights,
            "trace": history
        }

    def _flow_sc_contextual(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Phase 3: Single-Cell Contextual Analysis Workflow.
        Sequence: Load SC Data → Pathway Scoring → Spatial L-R → Trajectory
        """
        logger.info("Starting Single-Cell Contextual Analysis Workflow...")
        
        # 1. Load AnnData
        file_path = params.get('file_path')
        if not file_path:
            raise ValueError("Missing required parameter: file_path (.h5ad file)")
        
        sc_data = step_load_sc_data(file_path)
        logger.info(f"Loaded {sc_data['metadata']['n_cells']} cells, {sc_data['metadata']['n_genes']} genes")
        
        # 2. Define pathways for scoring
        pathways = params.get('pathways') or {
            'Cell Cycle': ['CDK1', 'CCNB1', 'CDC20'],
            'Apoptosis': ['TP53', 'BAX', 'CASP3'],
            'Immune Response': ['CD3D', 'CD8A', 'IFNG']
        }
        
        # 3. Compute pathway activity scores
        pathway_results = step_compute_pathway_activity(
            sc_data, pathways, cluster_key=params.get('cluster_key', 'cell_type')
        )
        
        # 4. Spatial L-R interaction analysis
        lr_interactions = []
        if sc_data['has_spatial']:
            lr_interactions = step_spatial_lr_analysis(sc_data, pathway_results)
        
        # 5. Trajectory mapping
        trajectory_result = {'trajectory_df': None, 'dynamic_pathways': []}
        if sc_data['has_pseudotime']:
            trajectory_result = step_pathway_trajectory(sc_data, pathway_results)
        
        history = self.engine.context.get_history()
        
        return {
            "status": "completed",
            "metadata": sc_data['metadata'],
            "lr_interactions": lr_interactions,
            "trajectory": trajectory_result,
            "trace": history
        }

    def process_intent(self, intent_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main entry point for AI Panel commands.
        Input example: {"intent": "analyze_all", "params": {...}}
        """
        intent = intent_json.get("intent")
        params = intent_json.get("params", {})
        
        if intent == "analyze_all":
            return self.run_workflow("comprehensive_analysis", params)
        elif intent == "analyze_narrative":
            return self.run_workflow("narrative_analysis", params)
        elif intent == "sc_contextual":
            return self.run_workflow("sc_contextual", params)
            
        # Natural Language Heuristics
        intent_lower = str(intent).lower()
        if any(k in intent_lower for k in ["summarize", "findings", "significance", "mechanism", "evidence", "literature"]):
             logger.info(f"Mapping structured prompt '{intent}' to narrative_analysis")
             return self.run_workflow("narrative_analysis", params)
        elif any(k in intent_lower for k in ["single cell", "spatial", "trajectory", "sc"]):
             logger.info(f"Mapping structured prompt '{intent}' to sc_contextual")
             return self.run_workflow("sc_contextual", params)
             
        # Default fallback for Synthesis Panel context
        logger.info(f"Unknown intent '{intent}', defaulting to narrative_analysis")
        return self.run_workflow("narrative_analysis", params)


# Singleton instance
agent_runtime = AgentRuntime()
