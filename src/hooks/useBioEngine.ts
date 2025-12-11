/**
 * BioViz Local - Python Sidecar Communication Hook
 * 
 * This hook provides a clean API for communicating with the Python backend.
 * It handles event listening, command sending, and automatic cleanup.
 */

import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

/** Response structure from the Python sidecar */
export interface SidecarResponse {
    status: string;
    message?: string;
    data?: unknown;
    error?: string;
}

/** Hook return type */
export interface UseBioEngineReturn {
    /** Whether the sidecar is connected and running */
    isConnected: boolean;
    /** Whether a command is currently being processed */
    isLoading: boolean;
    /** Last response received from the sidecar */
    lastResponse: SidecarResponse | null;
    /** Last error message */
    error: string | null;
    /** Send a command to the Python sidecar */
    sendCommand: (cmd: string, data?: Record<string, unknown>) => Promise<void>;
    /** Send a heartbeat to check connection */
    checkHealth: () => Promise<boolean>;
    /** Restart the sidecar process */
    restartSidecar: () => Promise<void>;
}

/**
 * Custom hook for communicating with the BioViz Python engine.
 * 
 * @example
 * ```tsx
 * const { isConnected, sendCommand, lastResponse } = useBioEngine();
 * 
 * const handleLoad = async () => {
 *   await sendCommand('load', { path: '/path/to/file.csv' });
 * };
 * ```
 */
export function useBioEngine(): UseBioEngineReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [lastResponse, setLastResponse] = useState<SidecarResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Set up event listeners
    useEffect(() => {
        let unlistenOutput: UnlistenFn | undefined;
        let unlistenError: UnlistenFn | undefined;
        let unlistenTerminated: UnlistenFn | undefined;

        const setupListeners = async () => {
            // Listen for stdout from sidecar
            unlistenOutput = await listen<string>('sidecar-output', (event) => {
                const payload = event.payload ?? '';

                // 有些情况下一条 stdout 事件里会包含多行 JSON，
                // 这里按换行拆开逐条解析，避免整块解析失败。
                const lines = payload.split(/\r?\n/);

                for (const rawLine of lines) {
                    const line = rawLine.trim();
                    if (!line) continue;

                    try {
                        const response = JSON.parse(line) as SidecarResponse;
                        console.log('[BioViz] Sidecar JSON:', response);

                        setLastResponse(response);
                        setError(null);

                        // Check for ready status
                        if (response.status === 'ready') {
                            setIsConnected(true);
                            console.log('[BioViz] Engine connected:', response.message);
                        }

                        // Check for alive status (heartbeat response)
                        if (response.status === 'alive') {
                            setIsConnected(true);
                        }

                        // Check for errors
                        if (response.status === 'error') {
                            setError(response.message || 'Unknown error');
                        }
                    } catch (e) {
                        // 只对当前行记录错误，不影响后续行解析
                        console.error('[BioViz] Failed to parse response line:', e, line.slice(0, 200));
                    }
                }
            });

            // Listen for stderr from sidecar
            unlistenError = await listen<string>('sidecar-error', (event) => {
                const payload = event.payload ?? '';
                // Treat debug/info lines as console logs, not fatal errors
                if (typeof payload === 'string' && (payload.startsWith('[DEBUG]') || payload.startsWith('[BioEngine]'))) {
                    console.log('[BioViz] Sidecar stderr:', payload);
                    return;
                }
                console.error('[BioViz] Sidecar error:', payload);
                setError(typeof payload === 'string' ? payload : String(payload));
            });

            // Listen for termination
            unlistenTerminated = await listen<string>('sidecar-terminated', (event) => {
                console.warn('[BioViz] Sidecar terminated:', event.payload);
                setIsConnected(false);
                setError(`Sidecar terminated: ${event.payload}`);
            });

            // Check initial connection status
            try {
                const running = await invoke<boolean>('is_sidecar_running');
                setIsConnected(running);
            } catch (e) {
                console.error('[BioViz] Failed to check sidecar status:', e);
            }
        };

        setupListeners();

        // Cleanup on unmount
        return () => {
            unlistenOutput?.();
            unlistenError?.();
            unlistenTerminated?.();
        };
    }, []);

    /**
     * Send a command to the Python sidecar
     */
    const sendCommand = useCallback(async (cmd: string, data?: Record<string, unknown>) => {
        setIsLoading(true);
        setError(null);

        try {
            const payload = JSON.stringify({
                cmd,
                payload: data || {},
            });

            await invoke('send_command', { payload });
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            setError(errorMsg);
            console.error('[BioViz] Failed to send command:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Check sidecar health via heartbeat
     */
    const checkHealth = useCallback(async (): Promise<boolean> => {
        try {
            await invoke('heartbeat');
            return true;
        } catch (e) {
            console.error('[BioViz] Heartbeat failed:', e);
            setIsConnected(false);
            return false;
        }
    }, []);

    /**
     * Restart the sidecar process
     */
    const restartSidecar = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            await invoke('restart_sidecar');
            setIsConnected(true);
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            setError(errorMsg);
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isConnected,
        isLoading,
        lastResponse,
        error,
        sendCommand,
        checkHealth,
        restartSidecar,
    };
}

export default useBioEngine;
