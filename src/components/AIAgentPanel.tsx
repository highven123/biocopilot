import React, { useState } from 'react';
import { useI18n } from '../i18n';
import './AIAgentPanel.css';

interface AIAgentPanelProps {
    sendCommand: (cmd: string, data?: Record<string, unknown>) => Promise<void>;
    isConnected: boolean;
    lastResponse: any;
    analysisContext?: {
        pathway?: any;
        volcanoData?: any[];
        statistics?: any;
    };
    chatHistory?: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
    onChatUpdate?: (messages: any[]) => void;
    onNavigateToGSEA?: () => void;
    onExportSession?: () => void;
}

interface Skill {
    id: string;
    icon: string;
    label: string;
    description: string;
    action: () => void;
    disabled?: boolean;
}

export const AIAgentPanel: React.FC<AIAgentPanelProps> = ({
    sendCommand,
    isConnected,
    lastResponse,
    analysisContext,
    chatHistory = [],
    onChatUpdate,
    onNavigateToGSEA,
    onExportSession,
}) => {
    const { t } = useI18n();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>>(chatHistory);
    const [isLoading, setIsLoading] = useState(false);

    // Sync with parent chatHistory
    React.useEffect(() => {
        setMessages(chatHistory);
    }, [chatHistory]);

    const updateMessages = (updater: (prev: any[]) => any[]) => {
        setMessages(prev => {
            const updated = updater(prev);
            if (onChatUpdate) onChatUpdate(updated);
            return updated;
        });
    };

    // Define AI Skills
    const skills: Skill[] = [
        {
            id: 'gsea',
            icon: '🔬',
            label: t('GSEA Analysis'),
            description: t('Gene set enrichment analysis'),
            action: () => onNavigateToGSEA?.(),
            disabled: !analysisContext?.volcanoData
        },
        {
            id: 'enrichment',
            icon: '📊',
            label: t('Enrichment Analysis'),
            description: t('Run enrichment analysis (ORA/GSEA)'),
            action: async () => {
                setIsLoading(true);
                await sendCommand('CHAT', {
                    query: t('Please run enrichment analysis for current differentially expressed genes and summarize the most significant pathways.'),
                    context: analysisContext
                });
                setIsLoading(false);
            },
            disabled: !analysisContext?.volcanoData
        },
        {
            id: 'report',
            icon: '📝',
            label: t('Generate Report'),
            description: t('Export analysis report'),
            action: () => onExportSession?.(),
            disabled: !analysisContext
        },
        {
            id: 'compare',
            icon: '🧬',
            label: t('Gene Comparison'),
            description: t('Compare upregulated vs downregulated genes'),
            action: async () => {
                setIsLoading(true);
                await sendCommand('CHAT', {
                    query: t('Please analyze functional differences between upregulated and downregulated genes in the current data.'),
                    context: analysisContext
                });
                setIsLoading(false);
            },
            disabled: !analysisContext?.volcanoData
        },
        {
            id: 'trend',
            icon: '📈',
            label: t('Trend Analysis'),
            description: t('Multi-timepoint trends'),
            action: async () => {
                setIsLoading(true);
                await sendCommand('CHAT', {
                    query: t('Please analyze time-dependent expression patterns in the data.'),
                    context: analysisContext
                });
                setIsLoading(false);
            },
            disabled: !analysisContext
        },
        {
            id: 'literature',
            icon: '🔍',
            label: t('Literature Search'),
            description: t('Find related studies'),
            action: async () => {
                setIsLoading(true);
                await sendCommand('CHAT', {
                    query: t('Please summarize recent research progress and clinical relevance of the current pathway.'),
                    context: analysisContext
                });
                setIsLoading(false);
            },
            disabled: !analysisContext?.pathway
        },
    ];

    const handleSend = async () => {
        if (!input.trim() || !isConnected) return;

        const userMessage = { role: 'user' as const, content: input, timestamp: Date.now() };
        updateMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            await sendCommand('CHAT', { query: input, context: analysisContext });
        } catch (e) {
            console.error('Chat error:', e);
        }
        setIsLoading(false);
    };

    // Handle AI responses
    React.useEffect(() => {
        if (!lastResponse) return;
        const structuredCmds = new Set(['SUMMARIZE_ENRICHMENT', 'SUMMARIZE_DE', 'PARSE_FILTER', 'GENERATE_HYPOTHESIS', 'DISCOVER_PATTERNS', 'DESCRIBE_VISUALIZATION']);
        if (lastResponse.cmd === 'CHAT' && lastResponse.content) {
            updateMessages(prev => {
                const filtered = prev.filter(m => m.content !== 'Processing...');
                return [...filtered, { role: 'assistant', content: lastResponse.content, timestamp: Date.now() }];
            });
        } else if (lastResponse.cmd && structuredCmds.has(lastResponse.cmd)) {
            const content = lastResponse.summary || lastResponse.content || lastResponse.message;
            if (content) {
                updateMessages(prev => [...prev, { role: 'assistant', content, timestamp: Date.now() }]);
            }
        }
    }, [lastResponse]);

    return (
        <div className="ai-agent-panel">
            {/* Header */}
            <div className="agent-header">
                <div className="header-title">
                    <span className="ai-icon">🤖</span>
                    <span>{t('AI Agent')}</span>
                </div>
                <div className={`status-badge ${isConnected ? 'online' : 'offline'}`}>
                    {isConnected ? (isLoading ? t('Thinking...') : t('Ready')) : t('Offline')}
                </div>
            </div>

            {/* Skills Grid */}
            <div className="skills-section">
                <div className="skills-label">{t('Quick Skills')}</div>
                <div className="skills-grid">
                    {skills.map(skill => (
                        <button
                            key={skill.id}
                            className={`skill-card ${skill.disabled ? 'disabled' : ''}`}
                            onClick={skill.action}
                            disabled={skill.disabled || isLoading}
                            title={skill.description}
                        >
                            <span className="skill-icon">{skill.icon}</span>
                            <span className="skill-label">{skill.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Section */}
            <div className="chat-section">
                <div className="chat-messages">
                    {messages.length === 0 ? (
                        <div className="empty-chat">
                            <span>💬</span>
                            <p>{t('How can I help you?')}</p>
                            <small>{t('Click a skill above or type your question')}</small>
                        </div>
                    ) : (
                        messages.map((msg, i) => (
                            <div key={i} className={`message ${msg.role}`}>
                                <div className="message-content">{msg.content}</div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="message assistant loading">
                            <div className="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="chat-input-area">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={t('Enter your question...')}
                        disabled={!isConnected || isLoading}
                    />
                    <button onClick={handleSend} disabled={!isConnected || isLoading || !input.trim()}>
                        {t('Send')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIAgentPanel;
