import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';

export interface AIConfig {
    provider: 'openai' | 'deepseek' | 'bailian' | 'gemini' | 'grok' | 'custom';
    apiKey: string;
    baseUrl: string;
    model: string;
}

interface AISettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: AIConfig) => void;
    currentConfig?: AIConfig;
}

const DEFAULT_CONFIGS: Record<string, Partial<AIConfig>> = {
    openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
    bailian: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'deepseek-v3' },
    gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-1.5-flash' },
    grok: { baseUrl: 'https://api.x.ai/v1', model: 'grok-2-1212' },
    custom: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' }
};

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose, onSave, currentConfig }) => {
    const { t } = useI18n();
    const [config, setConfig] = useState<AIConfig>(currentConfig || {
        provider: 'bailian',
        apiKey: '',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        model: 'deepseek-v3'
    });
    const [showApiKey, setShowApiKey] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        if (currentConfig) setConfig(currentConfig);
    }, [currentConfig, isOpen]);

    if (!isOpen) return null;

    const handleProviderChange = (provider: AIConfig['provider']) => {
        const defaults = DEFAULT_CONFIGS[provider];
        setConfig(prev => ({
            ...prev,
            provider,
            baseUrl: defaults.baseUrl || prev.baseUrl,
            model: defaults.model || prev.model
        }));
    };

    const handleSave = () => {
        onSave(config);
        onClose();
    };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <div style={headerStyle}>
                    <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⚙️</span> {t('ai.config')}
                    </h2>
                    <button onClick={onClose} style={closeBtnStyle}>&times;</button>
                </div>

                <div style={bodyStyle}>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>{t('ai.provider')}</label>
                        <select
                            value={config.provider}
                            onChange={(e) => handleProviderChange(e.target.value as any)}
                            style={selectStyle}
                        >
                            <option value="bailian">Alibaba Cloud Bailian (DeepSeek V3)</option>
                            <option value="deepseek">DeepSeek ({t('ai.official')})</option>
                            <option value="gemini">Google Gemini (OpenAI API Compatible)</option>
                            <option value="grok">xAI Grok (Grok-2)</option>
                            <option value="openai">OpenAI</option>
                            <option value="custom">{t('ai.customApi')}</option>
                        </select>
                    </div>

                    <div style={inputGroupStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={labelStyle}>{t('ai.apiKey')}</label>
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowHelp(!showHelp)}
                                    style={helpTriggerStyle}
                                    title={t('ai.helpTitle')}
                                >
                                    ?
                                </button>
                                {showHelp && (
                                    <div style={floatingHelpStyle}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{t('ai.helpTitle')}</div>
                                        <div style={{ fontSize: '11px', opacity: 0.9 }}>{t('ai.helpDesc')}</div>
                                        <div style={popoverArrowStyle} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ position: 'relative' }}>
                            <input
                                type={showApiKey ? "text" : "password"}
                                value={config.apiKey}
                                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                style={inputStyle}
                                placeholder={t('ai.enterApiKey')}
                            />
                            <button
                                onClick={() => setShowApiKey(!showApiKey)}
                                style={toggleBtnStyle}
                            >
                                {showApiKey ? '👁️' : '🙈'}
                            </button>
                        </div>
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>{t('ai.baseUrl')}</label>
                        <input
                            type="text"
                            value={config.baseUrl}
                            onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                            style={inputStyle}
                            placeholder="https://api.example.com/v1"
                        />
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>{t('ai.modelName')}</label>
                        <input
                            type="text"
                            value={config.model}
                            onChange={(e) => setConfig({ ...config, model: e.target.value })}
                            style={inputStyle}
                            placeholder="gpt-4 / llama3"
                        />
                    </div>

                    <div style={infoBoxStyle}>
                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                            💡 {t('ai.immediateEffect')}
                        </p>
                    </div>
                </div>

                <div style={footerStyle}>
                    <button onClick={onClose} style={cancelBtnStyle}>{t('ai.cancel')}</button>
                    <button onClick={handleSave} style={saveBtnStyle}>{t('ai.saveConfig')}</button>
                </div>
            </div>
        </div>
    );
};

const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10000, backdropFilter: 'blur(4px)'
};

const modalStyle: React.CSSProperties = {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    width: '450px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
};

const headerStyle: React.CSSProperties = {
    padding: '16px 20px',
    borderBottom: '1px solid #334155',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#f1f5f9'
};

const bodyStyle: React.CSSProperties = {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
};

const footerStyle: React.CSSProperties = {
    padding: '16px 20px',
    borderTop: '1px solid #334155',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    background: '#0f172a'
};

const inputGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
};

const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: '#94a3b8'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#f1f5f9',
    fontSize: '14px',
    boxSizing: 'border-box'
};

const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#f1f5f9',
    fontSize: '14px',
    cursor: 'pointer'
};

const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0 4px'
};

const toggleBtnStyle: React.CSSProperties = {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    opacity: 0.6
};

const saveBtnStyle: React.CSSProperties = {
    padding: '8px 16px',
    background: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer'
};

const cancelBtnStyle: React.CSSProperties = {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#94a3b8',
    fontWeight: 600,
    cursor: 'pointer'
};

const infoBoxStyle: React.CSSProperties = {
    background: '#0f172a',
    padding: '10px',
    borderRadius: '6px',
    borderLeft: '3px solid #3b82f6'
};

const helpTriggerStyle: React.CSSProperties = {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontWeight: 'bold',
    opacity: 0.8,
    transition: 'opacity 0.2s'
};

const floatingHelpStyle: React.CSSProperties = {
    position: 'absolute',
    left: '28px',
    top: '-10px',
    width: '240px',
    background: '#334155',
    color: 'white',
    padding: '12px',
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    zIndex: 100,
    fontSize: '12px',
    lineHeight: '1.4',
    border: '1px solid #475569'
};

const popoverArrowStyle: React.CSSProperties = {
    position: 'absolute',
    left: '-6px',
    top: '14px',
    width: '0',
    height: '0',
    borderTop: '6px solid transparent',
    borderBottom: '6px solid transparent',
    borderRight: '6px solid #334155'
};
