import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../i18n';
import './MultiSamplePanel.css';

interface MultiSampleData {
    status: string;
    file_path: string;
    gene_column: string;
    sample_groups: string[];
    is_multi_sample: boolean;
    expression_data: Record<string, Array<{ gene: string; logfc: number; pvalue: number }>>;
    total_genes: number;
}

interface MultiSamplePanelProps {
    sendCommand: (cmd: string, data?: Record<string, unknown>) => Promise<void>;
    isConnected: boolean;
    onSampleGroupChange?: (groupName: string, data: Array<{ gene: string; logfc: number; pvalue: number }>) => void;
    onMultiSampleData?: (data: MultiSampleData | null) => void;
    currentFilePath?: string;
    lastResponse?: any;
}

export const MultiSamplePanel: React.FC<MultiSamplePanelProps> = ({
    sendCommand,
    isConnected,
    onSampleGroupChange,
    onMultiSampleData,
    currentFilePath,
    lastResponse,
}) => {
    const { t } = useI18n();
    const [multiSampleData, setMultiSampleData] = useState<MultiSampleData | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'tabs' | 'slider'>('tabs');
    const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);

    // Handle responses from backend
    useEffect(() => {
        if (!lastResponse) return;

        if (lastResponse.cmd === 'LOAD_MULTI_SAMPLE') {
            setIsLoading(false);
            if (lastResponse.status === 'ok') {
                setMultiSampleData(lastResponse);
                onMultiSampleData?.(lastResponse);
                // Auto-select first group
                if (lastResponse.sample_groups?.length > 0) {
                    setSelectedGroup(lastResponse.sample_groups[0]);
                }
                setError(null);
            } else if (lastResponse.status === 'error') {
                setError(lastResponse.message || t('Failed to load multi-sample data'));
                onMultiSampleData?.(null);
            }
        }

        // Handle AI CHAT response for inline display
        if (lastResponse.cmd === 'CHAT' && isAnalyzing) {
            setIsAnalyzing(false);
            if (lastResponse.status === 'ok') {
                // Handle different response types
                if (lastResponse.type === 'CHAT' && lastResponse.content) {
                    setAiAnalysisResult(lastResponse.content);
                } else if (lastResponse.type === 'EXECUTE' && lastResponse.content) {
                    // AI executed a tool - show the result
                    let resultText = lastResponse.content;
                    if (lastResponse.tool_name && lastResponse.tool_result) {
                        resultText += `\n\n📊 ${t('Tool executed')}: ${lastResponse.tool_name}`;
                        if (lastResponse.tool_result.pathway) {
                            const pathway = lastResponse.tool_result.pathway;
                            resultText += `\n✅ ${t('Pathway')}: ${pathway.title || pathway.id}`;
                        }
                        if (lastResponse.tool_result.statistics) {
                            const stats = lastResponse.tool_result.statistics;
                            resultText += `\n📈 ${t('Stats')}: ${stats.upregulated} ${t('Upregulated')}, ${stats.downregulated} ${t('Downregulated')} / ${stats.total_nodes} ${t('Total Genes')}`;
                        }
                    }
                    setAiAnalysisResult(resultText);
                }
            }
            if (lastResponse.status === 'error') {
                setError(lastResponse.message || t('AI analysis failed'));
            }
        }
    }, [lastResponse, isAnalyzing]);

    // Load multi-sample data when file path changes
    useEffect(() => {
        if (currentFilePath && isConnected) {
            loadMultiSampleData(currentFilePath);
        }
    }, [currentFilePath, isConnected]);

    const loadMultiSampleData = async (filePath: string) => {
        setIsLoading(true);
        setError(null);

        try {
            await sendCommand('LOAD_MULTI_SAMPLE', { path: filePath });
        } catch (err) {
            setError(t('Failed to load multi-sample data: {error}', { error: String(err) }));
            setIsLoading(false);
        }
    };

    const handleGroupSelect = (groupName: string) => {
        setSelectedGroup(groupName);

        if (multiSampleData && onSampleGroupChange) {
            const groupData = multiSampleData.expression_data[groupName] || [];
            onSampleGroupChange(groupName, groupData);
        }
    };

    const sampleGroups = multiSampleData?.sample_groups || [];
    const isMultiSample = sampleGroups.length > 1;

    // Stats for current group
    const currentGroupStats = useMemo(() => {
        if (!multiSampleData || !selectedGroup) return null;

        const data = multiSampleData.expression_data[selectedGroup] || [];
        const upregulated = data.filter(d => d.logfc > 0 && d.pvalue < 0.05).length;
        const downregulated = data.filter(d => d.logfc < 0 && d.pvalue < 0.05).length;

        return {
            total: data.length,
            upregulated,
            downregulated,
            unchanged: data.length - upregulated - downregulated,
        };
    }, [multiSampleData, selectedGroup]);

    if (!isMultiSample && !isLoading) {
        return (
            <div className="multi-sample-panel empty">
                <div className="panel-placeholder">
                    <span className="icon">📊</span>
                    <p>{t('Current data is single-sample mode')}</p>
                    <p className="hint">{t('Upload a file with multiple LogFC columns to enable multi-sample analysis')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="multi-sample-panel">
            <div className="panel-header">
                <h3>🔄 {t('Multi-sample Analysis')}</h3>
                <div className="view-toggle">
                    <button
                        className={viewMode === 'tabs' ? 'active' : ''}
                        onClick={() => setViewMode('tabs')}
                        title={t('Tab view')}
                    >
                        ▦
                    </button>
                    <button
                        className={viewMode === 'slider' ? 'active' : ''}
                        onClick={() => setViewMode('slider')}
                        title={t('Timeline view')}
                    >
                        ━━
                    </button>
                </div>
            </div>

            {isLoading && (
                <div className="loading-state">
                    <span className="spinner">⏳</span>
                    <span>{t('Loading multi-sample data...')}</span>
                </div>
            )}

            {error && (
                <div className="error-state">{error}</div>
            )}

            {!isLoading && !error && isMultiSample && (
                <>
                    {/* Tab View */}
                    {viewMode === 'tabs' && (
                        <div className="sample-tabs">
                            {sampleGroups.map((group, idx) => (
                                <button
                                    key={group}
                                    className={`sample-tab ${selectedGroup === group ? 'active' : ''}`}
                                    onClick={() => handleGroupSelect(group)}
                                >
                                    <span className="tab-index">{idx + 1}</span>
                                    <span className="tab-name">{group}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Slider View (Timeline) */}
                    {viewMode === 'slider' && (
                        <div className="sample-slider">
                            <input
                                type="range"
                                min={0}
                                max={sampleGroups.length - 1}
                                value={sampleGroups.indexOf(selectedGroup)}
                                onChange={(e) => handleGroupSelect(sampleGroups[parseInt(e.target.value)])}
                                className="timeline-slider"
                            />
                            <div className="slider-labels">
                                {sampleGroups.map((group) => (
                                    <span
                                        key={group}
                                        className={`slider-label ${selectedGroup === group ? 'active' : ''}`}
                                        onClick={() => handleGroupSelect(group)}
                                    >
                                        {group}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Current Group Stats */}
                    {selectedGroup && currentGroupStats && (
                        <div className="group-stats">
                            <div className="stat-item total">
                                <span className="stat-value">{currentGroupStats.total}</span>
                                <span className="stat-label">{t('Total Genes')}</span>
                            </div>
                            <div className="stat-item up">
                                <span className="stat-value">{currentGroupStats.upregulated}</span>
                                <span className="stat-label">🔺 {t('Upregulated')}</span>
                            </div>
                            <div className="stat-item down">
                                <span className="stat-value">{currentGroupStats.downregulated}</span>
                                <span className="stat-label">🔻 {t('Downregulated')}</span>
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="quick-actions">
                        <button
                            className="action-btn compare"
                            onClick={() => {
                                setIsAnalyzing(true);
                                setAiAnalysisResult(null);
                                setError(null);

                                // Build context with expression data for each time point
                                const contextData: Record<string, unknown> = {};
                                if (multiSampleData?.expression_data) {
                                    sampleGroups.forEach(group => {
                                        const groupData = multiSampleData.expression_data[group] || [];
                                        contextData[group] = groupData.map(d => ({
                                            gene: d.gene,
                                            logfc: d.logfc,
                                            pvalue: d.pvalue
                                        }));
                                    });
                                }

                                sendCommand('CHAT', {
                                    query: t('Compare differential expression patterns across these multi-timepoint sample groups and provide biological interpretation: {groups}', { groups: sampleGroups.join(', ') }),
                                    context: {
                                        multiSample: true,
                                        sampleGroups: sampleGroups,
                                        expressionData: contextData
                                    }
                                });
                            }}
                            disabled={!isConnected || !multiSampleData || isAnalyzing}
                        >
                            {isAnalyzing ? t('⏳ Analyzing...') : t('🔍 AI Comparative Analysis')}
                        </button>
                    </div>

                    {/* AI Analysis Results - Inline Display */}
                    {aiAnalysisResult && (
                        <div className="ai-analysis-result">
                            <div className="result-header">
                                <h4>🤖 {t('AI Analysis Results')}</h4>
                                <button
                                    className="close-btn"
                                    onClick={() => setAiAnalysisResult(null)}
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="result-content">
                                {aiAnalysisResult.split('\n').map((line, idx) => (
                                    <p key={idx}>{line || <br />}</p>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            <div className="panel-footer">
                <span className="file-info">
                    📁 {multiSampleData?.file_path?.split('/').pop() || t('Not loaded')}
                </span>
                <span className="group-count">
                    {t('{count} sample groups', { count: sampleGroups.length })}
                </span>
            </div>
        </div>
    );
};

export default MultiSamplePanel;
