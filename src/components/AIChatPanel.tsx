/**
 * AI Chat Panel - BioViz AI Assistant
 */

import React, { useState, useRef, useEffect } from 'react';
import './AIChatPanel.css';
import { renderEvidenceContent } from '../utils/evidenceRenderer';
import { useI18n } from '../i18n';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface AIChatPanelProps {
    sendCommand: (cmd: string, data?: Record<string, unknown>) => Promise<void>;
    isConnected: boolean;
    lastResponse: any; // Response from useBioEngine
    analysisContext?: {
        pathway?: any;
        volcanoData?: any[];
        statistics?: any;
    };
    chatHistory?: Message[];  // Chat history from parent
    onChatUpdate?: (messages: Message[]) => void;  // Callback to update parent
    workflowPhase?: 'perception' | 'exploration' | 'synthesis';
    onEntityClick?: (type: string, id: string) => void;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
    sendCommand,
    isConnected,
    lastResponse,
    analysisContext,
    chatHistory,
    onChatUpdate,
    workflowPhase = 'perception',
    onEntityClick
}) => {
    const { t } = useI18n();
    const [messages, setMessages] = useState<Message[]>(chatHistory ?? []);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isSyncingFromParent = useRef(false);
    const mountedAtRef = useRef<number>(Date.now());

    // Sync with parent chatHistory when it changes (e.g., switching analysis)
    useEffect(() => {
        if (!chatHistory) return;
        if (JSON.stringify(chatHistory) !== JSON.stringify(messages)) {
            isSyncingFromParent.current = true;
            setMessages(chatHistory);
        }
    }, [chatHistory]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const formatAIContent = (content: string) => renderEvidenceContent(content, onEntityClick);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Helper to update messages and notify parent
    const updateMessages = (updater: (prev: Message[]) => Message[]) => {
        setMessages(prev => {
            const next = updater(prev);
            return next;
        });
    };

    // Notify parent when messages change
    useEffect(() => {
        if (isSyncingFromParent.current) {
            isSyncingFromParent.current = false;
            return;
        }
        if (!onChatUpdate) return;
        if (!chatHistory) return;
        if (messages.length === 0) return;
        if (JSON.stringify(messages) !== JSON.stringify(chatHistory)) {
            onChatUpdate(messages);
        }
    }, [messages, chatHistory, onChatUpdate]);

    // Listen for AI responses from useBioEngine's lastResponse
    useEffect(() => {
        console.log('[AIChatPanel] lastResponse changed:', lastResponse);

        if (!lastResponse) return;
        if (typeof lastResponse.__receivedAt === 'number' && lastResponse.__receivedAt < mountedAtRef.current) {
            return;
        }

        try {
            console.log('[AIChatPanel] Response type:', lastResponse.type, 'cmd:', lastResponse.cmd);

            // Handle both CHAT and EXECUTE responses
            const structuredCmds = new Set(['SUMMARIZE_ENRICHMENT', 'SUMMARIZE_DE', 'PARSE_FILTER', 'GENERATE_HYPOTHESIS', 'DISCOVER_PATTERNS', 'DESCRIBE_VISUALIZATION']);
            if (lastResponse.cmd === 'CHAT' && (lastResponse.type === 'CHAT' || lastResponse.type === 'EXECUTE')) {
                console.log('[AIChatPanel] Processing AI response, content:', lastResponse.content?.substring(0, 50));

                setMessages(prev => {
                    // Build response content
                    let responseContent = lastResponse.content;

                    // If this is an EXECUTE action, add tool execution details
                    if (lastResponse.type === 'EXECUTE' && lastResponse.tool_name) {
                        responseContent += `\n\n**🔧 ${t('Tool executed')}**: ${lastResponse.tool_name}`;

                        // Format and display tool results
                        if (lastResponse.tool_result) {
                            const result = lastResponse.tool_result;

                            if (lastResponse.tool_name === 'list_pathways' && Array.isArray(result)) {
                                responseContent += `\n\n**${t('Available pathways list')}** (${result.length} ${t('items')}):`;
                                result.forEach((p: any) => {
                                    responseContent += `\n• ${p.id}: ${p.name}`;
                                });
                            } else if (lastResponse.tool_name === 'render_pathway' && result.pathway) {
                                const pathway = result.pathway;
                                const stats = result.statistics || {};
                                responseContent += `\n\n**${t('Pathway')}**: ${pathway.title || pathway.id}`;
                                responseContent += `\n**${t('Total Genes')}**: ${stats.total_nodes || 0}`;
                                responseContent += `\n**${t('Upregulated')}**: ${stats.upregulated || 0} | **${t('Downregulated')}**: ${stats.downregulated || 0}`;
                            } else if (lastResponse.tool_name === 'run_enrichment') {
                                if (result.error) {
                                    responseContent += `\n\n**${t('Error')}**: ${result.error}`;
                                } else {
                                    responseContent += `\n\n**${t('Enrichment Results')}**:`;
                                    responseContent += `\n• ${t('Input genes')}: ${result.input_genes}`;
                                    responseContent += `\n• ${t('Gene sets')}: ${result.gene_sets}`;
                                    responseContent += `\n• ${t('Enriched terms')}: ${result.total_terms}\n`;

                                    if (result.enriched_terms && result.enriched_terms.length > 0) {
                                        responseContent += `\n**${t('Top 10 significant pathways')}**:\n`;
                                        result.enriched_terms.slice(0, 10).forEach((term: any, idx: number) => {
                                            const pval = term.adjusted_p_value || term.p_value;
                                            responseContent += `${idx + 1}. **${term.term}**\n`;
                                            responseContent += `   - P-value: ${pval.toExponential(2)}\n`;
                                            responseContent += `   - ${t('Genes')}: ${term.overlap}\n`;
                                        });
                                    }
                                }
                            } else if (typeof result === 'object') {
                                responseContent += `\n\n**${t('Result')}**: ${JSON.stringify(result, null, 2)}`;
                            } else {
                                responseContent += `\n\n**${t('Result')}**: ${String(result)}`;
                            }
                        }
                    }

                    // Add AI response
                    return [...prev, {
                        role: 'assistant',
                        content: responseContent,
                        timestamp: Date.now()
                    }];
                });
                setIsLoading(false);
            } else if (lastResponse.cmd === 'AGENT_TASK') {
                const narrative =
                    lastResponse.result?.narrative ||
                    lastResponse.narrative ||
                    lastResponse.summary ||
                    lastResponse.content ||
                    lastResponse.message;
                if (narrative) {
                    updateMessages(prev => [
                        ...prev,
                        { role: 'assistant', content: narrative, timestamp: Date.now() }
                    ]);
                }
                setIsLoading(false);
            } else if (lastResponse.cmd && structuredCmds.has(lastResponse.cmd)) {
                // Display structured prompt responses (e.g., SUMMARIZE_ENRICHMENT)
                const content = lastResponse.summary || lastResponse.content || lastResponse.message;
                if (content) {
                    updateMessages(prev => [
                        ...prev,
                        { role: 'assistant', content, timestamp: Date.now() }
                    ]);
                }
                setIsLoading(false);
            } else {
                console.log('[AIChatPanel] Ignoring non-CHAT response');
            }
        } catch (error) {
            console.error('[AIChatPanel] Failed to process AI response:', error);
        }
    }, [lastResponse]);

    const handleSend = async () => {
        if (!input.trim() || !isConnected || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: input.trim(),
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Send CHAT command to backend with analysis context
            await sendCommand('CHAT', {
                query: userMessage.content,
                history: messages.slice(-10).map(m => ({
                    role: m.role,
                    content: m.content
                })),
                context: analysisContext || {}
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: t('Sorry, I encountered an error processing your request.'),
                timestamp: Date.now()
            };
            updateMessages(prev => [...prev, errorMessage]);
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };


    const milestoneInfo = {
        perception: { title: t('🎯 Stage 1: Perception'), hint: t('AI has scanned your data. Review the initial insights.') },
        exploration: { title: t('🔍 Stage 2: Exploration'), hint: t('Deep dive into pathways and evidence. Use tools to investigate.') },
        synthesis: { title: t('🤖 Stage 3: Synthesis'), hint: t('Consolidating all evidence into a consistent mechanism.') }
    };

    const currentMilestone = milestoneInfo[workflowPhase] || milestoneInfo['perception'];

    return (
        <div className="ai-chat-panel">
            <div className="chat-header">
                <div className="header-title">
                    <span className="ai-icon">🤖</span>
                    <span>{t('BioViz AI Assistant')}</span>
                </div>
                <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                    {isConnected ? `● ${t('Online')}` : `● ${t('Offline')}`}
                </div>
            </div>

            <div className="chat-messages">
                <div className="milestone-badge">
                    <span className="milestone-title">{currentMilestone.title}</span>
                    <span className="milestone-hint">{currentMilestone.hint}</span>
                </div>

                {messages.length === 0 && (
                    <div className="welcome-message" style={{ padding: '20px 16px' }}>
                        <p style={{ fontSize: '15px', fontWeight: 600 }}>👋 {currentMilestone.title}</p>
                        <p style={{ fontSize: '13px', opacity: 0.8 }}>{t('Choose a smart skill below to start your discovery.')}</p>
                    </div>
                )}


                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role}`}>
                        <div className="message-avatar">
                            {msg.role === 'user' ? '👤' : '🤖'}
                        </div>
                        <div className="message-content">
                            <div className="message-text">
                                {msg.role === 'assistant' ? formatAIContent(msg.content) : msg.content}
                            </div>
                            <div className="message-time">
                                {(() => {
                                    const date = new Date(msg.timestamp || Date.now());
                                    return isNaN(date.getTime()) ? '' : date.toLocaleTimeString();
                                })()}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="message assistant">
                        <div className="message-avatar">🤖</div>
                        <div className="message-content">
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
                <textarea
                    className="chat-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t('Ask me anything about pathways...')}
                    rows={2}
                    disabled={!isConnected || isLoading}
                />
                <button
                    className="send-button"
                    onClick={handleSend}
                    disabled={!input.trim() || !isConnected || isLoading}
                >
                    {t('Send')}
                </button>
            </div>
        </div>
    );
};
