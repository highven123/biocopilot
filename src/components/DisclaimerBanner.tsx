import React from 'react';

export const DisclaimerBanner: React.FC = () => {
    return (
        <div className="disclaimer-banner">
            <div className="disclaimer-content">
                <span className="disclaimer-icon">⚠️</span>
                <p>
                    <strong>Research Use Only:</strong> This tool is for research purposes only and should not be used for clinical diagnosis or treatment decisions.
                    Always validate results with established bioinformatics pipelines.
                </p>
            </div>
        </div>
    );
};
