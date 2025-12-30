/**
 * AI Chat Panel - BioCopilot AI Assistant
 */

import React, { useState, useRef, useEffect } from 'react';
import './AIChatPanel.css';
import { renderEvidenceContent } from '../utils/evidenceRenderer';
import { useI18n } from '../i18n';
import { eventBus, BioCopilotEvents } from '../stores/eventBus';
import { AIActionResponse, isRedZone } from '../types/aiSafety';

interface BaseMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface ProposalMessage extends BaseMessage {
    kind: 'proposal';
    proposal: AIActionResponse;
    status: 'pending' | 'approved' | 'rejected';
}

type Message = BaseMessage | ProposalMessage;

interface AIChatPanelProps {
    sendCommand: (cmd: string, data?: Record<string, unknown>) => Promise<void>;
    isConnected: boolean;
    lastResponse: any; // Response from useBioEngine
    activeProposal?: AIActionResponse | null;
    onResolveProposal?: (proposalId: string, accepted: boolean, context?: any) => Promise<void>;
    analysisContext?: {
        pathway?: any;
        volcanoData?: any[];
        statistics?: any;
        enrichmentResults?: any;
        data?: any;
        metadata?: any;
        filePath?: string;
        mapping?: Record<string, unknown>;
        dataType?: string;
        filters?: Record<string, unknown>;
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
    activeProposal,
    onResolveProposal,
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
    const [aiActivity, setAiActivity] = useState<{ taskName: string, currentStep?: string } | null>(null);
    const lastProposalIdRef = useRef<string | null>(null);

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

    const formatInlineValue = (value: unknown): string => {
        if (value === null || value === undefined) return t('N/A');
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        if (Array.isArray(value)) {
            if (value.length === 0) return `0 ${t('items')}`;
            const primitive = value.every(v => v === null || ['string', 'number', 'boolean'].includes(typeof v));
            if (primitive) {
                const preview = value.slice(0, 3).map(v => String(v)).join(', ');
                return value.length > 3 ? `${preview}, +${value.length - 3}` : preview;
            }
            return `${value.length} ${t('items')}`;
        }
        if (typeof value === 'object') {
            const keys = Object.keys(value as Record<string, unknown>);
            if (keys.length === 0) return t('N/A');
            const preview = keys.slice(0, 3).join(', ');
            return keys.length > 3 ? `{${preview}, ...}` : `{${preview}}`;
        }
        return String(value);
    };

    const formatObjectInline = (obj: Record<string, unknown>) => {
        const entries = Object.entries(obj);
        if (entries.length === 0) return t('N/A');
        return entries.slice(0, 4).map(([key, value]) => `${key}: ${formatInlineValue(value)}`).join('; ');
    };

    const formatGenericToolResult = (result: unknown): string => {
        if (Array.isArray(result)) {
            const items = result.map(item => {
                if (item && typeof item === 'object' && !Array.isArray(item)) {
                    return formatObjectInline(item as Record<string, unknown>);
                }
                return formatInlineValue(item);
            });
            const lines = items.map(item => `- ${item}`);
            return `**${t('Result')}** (${result.length} ${t('items')}):\n${lines.join('\n')}`;
        }
        if (result && typeof result === 'object') {
            const entries = Object.entries(result as Record<string, unknown>);
            if (entries.length === 0) {
                return `**${t('Result')}**: ${t('N/A')}`;
            }
            const lines = entries.map(([key, value]) => `- ${key}: ${formatInlineValue(value)}`);
            return `**${t('Result')}**:\n${lines.join('\n')}`;
        }
        return `**${t('Result')}**: ${formatInlineValue(result)}`;
    };

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
        if (messages.length === 0 && (!chatHistory || chatHistory.length === 0)) return;

        if (JSON.stringify(messages) !== JSON.stringify(chatHistory || [])) {
            onChatUpdate(messages);
        }
    }, [messages, chatHistory, onChatUpdate]);

    // Subscribe to AI process events for real-time visibility
    useEffect(() => {
        const subStart = eventBus.subscribe(BioCopilotEvents.AI_PROCESS_START, (payload) => {
            setAiActivity({
                taskName: payload.taskName || t('AI Thinking'),
                currentStep: payload.steps?.[0]
            });
        });

        const subUpdate = eventBus.subscribe(BioCopilotEvents.AI_PROCESS_UPDATE, (payload) => {
            setAiActivity(prev => ({
                taskName: prev?.taskName || t('AI Thinking'),
                currentStep: payload.label || (payload.steps && payload.steps[payload.stepIndex]) || prev?.currentStep
            }));
        });

        const subComplete = eventBus.subscribe(BioCopilotEvents.AI_PROCESS_COMPLETE, () => {
            setAiActivity(null);
        });

        return () => {
            eventBus.unsubscribe(BioCopilotEvents.AI_PROCESS_START, subStart);
            eventBus.unsubscribe(BioCopilotEvents.AI_PROCESS_UPDATE, subUpdate);
            eventBus.unsubscribe(BioCopilotEvents.AI_PROCESS_COMPLETE, subComplete);
        };
    }, []);

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
                            } else {
                                responseContent += `\n\n${formatGenericToolResult(result)}`;
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
                setAiActivity(null); // Ensure cleared on response
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

    useEffect(() => {
        if (!activeProposal || !activeProposal.proposal_id) return;

        // Check if we've already seen this proposal ID in our messages history to prevent duplicates
        // (especially when switching between tabs/phases)
        const isDuplicate = messages.some(msg =>
            'kind' in msg && msg.kind === 'proposal' && msg.proposal.proposal_id === activeProposal.proposal_id
        );
        if (isDuplicate) return;

        if (lastProposalIdRef.current === activeProposal.proposal_id) return;
        lastProposalIdRef.current = activeProposal.proposal_id;
        updateMessages(prev => ([
            ...prev,
            {
                role: 'assistant',
                content: activeProposal.content,
                timestamp: Date.now(),
                kind: 'proposal',
                proposal: activeProposal,
                status: 'pending'
            }
        ]));
        setIsLoading(false);
        setAiActivity(null);
    }, [activeProposal]);

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
            setAiActivity(null);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleProposalDecision = async (proposalId: string, accepted: boolean) => {
        updateMessages(prev => prev.map(msg => {
            if ('kind' in msg && msg.kind === 'proposal' && msg.proposal.proposal_id === proposalId) {
                return { ...msg, status: accepted ? 'approved' : 'rejected' };
            }
            return msg;
        }));
        try {
            if (onResolveProposal) {
                await onResolveProposal(proposalId, accepted, analysisContext);
            } else {
                await sendCommand(accepted ? 'CHAT_CONFIRM' : 'CHAT_REJECT', {
                    proposal_id: proposalId,
                    context: analysisContext || {}
                });
            }
        } catch (error) {
            console.error('[AIChatPanel] Failed to resolve proposal:', error);
            updateMessages(prev => ([
                ...prev,
                {
                    role: 'assistant',
                    content: t('Failed to resolve the proposal. Please try again.'),
                    timestamp: Date.now()
                }
            ]));
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
                    <span>{t('BioCopilot AI Assistant')}</span>
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
                        <p style={{ fontSize: '13px', opacity: 0.8 }}>{t('Try one of these focused prompts to get started:')}</p>
                        <ul className="welcome-examples">
                            {(Object.entries({
                                'enrich': t('对当前显著基因做富集分析（Reactome）'),
                                'list': t('列出所有可用通路'),
                                'explain': t('解释通路 hsa04110'),
                                'thresh': t('把 p-value 阈值改到 0.01'),
                                'export': t('导出当前结果为 CSV')
                            })).map(([key, text]) => (
                                <li key={key} onClick={() => {
                                    setInput(text);
                                    // Small delay to allow state update if we wanted to auto-send
                                    // but usually just pre-filling is better.
                                    // For best UX, let's just pre-fill.
                                }}>{text}</li>
                            ))}
                        </ul>
                    </div>
                )}


                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role}`}>
                        <div className="message-avatar">
                            {msg.role === 'user' ? '👤' : '🤖'}
                        </div>
                        <div className="message-content">
                            {'kind' in msg && msg.kind === 'proposal' ? (
                                <div className="message-text proposal">
                                    <div className="proposal-header">
                                        <span className="proposal-icon">{isRedZone(msg.proposal) ? '🚫' : '⚠️'}</span>
                                        <span className="proposal-title">
                                            {isRedZone(msg.proposal) ? t('Action Blocked') : t('Action Requires Approval')}
                                        </span>
                                        <span className={`proposal-badge ${msg.proposal.safety_level?.toLowerCase() || 'yellow'}`}>
                                            {msg.proposal.safety_level || 'YELLOW'}
                                        </span>
                                    </div>
                                    <div className="proposal-body">{formatAIContent(msg.content)}</div>
                                    {msg.proposal.proposal_reason && (
                                        <div className="proposal-reason">
                                            <strong>{t('Reason')}:</strong> {msg.proposal.proposal_reason}
                                        </div>
                                    )}
                                    {msg.proposal.tool_name && (
                                        <div className="proposal-details">
                                            <div className="proposal-row">
                                                <span className="proposal-label">{t('Tool')}:</span>
                                                <code className="proposal-value">{msg.proposal.tool_name}</code>
                                            </div>
                                            {msg.proposal.tool_args && Object.keys(msg.proposal.tool_args).length > 0 && (
                                                <div className="proposal-row">
                                                    <span className="proposal-label">{t('Parameters')}:</span>
                                                    <pre className="proposal-json">
                                                        {JSON.stringify(msg.proposal.tool_args, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="proposal-actions">
                                        <button
                                            className="proposal-btn reject"
                                            onClick={() => handleProposalDecision(msg.proposal.proposal_id!, false)}
                                            disabled={msg.status !== 'pending'}
                                        >
                                            {msg.status === 'rejected' ? t('Rejected') : t('Reject')}
                                        </button>
                                        {!isRedZone(msg.proposal) && (
                                            <button
                                                className="proposal-btn approve"
                                                onClick={() => handleProposalDecision(msg.proposal.proposal_id!, true)}
                                                disabled={msg.status !== 'pending'}
                                            >
                                                {msg.status === 'approved' ? t('Approved') : t('Approve')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="message-text">
                                    {msg.role === 'assistant' ? formatAIContent(msg.content) : msg.content}
                                </div>
                            )}
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
                    <div className="message assistant loading">
                        <div className="message-avatar">🤖</div>
                        <div className="ai-thinking-box">
                            <div className="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                            {aiActivity && (
                                <div className="ai-activity-info">
                                    <div className="ai-task-name">{aiActivity.taskName}</div>
                                    {aiActivity.currentStep && (
                                        <div className="ai-current-step">🔄 {aiActivity.currentStep}</div>
                                    )}
                                </div>
                            )}
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
