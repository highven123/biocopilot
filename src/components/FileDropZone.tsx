import React, { useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useDropzone } from 'react-dropzone';

interface FileDropZoneProps {
    onLoadSuccess: (data: {
        filePath: string;
        columns: string[];
        preview: string[][];
        suggestedMapping: { gene?: string; value?: string };
        dataType: 'gene' | 'protein' | 'cell';
    }) => void;
    addLog: (message: string) => void;
}

import { listen } from '@tauri-apps/api/event';

export const FileDropZone: React.FC<FileDropZoneProps> = ({ onLoadSuccess, addLog }) => {
    const [loading, setLoading] = React.useState(false);
    const [dataType, setDataType] = React.useState<'gene' | 'protein' | 'cell' | null>(null); // Null means no selection yet
    const selectedPathRef = useRef<string | null>(null);

    const handleFile = async (filePath: string) => {
        if (!dataType) return; // Should not happen

        setLoading(true);
        addLog(`📂 Loading file: ${filePath}`);

        try {
            const response = await new Promise<any>(async (resolve, reject) => {
                let unlistenOutput: (() => void) | undefined;
                let unlistenError: (() => void) | undefined;
                let timeoutId: any;

                const cleanup = () => {
                    if (unlistenOutput) unlistenOutput();
                    if (unlistenError) unlistenError();
                    clearTimeout(timeoutId);
                };

                // Listen for sidecar output
                unlistenOutput = await listen('sidecar-output', (event: any) => {
                    try {
                        const data = JSON.parse(event.payload);
                        if (data.status === 'ok' || data.status === 'error') {
                            cleanup();
                            resolve(data);
                        }
                    } catch (e) {
                        // Ignore non-JSON output
                    }
                });

                // Listen for sidecar logs
                unlistenError = await listen('sidecar-error', (event: any) => {
                    console.warn("Sidecar stderr:", event.payload);
                });

                // Timeout after 60 seconds
                timeoutId = setTimeout(() => {
                    cleanup();
                    reject(new Error("Timeout waiting for sidecar response"));
                }, 60000);

                // Send command
                invoke('send_command', {
                    payload: JSON.stringify({ cmd: 'LOAD', payload: { path: filePath } })
                }).catch(e => {
                    cleanup();
                    reject(e);
                });
            });

            if (response.status === 'ok') {
                addLog('✅ File loaded successfully');
                if (response.is_transposed) {
                    addLog('🔄 Wide matrix detected and transposed');
                }

                onLoadSuccess({
                    filePath: response.path || filePath,
                    columns: response.columns || [],
                    preview: response.preview || [],
                    suggestedMapping: response.suggested_mapping || {},
                    dataType: dataType
                });
            } else {
                addLog(`❌ Error: ${response.message}`);
            }
        } catch (error: any) {
            addLog(`❌ Error loading file: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };

    const onDrop = async (files: File[]) => {
        if (files.length === 0) return;
        const file = files[0];
        // @ts-ignore - Tauri file path access
        const filePath = file.path || (await file.text());
        selectedPathRef.current = filePath;
        await handleFile(filePath);
    };

    const handleBrowseClick = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        try {
            const selected = await open({
                multiple: false,
                filters: [{
                    name: 'Data Files',
                    extensions: ['csv', 'xlsx', 'xls', 'txt', 'tsv']
                }]
            });

            if (selected && typeof selected === 'string') {
                selectedPathRef.current = selected;
                await handleFile(selected);
            }
        } catch (error) {
            console.error("Failed to open dialog:", error);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'text/plain': ['.txt', '.tsv']
        },
        multiple: false,
        noClick: true,
        disabled: !dataType // Disable drop if no type selected (though UI hides it)
    });

    const onContainerClick = (e: React.MouseEvent) => {
        if (isDragActive) return;
        handleBrowseClick(e);
    };

    // Phase 1: Data Type Selection
    if (!dataType) {
        return (
            <div className="dtype-selection-container" style={{
                height: '400px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '24px'
            }}>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Select Data Type
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Choose the type of biological data you are analyzing to ensure correct mapping.
                </p>

                <div className="dtype-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                    width: '100%',
                    maxWidth: '800px'
                }}>
                    <button onClick={() => setDataType('gene')} style={{
                        padding: '32px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.2s'
                    }} className="dtype-card">
                        <span style={{ fontSize: '32px' }}>🧬</span>
                        <span style={{ fontWeight: 600 }}>Transcriptomics</span>
                    </button>

                    <button onClick={() => setDataType('protein')} style={{
                        padding: '32px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.2s'
                    }} className="dtype-card">
                        <span style={{ fontSize: '32px' }}>🧪</span>
                        <span style={{ fontWeight: 600 }}>Proteomics</span>
                    </button>

                    <button onClick={() => setDataType('cell')} style={{
                        padding: '32px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.2s'
                    }} className="dtype-card">
                        <span style={{ fontSize: '32px' }}>🩸</span>
                        <span style={{ fontWeight: 600 }}>Flow Cytometry</span>
                    </button>
                </div>
            </div>
        );
    }

    // Phase 2: File Upload (Specific to selected Type)
    const typeLabels = {
        'gene': { icon: '🧬', text: 'Transcriptomics' },
        'protein': { icon: '🧪', text: 'Proteomics' },
        'cell': { icon: '🩸', text: 'Flow Cytometry' }
    };
    const currentLabel = typeLabels[dataType];

    return (
        <div className="file-drop-zone-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Back Button */}
            <button
                onClick={(e) => { e.stopPropagation(); setDataType(null); }}
                style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    padding: '8px 16px',
                    background: 'none',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    zIndex: 10
                }}
            >
                ← Change Data Type
            </button>

            <div
                {...getRootProps()}
                onClick={onContainerClick}
                style={{
                    height: '400px',
                    border: '2px dashed rgba(255, 255, 255, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDragActive ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    borderColor: isDragActive ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.2)',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                }}
            >
                <input {...getInputProps()} />

                {loading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <div className="spinner" style={{ marginBottom: '16px' }}>⏳</div>
                        <p>Parsing dataset...</p>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            marginBottom: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '48px', opacity: 0.8 }}>{currentLabel.icon}</span>
                            <span style={{
                                fontSize: '14px',
                                color: 'var(--accent-primary)',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}>
                                {currentLabel.text} Mode
                            </span>
                        </div>

                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>
                            Drag & Drop your {currentLabel.text} File
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                            Supports .xlsx, .csv
                        </p>
                        <button style={{
                            pointerEvents: 'none',
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            border: 'none',
                            padding: '12px 32px',
                            fontSize: '15px',
                            fontWeight: 600,
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            marginTop: '12px'
                        }}>
                            Choose File
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
