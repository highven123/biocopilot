/**
 * AI Safety Protocol Types
 * Defines the strict protocol for AI action responses and safety levels.
 */

/** Safety classification levels */
export type SafetyLevel = 'GREEN' | 'YELLOW' | 'RED';

/**
 * AI Action Response from backend.
 * 
 * - CHAT: Pure text response, no action taken
 * - EXECUTE: Action was auto-executed (Green Zone only)
 * - PROPOSAL: Action proposed, awaiting user confirmation (Yellow/Red Zone)
 */
export interface AIActionResponse {
    type: 'CHAT' | 'EXECUTE' | 'PROPOSAL';
    content: string;

    // Only for EXECUTE/PROPOSAL
    tool_name?: string;
    tool_args?: Record<string, any>;
    tool_result?: any;

    // Only for PROPOSAL
    proposal_id?: string;
    proposal_reason?: string;
    safety_level?: SafetyLevel;
}

/**
 * Check if a response requires user confirmation
 */
export function isProposal(response: AIActionResponse): boolean {
    return response.type === 'PROPOSAL' && !!response.proposal_id;
}

/**
 * Check if a proposal is in the Red Zone (blocked, cannot confirm)
 */
export function isRedZone(response: AIActionResponse): boolean {
    return response.safety_level === 'RED';
}

/**
 * Check if a proposal is in the Yellow Zone (requires confirmation)
 */
export function isYellowZone(response: AIActionResponse): boolean {
    return response.safety_level === 'YELLOW' ||
        (response.type === 'PROPOSAL' && !response.safety_level);
}
