import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import './DEAnalysisPanel.css';

interface DEAnalysisPanelProps {
    sendCommand: (cmd: string, data?: Record<string, unknown>, waitForResponse?: boolean) => Promise<any>;
    isConnected: boolean;
    lastResponse?: any;
    currentFilePath?: string;
    onAnalysisComplete?: (results: any) => void;
    onReset?: () => void;
}

export const DEAnalysisPanel: React.FC<DEAnalysisPanelProps> = ({
    sendCommand,
    isConnected,
    lastResponse,
    currentFilePath,
    onAnalysisComplete,
    onReset,
}) => {
    const { t } = useI18n();
    const [columns, setColumns] = useState<string[]>([]);
    const [group1, setGroup1] = useState<string[]>([]);
    const [group2, setGroup2] = useState<string[]>([]);
    const [method, setMethod] = useState<'auto' | 'ttest' | 'deseq2'>('auto');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Get columns when file changes or panel loads
    useEffect(() => {
        if (currentFilePath && isConnected) {
            fetchColumns();
        }
    }, [currentFilePath, isConnected]);

    const fetchColumns = async () => {
        setIsLoading(true);
        try {
            // We use the LOAD command to just get headers if not already available
            // In a real app, we might already have this from the wizard
            await sendCommand('LOAD', { path: currentFilePath });
        } catch (err) {
            setError(t('Failed to fetch columns: {error}', { error: String(err) }));
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!lastResponse) return;

        if (lastResponse.cmd === 'LOAD' && lastResponse.status === 'ok') {
            setColumns(lastResponse.columns || []);
            setIsLoading(false);
        }

        if (lastResponse.cmd === 'DE_ANALYSIS') {
            setIsLoading(false);
            if (lastResponse.status === 'ok') {
                setResults(lastResponse);
                setError(null);
                if (onAnalysisComplete) {
                    onAnalysisComplete(lastResponse);
                }
            } else {
                setError(lastResponse.message || t('DE Analysis failed'));
            }
        }
    }, [lastResponse]);

    const handleRunDE = async () => {
        if (group1.length === 0 || group2.length === 0) {
            alert(t('Please select samples for both groups.'));
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await sendCommand('DE_ANALYSIS', {
                counts_path: currentFilePath,
                group1_samples: group1,
                group2_samples: group2,
                method: method
            });
        } catch (err) {
            setError(t('Analysis trigger failed: {error}', { error: String(err) }));
            setIsLoading(false);
        }
    };

    const toggleSample = (sample: string, group: 1 | 2) => {
        if (group === 1) {
            setGroup1(prev => prev.includes(sample) ? prev.filter(s => s !== sample) : [...prev, sample]);
            // Remove from group 2 if it's there
            setGroup2(prev => prev.filter(s => s !== sample));
        } else {
            setGroup2(prev => prev.includes(sample) ? prev.filter(s => s !== sample) : [...prev, sample]);
            // Remove from group 1 if it's there
            setGroup1(prev => prev.filter(s => s !== sample));
        }
    };

    return (
        <div className="de-panel">
            <div className="de-header">
                <h3>🧪 {t('Differential Expression Analysis')}</h3>
                <p className="de-subtitle">{t('Perform statistical comparison between two groups of samples.')}</p>
                <p className="de-hint">{t('Requires raw counts matrix: first column gene name, following columns are samples.')}</p>
            </div>

            <div className="de-content">
                <div className="de-config-grid">
                    <div className="de-method-selector">
                        <label>{t('Analysis Method')}:</label>
                        <select value={method} onChange={(e) => setMethod(e.target.value as any)}>
                            <option value="auto">{t('Auto (Best available)')}</option>
                            <option value="ttest">{t("Welch's t-test (Fast, local)")}</option>
                            <option value="deseq2">{t('DESeq2 (Robust, requires pyDESeq2)')}</option>
                        </select>
                    </div>
                </div>

                <div className="sample-selection-area">
                    <div className="sample-box">
                        <h4>{t('Group 1 (Control / Baseline)')}</h4>
                        <div className="sample-list">
                            {columns.slice(1).map(col => (
                                <button
                                    key={`g1-${col}`}
                                    className={`sample-item ${group1.includes(col) ? 'active' : ''}`}
                                    onClick={() => toggleSample(col, 1)}
                                >
                                    {col}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="sample-box">
                        <h4>{t('Group 2 (Experiment / Treatment)')}</h4>
                        <div className="sample-list">
                            {columns.slice(1).map(col => (
                                <button
                                    key={`g2-${col}`}
                                    className={`sample-item ${group2.includes(col) ? 'active' : ''}`}
                                    onClick={() => toggleSample(col, 2)}
                                >
                                    {col}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="de-actions">
                    <button
                        className="run-de-btn"
                        onClick={handleRunDE}
                        disabled={isLoading || !isConnected || group1.length === 0 || group2.length === 0}
                    >
                        {isLoading ? t('⏳ Analyzing...') : t('🚀 Run DE Analysis')}
                    </button>
                </div>

                {error && <div className="de-error">{error}</div>}

                {results && (
                    <>
                        <div className="de-results-summary">
                            <h4>{t('Analysis Summary')}</h4>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <span className="label">{t('Total Genes')}</span>
                                    <span className="value">{results.summary?.total_genes || 0}</span>
                                </div>
                                <div className="stat-card up">
                                    <span className="label">🔺 {t('Upregulated')}</span>
                                    <span className="value">{results.summary?.upregulated || 0}</span>
                                </div>
                                <div className="stat-card down">
                                    <span className="label">🔻 {t('Downregulated')}</span>
                                    <span className="value">{results.summary?.downregulated || 0}</span>
                                </div>
                            </div>
                            <p className="method-note">{t('Method used')}: <strong>{results.method}</strong></p>
                        </div>

                        <div className="de-results-table-container">
                            <div className="table-header-row">
                                <h4>{t('Top Significant Entities')}</h4>
                                <span className="entity-count">{results.results?.length || 0} {t('Total')}</span>
                            </div>
                            <div className="table-scroll">
                                <table className="de-results-table">
                                    <thead>
                                        <tr>
                                            <th>{t('Entity')}</th>
                                            <th>{t('Log2FC')}</th>
                                            <th>{t('P-value')}</th>
                                            <th>{t('Status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.results?.slice(0, 50).sort((a: any, b: any) => (a.pvalue || 1) - (b.pvalue || 1)).map((r: any) => (
                                            <tr key={r.gene}>
                                                <td className="gene-name">{r.gene}</td>
                                                <td className={`fc-val ${r.log2FC > 0 ? 'up' : r.log2FC < 0 ? 'down' : ''}`}>
                                                    {r.log2FC?.toFixed(2)}
                                                </td>
                                                <td>{r.pvalue?.toExponential(2)}</td>
                                                <td>
                                                    <span className={`status-tag ${r.status}`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {results.results?.length > 50 && (
                                <p className="table-note">{t('Showing top 50 by significance.')}</p>
                            )}
                        </div>

                        {results.qc_report && (
                            <div className="de-qc">
                                <h4>{t('QC Report')}</h4>
                                <div className="qc-grid">
                                    <div className="qc-card">
                                        <div className="qc-title">{t('Library Size')}</div>
                                        <div className="qc-row">
                                            <span>{t('Mean')}</span>
                                            <span>{Number(results.qc_report.library_size?.mean || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="qc-row">
                                            <span>{t('Min')}</span>
                                            <span>{Number(results.qc_report.library_size?.min || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="qc-row">
                                            <span>{t('Max')}</span>
                                            <span>{Number(results.qc_report.library_size?.max || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="qc-row">
                                            <span>{t('Outliers')}</span>
                                            <span>{(results.qc_report.library_size?.outliers || []).join(', ') || t('None')}</span>
                                        </div>
                                    </div>

                                    <div className="qc-card">
                                        <div className="qc-title">{t('PCA (PC1/PC2)')}</div>
                                        {results.qc_report.pca?.samples?.length ? (
                                            <svg className="qc-pca" viewBox="0 0 200 160">
                                                {(() => {
                                                    const samples = results.qc_report.pca.samples;
                                                    const xs = samples.map((s: any) => s.pc1);
                                                    const ys = samples.map((s: any) => s.pc2);
                                                    const minX = Math.min(...xs);
                                                    const maxX = Math.max(...xs);
                                                    const minY = Math.min(...ys);
                                                    const maxY = Math.max(...ys);
                                                    const scale = (v: number, min: number, max: number, outMin: number, outMax: number) => {
                                                        if (max === min) return (outMin + outMax) / 2;
                                                        return outMin + (v - min) * (outMax - outMin) / (max - min);
                                                    };
                                                    return samples.map((s: any, idx: number) => {
                                                        const cx = scale(s.pc1, minX, maxX, 20, 180);
                                                        const cy = scale(s.pc2, minY, maxY, 140, 20);
                                                        const color = s.group === 'group1' ? '#60a5fa' : '#f87171';
                                                        return (
                                                            <g key={`pca-${idx}`}>
                                                                <circle cx={cx} cy={cy} r={4} fill={color} />
                                                                <text x={cx + 6} y={cy + 4} fontSize="9" fill="#cbd5f5">
                                                                    {s.sample}
                                                                </text>
                                                            </g>
                                                        );
                                                    });
                                                })()}
                                            </svg>
                                        ) : (
                                            <div className="qc-empty">{t('PCA not available.')}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            className="reset-view-btn"
                            onClick={() => {
                                setResults(null);
                                if (onReset) onReset();
                            }}
                        >
                            {t('Clear Analysis Results')}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
