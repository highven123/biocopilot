# Design Document: Interactive Research Workbench

## Overview

The Interactive Research Workbench enhances BioViz Local by transforming it from a simple pathway visualization tool into a comprehensive three-panel analysis environment. The enhancement adds volcano plot filtering, dynamic pathway updates, and detailed gene evidence panels while preserving the existing Tauri/React/Python architecture.

### Current State

BioViz Local currently provides:
- Data import wizard with file upload and column mapping
- KEGG pathway template selection
- Pathway visualization with colored nodes based on gene expression
- Export functionality (SVG, PPTX)

### Proposed Enhancement

The workbench adds:
- **Left Panel (20%)**: Volcano plot with brush selection for filtering genes
- **Center Panel (55%)**: Existing pathway visualizer with dynamic filtering
- **Right Panel (25%)**: Evidence panel showing detailed gene information
- **Interactive Filtering**: Brush selection on volcano plot filters pathway nodes
- **Gene Selection**: Clicking nodes or points displays gene details

### Design Principles

1. **No Infrastructure Changes**: Preserve existing Rust backend, Tauri IPC, and Python sidecar
2. **Component Reuse**: Leverage existing DataImportWizard, PathwayVisualizer components
3. **Progressive Enhancement**: Add features without breaking existing functionality
4. **Minimal Backend Changes**: Extend Bio Engine's handle_analyze to include volcano data

## Architecture

### System Architecture


```
┌─────────────────────────────────────────────────────────────┐
│                    Tauri Desktop App                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              React Frontend (src/)                     │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │           App.tsx (Main Component)                │ │  │
│  │  │  - Manages workbench state                        │ │  │
│  │  │  - Coordinates panel interactions                 │ │  │
│  │  │  - Handles Bio Engine responses                   │ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  │                                                         │  │
│  │  ┌─────────────┬──────────────────┬─────────────────┐ │  │
│  │  │ VolcanoPlot │ PathwayVisualizer│ EvidencePanel   │ │  │
│  │  │  (20%)      │     (55%)        │    (25%)        │ │  │
│  │  │             │                  │                 │ │  │
│  │  │ - ECharts   │ - ECharts Graph  │ - Gene Details  │ │  │
│  │  │ - Brush     │ - Filtered Nodes │ - Bar Chart     │ │  │
│  │  │ - Click     │ - Click Handler  │ - Ext Links     │ │  │
│  │  └─────────────┴──────────────────┴─────────────────┘ │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │      useBioEngine Hook (unchanged)                │ │  │
│  │  │  - IPC communication                              │ │  │
│  │  │  - Event listeners                                │ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          │ Tauri IPC (unchanged)             │
│                          ▼                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Rust Backend (src-tauri/) - NO CHANGES        │  │
│  │  - Sidecar process management                         │  │
│  │  - stdin/stdout IPC                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │ JSON over stdin/stdout
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           Python Sidecar (python/bio_engine.py)             │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  handle_analyze() - ENHANCED                          │   │
│  │  - Reads gene expression + P-values                   │   │
│  │  - Calculates -log10(pvalue)                          │   │
│  │  - Classifies genes (UP/DOWN/NS)                      │   │
│  │  - Returns: {pathway, statistics, volcano_data}       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  mapper.py - NO CHANGES                               │   │
│  │  - color_kegg_pathway()                               │   │
│  │  - get_pathway_statistics()                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

