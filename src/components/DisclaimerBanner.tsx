import React from 'react';
import { useI18n } from '../i18n';

export const DisclaimerBanner: React.FC = () => {
    const { t } = useI18n();
    return (
        <div className="disclaimer-banner">
            <div className="disclaimer-content">
                <span className="disclaimer-icon">⚠️</span>
                <p>
                    <strong>{t('Research Use Only')}:</strong> {t('This tool is for research purposes only and should not be used for clinical diagnosis or treatment decisions.')}
                    {` ${t('Always validate results with established bioinformatics pipelines.')}`}
                </p>
            </div>
        </div>
    );
};
