# Phase 2 Walkthrough: Trust & Reproducibility features

## 1. Metadata Stamp Verification
### Goal
Verify that exported HTML reports contain the specific application version, report ID, and generation timestamp in the footer.

### Steps
1.  **Run Analysis**: Load the "Basic Timecourse" demo (or any data).
2.  **Export Report**: Click the **Export** button in the top right and select **"Interactive HTML Report"**.
3.  **Inspect Footer**: Open the generated HTML file in a browser. Scroll to the bottom.
4.  **Verify Content**:
    *   **App Version**: Should say `Verified by BioViz Local v2.0.0` (or current version).
    *   **AI Model**: Should contain `AI Model: Standard` (or similar placeholder).
    *   **Database**: Should match the database used (e.g., `KEGG 2021 Human`).
    *   **Timestamp**: "Report Generated: [Current Date/Time]".

## 2. Standardized Demo Projects
### Goal
Verify that the user can load 3 "Gold Standard" demo datasets to see ideal outputs.

### Steps
1.  **Launch App**: Open BioViz Local.
2.  **Click "Load Demo"**: In the Data Import Wizard (Step 1), click the **"Load Demo"** button.
3.  **Verify Picker Modal**:
    *   A modal titled **"Select a Demo Project"** should appear.
    *   It should list 4 options:
        1.  📉 **Basic Timecourse**
        2.  🎗️ **TCGA BRCA (Breast Cancer)**
        3.  🧠 **Alzheimer's Disease**
        4.  🦠 **COVID-19 Cytokine Storm**
4.  **Load a Demo**: Click **"TCGA BRCA (Breast Cancer)"**.
5.  **Verify Data**:
    *   **Volcano Plot**: Check for `TP53`, `BRCA1` (Down), `ERBB2` (Up).
    *   **Pathway**: Should show "Breast Cancer" or relevant pathway.
6.  **Load Another Demo**: Go back to Import and select **"COVID-19"**.
    *   **Volcano Plot**: Check for `IL6`, `TNF` (Up).

### Screenshots
*(Placeholders for screenshots of the Demo Picker Modal and Verification Footer)*
