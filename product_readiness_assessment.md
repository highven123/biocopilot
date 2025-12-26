# Product Readiness Assessment: From Prototype to User-Centric Tool

To ensure BioViz-Local matches user needs (Product-Market Fit) before distribution, we must address several functional gaps in the scientific workflow.

## 1. Scientific Workflow Integrity (The "Trust" Gap) 🧪
**Current Status**: Import -> Map Columns -> Pathway Analysis.
**Gap**: Users blindly analyze data without "Quality Control" (QC). In real research, checking sample quality is Step 0.

### Action Items:
- [ ] **Implement QC Dashboard**:
    - **PCA Plot**: Show if biological replicates cluster together (crucial check).
    - **Boxplots**: Check if normalization was performed correctly.
    - **Insert Step 1.5**: After import, auto-show these plots before asking for pathway selection.

## 2. Interactive Parameter Tuning (The "Control" Gap) 🎛️
**Current Status**: Hardcoded thresholds (`P < 0.05`, `LogFC > 1`) in `VolcanoPlot.tsx` and `bio_core.py`.
**Gap**: Scientists frequently adjust cutoffs based on signal noise. "Rigid" software is unusable for exploratory research.

### Action Items:
- [ ] **Global Settings Panel**: Add sliders/inputs for:
    - Significance Threshold (0.01 vs 0.05).
    - Fold Change Cutoff (1.5x vs 2.0x).
- [ ] **Real-time Recalculation**: Updating sliders should instantly refresh the Volcano Plot and "Up/Down" counts without re-running the backend command.

## 3. Publication-Ready Customization (The "Value" Gap) 🎨
**Current Status**: Fixed colors (Red/Blue).
**Gap**: Users need to match figures to journal requirements or colorblind-safe palettes.

### Action Items:
- [ ] **Appearance Editor**:
    - **Color Picker**: Allow changing "Up" color (e.g., to Orange) and "Down" color (e.g., to Purple).
    - **Resolution Control**: Explicit 300 DPI export option for TIFF/PNG (currently 2x pixel ratio).

## 4. Onboarding & Empty States (The "Usability" Gap) 🚦
**Current Status**: Main screen is empty until specific buttons are clicked.
**Gap**: New users won't know where to start or what the software *can* do.

### Action Items:
- [ ] **"Zero State" Dashboard**:
    - Instead of gray space, show 3 big cards: "Start New Analysis", "Load Demo Data", "Open Recent".
    - Add a "Quick Start Guide" sidebar.

## 5. Result Comparison (The "Insight" Gap) 💡
**Current Status**: Results are in tabs (`ResultTabs.tsx`).
**Gap**: Users often need to compare "Treatment A" vs "Treatment B" side-by-side to see if the same pathway behaves differently.

### Action Items:
- [ ] **Split View Mode**: Allow dragging a tab to create a split-screen view.

---

## Recommended Logic Refinements (Immediate)
1.  **Add "Settings" button** to Volcano Plot to adjust P-value/LogFC cutoffs.
2.  **Add PCA Plot** to the Data Import Wizard (using a simple JS library like `pca-js` or backend calculation).
3.  **Create "Welcome" Component** for the empty state.
