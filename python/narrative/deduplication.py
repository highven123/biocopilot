import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional

class SemanticAggregator:
    """
    Implements pathway de-duplication and clustering logic.
    Goal: Reduce 100+ similar pathways (e.g., 'T cell activation', 'Lymphocyte activation') 
    into ~10 distinct 'Biological Modules'.
    """

    def __init__(self, similarity_threshold: float = 0.4):
        self.threshold = similarity_threshold

    def calculate_jaccard(self, set_a: set, set_b: set) -> float:
        """Calculates Jaccard Index: Intersection / Union"""
        intersection = len(set_a.intersection(set_b))
        union = len(set_a.union(set_b))
        if union == 0:
            return 0.0
        return intersection / union

    def deduplicate(self, enrichment_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Main entry point.
        Expects a DataFrame with enrichment columns; gene list columns may vary by source.
        Returns a list of structured 'Module' dicts.
        """
        if enrichment_df.empty:
            return []

        def pick_column(df: pd.DataFrame, candidates: List[str]) -> Optional[str]:
            for name in candidates:
                if name in df.columns:
                    return name
            return None

        def parse_gene_set(val: Any) -> set:
            if val is None or (isinstance(val, float) and np.isnan(val)):
                return set()
            if isinstance(val, (list, tuple, set)):
                return set(str(v).strip() for v in val if str(v).strip())
            text = str(val).replace(';', ' ').replace(',', ' ')
            return set(tok for tok in text.split() if tok)

        # Standardize DF
        df = enrichment_df.copy()
        term_col = pick_column(df, ['Term', 'term', 'Pathway', 'pathway', 'pathway_name', 'Name', 'name'])
        genes_col = pick_column(df, ['Genes', 'genes', 'Hit Genes', 'hit_genes', 'Gene Set', 'gene_set', 'Lead_genes', 'Leading edge', 'leading_edge'])
        fdr_col = pick_column(df, ['Adjusted P-value', 'adjusted_p_value', 'FDR', 'fdr'])
        p_col = pick_column(df, ['P-value', 'p_value', 'PValue'])

        if term_col and term_col != 'Term':
            df['Term'] = df[term_col]
        if genes_col:
            df['Genes'] = df[genes_col]
        elif 'Genes' not in df.columns:
            df['Genes'] = ''

        # Ensure we have a set of genes for each term
        # Assuming 'Genes' col formatting is typical (e.g., "TP53;EGFR" or "TP53, EGFR")
        df['GeneSet'] = df['Genes'].apply(parse_gene_set)
        
        # Sort by P-value (most significant first) to pick "Representatives"
        if fdr_col:
            df = df.sort_values(fdr_col)
        elif p_col:
            df = df.sort_values(p_col)
            
        data = df.to_dict('records')
        clusters = [] # List of {'rep': record, 'members': [record, ...]}
        
        assigned_indices = set()

        for i, row_a in enumerate(data):
            if i in assigned_indices:
                continue
            
            # Start a new cluster with this term as the Representative (because it has lowest P-val)
            current_cluster = {
                "representative": row_a.get('Term', ''),
                "p_value": row_a.get(fdr_col, row_a.get(p_col, 0)),
                "genes": list(row_a['GeneSet']),
                "members": [row_a.get('Term', '')],  # Include itself
                "size": 1
            }
            assigned_indices.add(i)
            
            # Find all subsequent terms that are similar to this representative
            for j in range(i + 1, len(data)):
                if j in assigned_indices:
                    continue
                
                row_b = data[j]
                similarity = self.calculate_jaccard(row_a['GeneSet'], row_b['GeneSet'])
                
                if similarity >= self.threshold:
                    current_cluster['members'].append(row_b.get('Term', ''))
                    # Merge gene sets for a comprehensive view? 
                    # For now, keep rep's genes or union? Union is safer for "Module" view.
                    # row_a['GeneSet'].update(row_b['GeneSet']) 
                    current_cluster['size'] += 1
                    assigned_indices.add(j)
            
            # Format output for the next step (Narrative)
            # Simplify 'members' if too long
            if len(current_cluster['members']) > 5:
                current_cluster['members_str'] = ", ".join(current_cluster['members'][:5]) + f", ... ({len(current_cluster['members'])} total)"
            else:
                current_cluster['members_str'] = ", ".join(current_cluster['members'])
                
            clusters.append(current_cluster)

        return clusters

# Singleton
deduplicator = SemanticAggregator()
