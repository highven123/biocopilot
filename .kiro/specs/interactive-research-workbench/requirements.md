# Requirements Document

## Introduction

The Interactive Research Workbench enhances BioViz Local by adding interactive filtering and evidence exploration capabilities. The system currently supports uploading gene expression data, selecting KEGG pathways, and visualizing colored pathway graphs. This enhancement adds a three-panel workbench layout with volcano plot filtering, dynamic pathway updates, and detailed gene evidence panels. The workbench maintains the existing Python backend (bio_engine.py) and Tauri infrastructure without modifications to Rust code or IPC structure.

## Glossary

- **BioViz Local**: Tauri-based desktop application for biological pathway visualization using KEGG templates
- **Bio Engine**: Python sidecar process (bio_engine.py) that handles data loading, column inference, and pathway coloring
- **Volcano Plot**: Scatter plot showing LogFC (X-axis) versus -log10(P-value) (Y-axis) for differential expression analysis
- **LogFC**: Log2 fold change representing magnitude of gene expression difference
- **P-value**: Statistical significance measure for differential expression
- **Pathway Graph**: ECharts-based visualization of KEGG pathway with colored nodes based on expression data
- **Evidence Panel**: Right-side panel displaying detailed information for a selected gene
- **Data Import Wizard**: Existing multi-step component for file upload, column mapping, and pathway selection
- **Brush Selection**: ECharts rectangular selection tool for filtering volcano plot data points
- **useBioEngine Hook**: React hook managing communication with Python sidecar via Tauri IPC
- **Analysis Config**: Configuration object with filePath, mapping (gene/value/pvalue columns), pathwayId, and dataType
- **Sidecar IPC**: Tauri's inter-process communication between Rust backend and Python process via stdin/stdout
- **KEGG Template**: Pre-loaded JSON pathway structure stored in assets/templates/ directory

## Requirements

### Requirement 1: Preserve Existing Infrastructure

**User Story:** As a system maintainer, I want all new features to work within the existing architecture, so that I avoid breaking changes to the stable Tauri and Python backend.

#### Acceptance Criteria

1. WHEN implementing new features THEN the system SHALL NOT modify any files in the src-tauri directory
2. WHEN implementing new features THEN the system SHALL NOT change the sidecar IPC communication protocol structure
3. WHEN implementing new features THEN the useBioEngine.ts hook interface SHALL remain unchanged in its public API
4. WHEN the Bio Engine adds volcano data preparation THEN the system SHALL extend the handle_analyze function without breaking existing response structure
5. WHEN the Bio Engine returns analysis results THEN the system SHALL include both pathway data and volcano_data in the same response object

### Requirement 2: Enhanced Column Inference for P-values

**User Story:** As a researcher, I want the system to automatically detect P-value columns in my data, so that I can enable volcano plot functionality without manual configuration.

#### Acceptance Criteria

1. WHEN the Bio Engine processes uploaded data in handle_load THEN the system SHALL detect P-value columns using keywords: 'pvalue', 'p-value', 'p.value', 'pval', 'padj', 'adj.p.val', 'fdr', 'q-value', 'qvalue'
2. WHEN the Bio Engine detects a P-value column THEN the system SHALL include it in the suggested_mapping response with key 'pvalue'
3. WHEN the Data Import Wizard displays column mapping THEN the system SHALL show P-value column selector with optional badge
4. WHEN a P-value column is auto-detected THEN the Data Import Wizard SHALL display "✨ Auto" badge next to the P-value selector
5. WHEN a user completes column mapping without P-value THEN the system SHALL proceed with analysis but disable volcano plot interactivity

### Requirement 3: Volcano Plot Data Preparation in Bio Engine

**User Story:** As a backend component, I want to prepare volcano plot data during analysis, so that the frontend receives properly formatted visualization data.

#### Acceptance Criteria

1. WHEN the Bio Engine receives analyze command with pvalue_column in mapping THEN the system SHALL extract P-value data from the specified column
2. WHEN the Bio Engine calculates volcano data THEN the system SHALL compute -log10(pvalue) for Y-axis values
3. WHEN the Bio Engine encounters P-value of 0 THEN the system SHALL cap -log10(pvalue) at 10.0
4. WHEN the Bio Engine encounters P-value >= 1 THEN the system SHALL set -log10(pvalue) to 0.0
5. WHEN the Bio Engine classifies gene status THEN the system SHALL assign "UP" WHERE logFC > 1.0 AND pvalue < 0.05
6. WHEN the Bio Engine classifies gene status THEN the system SHALL assign "DOWN" WHERE logFC < -1.0 AND pvalue < 0.05
7. WHEN the Bio Engine classifies gene status THEN the system SHALL assign "NS" WHERE the gene does not meet UP or DOWN criteria
8. WHEN the Bio Engine generates volcano_data THEN each entry SHALL contain gene, x (logFC), y (-log10(pvalue)), pvalue, and status fields
9. WHEN the Bio Engine completes analysis THEN the response SHALL include volcano_data array alongside pathway and statistics
10. WHEN the Bio Engine processes data without P-value column THEN the system SHALL return empty volcano_data array

### Requirement 4: Volcano Plot Component with Brush Selection

**User Story:** As a researcher, I want to visualize gene expression data as an interactive volcano plot, so that I can identify and select significantly changed genes.

#### Acceptance Criteria

1. WHEN the VolcanoPlot component receives data THEN the system SHALL render an ECharts scatter plot with LogFC on X-axis and -log10(P) on Y-axis
2. WHEN the VolcanoPlot renders points THEN the system SHALL color UP genes as red (#ef4444)
3. WHEN the VolcanoPlot renders points THEN the system SHALL color DOWN genes as blue (#3b82f6)
4. WHEN the VolcanoPlot renders points THEN the system SHALL color NS genes as gray (#475569)
5. WHEN the VolcanoPlot renders THEN the system SHALL draw vertical reference lines at x = ±1
6. WHEN the VolcanoPlot renders THEN the system SHALL draw horizontal reference line at y = 1.3 (corresponding to p = 0.05)
7. WHEN a user activates ECharts brush tool THEN the system SHALL enable rectangular selection on the plot
8. WHEN a user completes brush selection THEN the system SHALL trigger onSelectionChange callback with array of selected gene names
9. WHEN a user clicks a point THEN the system SHALL trigger onPointClick callback with the gene name
10. WHEN the VolcanoPlot displays tooltip THEN the system SHALL show gene name, LogFC, -log10(P), and status

### Requirement 5: Evidence Panel Component

**User Story:** As a researcher, I want to view detailed information about selected genes, so that I can examine expression data and access external resources.

#### Acceptance Criteria

1. WHEN no gene is selected THEN the Evidence Panel SHALL display empty state with message "Select a gene from the volcano plot or pathway to view details"
2. WHEN a gene is selected but no data exists THEN the Evidence Panel SHALL display "No data found for {gene}"
3. WHEN a gene is selected with data THEN the Evidence Panel SHALL display gene symbol in header
4. WHEN a gene is selected with data THEN the Evidence Panel SHALL display fold change badge with calculated FC value (2^|logFC|)
5. WHEN the fold change badge displays THEN the system SHALL apply class "up" for logFC > 0 or "down" for logFC < 0
6. WHEN the Evidence Panel displays gene data THEN the system SHALL show Log2FC value rounded to 3 decimal places
7. WHEN P-value data exists THEN the Evidence Panel SHALL display P-value in scientific notation
8. WHEN the Evidence Panel renders chart THEN the system SHALL display ECharts bar chart showing LogFC value
9. WHEN the Evidence Panel displays external links THEN the system SHALL provide clickable link to NCBI Gene with URL format https://www.ncbi.nlm.nih.gov/gene/?term={gene}
10. WHEN the Evidence Panel displays external links THEN the system SHALL provide clickable link to GeneCards with URL format https://www.genecards.org/cgi-bin/carddisp.pl?gene={gene}

### Requirement 6: Three-Panel Workbench Layout

**User Story:** As a researcher, I want a unified three-panel interface, so that I can simultaneously view volcano plot, pathway graph, and gene evidence.

#### Acceptance Criteria

1. WHEN analysis completes THEN the App component SHALL render a three-column CSS grid layout
2. WHEN the layout renders THEN the left panel SHALL occupy 20% width and contain VolcanoPlot component
3. WHEN the layout renders THEN the center panel SHALL occupy 55% width and contain PathwayVisualizer component
4. WHEN the layout renders THEN the right panel SHALL occupy 25% width and contain EvidencePanel component
5. WHEN the layout renders THEN the grid SHALL apply 1px gap between columns
6. WHEN the layout renders THEN the total height SHALL be calculated as calc(100vh - 120px) for header and footer
7. WHEN the left panel header renders THEN the system SHALL display "Filtering" label
8. WHEN the center panel header renders THEN the system SHALL display "Pathway Landscape" label with statistics summary
9. WHEN the right panel header renders THEN the system SHALL display "Evidence" label
10. WHEN no analysis data exists THEN each panel SHALL display appropriate empty state message

### Requirement 7: Interactive Filtering Between Panels

**User Story:** As a researcher, I want the pathway visualization to dynamically filter based on my volcano plot selection, so that I can focus on relevant genes in their biological context.

#### Acceptance Criteria

1. WHEN a user completes brush selection on volcano plot THEN the App component SHALL update filteredGenes state with selected gene names
2. WHEN filteredGenes state changes THEN the system SHALL compute visibleNodes by filtering pathway nodes
3. WHEN computing visibleNodes with empty filteredGenes THEN the system SHALL return all pathway nodes
4. WHEN computing visibleNodes with non-empty filteredGenes THEN the system SHALL filter nodes where node.name contains any filtered gene
5. WHEN node.name contains multiple genes separated by commas THEN the system SHALL split by comma and check each gene against filteredGenes
6. WHEN visibleNodes updates THEN the PathwayVisualizer SHALL re-render with filtered nodes only
7. WHEN a user clicks a gene node in PathwayVisualizer THEN the system SHALL call onNodeClick callback with gene name
8. WHEN onNodeClick triggers THEN the App component SHALL update activeGene state
9. WHEN activeGene state changes THEN the system SHALL compute activeGeneDetail from volcano_data gene_map
10. WHEN activeGeneDetail updates THEN the EvidencePanel SHALL display the selected gene's details

### Requirement 8: App Component State Management

**User Story:** As the main application component, I want to manage analysis data and user interactions, so that I can coordinate between all panels.

#### Acceptance Criteria

1. WHEN the App component initializes THEN the system SHALL set wizardOpen state to true
2. WHEN the App component receives lastResponse from useBioEngine THEN the system SHALL check for status 'ok' and presence of pathway and volcano_data
3. WHEN analysis response is valid THEN the system SHALL create gene_map by indexing volcano_data by gene name
4. WHEN analysis response is valid THEN the system SHALL construct AnalysisResult object with pathway, statistics, volcano_data, has_pvalue, gene_map, and config
5. WHEN AnalysisResult is set THEN the system SHALL update analysisData state and close wizard
6. WHEN analysis completes THEN the system SHALL reset filteredGenes to empty array and activeGene to null
7. WHEN analysis response has error status THEN the system SHALL display alert with error message
8. WHEN user clicks "New Analysis" button THEN the system SHALL set wizardOpen to true
9. WHEN DataImportWizard calls onComplete THEN the system SHALL invoke sendCommand with 'ANALYZE' and config parameters
10. WHEN sendCommand is called THEN the system SHALL pass file_path, mapping, template_id, data_type, and filters to Bio Engine

### Requirement 9: PathwayVisualizer Click Handler

**User Story:** As a pathway visualization component, I want to handle node clicks, so that I can notify the parent component when a gene is selected.

#### Acceptance Criteria

1. WHEN the PathwayVisualizer receives onNodeClick prop THEN the system SHALL register ECharts click event handler
2. WHEN a user clicks on the chart THEN the system SHALL check if params.dataType equals 'node'
3. WHEN the clicked element is a node THEN the system SHALL extract gene name from params.name
4. WHEN gene name is extracted THEN the system SHALL invoke onNodeClick callback with the gene name
5. WHEN onNodeClick is not provided THEN the system SHALL skip click handling without errors

### Requirement 10: VolcanoPlot Brush Event Handling

**User Story:** As a volcano plot component, I want to handle brush selection events, so that I can notify the parent component of filtered genes.

#### Acceptance Criteria

1. WHEN the VolcanoPlot component initializes THEN the system SHALL configure ECharts brush tool with toolbox options: 'rect', 'polygon', 'clear'
2. WHEN the VolcanoPlot registers events THEN the system SHALL listen for 'brushSelected' event
3. WHEN brushSelected event fires THEN the system SHALL check if params.batch exists and has length > 0
4. WHEN brush selection contains data THEN the system SHALL extract selectedIndices from params.batch[0].selected[0].dataIndex
5. WHEN selectedIndices are extracted THEN the system SHALL map indices to gene names using data array
6. WHEN gene names are mapped THEN the system SHALL invoke onSelectionChange callback with array of selected genes
7. WHEN brush is cleared (empty selection) THEN the system SHALL invoke onSelectionChange with empty array
8. WHEN the VolcanoPlot registers click events THEN the system SHALL listen for 'click' event
9. WHEN click event fires on series component THEN the system SHALL extract gene name from params.data[2]
10. WHEN gene name is extracted from click THEN the system SHALL invoke onPointClick callback with the gene name


### Requirement 11: Workbench Visual Styling

**User Story:** As a researcher, I want a professional dark-themed interface, so that I can work comfortably during long analysis sessions.

#### Acceptance Criteria

1. WHEN the workbench layout renders THEN the system SHALL apply CSS class "workbench-layout" with display: grid
2. WHEN the workbench layout renders THEN the system SHALL set grid-template-columns to "20% 55% 25%"
3. WHEN the workbench layout renders THEN the system SHALL set height to "calc(100vh - 120px)"
4. WHEN the workbench layout renders THEN the system SHALL apply gap of 1px between columns
5. WHEN panel headers render THEN the system SHALL use CSS class "panel-header" with consistent styling
6. WHEN panel bodies render THEN the system SHALL use CSS class "panel-body" with overflow handling
7. WHEN the left panel renders THEN the system SHALL apply border-right: 1px solid var(--border-subtle)
8. WHEN the volcano plot panel shows filtered genes THEN the system SHALL display count badge with clear button
9. WHEN the center panel displays statistics THEN the system SHALL show total nodes, upregulated count in red, and downregulated count in blue
10. WHEN any panel is empty THEN the system SHALL display centered empty state with appropriate icon and message

### Requirement 12: Loading and Error States

**User Story:** As a researcher, I want clear feedback during analysis processing, so that I know the system is working and can identify issues.

#### Acceptance Criteria

1. WHEN analysis is processing THEN the App component SHALL display loading overlay on center panel
2. WHEN loading overlay displays THEN the system SHALL show spinner animation and "Processing Analysis..." message
3. WHEN loading overlay is active THEN the system SHALL apply backdrop blur effect
4. WHEN Bio Engine returns error response THEN the system SHALL add error log with "❌ Engine Error:" prefix
5. WHEN Bio Engine returns error response THEN the system SHALL display alert dialog with error message
6. WHEN analysis completes successfully THEN the system SHALL add success log with "✓ Analysis complete:" prefix
7. WHEN user actions occur THEN the system SHALL append timestamped log entries to logs state
8. WHEN logs array exceeds 20 entries THEN the system SHALL keep only the most recent 20 entries
9. WHEN footer renders THEN the system SHALL display the most recent log entry
10. WHEN no logs exist THEN the footer SHALL display "Ready" status

### Requirement 13: Data Import Wizard Enhancements

**User Story:** As a researcher, I want the wizard to remember my last configuration, so that I can quickly reload previous analyses.

#### Acceptance Criteria

1. WHEN DataImportWizard completes analysis THEN the system SHALL call saveConfig function with AnalysisConfig
2. WHEN saveConfig executes THEN the system SHALL store config in localStorage with key 'bioviz_last_config'
3. WHEN saveConfig stores data THEN the system SHALL include filePath, mapping, pathwayId, dataType, and timestamp
4. WHEN DataImportWizard initializes THEN the system SHALL call loadLastConfig to check for saved configuration
5. WHEN saved configuration exists THEN the system SHALL set canQuickLoad to true
6. WHEN canQuickLoad is true THEN the wizard SHALL display "⚡ Load Last Config" button in Step 1
7. WHEN user clicks "Load Last Config" button THEN the system SHALL call onComplete with loaded configuration
8. WHEN "Load Last Config" button displays THEN the system SHALL show preview text with pathwayId and column mappings
9. WHEN localStorage access fails THEN the system SHALL log warning and continue without saved config
10. WHEN development mode is active THEN the system SHALL log availability of quick load feature to console
