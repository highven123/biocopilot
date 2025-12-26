import React from 'react';
import { useI18n } from '../i18n';
import { EntityKind, EntityMeta, EXTERNAL_RESOURCES } from '../entityTypes';
import './EvidencePopup.css';

export interface GeneDetail {
    name: string;
    logFC: number;
    pvalue?: number;
}

interface EvidencePopupProps {
    entityType: string | null;
    entityId: string | null;
    geneData?: GeneDetail | null;
    auditSnapshot?: any | null;
    distribution?: any | null;
    entityKind: EntityKind;
    labels: EntityMeta;
    onClose: () => void;
}

export const EvidencePopup: React.FC<EvidencePopupProps> = ({
    entityType,
    entityId,
    geneData,
    auditSnapshot,
    distribution,
    entityKind,
    labels,
    onClose
}) => {
    const { t } = useI18n();
    if (!entityId) return null;

    const { labelSingular } = labels;
    const roundedFC = geneData ? Math.pow(2, Math.abs(geneData.logFC)).toFixed(2) : null;
    const badgeClass = geneData ? (geneData.logFC > 0 ? 'up' : geneData.logFC < 0 ? 'down' : 'neutral') : 'neutral';
    const resources = EXTERNAL_RESOURCES[entityKind] || [];

    return (
        <div className="evidence-popup-overlay" onClick={onClose}>
            <div className="evidence-popup" onClick={e => e.stopPropagation()}>
                {/* Close button */}
                <button className="popup-close" onClick={onClose}>✕</button>

                {/* Header */}
                <div className="popup-header">
                    <span className="popup-gene">{entityId}</span>
                    {roundedFC && (
                        <span className={`popup-badge ${badgeClass}`}>
                            {t('FC')}: {roundedFC}x
                        </span>
                    )}
                </div>

                {/* Stats */}
                {geneData && (
                    <div className="popup-stats">
                        <div className="stat-row">
                            <span className="stat-label">{t('Log2FC')}:</span>
                            <span className={`stat-value ${geneData.logFC > 0 ? 'up' : 'down'}`}>
                                {geneData.logFC > 0 ? '+' : ''}{geneData.logFC.toFixed(3)}
                            </span>
                        </div>
                        {geneData.pvalue !== undefined && (
                            <div className="stat-row">
                                <span className="stat-label">{t('P-value')}:</span>
                                <span className="stat-value">{geneData.pvalue.toExponential(2)}</span>
                            </div>
                        )}
                        <div className="stat-row">
                            <span className="stat-label">{t('Type')}:</span>
                            <span className="stat-value">{labelSingular}</span>
                        </div>
                    </div>
                )}

                {(auditSnapshot || distribution) && (
                    <div className="popup-audit">
                        <div className="audit-title">{t('Evidence Snapshot')}</div>
                        {auditSnapshot && (
                            <div className="audit-grid">
                                <div><span className="audit-label">{t('Method')}</span><span>{auditSnapshot.method || t('N/A')}</span></div>
                                <div><span className="audit-label">{t('Gene Sets')}</span><span>{auditSnapshot.gene_set_source || t('N/A')}</span></div>
                                <div><span className="audit-label">{t('Run Time')}</span><span>{auditSnapshot.created_at || t('N/A')}</span></div>
                                <div><span className="audit-label">{t('Version')}</span><span>{auditSnapshot.metadata?.software_version || t('N/A')}</span></div>
                                <div><span className="audit-label">{t('DB Hash')}</span><span>{auditSnapshot.metadata?.gene_set_hash || t('N/A')}</span></div>
                            </div>
                        )}
                        {distribution && (
                            <div className="audit-grid">
                                <div><span className="audit-label">{t('Total')}</span><span>{distribution.total ?? t('N/A')}</span></div>
                                <div><span className="audit-label">{t('Up/Down')}</span><span>{distribution.up ?? 0}/{distribution.down ?? 0}</span></div>
                                <div><span className="audit-label">{t('Log2FC')}</span><span>{distribution.log2fc?.min ?? t('N/A')} ~ {distribution.log2fc?.max ?? t('N/A')}</span></div>
                                <div><span className="audit-label">{t('Median')}</span><span>{distribution.log2fc?.median ?? t('N/A')}</span></div>
                                <div><span className="audit-label">{t('P(min)')}</span><span>{distribution.pvalue?.min ?? t('N/A')}</span></div>
                                <div><span className="audit-label">{t('P(median)')}</span><span>{distribution.pvalue?.median ?? t('N/A')}</span></div>
                            </div>
                        )}
                    </div>
                )}

                {/* External Links */}
                {resources.length > 0 && entityType === 'GENE' && (
                    <div className="popup-links">
                        {resources.map(resource => (
                            <a
                                key={resource.id}
                                href={resource.buildUrl(entityId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="popup-link"
                            >
                                {resource.label}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EvidencePopup;
