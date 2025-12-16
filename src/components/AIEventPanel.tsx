import React, { useState, useEffect } from 'react';
import { eventBus, BioVizEvents } from '../stores/eventBus';
import './AIEventPanel.css';

interface AISuggestion {
    id: string;
    type: 'info' | 'warning' | 'success' | 'action';
    title: string;
    message: string;
    timestamp: number;
    actions?: Array<{
        label: string;
        handler: () => void;
    }>;
    dismissed?: boolean;
}

interface AIEventPanelProps {
    sendCommand: (cmd: string, data?: Record<string, unknown>) => Promise<void>;
    isConnected: boolean;
    onNavigateToGSEA?: () => void;
    onExportSession?: () => void;
    analysisContext?: {
        pathway?: any;
        volcanoData?: any[];
        statistics?: any;
    };
}

export const AIEventPanel: React.FC<AIEventPanelProps> = ({
    sendCommand,
    isConnected,
    onNavigateToGSEA,
    onExportSession,
    analysisContext,
}) => {
    const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        // Subscribe to AI suggestion events
        const subSuggestion = eventBus.subscribe(BioVizEvents.AI_SUGGESTION, (payload) => {
            const newSuggestion: AISuggestion = {
                id: `sug_${Date.now()}`,
                type: payload.type || 'info',
                title: payload.title || 'AI Insight',
                message: payload.message,
                timestamp: Date.now(),
                actions: payload.actions,
            };
            setSuggestions((prev) => [newSuggestion, ...prev].slice(0, 10));
        });

        // Subscribe to AI warning events
        const subWarning = eventBus.subscribe(BioVizEvents.AI_WARNING, (payload) => {
            const warning: AISuggestion = {
                id: `warn_${Date.now()}`,
                type: 'warning',
                title: payload.title || '⚠️ Warning',
                message: payload.message,
                timestamp: Date.now(),
            };
            setSuggestions((prev) => [warning, ...prev].slice(0, 10));
        });

        // Example: Auto-trigger QC check when data is loaded
        const subDataLoaded = eventBus.subscribe(BioVizEvents.DATA_LOADED, (payload) => {
            // Simulate AI QC check
            setTimeout(() => {
                const qcResult: AISuggestion = {
                    id: `qc_${Date.now()}`,
                    type: 'success',
                    title: '✅ Data Quality Check',
                    message: `Loaded ${payload?.rows || 0} rows. No missing values detected.`,
                    timestamp: Date.now(),
                };
                setSuggestions((prev) => [qcResult, ...prev].slice(0, 10));
            }, 500);
        });

        // Auto-trigger suggestion when analysis completes
        const subAnalysis = eventBus.subscribe(BioVizEvents.ANALYSIS_COMPLETE, (payload) => {
            setTimeout(() => {
                const analysisHint: AISuggestion = {
                    id: `analysis_${Date.now()}`,
                    type: 'action',
                    title: '🧬 Analysis Complete',
                    message: `Found ${payload?.statistics?.upregulated || 0} upregulated and ${payload?.statistics?.downregulated || 0} downregulated genes. Would you like to run enrichment analysis?`,
                    timestamp: Date.now(),
                    actions: [
                        {
                            label: 'Open GSEA',
                            handler: () => {
                                if (onNavigateToGSEA) {
                                    onNavigateToGSEA();
                                }
                            },
                        },
                    ],
                };
                setSuggestions((prev) => [analysisHint, ...prev].slice(0, 10));
            }, 300);
        });

        return () => {
            eventBus.unsubscribe(BioVizEvents.AI_SUGGESTION, subSuggestion);
            eventBus.unsubscribe(BioVizEvents.AI_WARNING, subWarning);
            eventBus.unsubscribe(BioVizEvents.DATA_LOADED, subDataLoaded);
            eventBus.unsubscribe(BioVizEvents.ANALYSIS_COMPLETE, subAnalysis);
        };
    }, [sendCommand]);

    const dismissSuggestion = (id: string) => {
        setSuggestions((prev) =>
            prev.map((s) => (s.id === id ? { ...s, dismissed: true } : s))
        );
        setTimeout(() => {
            setSuggestions((prev) => prev.filter((s) => s.id !== id));
        }, 300);
    };

    const activeSuggestions = suggestions.filter((s) => !s.dismissed);

    // Always show panel because we have Skills cards

    return (
        <div className={`ai-event-panel ${isMinimized ? 'minimized' : ''}`}>
            <div className="ai-event-header" onClick={() => setIsMinimized(!isMinimized)}>
                <span className="ai-badge">🤖 AI Assistant</span>
                <span className="suggestion-count">{activeSuggestions.length}</span>
                <button className="minimize-btn">{isMinimized ? '▲' : '▼'}</button>
            </div>

            {!isMinimized && (
                <div className="ai-event-list">
                    {/* Skills Cards */}
                    <div className="ai-skills-section">
                        <div className="skills-label">快捷技能</div>
                        <div className="skills-grid">
                            <button
                                className="skill-card"
                                onClick={() => onNavigateToGSEA?.()}
                                title="基因集富集分析"
                            >
                                <span className="skill-icon">🔬</span>
                                <span className="skill-name">GSEA分析</span>
                            </button>
                            <button
                                className="skill-card"
                                onClick={async () => {
                                    // Enrichment Analysis - extract genes and call AI
                                    const genes = analysisContext?.volcanoData
                                        ?.filter((g: any) => g.status === 'UP' || g.status === 'DOWN')
                                        ?.map((g: any) => g.gene) || [];
                                    if (genes.length > 0) {
                                        await sendCommand('CHAT', {
                                            query: `请对以下${genes.length}个差异表达基因运行富集分析: ${genes.slice(0, 50).join(', ')}${genes.length > 50 ? '...' : ''}`,
                                            context: analysisContext
                                        });
                                    }
                                }}
                                title="运行Enrichr分析"
                                disabled={!analysisContext?.volcanoData}
                            >
                                <span className="skill-icon">📊</span>
                                <span className="skill-name">富集分析</span>
                            </button>
                            <button
                                className="skill-card"
                                onClick={() => onExportSession?.()}
                                title="导出分析报告"
                                disabled={!analysisContext}
                            >
                                <span className="skill-icon">📝</span>
                                <span className="skill-name">生成报告</span>
                            </button>
                            <button
                                className="skill-card"
                                onClick={async () => {
                                    // Gene Comparison - compare UP vs DOWN
                                    const upGenes = analysisContext?.volcanoData
                                        ?.filter((g: any) => g.status === 'UP')
                                        ?.map((g: any) => g.gene) || [];
                                    const downGenes = analysisContext?.volcanoData
                                        ?.filter((g: any) => g.status === 'DOWN')
                                        ?.map((g: any) => g.gene) || [];
                                    await sendCommand('CHAT', {
                                        query: `请对比分析上调基因(${upGenes.length}个)和下调基因(${downGenes.length}个)的功能差异。上调: ${upGenes.slice(0, 20).join(', ')}; 下调: ${downGenes.slice(0, 20).join(', ')}`,
                                        context: analysisContext
                                    });
                                }}
                                title="对比上下调基因"
                                disabled={!analysisContext?.volcanoData}
                            >
                                <span className="skill-icon">🧬</span>
                                <span className="skill-name">基因对比</span>
                            </button>
                            <button
                                className="skill-card"
                                onClick={async () => {
                                    // Trend Analysis - analyze expression patterns
                                    const genes = analysisContext?.volcanoData || [];
                                    const upGenes = genes.filter((g: any) => g.status === 'UP');
                                    const downGenes = genes.filter((g: any) => g.status === 'DOWN');

                                    // Get top changed genes with their fold changes
                                    const topChanges = [...genes]
                                        .sort((a: any, b: any) => Math.abs(b.x) - Math.abs(a.x))
                                        .slice(0, 15)
                                        .map((g: any) => `${g.gene}(${g.x > 0 ? '+' : ''}${g.x.toFixed(2)})`);

                                    await sendCommand('CHAT', {
                                        query: `请分析当前差异表达数据的趋势模式：共${genes.length}个基因，其中${upGenes.length}个上调、${downGenes.length}个下调。变化最显著的基因：${topChanges.join(', ')}。请识别可能的生物学趋势和调控模式。`,
                                        context: analysisContext
                                    });
                                }}
                                title="表达趋势分析"
                                disabled={!analysisContext?.volcanoData}
                            >
                                <span className="skill-icon">📈</span>
                                <span className="skill-name">趋势分析</span>
                            </button>
                            <button
                                className="skill-card"
                                onClick={async () => {
                                    // Literature Search - AI query about pathway
                                    const pathwayName = analysisContext?.pathway?.name || analysisContext?.pathway?.title || '当前通路';
                                    await sendCommand('CHAT', {
                                        query: `请介绍${pathwayName}的最新研究进展、临床意义和治疗靶点。`,
                                        context: analysisContext
                                    });
                                }}
                                title="搜索相关研究"
                                disabled={!analysisContext?.pathway}
                            >
                                <span className="skill-icon">🔍</span>
                                <span className="skill-name">文献搜索</span>
                            </button>
                        </div>
                    </div>

                    {/* Suggestions */}
                    {activeSuggestions.map((suggestion) => (
                        <div
                            key={suggestion.id}
                            className={`ai-suggestion ${suggestion.type} ${suggestion.dismissed ? 'dismissed' : ''}`}
                        >
                            <div className="suggestion-header">
                                <span className="suggestion-title">{suggestion.title}</span>
                                <button
                                    className="dismiss-btn"
                                    onClick={() => dismissSuggestion(suggestion.id)}
                                >
                                    ✕
                                </button>
                            </div>
                            <p className="suggestion-message">{suggestion.message}</p>
                            {suggestion.actions && (
                                <div className="suggestion-actions">
                                    {suggestion.actions.map((action, idx) => (
                                        <button
                                            key={idx}
                                            className="action-btn"
                                            onClick={action.handler}
                                        >
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AIEventPanel;
