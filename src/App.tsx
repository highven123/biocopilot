import React, { useState, useEffect, useMemo } from 'react';
import { useBioEngine } from './hooks/useBioEngine';
import { DataImportWizard, AnalysisConfig } from './components/DataImportWizard';
import { VolcanoPlot, VolcanoPoint } from './components/VolcanoPlot';
import { EvidencePanel, GeneDetail } from './components/EvidencePanel';
import { PathwayVisualizer } from './components/PathwayVisualizer';
import { DataTable } from './components/DataTable';
import { WorkflowBreadcrumb, WorkflowStep } from './components/WorkflowBreadcrumb';
import { ENTITY_META, resolveEntityKind, EntityKind } from './entityTypes';
import { openPath } from '@tauri-apps/plugin-opener';
import './App.css';

// --- Types ---
interface PathwayData {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
}

interface AnalysisResult {
  pathway: PathwayData;
  statistics: any;
  volcano_data: VolcanoPoint[];
  has_pvalue: boolean;
  gene_map: Record<string, VolcanoPoint>;
  config: AnalysisConfig;
  entityKind: EntityKind;
  analysis_table_path?: string;
}

function App() {
  const { isConnected, isLoading: engineLoading, lastResponse, sendCommand } = useBioEngine();

  // --- State ---
  const [pendingConfig, setPendingConfig] = useState<AnalysisConfig | null>(null);
  const [draftConfig, setDraftConfig] = useState<AnalysisConfig | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [maxWizardStep, setMaxWizardStep] = useState<1 | 2 | 3>(1);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('upload');
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [filteredGenes, setFilteredGenes] = useState<string[]>([]);
  const [activeGene, setActiveGene] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [leftPanelView, setLeftPanelView] = useState<'chart' | 'table'>('chart');

  // --- Resizing Logic ---
  const [colSizes, setColSizes] = useState<number[]>([20, 55, 25]); // Left, Center, Right in %
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Start resizing
  const startResize = (idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    setDragIdx(idx);
  };

  // Handle dragging (GLOBAL effect when dragging)
  useEffect(() => {
    if (dragIdx === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      // Convert layout to pixel positions to find current split points
      // Or easier: Calculate movement delta as percentage
      // Resizer 0 affects col 0 and 1. Resizer 1 affects col 1 and 2.

      // Get current sizes
      const sizes = [...colSizes];

      // Calculate mouse position relative to container
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const percentX = (relativeX / containerWidth) * 100;

      // Min width constraint (e.g. 10%)
      const minW = 10;

      if (dragIdx === 0) {
        // Moving Splitter 1 (between 0 and 1)
        // percentX is effectively the new size of col 0 (roughly, ignoring gutters for simplicity)
        let newCol0 = percentX;

        // Constraints
        if (newCol0 < minW) newCol0 = minW;
        if (newCol0 > (sizes[0] + sizes[1] - minW)) newCol0 = sizes[0] + sizes[1] - minW;

        // Calculate delta
        const delta = newCol0 - sizes[0];
        sizes[0] += delta;
        sizes[1] -= delta;
      }
      else if (dragIdx === 1) {
        // Moving Splitter 2 (between 1 and 2)
        // The position of splitter 2 is size[0] + size[1]
        // So new (size[0] + size[1]) = percentX

        const currentSplitPos = sizes[0] + sizes[1];
        let newSplitPos = percentX;

        // Constraints based on col1 min width and col2 min width
        if (newSplitPos < (sizes[0] + minW)) newSplitPos = sizes[0] + minW;
        if (newSplitPos > (100 - minW)) newSplitPos = 100 - minW;

        const delta = newSplitPos - currentSplitPos;
        sizes[1] += delta;
        sizes[2] -= delta;
      }

      setColSizes(sizes);
    };

    const handleMouseUp = () => {
      setDragIdx(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragIdx, colSizes]);
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-20), `[${timestamp}] ${message}`]);
  };

  // --- BioEngine Response Handler ---
  useEffect(() => {
    if (lastResponse) {
      const response = lastResponse as any;

      // 支持旧版 engine（无 volcano_data）和新版（带 volcano_data）
      if (response.status === 'ok' && response.pathway) {
        const volcano: VolcanoPoint[] = Array.isArray(response.volcano_data)
          ? response.volcano_data
          : [];

        const gene_map: Record<string, VolcanoPoint> = {};
        volcano.forEach((p: VolcanoPoint) => {
          gene_map[p.gene] = p;
        });

        const config = pendingConfig || analysisData?.config || ({} as any);
        const entityKind = resolveEntityKind(
          response.pathway?.metadata?.data_type,
          config?.dataType,
        );

        const result: AnalysisResult = {
          pathway: response.pathway,
          statistics: response.statistics,
          volcano_data: volcano,
          has_pvalue: Boolean(response.has_pvalue),
          gene_map,
          config,
          entityKind,
          analysis_table_path: response.analysis_table_path || undefined,
        };

        setAnalysisData(result);
        setPendingConfig(null);
        setWorkflowStep('viz');
        const pathwayName =
          response.pathway.name ||
          response.pathway.title ||
          response.pathway.id ||
          'analysis';
        addLog(`✓ Analysis complete: ${pathwayName}`);
        if (response.analysis_table_path) {
          addLog(`Saved analysis table → ${response.analysis_table_path}`);
        }
        setFilteredGenes([]);
        setActiveGene(null);
      } else if (response.status === 'error') {
        addLog(`❌ Engine Error: ${response.message}`);
        alert(`Analysis Failed: ${response.message}`);
      }
    }
  }, [lastResponse]);

  // --- Actions ---
  const handleAnalysisStart = async (config: AnalysisConfig) => {
    addLog(`Running analysis for pathway: ${config.pathwayId}...`);
    // Prepare UI for new analysis
    setPendingConfig(config);
    setAnalysisData(null);
    setFilteredGenes([]);
    setActiveGene(null);
    setWorkflowStep('viz');

    await sendCommand('ANALYZE', {
      file_path: config.filePath,
      mapping: config.mapping,
      template_id: config.pathwayId,
      data_type: config.dataType,
      filters: {}
    });
  };



  const activeGeneDetail = useMemo((): GeneDetail | null => {
    if (!analysisData || !activeGene) return null;
    const point = analysisData.gene_map[activeGene];
    if (!point) return null;
    return {
      name: point.gene,
      logFC: point.x,
      pvalue: point.pvalue
    };
  }, [analysisData, activeGene]);

  // --- Entity labels derived from analysis data (fallback: gene) ---
  const entityKind: EntityKind = analysisData?.entityKind || 'gene';
  const entityLabels = ENTITY_META[entityKind];

  // --- Workflow navigation ---
  const canAccessMapping = maxWizardStep >= 2;
  const canAccessGallery = maxWizardStep >= 3;
  const canAccessViz = !!analysisData;

  const handleWorkflowStepClick = (step: WorkflowStep) => {
    if (step === 'upload') {
      setWizardStep(1);
      setWorkflowStep('upload');
      return;
    }
    if (step === 'mapping') {
      if (!canAccessMapping) return;
      setWizardStep(2);
      setWorkflowStep('mapping');
      return;
    }
    if (step === 'gallery') {
      if (!canAccessGallery) return;
      setWizardStep(3);
      setWorkflowStep('gallery');
      return;
    }
    if (step === 'viz') {
      // 如果已经有分析结果，直接切换到可视化
      if (analysisData) {
        setWorkflowStep('viz');
        return;
      }
      // 如果当前配置已经就绪（导入 + 映射 + 选 pathway），从顶部 Step4 触发分析
      if (draftConfig) {
        handleAnalysisStart(draftConfig);
      }
    }
  };


  // --- Render ---

  return (
    <div className="workbench-container">

      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <h1>
            <span>🧬</span>
            BioViz <span>Local</span>
          </h1>
          {analysisData && (
            <span style={{
              marginLeft: '20px',
              padding: '4px 12px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }}>
              {analysisData.pathway.name}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="status-indicator">
            <div className={`status-dot ${!isConnected ? 'disconnected' : ''}`}
              style={{ backgroundColor: isConnected ? 'var(--color-success)' : 'var(--color-danger)' }}
            />
            {isConnected ? 'Engine Ready' : 'Connecting...'}
          </div>
        </div>
      </header>

      {/* Global Workflow Stepper */}
      <WorkflowBreadcrumb
        currentStep={workflowStep}
        canAccessMapping={canAccessMapping}
        canAccessGallery={canAccessGallery}
        canAccessViz={canAccessViz}
        onStepClick={handleWorkflowStepClick}
      />

      {/* Wizard Overlay for steps 1-3 (keeps state alive) */}
      <div
        className="wizard-overlay"
        style={{ display: workflowStep === 'viz' ? 'none' : 'flex' }}
      >
        <DataImportWizard
          onComplete={handleAnalysisStart}
          onCancel={() => { }}
          addLog={addLog}
          isConnected={isConnected}
          activeStep={wizardStep}
          onStepChange={(s) => {
            setWizardStep(s);
            setMaxWizardStep(prev => (s > prev ? s : prev));
            setWorkflowStep(s === 1 ? 'upload' : s === 2 ? 'mapping' : 'gallery');
          }}
          onConfigPreview={setDraftConfig}
        />
      </div>

      {/* Workbench is always mounted; wizard hides it for steps 1-3 via display */}
      <main
        className="workbench-layout"
        style={{
          display: workflowStep === 'viz' ? 'grid' : 'none',
          gridTemplateColumns: `${colSizes[0]}% 6px ${colSizes[1]}% 6px ${colSizes[2]}%`, // 6px for gutters
          gap: '0', // Override default gap
        }}
        ref={containerRef}
      >
        {/* Left Panel: Volcano / Data Table */}
        <div className="panel-col" style={{ borderRight: '1px solid var(--border-subtle)' }}>
          <div className="panel-header" style={{ justifyContent: 'space-between', paddingRight: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setLeftPanelView('chart')}
                style={{
                  background: leftPanelView === 'chart' ? 'var(--border-subtle)' : 'transparent',
                  border: 'none',
                  color: leftPanelView === 'chart' ? 'var(--text-primary)' : 'var(--text-dim)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🌋 Volcano
              </button>
              <button
                onClick={() => setLeftPanelView('table')}
                style={{
                  background: leftPanelView === 'table' ? 'var(--border-subtle)' : 'transparent',
                  border: 'none',
                  color: leftPanelView === 'table' ? 'var(--text-primary)' : 'var(--text-dim)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                📋 Data
              </button>
            </div>

            {filteredGenes.length > 0 && leftPanelView === 'chart' && (
              <span
                style={{ fontSize: '11px', color: '#60a5fa', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setFilteredGenes([])}
              >
                Clear ({filteredGenes.length})
              </span>
            )}
          </div>
          <div className="panel-body">
            {analysisData?.volcano_data ? (
              leftPanelView === 'chart' ? (
                <VolcanoPlot
                  data={analysisData.volcano_data}
                  onSelectionChange={setFilteredGenes}
                  onPointClick={setActiveGene}
                />
              ) : (
                <DataTable
                  data={analysisData.volcano_data}
                  onRowClick={setActiveGene}
                  labels={entityLabels}
                />
              )
            ) : (
              <div className="empty-state">
                No Data Loaded
              </div>
            )}
          </div>
        </div>

        {/* Resizer 1 */}
        <div
          className={`resizer-gutter ${dragIdx === 0 ? 'dragging' : ''}`}
          onMouseDown={(e) => startResize(0, e)}
        />

        {/* Center Panel: Pathway */}
        <div className="panel-col" style={{ background: '#000' }}> {/* Darker bg for chart? Or var(--bg-panel)? ECharts theme is dark */}
          <div className="panel-header">
            <span>Pathway Landscape</span>

            {/* Stats Summary + tools */}
            {analysisData && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '11px', textTransform: 'none', color: 'var(--text-secondary)' }}>
                <span>
                  <b style={{ color: 'white' }}>{analysisData.statistics.total_nodes}</b>{' '}
                  {entityLabels.labelPlural.toLowerCase()}
                </span>
                <span style={{ color: '#ef4444' }}><b>{analysisData.statistics.upregulated}</b> up</span>
                <span style={{ color: '#3b82f6' }}><b>{analysisData.statistics.downregulated}</b> down</span>
                {analysisData.analysis_table_path && (
                  <button
                    onClick={() => openPath(analysisData.analysis_table_path!)}
                    style={{
                      marginLeft: '8px',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      border: '1px solid var(--border-subtle)',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '10px',
                      textTransform: 'none'
                    }}
                  >
                    Open Stats CSV
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="panel-body" style={{ position: 'relative' }}>
            {engineLoading && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 50,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)'
              }}>
                <div className="spinner" style={{ marginBottom: '16px' }}></div>
                <p style={{ color: 'white' }}>Processing Analysis...</p>
              </div>
            )}

            {analysisData ? (
              <PathwayVisualizer
                nodes={analysisData.pathway.nodes}
                edges={analysisData.pathway.edges}
                title={analysisData.pathway.name}
                theme="dark"
                pathwayId={analysisData.pathway.id}
                onNodeClick={setActiveGene}
                selectedNodeNames={filteredGenes}
              />
            ) : (
              <div className="empty-state">
                <p style={{ fontSize: '40px', marginBottom: '10px', opacity: 0.5 }}>🧬</p>
                Start a new analysis to view pathway
              </div>
            )}
          </div>
        </div>

        {/* Resizer 2 */}
        <div
          className={`resizer-gutter ${dragIdx === 1 ? 'dragging' : ''}`}
          onMouseDown={(e) => startResize(1, e)}
        />

        {/* Right Panel: Evidence */}
        <div className="panel-col">
          <div className="panel-header">
            Evidence
          </div>
          <div className="panel-body">
            <EvidencePanel
              gene={activeGene}
              geneData={activeGeneDetail}
              entityKind={entityKind}
              labels={entityLabels}
            />
          </div>
        </div>

      </main>

      {/* Footer / Logs */}
      <footer style={{
        height: '30px',
        background: 'var(--bg-panel)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', fontSize: '11px', color: 'var(--text-dim)',
        flexShrink: 0
      }}>
        <div>BioViz Local v0.3.0 • Workbench Mode</div>
        <div style={{ display: 'flex', gap: '8px', maxWidth: '500px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span style={{ color: 'var(--brand-primary)' }}>Last:</span> {logs.length > 0 ? logs[logs.length - 1] : 'Ready'}
        </div>
      </footer>

    </div>
  );
}

export default App;
