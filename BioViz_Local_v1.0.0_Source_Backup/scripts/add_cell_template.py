import json
import os

def create_hematopoietic_template():
    """Generates a simplified KEGG-like JSON for Hematopoietic Cell Lineage (hsa04640)."""
    
    # Define the structure based on a hierarchical differentiation tree
    # Coordinates are approximate for visual layout
    
    # Root
    hsc = {"id": 1, "name": "HSC", "x": 400, "y": 50, "type": "gene", "category": "Cell"} # Hematopoietic stem cell
    
    # Level 1: Multipotent
    mpp = {"id": 2, "name": "MPP", "x": 400, "y": 150, "type": "gene", "category": "Cell"} # Multipotent progenitor
    
    # Level 2: Lineage Commitment
    cmp = {"id": 3, "name": "CMP", "x": 200, "y": 250, "type": "gene", "category": "Cell"} # Common myeloid progenitor
    clp = {"id": 4, "name": "CLP", "x": 600, "y": 250, "type": "gene", "category": "Cell"} # Common lymphoid progenitor
    
    # Level 3: Myeloid Branch
    gmp = {"id": 5, "name": "GMP", "x": 100, "y": 350, "type": "gene", "category": "Cell"} # Granulocyte-macrophage progenitor
    mep = {"id": 6, "name": "MEP", "x": 300, "y": 350, "type": "gene", "category": "Cell"} # Megakaryocyte-erythroid progenitor
    
    # Level 4: Differentiated Myeloid
    monocyte = {"id": 7, "name": "Monocyte", "x": 50, "y": 450, "type": "gene", "category": "Cell"}
    neutrophil = {"id": 8, "name": "Neutrophil", "x": 150, "y": 450, "type": "gene", "category": "Cell"}
    eosinophil = {"id": 9, "name": "Eosinophil", "x": 100, "y": 550, "type": "gene", "category": "Cell"}
    basophil = {"id": 10, "name": "Basophil", "x": 200, "y": 550, "type": "gene", "category": "Cell"}
    macrophage = {"id": 11, "name": "Macrophage", "x": 50, "y": 550, "type": "gene", "category": "Cell"}
    
    # Level 3: Lymphoid Branch
    pro_b = {"id": 12, "name": "Pro-B cell", "x": 500, "y": 350, "type": "gene", "category": "Cell"}
    pro_t = {"id": 13, "name": "Pro-T cell", "x": 700, "y": 350, "type": "gene", "category": "Cell"}
    nk_p = {"id": 14, "name": "NK precursor", "x": 800, "y": 350, "type": "gene", "category": "Cell"}

    # Level 4: Differentiated Lymphoid
    b_cell = {"id": 15, "name": "B cell", "x": 500, "y": 450, "type": "gene", "category": "Cell"}
    t_cell = {"id": 16, "name": "T cell", "x": 700, "y": 450, "type": "gene", "category": "Cell"}
    nk_cell = {"id": 17, "name": "NK cell", "x": 850, "y": 450, "type": "gene", "category": "Cell"}

    # Level 5: T Cell Subsets
    cd4_t = {"id": 18, "name": "CD4+ T cell", "x": 650, "y": 550, "type": "gene", "category": "Cell"}
    cd8_t = {"id": 19, "name": "CD8+ T cell", "x": 750, "y": 550, "type": "gene", "category": "Cell"}

    nodes = [
        hsc, mpp, cmp, clp, gmp, mep, 
        monocyte, neutrophil, eosinophil, basophil, macrophage,
        pro_b, pro_t, nk_p, b_cell, t_cell, nk_cell, cd4_t, cd8_t
    ]

    # Edges (Differentiation paths)
    edges = [
        {"source": 1, "target": 2}, # HSC -> MPP
        {"source": 2, "target": 3}, # MPP -> CMP
        {"source": 2, "target": 4}, # MPP -> CLP
        
        # Myeloid Lineage
        {"source": 3, "target": 5}, # CMP -> GMP
        {"source": 3, "target": 6}, # CMP -> MEP
        {"source": 5, "target": 7}, # GMP -> Monocyte
        {"source": 7, "target": 11}, # Monocyte -> Macrophage
        {"source": 5, "target": 8}, # GMP -> Neutrophil
        {"source": 5, "target": 9}, # GMP -> Eosinophil
        {"source": 5, "target": 10}, # GMP -> Basophil
        
        # Lymphoid Lineage
        {"source": 4, "target": 12}, # CLP -> Pro-B
        {"source": 4, "target": 13}, # CLP -> Pro-T
        {"source": 4, "target": 14}, # CLP -> NK precursor
        
        {"source": 12, "target": 15}, # Pro-B -> B cell
        {"source": 13, "target": 16}, # Pro-T -> T cell
        {"source": 14, "target": 17}, # NK p -> NK cell
        
        {"source": 16, "target": 18}, # T cell -> CD4+
        {"source": 16, "target": 19}, # T cell -> CD8+
    ]

    template = {
        "id": "hsa04640",
        "title": "Hematopoietic cell lineage",
        "description": "Map of blood cell differentiation from HSCs to mature immune cells.",
        "nodes": nodes,
        "edges": edges
    }

    output_path = os.path.join("assets", "templates", "hsa04640.json") # Corrected path
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, "w") as f:
        json.dump(template, f, indent=2)
    
    print(f"Successfully generated {output_path}")

if __name__ == "__main__":
    create_hematopoietic_template()
