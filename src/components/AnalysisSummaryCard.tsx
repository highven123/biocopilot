/**
 * Analysis Summary Card - Shows key statistics
 */

import React from 'react';
import './AnalysisSummaryCard.css';
import { useI18n } from '../i18n';

interface AnalysisSummaryCardProps {
    statistics?: {
        total_nodes?: number;
        upregulated?: number;
        downregulated?: number;
        unchanged?: number;
        total_edges?: number;
        confidence_score?: number; // 0-1
    };
    insights?: {
        summary: string;
        badges?: Array<{
            type: 'HIGHLIGHT' | 'RISK' | 'INFO';
            message: string;
            detail?: string;
        }>;
    };
    dataType?: 'gene' | 'protein' | 'compound' | 'cell';
}

export const AnalysisSummaryCard: React.FC<AnalysisSummaryCardProps> = ({
    statistics,
    insights,
    dataType = 'gene'
}) => {
    const { t } = useI18n();
    if (!statistics) return null;

    const entityLabel = dataType === 'gene' ? 'Gene' : dataType === 'protein' ? 'Protein' : 'Compound';
    const {
        total_nodes = 0,
        upregulated = 0,
        downregulated = 0,
        unchanged = 0,
        confidence_score = 0.85 // Default to 85% if not provided
    } = statistics;

    const totalRegulated = upregulated + downregulated;
    const balanceRatio = totalRegulated > 0 ? Math.abs(upregulated - downregulated) / totalRegulated : 1;
    const insightChips: Array<{ label: string; icon: string; type?: string }> = [];

    // Heuristics (Client-side only)
    if (upregulated > 1000) {
        insightChips.push({ icon: '🔥', label: t('High transcriptional activity') });
    }
    if (downregulated > 1000) {
        insightChips.push({ icon: '❄️', label: t('Suppression dominant') });
    }
    if (totalRegulated > 0 && balanceRatio <= 0.15) {
        insightChips.push({ icon: '⚖️', label: t('Balanced regulation') });
    }

    // Backend Insights (If available)
    if (insights?.badges) {
        insights.badges.forEach(badge => {
            const icon = badge.type === 'RISK' ? '⚠️' : badge.type === 'HIGHLIGHT' ? '✨' : 'ℹ️';
            // Avoid duplicates with local heuristics
            if (!insightChips.find(c => c.label === badge.message)) {
                insightChips.push({
                    icon,
                    label: t(badge.message),
                    type: badge.type
                });
            }
        });
    }

    const stats = [
        { label: `Total ${entityLabel}s`, value: total_nodes, color: '#64748b', icon: '📊' },
        { label: 'Upregulated', value: upregulated, color: '#ef4444', icon: '⬆️' },
        { label: 'Downregulated', value: downregulated, color: '#3b82f6', icon: '⬇️' },
        { label: 'Unchanged', value: unchanged, color: '#94a3b8', icon: '➖' }
    ];

    const confidencePercent = Math.round(confidence_score * 100);

    return (
        <div className="analysis-summary-card">
            <div className="summary-card-header">
                <div className="header-top">
                    <span className="summary-card-title">📈 {t('Analysis Overview')}</span>
                    <div className="confidence-meter" title={t('AI Confidence Score')}>
                        <div className="meter-label">{t('Confidence')}: {confidencePercent}%</div>
                        <div className="meter-bar">
                            <div className="meter-fill" style={{ width: `${confidencePercent}%`, background: _getConfidenceColor(confidencePercent) }}></div>
                        </div>
                    </div>
                </div>
                {insightChips.length > 0 && (
                    <div className="summary-chip-row">
                        {insightChips.map((chip) => (
                            <span key={chip.label} className={`summary-chip ${chip.type?.toLowerCase() || ''}`}>
                                <span className="summary-chip-icon">{chip.icon}</span>
                                <span>{chip.label}</span>
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <div className="summary-stats-grid">
                {stats.map((stat, idx) => (
                    <div key={idx} className="stat-item" style={{ borderLeftColor: stat.color }}>
                        <div className="stat-icon">{stat.icon}</div>
                        <div className="stat-content">
                            <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
                            <div className="stat-label">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="summary-footer">
                <div className="efficiency-badge">
                    ⚡ {t('Estimated time saved: ~{hours} hours', { hours: total_nodes > 5000 ? 4 : 2 })}
                </div>
                <div className="algorithmic-badge">
                    🛡️ {t('Powered by BioEngine AI')}
                </div>
            </div>
        </div>
    );
};

function _getConfidenceColor(percent: number): string {
    if (percent > 80) return '#22c55e';
    if (percent > 60) return '#eab308';
    return '#ef4444';
}
