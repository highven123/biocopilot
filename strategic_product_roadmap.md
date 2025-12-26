# BioViz-Local v2.0 Strategic Product Roadmap
**Objective**: Transition from "Functional Prototype" to "Category-Defining Product" by addressing core researcher needs: Privacy, Continuity, and Trust.

## Pillar 1: Responsible AI Connectivity (The "Privacy" Moat) 🛡️
**Problem**: Researchers handle sensitive data (HIPAA/GDPR). They need clarity on what is sent out, when, and why.
**Current State**: AI usage depends on external providers, and visibility into network usage is limited.
**Strategic Pivot**:
- **Transparent AI Requests**: Show which actions require external calls and what payload types are involved.
- **Local Caching Strategy**: Cache pathway templates, metadata, and non-sensitive resources to reduce repeated network usage.
- **Why this wins**: It builds trust through clarity and control without over-promising on infrastructure constraints.

## Pillar 2: The "Living" Project Memory (The "Retention" Moat) 🧠
**Problem**: Bioinformatics is iterative. I analyze Dataset A today, Dataset B next month. Most tools are "Calculators" (do calc, forget). Researchers need a "Lab Notebook".
**Current State**: We save individual sessions (`.json`). No cross-session intelligence.
**Strategic Pivot**:
- **Project Knowledge Graph**: When I analyze specific genes in Dataset B, the AI should say: *"Note: These genes were also upregulated in your Dataset A analysis from last week."*
- **Persistent "Bio-Context"**: Allow the user to define global context once (e.g., "I work on NSCLC drug resistance"). The AI then interprets *every* future result through that lens without needing reprompting.
- **Why this wins**: It makes the tool "stickier" the more you use it. It builds an asset (the knowledge graph) that the user can't easily walk away from.

## Pillar 3: "Glass Box" Evidence System (The "Trust" Moat) 🔍
**Problem**: Generative AI hallucinates. A PI will never trust a generic "This pathway is active" statement in a paper.
**Current State**: The AI gives a summary. It's text.
**Strategic Pivot**:
- **Hyperlinked Evidence**: Every claim must have a citation to *user data*.
    - *Bad*: "P53 signaling is active."
    - *Good*: "P53 signaling is active (driven by [TP53: LogFC -2.1](local://gene/TP53) and [MDM2: LogFC +1.5](local://gene/MDM2))."
- **Interactive "Why?"**: Hovering over an AI sentence should highlight the relevant nodes on the pathway map.
- **Why this wins**: It moves AI from "Toy" to "Research Assistant". It helps the user verify the insight immediately.

## Pillar 4: Ecosystem Connectors (Integration) 🔌
**Problem**: BioViz is an island. Data comes from upstream pipelines (Seurat, Nextflow) and goes to downstream papers.
**Current State**: CSV Import / Image Export.
**Strategic Pivot**:
- **"Watch Folder" Agent**: Point BioViz at a Nextflow results folder. When the pipeline finishes at 3 AM, BioViz wakes up, auto-analyzes, and sends a notification summary.
- **Direct Object Support**: Native read support for `.h5ad` (Scanpy/AnnData) and `.rds` (Seurat) files. Don't make users export to CSV first.

---

## Immediate "Signature Feature"
**The "Bio-Brief" Interactive Report**:
Instead of a static PDF, generate a single-file HTML (like we have, but steroids).
- **Embedded AI Chat**: The recipient (PI/Collaborator) can ask *simple* questions to the report ("Show me the top 5 genes") without installing the software. (Requires embedding a tiny JS search or pre-canned Q&A).
