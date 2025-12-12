import json
import os

def create_th1_th2_template():
    """Generates KEEG-like JSON for Th1 and Th2 cell differentiation (hsa04658)."""
    
    # Naive CD4+ T cell as root
    naive = {"id": 1, "name": "Naive CD4+ T cell", "x": 400, "y": 50, "type": "gene", "category": "Cell"}
    
    # Th1 Branch
    il12 = {"id": 2, "name": "IL-12", "x": 200, "y": 150, "type": "gene", "category": "Cytokine", "color": "#3498db"}
    ifng = {"id": 3, "name": "IFN-γ", "x": 200, "y": 250, "type": "gene", "category": "Cytokine", "color": "#3498db"}
    tbet = {"id": 4, "name": "T-bet", "x": 200, "y": 350, "type": "gene", "category": "Transcription Factor"}
    th1 = {"id": 5, "name": "Th1 cell", "x": 200, "y": 450, "type": "gene", "category": "Cell"}
    
    # Th2 Branch
    il4 = {"id": 6, "name": "IL-4", "x": 600, "y": 150, "type": "gene", "category": "Cytokine", "color": "#e74c3c"}
    il2 = {"id": 7, "name": "IL-2", "x": 600, "y": 250, "type": "gene", "category": "Cytokine", "color": "#e74c3c"}
    gata3 = {"id": 8, "name": "GATA3", "x": 600, "y": 350, "type": "gene", "category": "Transcription Factor"}
    th2 = {"id": 9, "name": "Th2 cell", "x": 600, "y": 450, "type": "gene", "category": "Cell"}

    nodes = [naive, il12, ifng, tbet, th1, il4, il2, gata3, th2]

    edges = [
        # Th1 Path
        {"source": 1, "target": 5, "relation": "differentiation"},
        {"source": 2, "target": 4, "relation": "activation"}, # IL-12 -> T-bet
        {"source": 4, "target": 5, "relation": "regulation"},
        
        # Th2 Path
        {"source": 1, "target": 9, "relation": "differentiation"},
        {"source": 6, "target": 8, "relation": "activation"}, # IL-4 -> GATA3
        {"source": 8, "target": 9, "relation": "regulation"},
        
        # Cross-regulation (Inhibition)
        {"source": 3, "target": 9, "relation": "inhibition"}, # IFN-g inhibits Th2
        {"source": 6, "target": 5, "relation": "inhibition"}, # IL-4 inhibits Th1
    ]

    template = {
        "id": "hsa04658",
        "title": "Th1 and Th2 cell differentiation",
        "description": "Differentiation of naive CD4+ T cells into Th1 and Th2 lineages.",
        "nodes": nodes,
        "edges": edges
    }
    
    return template

def create_th17_template():
    """Generates KEGG-like JSON for Th17 cell differentiation (hsa04659)."""
    
    naive = {"id": 1, "name": "Naive CD4+ T cell", "x": 400, "y": 50, "type": "gene", "category": "Cell"}
    
    # Th17 Path
    il6 = {"id": 2, "name": "IL-6", "x": 300, "y": 150, "type": "gene", "category": "Cytokine", "color": "#e67e22"}
    tgfb = {"id": 3, "name": "TGF-β", "x": 500, "y": 150, "type": "gene", "category": "Cytokine", "color": "#e67e22"}
    
    stat3 = {"id": 4, "name": "STAT3", "x": 300, "y": 250, "type": "gene", "category": "Transcription Factor"}
    rorc = {"id": 5, "name": "RORγt", "x": 500, "y": 250, "type": "gene", "category": "Transcription Factor"}
    
    th17 = {"id": 6, "name": "Th17 cell", "x": 400, "y": 350, "type": "gene", "category": "Cell"}
    
    # Treg Path (Closely related)
    foxp3 = {"id": 7, "name": "Foxp3", "x": 700, "y": 250, "type": "gene", "category": "Transcription Factor"}
    treg = {"id": 8, "name": "Treg cell", "x": 700, "y": 350, "type": "gene", "category": "Cell"}

    nodes = [naive, il6, tgfb, stat3, rorc, th17, foxp3, treg]
    
    edges = [
        {"source": 1, "target": 6, "relation": "differentiation"},
        {"source": 1, "target": 8, "relation": "differentiation"},
        
        {"source": 2, "target": 4, "relation": "activation"}, # IL-6 -> STAT3
        {"source": 3, "target": 7, "relation": "activation"}, # TGF-b -> Foxp3 (Treg)
        
        {"source": 4, "target": 5, "relation": "activation"}, # STAT3 -> RORgt
        {"source": 5, "target": 6, "relation": "regulation"}, # RORgt -> Th17
        
        {"source": 7, "target": 8, "relation": "regulation"}, # Foxp3 -> Treg
        
        # Th17 vs Treg balance
        {"source": 7, "target": 5, "relation": "inhibition"}, # Foxp3 inhibits RORgt
    ]
    
    template = {
        "id": "hsa04659",
        "title": "Th17 cell differentiation",
        "description": "Differentiation of naive CD4+ T cells into Th17 cells.",
        "nodes": nodes,
        "edges": edges
    }
    
    return template

def save_template(template, filename):
    output_path = os.path.join("assets", "templates", filename)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(template, f, indent=2)
    print(f"Generated {output_path}")

if __name__ == "__main__":
    t1 = create_th1_th2_template()
    save_template(t1, "hsa04658.json")
    
    t2 = create_th17_template()
    save_template(t2, "hsa04659.json")
