import React from 'react';
import { EntityKind, EntityMeta, EXTERNAL_RESOURCES } from '../entityTypes';
import './EvidencePopup.css';

export interface GeneDetail {
    name: string;
    logFC: number;
    pvalue?: number;
}

interface EvidencePopupProps {
    gene: string | null;
    geneData: GeneDetail | null;
    entityKind: EntityKind;
    labels: EntityMeta;
    onClose: () => void;
}

export const EvidencePopup: React.FC<EvidencePopupProps> = ({
    gene,
    geneData,
    entityKind,
    labels,
    onClose
}) => {
    if (!gene || !geneData) return null;

    const { labelSingular } = labels;
    const roundedFC = Math.pow(2, Math.abs(geneData.logFC)).toFixed(2);
    const badgeClass = geneData.logFC > 0 ? 'up' : geneData.logFC < 0 ? 'down' : 'neutral';
    const resources = EXTERNAL_RESOURCES[entityKind] || [];

    return (
        <div className="evidence-popup-overlay" onClick={onClose}>
            <div className="evidence-popup" onClick={e => e.stopPropagation()}>
                {/* Close button */}
                <button className="popup-close" onClick={onClose}>✕</button>

                {/* Header */}
                <div className="popup-header">
                    <span className="popup-gene">{gene}</span>
                    <span className={`popup-badge ${badgeClass}`}>
                        FC: {roundedFC}x
                    </span>
                </div>

                {/* Stats */}
                <div className="popup-stats">
                    <div className="stat-row">
                        <span className="stat-label">Log2FC:</span>
                        <span className={`stat-value ${geneData.logFC > 0 ? 'up' : 'down'}`}>
                            {geneData.logFC > 0 ? '+' : ''}{geneData.logFC.toFixed(3)}
                        </span>
                    </div>
                    {geneData.pvalue !== undefined && (
                        <div className="stat-row">
                            <span className="stat-label">P-value:</span>
                            <span className="stat-value">{geneData.pvalue.toExponential(2)}</span>
                        </div>
                    )}
                    <div className="stat-row">
                        <span className="stat-label">Type:</span>
                        <span className="stat-value">{labelSingular}</span>
                    </div>
                </div>

                {/* External Links */}
                {resources.length > 0 && (
                    <div className="popup-links">
                        {resources.map(resource => (
                            <a
                                key={resource.id}
                                href={resource.buildUrl(gene)}
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
