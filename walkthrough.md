# Walkthrough: Phase 1 - Scientific Onboarding

We have successfully implemented the "Scientific Onboarding" phase of the product roadmap, focusing on environment reliability, data import guidance, and professional reporting.

## 1. Environment Self-Check ("One-Click Ready")
**Goal**: Ensure the Researcher's machine is ready for analysis before they start.
- **Feature**: A `sys_check.py` module runs on startup via the `SYS_CHECK` command.
- **UI**: A **System Health Modal** appears if critical checks fail (or on first launch). It checks:
    - **RAM**: Warns if < 4GB.
    - **Disk**: Warns if < 2GB free.
    - **Network**: Checks connectivity to KEGG/NCBI.
    - **Dependencies**: Verifies Python libraries (Pandas, SciPy, etc.).

## 2. Data Import Guardrails
**Goal**: Reduce "formatting frustration" for users.
- **Templates**: Added "Download Example Template" buttons in the Data Wizard for:
    - Gene Expression (`expression_template.csv`)
    - Metadata (`metadata_template.csv`)
- **Impact**: Users now have a known-good format to copy-paste their data into.

## 3. "Lab-Ready" Structured Reports
**Goal**: Turn analysis into a sharable asset.
- **Enhanced Export**: The interactive HTML export now features a **clean Light Theme** suitable for printing or sharing as a "Lab Report".
- **Structured Sections**:
    - **Materials & Methods**: Auto-generated text describing the analysis method and data mapping.
    - **Citations**: Boilerplate citations for BioViz and underlying tools.
    - **Results**: Tables for top DE genes and Enrichment results.
    - **AI Log**: Full transcript of the AI conversation.

## Verification
### Manual Test Cases
1.  **Launch**: Restart the app. Expect to see the "Environment Self-Check" modal (since we enabled it for demo). All checks should pass (Green/Green/Green/Green).
2.  **Import**: Go to "New Analysis". Click "Download Example Template". Verify a CSV downloads.
3.  **Report**: Run an analysis (e.g., using the downloaded template). Click the "Web" (Globe) icon to export HTML. Open the HTML file in Chrome.
    - Verify it is **Light Mode**.
    - Read the **"Materials & Methods"** section. It should say something like *"Differential expression was assessed using Auto-detected statistical test method."*

## Next Steps (Phase 2)
With the foundation laid, we are ready to move to **Phase 2: Trust & Reproducibility**, focusing on the "Glass Box" evidence system.
