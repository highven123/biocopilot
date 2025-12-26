import React from 'react';
import { useI18n } from '../i18n';

interface ProFeatureProps {
    isPro: boolean;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    blur?: boolean;
}

export const ProFeature: React.FC<ProFeatureProps> = ({ isPro, children, fallback, blur = true }) => {
    const { t } = useI18n();
    if (isPro) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ filter: blur ? 'blur(4px)' : 'none', pointerEvents: 'none', opacity: 0.5, userSelect: 'none' }}>
                {children}
            </div>
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.1)', zIndex: 10
            }}>
                <div style={{
                    background: 'var(--bg-panel)', padding: '12px 20px', borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)', textAlign: 'center', border: '1px solid var(--primary)'
                }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔐</div>
                    <h4 style={{ margin: '0 0 4px 0' }}>{t('Pro Feature')}</h4>
                    <p style={{ margin: '0', fontSize: '12px', opacity: 0.7 }}>{t('Upgrade to access')}</p>
                </div>
            </div>
        </div>
    );
};
