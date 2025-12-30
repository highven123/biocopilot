import React from 'react';
import { useI18n } from '../i18n';

interface SystemHealthModalProps {
    isOpen: boolean;
    onClose: () => void;
    checkReport: any;
}

export const SystemHealthModal: React.FC<SystemHealthModalProps> = ({ isOpen, onClose, checkReport }) => {
    const { t } = useI18n();
    if (!isOpen || !checkReport) return null;

    const { ram, disk, network, dependencies } = checkReport;
    const isCritical = dependencies?.status === 'CRITICAL';

    const StatusBadge = ({ status }: { status: string }) => {
        let color = '#22c55e'; // green
        let text = t('PASS');
        if (status === 'WARN') {
            color = '#eab308'; // yellow
            text = t('WARN');
        } else if (status === 'CRITICAL' || status === 'OFFLINE' || status === 'FAIL') {
            color = '#ef4444'; // red
            text = t('FAIL');
        }

        return (
            <span style={{
                backgroundColor: `${color}20`,
                color: color,
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                border: `1px solid ${color}40`
            }}>
                {text}
            </span>
        );
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, backdropFilter: 'blur(5px)'
        }}>
            <div style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '12px',
                width: '500px',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <h2 style={{ marginTop: 0, color: '#f8fafc', fontSize: '20px' }}>
                    {t('Environment Self-Check')}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>

                    {/* RAM */}
                    <div className="check-row" style={rowStyle}>
                        <div>
                            <div style={labelStyle}>{t('System Memory (RAM)')}</div>
                            <div style={subLabelStyle}>{t('{gb} GB detected (Rec: >4GB)', { gb: ram?.total_gb })}</div>
                        </div>
                        <StatusBadge status={ram?.status} />
                    </div>

                    {/* Disk */}
                    <div className="check-row" style={rowStyle}>
                        <div>
                            <div style={labelStyle}>{t('Disk Space')}</div>
                            <div style={subLabelStyle}>{t('{gb} GB free (Rec: >2GB)', { gb: disk?.free_gb })}</div>
                        </div>
                        <StatusBadge status={disk?.status} />
                    </div>

                    {/* Network */}
                    <div className="check-row" style={rowStyle}>
                        <div>
                            <div style={labelStyle}>{t('Network Connectivity')}</div>
                            <div style={subLabelStyle}>
                                KEGG: {network?.kegg_accessible ? t('OK') : t('Unreachable')} •
                                NCBI: {network?.ncbi_accessible ? t('OK') : t('Unreachable')}
                            </div>
                        </div>
                        <StatusBadge status={network?.status} />
                    </div>

                    {/* Dependencies */}
                    <div className="check-row" style={rowStyle}>
                        <div>
                            <div style={labelStyle}>{t('Bio-Engine Core')}</div>
                            <div style={subLabelStyle}>
                                {dependencies?.missing?.length > 0
                                    ? t('Missing: {items}', { items: dependencies.missing.join(', ') })
                                    : t('All libraries verified')}
                            </div>
                        </div>
                        <StatusBadge status={dependencies?.status} />
                    </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                    {isCritical ? (
                        <button
                            style={{ ...btnStyle, background: '#ef4444', cursor: 'not-allowed', opacity: 0.7 }}
                            disabled
                        >
                            {t('Fix Critical Issues to Start')}
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            style={{ ...btnStyle, background: '#3b82f6' }}
                        >
                            {t('Launch BioCopilot')} →
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    border: '1px solid #334155'
};

const labelStyle: React.CSSProperties = {
    color: '#e2e8f0',
    fontWeight: 500,
    fontSize: '14px'
};

const subLabelStyle: React.CSSProperties = {
    color: '#94a3b8',
    fontSize: '12px',
    marginTop: '2px'
};

const btnStyle: React.CSSProperties = {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer'
};
