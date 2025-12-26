/**
 * NarrativePanel - AI Mechanistic Narrative Generator
 * 
 * Converts enrichment results into paper-ready biological narrative reports.
 * Phase 2 of the BioViz AI Platform.
 */

import { useState } from 'react';
import { useI18n } from '../i18n';
import { useBioEngine } from '../hooks/useBioEngine';
import { renderEvidenceContent } from '../utils/evidenceRenderer';
import './NarrativePanel.css';

interface NarrativePanelProps {
    /** Enrichment results to analyze */
    enrichmentResults?: any[];
    analysisContext?: {
        filePath?: string;
        mapping?: Record<string, unknown>;
        dataType?: string;
        filters?: Record<string, unknown>;
    };
    /** Callback when analysis completes */
    onComplete?: (narrative: string) => void;
    onEntityClick?: (type: string, id: string) => void;
}

export function NarrativePanel({ enrichmentResults, analysisContext, onComplete, onEntityClick }: NarrativePanelProps) {

    const { t } = useI18n();
    const { runNarrativeAnalysis, isLoading } = useBioEngine();

    const [narrative, setNarrative] = useState<string | null>(null);
    const [modulesFound, setModulesFound] = useState<number>(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        setNarrative(null);

        try {
            const response = await runNarrativeAnalysis(enrichmentResults, analysisContext) as any;

            // Response format: {status: "ok", result: {status: "completed", narrative: "..."}}
            if (response?.status === 'ok' && response?.result?.status === 'completed') {
                setNarrative(response.result.narrative);
                setModulesFound(response.result.modules_found || 0);
                onComplete?.(response.result.narrative);
            } else if (response?.status === 'error' || response?.result?.status === 'error') {
                setError(response.error || response.message || response.result?.error || t('Analysis failed'));
            } else {
                console.log('Unexpected response:', response);
                setError(t('Unexpected response from backend'));
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsGenerating(false);
        }
    };


    const handleCopy = () => {
        if (narrative) {
            navigator.clipboard.writeText(narrative);
        }
    };

    return (
        <div className="narrative-panel">
            <div className="narrative-header">
                <h3>📝 {t('Mechanistic Narrative')}</h3>
                <span className="narrative-badge">{t('AI Analysis')}</span>
            </div>

            <div className="narrative-description">
                {t('Generate a paper-ready biological narrative from your enrichment results. The AI will identify key functional modules and synthesize mechanistic insights.')}
            </div>

            <button
                className="narrative-generate-btn"
                onClick={handleGenerate}
                disabled={isGenerating || isLoading}
            >
                {isGenerating ? (
                    <>
                        <span className="spinner"></span>
                        {t('Generating Report...')}
                    </>
                ) : (
                    <>
                        🧬 {t('Generate Narrative Report')}
                    </>
                )}
            </button>

            {error && (
                <div className="narrative-error">
                    ❌ {error}
                </div>
            )}

            {narrative && (
                <div className="narrative-result">
                    <div className="narrative-stats">
                        <span className="stat-item">
                            📊 {t('{count} Functional Modules Identified', { count: modulesFound })}
                        </span>
                        <button className="copy-btn" onClick={handleCopy} title={t('Copy to clipboard')}>
                            📋 {t('Copy')}
                        </button>
                    </div>

                    <div className="narrative-content">
                        {renderEvidenceContent(narrative, onEntityClick)}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NarrativePanel;
