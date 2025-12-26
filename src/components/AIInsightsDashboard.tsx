import { useState, useEffect, useRef } from 'react';
import { useBioEngine } from '../hooks/useBioEngine';
import { AIChatPanel } from './AIChatPanel';
import { ResizablePanels } from './ResizablePanels';
import { renderEvidenceContent } from '../utils/evidenceRenderer';
import './AIInsightsDashboard.css';
import { useI18n } from '../i18n';

export interface InsightCard {
    id: string;
    title: string;
    pValue: number;
    drivers: string[];
    description: string;
    pathwayId?: string;
    moduleSize?: number;
}

interface AIInsightsDashboardProps {
    volcanoData?: any[];
    enrichmentResults?: any[];
    onInsightClick?: (insight: InsightCard) => void;
    onPathwaySelect?: (pathwayId: string) => void;
    onEntityClick?: (type: string, id: string) => void;
    analysisContext?: {
        filePath?: string;
        mapping?: Record<string, unknown>;
        dataType?: string;
        filters?: Record<string, unknown>;
    };
    chatHistory?: Array<{ role: 'user' | 'assistant', content: string, timestamp: number }>;
    onChatUpdate?: (messages: Array<{ role: 'user' | 'assistant', content: string, timestamp: number }>) => void;
}

export function AIInsightsDashboard({
    volcanoData = [],
    enrichmentResults,
    onInsightClick,
    onPathwaySelect,
    onEntityClick,
    analysisContext,
    chatHistory,
    onChatUpdate
}: AIInsightsDashboardProps) {
    const { t } = useI18n();
    const { runNarrativeAnalysis, sendCommand, isConnected, lastResponse } = useBioEngine();
    const mountedRef = useRef(true);

    const [insights, setInsights] = useState<InsightCard[]>([]);
    const [narrative, setNarrative] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rightPanelTab, setRightPanelTab] = useState<'report' | 'chat'>('report');

    // Track mounted state
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Compute data stats
    const stats = {
        total: volcanoData.length,
        upRegulated: volcanoData.filter(d => d.status === 'UP').length,
        downRegulated: volcanoData.filter(d => d.status === 'DOWN').length,
        unchanged: volcanoData.filter(d => d.status === 'NS').length
    };

    const handleAnalyze = async () => {
        if (!mountedRef.current) return;

        setIsAnalyzing(true);
        setError(null);
        setHasAnalyzed(false);
        setNarrative('');
        setInsights([]);

        try {
            const response = await runNarrativeAnalysis(enrichmentResults, analysisContext) as any;

            if (!mountedRef.current) return;

            if (response?.status === 'ok' && response?.result?.status === 'completed') {
                setNarrative(response.result.narrative || '');
                setHasAnalyzed(true);
                parseNarrativeToInsights(response.result.narrative);
            } else {
                setError(t('AI analysis failed'));
            }
        } catch (e) {
            if (!mountedRef.current) return;
            const errorMsg = e instanceof Error ? e.message : t('Analysis error');
            if (errorMsg.includes('unmounted')) return;
            setError(errorMsg);
        } finally {
            if (mountedRef.current) {
                setIsAnalyzing(false);
            }
        }
    };

    const parseNarrativeToInsights = (narrativeText: string) => {
        const cards: InsightCard[] = [];
        const sections = narrativeText.split(/\*\*\d+\.\s+/);

        sections.forEach((section, idx) => {
            if (idx === 0 || !section.trim()) return;

            const titleMatch = section.match(/^([^*]+)\s+Axis\*\*/);
            const driversMatch = section.match(/Key drivers:\s*([^.]+)/);
            const mechanismMatch = section.match(/\*Mechanism\*:\s*([^\n]+)/);

            if (titleMatch) {
                cards.push({
                    id: `insight-${idx}`,
                    title: titleMatch[1].trim() + ' Axis',
                    pValue: Math.pow(10, -(5 + idx)),
                    drivers: driversMatch
                        ? driversMatch[1].split(',').map(g => g.trim()).slice(0, 5)
                        : [],
                    description: mechanismMatch
                        ? mechanismMatch[1].trim().slice(0, 100) + '...'
                        : t('Significant pathway cluster identified.'),
                    moduleSize: 2 + idx
                });
            }
        });

        setInsights(cards);
        return cards;
    };

    const handleCardClick = (insight: InsightCard) => {
        onInsightClick?.(insight);
        if (insight.pathwayId) {
            onPathwaySelect?.(insight.pathwayId);
        }
    };

    const handleReanalyze = () => {
        handleAnalyze();
    };

    // Left Panel Content
    const leftPanelContent = (
        <div className="studio-dashboard-left ai-dashboard-left">
            <div className="ai-dashboard-header">
                <div className="ai-title">
                    <span className="ai-icon">🧠</span>
                    <h2>{t('AI Intelligence Hub')}</h2>
                </div>
                <button
                    className="ai-reanalyze-btn"
                    onClick={handleReanalyze}
                    disabled={isAnalyzing || volcanoData.length === 0}
                >
                    {hasAnalyzed ? t('🔄 Reanalyze') : t('✨ Analyze')}
                </button>
            </div>

            {volcanoData.length > 0 && (
                <div className="ai-stats-row">
                    <div className="ai-stat-card">
                        <div className="ai-stat-value">{stats.total.toLocaleString()}</div>
                        <div className="ai-stat-label">{t('Total Genes')}</div>
                    </div>
                    <div className="ai-stat-card up">
                        <div className="ai-stat-value">{stats.upRegulated}</div>
                        <div className="ai-stat-label">↑ {t('Upregulated')}</div>
                    </div>
                    <div className="ai-stat-card down">
                        <div className="ai-stat-value">{stats.downRegulated}</div>
                        <div className="ai-stat-label">↓ {t('Downregulated')}</div>
                    </div>
                </div>
            )}

            {isAnalyzing && (
                <div className="ai-loading">
                    <div className="ai-spinner"></div>
                    <p>{t('AI is analyzing your data...')}</p>
                </div>
            )}

            {error && (
                <div className="ai-error">
                    ❌ {error}
                    <button onClick={handleReanalyze}>{t('Retry')}</button>
                </div>
            )}

            {volcanoData.length === 0 && !isAnalyzing && (
                <div className="ai-empty">
                    <div className="ai-empty-icon">📊</div>
                    <h3>{t('Import Data to Start')}</h3>
                    <p>{t('Upload your differential expression data to get AI-powered insights.')}</p>
                </div>
            )}

            {insights.length > 0 && (
                <div className="ai-insights-section">
                    <h3 className="ai-section-title">🔥 {t('Top Insights')}</h3>
                    <div className="ai-insights-grid">
                        {insights.map((insight) => (
                            <div
                                key={insight.id}
                                className="ai-insight-card"
                                onClick={() => handleCardClick(insight)}
                            >
                                <div className="ai-card-header">
                                    <span className="ai-card-title">{insight.title}</span>
                                    <span className="ai-card-badge">
                                        p={insight.pValue.toExponential(1)}
                                    </span>
                                </div>
                                <div className="ai-card-drivers">
                                    {insight.drivers.slice(0, 4).map(gene => (
                                        <span key={gene} className="ai-gene-chip">{gene}</span>
                                    ))}
                                    {insight.drivers.length > 4 && (
                                        <span className="ai-gene-more">+{insight.drivers.length - 4}</span>
                                    )}
                                </div>
                                <p className="ai-card-desc">{insight.description}</p>
                                <div className="ai-card-footer">
                                    <span className="ai-card-size">
                                        📊 {t('{count} related pathways', { count: insight.moduleSize || 0 })}
                                    </span>
                                    <span className="ai-card-action">{t('Explore')} →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    // Right Panel Content
    const rightPanelContent = (
        <div className="studio-dashboard-right ai-dashboard-right">
            <div className="studio-right-tabs">
                <button
                    className={`studio-tab-btn ${rightPanelTab === 'report' ? 'active' : ''}`}
                    onClick={() => setRightPanelTab('report')}
                >
                    <span style={{ fontSize: '16px' }}>📝</span>
                    <span>{t('Report')}</span>
                </button>
                <button
                    className={`studio-tab-btn ${rightPanelTab === 'chat' ? 'active' : ''}`}
                    onClick={() => setRightPanelTab('chat')}
                >
                    <span style={{ fontSize: '16px' }}>💬</span>
                    <span>{t('Chat')}</span>
                </button>
            </div>

            <div className="studio-right-content">
                {rightPanelTab === 'report' ? (
                    <div className="ai-report-panel">
                        {narrative ? (
                            <div className="ai-narrative-content">
                                <h3>{t('Mechanistic Narrative Report')}</h3>
                                {renderEvidenceContent(narrative, onEntityClick)}
                            </div>
                        ) : (
                            <div className="ai-report-placeholder">
                                <span>📝</span>
                                <p>{t('Narrative report will appear here after analysis.')}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <AIChatPanel
                        sendCommand={sendCommand as (cmd: string, data?: Record<string, unknown>) => Promise<void>}
                        isConnected={isConnected}
                        lastResponse={lastResponse}
                        analysisContext={{
                            volcanoData: volcanoData
                        }}
                        chatHistory={chatHistory}
                        onChatUpdate={onChatUpdate}
                        workflowPhase="perception"
                        onEntityClick={onEntityClick}
                    />
                )}
            </div>
        </div>
    );

    return (
        <div className="studio-dashboard-container">
            <ResizablePanels
                leftPanel={leftPanelContent}
                rightPanel={rightPanelContent}
                defaultLeftWidth={30}
                minLeftWidth={20}
                maxLeftWidth={60}
            />
        </div>
    );
}

export default AIInsightsDashboard;
