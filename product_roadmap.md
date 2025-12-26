# BioViz-Local v2.0 Product Roadmap

**Strategy**: "Scientific Pragmatism". Prioritize features that remove friction (Phase 1) and build trust (Phase 2) to enable sales (Phase 3).

## Phase 1: Scientific Onboarding (Months 1-2) 🚀
**Goal**: "It just works." Reduce TTV (Time to Value) to < 5 minutes.
- [x] **One-Click Installer (macOS/Windows)**
    - [x] Embed Python environment (bundled via PyInstaller).
    - [x] **Startup Self-Check**: Validate sidecar, dependencies, network, and RAM on launch. Auto-fix or clearly guide errors.
- [x] **Data Import 'Guardrails'**
    - [x] **Templates**: Downloadable Excel templates for "Gene Expression", "Metabolomics", etc.
    - [x] **Smart Error Hints**: Instead of "Parse Error", say "Column 3 has text in a numeric field".
- [x] **Structured "Lab-Ready" Reports**
    - [x] Export HTML/PDF with distinct sections: "Methods" (Auto-generated text), "Results" (Table + Plots), "Citations".

## Phase 2: Trust & Reproducibility (Months 2-3) 🔍
**Goal**: "I feel safe publishing this."
- [x] **"Glass Box" AI Citations**
    - [x] Every AI insight links to source data (Gene X, LogFC Y).
    - [x] Clickable entity tags (`[[GENE:x]]`) highlight visualizations.
- [x] **Metadata Stamp**
    - [x] Reports include: App Version, DB Version (KEGG 2021), Model (Standard), Date.
- [x] **Standardized Demo Projects**
    - [x] Ship with 3 "Gold Standard" datasets (e.g., TCGA Cancer vs Normal) showing ideal outputs.

## Phase 3: Commercial Capabilities (Months 3-6) 💼
**Goal**: "Ready for Enterprise."
- [ ] **Licensing System**
    - [ ] Node-locked licenses (Machine ID).
    - [ ] Floating licenses (Lab Server).
- [ ] **Offline / LAN Mode**
    - [ ] Pure offline mode for high-security labs.
- [ ] **Feedback Loop**
    - [ ] Built-in "Report Issue" (attaches anonymized logs).

---

## Technical Implications (Immediate)
1.  **Frontend**: Enhancing `DataImportWizard.tsx` with error boundary logic and template download links.
2.  **Backend**: Creating a `sys_check.py` module for the Startup Self-Check.
3.  **Reporting**: Refactoring `sessionExport.ts` to support the "Structured Lab Report" format.
