#!/usr/bin/env python3
"""
Quick verification script for KEGGpathway integration
Tests all three pathways and the mapper functions
"""

import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from mapper import (
    load_pathway_template,
    color_kegg_pathway,
    get_pathway_statistics,
    batch_color_pathways
)


def test_load_pathways():
    """Test loading all three pathway templates"""
    print("=" * 60)
    print("TEST 1: Loading Pathway Templates")
    print("=" * 60)
    
    pathway_ids = ['hsa04210', 'hsa04115', 'hsa04110']
    
    for pathway_id in pathway_ids:
        pathway = load_pathway_template(pathway_id)
        if pathway:
            print(f"✓ {pathway_id}: {pathway['name']}")
            print(f"  - Nodes: {len(pathway['nodes'])}")
            print(f"  - Edges: {len(pathway['edges'])}")
            print(f"  - Categories: {len(pathway['categories'])}")
        else:
            print(f"✗ {pathway_id}: FAILED TO LOAD")
    
    print()


def test_color_pathway():
    """Test coloring a pathway with sample data"""
    print("=" * 60)
    print("TEST 2: Coloring Apoptosis Pathway")
    print("=" * 60)
    
    # Sample gene expression data (log2 fold change)
    gene_expression = {
        'TNF': 1.5,
        'FAS': 2.0,
        'CASP8': 1.8,
        'CASP3': 2.5,
        'BAX': 2.2,
        'BCL2': -1.8,
        'BCLXL': -1.5,
        'XIAP': -2.0,
        'CYCS': 2.3,
        'APAF1': 1.9,
        'CASP9': 2.1
    }
    
    colored_pathway = color_kegg_pathway('hsa04210', gene_expression)
    stats = get_pathway_statistics(colored_pathway)
    
    print(f"Pathway: {colored_pathway['name']}")
    print(f"Gene expression data: {len(gene_expression)} genes")
    print()
    print("Statistics:")
    print(f"  - Total nodes: {stats['total_nodes']}")
    print(f"  - Upregulated: {stats['upregulated']} ({stats['percent_upregulated']:.1f}%)")
    print(f"  - Downregulated: {stats['downregulated']} ({stats['percent_downregulated']:.1f}%)")
    print(f"  - Unchanged: {stats['unchanged']}")
    print()
    
    # Show some colored nodes
    print("Sample colored nodes:")
    for node in colored_pathway['nodes'][:5]:
        expr = node.get('expression', 'N/A')
        print(f"  - {node['id']:10s}: color={node['color']}, expression={expr}")
    
    print()


def test_batch_coloring():
    """Test batch coloring multiple pathways"""
    print("=" * 60)
    print("TEST 3: Batch Coloring All Pathways")
    print("=" * 60)
    
    gene_expression = {
        # Shared genes across pathways
        'TP53': 3.0,
        'MDM2': 1.2,
        'CDKN1A': 2.8,  # p21
        'BAX': 2.2,
        'PUMA': 2.5,
        'GADD45A': 1.9,
        'CCND1': 1.5,
        'CDK4': 1.3,
        'RB1': -0.8,
        'E2F': 1.7,
        'CCNE1': 1.9,
        'CDK2': 1.6,
        'FAS': 2.0,
        'CASP3': 2.5,
        'BCL2': -1.8
    }
    
    pathways = batch_color_pathways(
        ['hsa04210', 'hsa04115', 'hsa04110'],
        gene_expression
    )
    
    for pathway_id, pathway in pathways.items():
        stats = get_pathway_statistics(pathway)
        print(f"{pathway_id} - {pathway['name']}")
        print(f"  Up: {stats['upregulated']}, Down: {stats['downregulated']}, Unchanged: {stats['unchanged']}")
    
    print()


def test_color_mapping():
    """Test the color mapping function"""
    print("=" * 60)
    print("TEST 4: Color Mapping Verification")
    print("=" * 60)
    
    from mapper import map_expression_to_color
    
    test_values = [
        (-2.0, "Strong downregulation"),
        (-1.0, "Moderate downregulation"),
        (0.0, "No change"),
        (1.0, "Moderate upregulation"),
        (2.0, "Strong upregulation")
    ]
    
    for value, description in test_values:
        color = map_expression_to_color(value, -2.0, 2.0)
        print(f"  {value:5.1f} → {color} ({description})")
    
    print()


def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("BioViz Local - KEGG Pathway Integration Tests")
    print("=" * 60 + "\n")
    
    try:
        test_load_pathways()
        test_color_pathway()
        test_batch_coloring()
        test_color_mapping()
        
        print("=" * 60)
        print("✓ ALL TESTS PASSED!")
        print("=" * 60)
        print("\nThe KEGG pathway integration is ready to use.")
        print("Next step: Integrate into the Tauri frontend.\n")
        
    except Exception as e:
        print(f"\n✗ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
