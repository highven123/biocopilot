import React, { useState, useEffect } from 'react';
import { LicenseManager } from '../utils/licenseManager';
import { useI18n } from '../i18n';

interface LicenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { t } = useI18n();
    const [key, setKey] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [machineId, setMachineId] = useState('');

    useEffect(() => {
        setMachineId(LicenseManager.getMachineId());
    }, []);

    if (!isOpen) return null;

    const handleActivate = async () => {
        setError(null);
        if (!key.trim()) {
            setError(t('Please enter a license key.'));
            return;
        }

        const result = await LicenseManager.validateLicense(key.trim());
        if (result.valid) {
            LicenseManager.saveLicense(key.trim());
            onSuccess();
            onClose();
        } else {
            setError(result.error || t('Activation failed.'));
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <h2>{t('Activate BioCopilot Pro 🔐')}</h2>

                <div style={{ marginBottom: '20px', background: 'var(--bg-subtle)', padding: '12px', borderRadius: '6px', fontSize: '14px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', opacity: 0.7 }}>{t('Your Machine ID')}:</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <code style={{ flex: 1, background: '#00000011', padding: '4px', borderRadius: '4px' }}>{machineId}</code>
                        <button
                            className="secondary-btn"
                            style={{ padding: '2px 8px', fontSize: '12px' }}
                            onClick={() => navigator.clipboard.writeText(machineId)}
                        >
                            {t('Copy')}
                        </button>
                    </div>
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', opacity: 0.6 }}>
                        {t('Send this ID to your administrator to receive a license.')}
                    </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px' }}>{t('License Key')}</label>
                    <textarea
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder={t('Paste your license key here...')}
                        style={{
                            width: '100%', height: '100px', padding: '10px',
                            borderRadius: '6px', border: '1px solid var(--border-color)',
                            fontFamily: 'monospace', fontSize: '12px'
                        }}
                    />
                    {error && <div style={{ color: 'var(--error)', fontSize: '13px', marginTop: '8px' }}>⚠️ {error}</div>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button className="secondary-btn" onClick={onClose}>{t('Cancel')}</button>
                    <button className="primary-btn" onClick={handleActivate}>{t('Activate License')}</button>
                </div>
            </div>
        </div>
    );
};
