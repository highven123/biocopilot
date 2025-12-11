import React from 'react';
import './ColumnMapper.css';

interface ColumnMapperProps {
    columns: string[];
    preview: string[][];
    suggestedMapping: { gene?: string; value?: string };
    onMappingComplete: (mapping: { gene: string; value: string }) => void;
    addLog: (message: string) => void;
    dataType: 'gene' | 'protein' | 'cell';
}

export const ColumnMapper: React.FC<ColumnMapperProps> = ({
    columns,
    preview,
    suggestedMapping,
    onMappingComplete,
    addLog,
    dataType
}) => {
    const [geneColumn, setGeneColumn] = React.useState<string>(suggestedMapping.gene || '');
    const [valueColumn, setValueColumn] = React.useState<string>(suggestedMapping.value || '');
    const [error, setError] = React.useState<string>('');

    React.useEffect(() => {
        console.log("ColumnMapper received dataType:", dataType); // DEBUG LOG
        if (suggestedMapping.gene) setGeneColumn(suggestedMapping.gene);
        if (suggestedMapping.value) setValueColumn(suggestedMapping.value);
    }, [suggestedMapping, dataType]);

    const getLabels = () => {
        switch (dataType) {
            case 'protein':
                return {
                    entity: 'Protein ID Column',
                    value: 'Abundance / Ratio',
                    desc: 'Select which columns contain protein identifiers and quantitative values.'
                };
            case 'cell':
                return {
                    entity: 'Cell Type Column',
                    value: 'Frequency / Count / LogFC',
                    desc: 'Select which columns contain cell type names and frequency or count data.'
                };
            case 'gene':
            default:
                return {
                    entity: 'Gene Symbol Column',
                    value: 'Expression Value (LogFC)',
                    desc: 'Select which columns contain gene symbols and expression values.'
                };
        }
    };

    const labels = getLabels();

    const handleSubmit = () => {
        if (!geneColumn || !valueColumn) {
            setError('Please select both columns');
            return;
        }
        if (geneColumn === valueColumn) {
            setError('Columns must be different');
            return;
        }

        setError('');
        addLog(`✓ Mapped columns: Entity="${geneColumn}", Value="${valueColumn}"`);
        onMappingComplete({ gene: geneColumn, value: valueColumn });
    };

    return (
        <div className="column-mapper">
            <h2>📋 Map Your Data Columns</h2>
            <p className="mapper-subtitle">
                {labels.desc}
            </p>

            {error && <div className="error-message">{error}</div>}

            <div className="column-selectors">
                <div className="selector-group">
                    <label>
                        <span className="label-icon">🧬</span>
                        {labels.entity}
                    </label>
                    <select
                        value={geneColumn}
                        onChange={(e) => setGeneColumn(e.target.value)}
                        className="column-select"
                    >
                        <option value="">-- Select {labels.entity} --</option>
                        {columns.map((col) => (
                            <option key={col} value={col}>
                                {col}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="selector-group">
                    <label>
                        <span className="label-icon">📈</span>
                        {labels.value}
                    </label>
                    <select
                        value={valueColumn}
                        onChange={(e) => setValueColumn(e.target.value)}
                        className="column-select"
                    >
                        <option value="">-- Select {labels.value} --</option>
                        {columns.map((col) => (
                            <option key={col} value={col}>
                                {col}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {preview.length > 0 && (
                <div className="data-preview">
                    <h3>Data Preview</h3>
                    <div className="preview-table-container">
                        <table className="preview-table">
                            <thead>
                                <tr>
                                    {columns.map((col) => (
                                        <th key={col} className={
                                            col === geneColumn ? 'highlight-gene' :
                                                col === valueColumn ? 'highlight-value' : ''
                                        }>
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.slice(0, 5).map((row, i) => (
                                    <tr key={i}>
                                        {row.map((cell, j) => (
                                            <td key={j} className={
                                                columns[j] === geneColumn ? 'highlight-gene' :
                                                    columns[j] === valueColumn ? 'highlight-value' : ''
                                            }>
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <button
                onClick={handleSubmit}
                className="continue-btn"
                disabled={!geneColumn || !valueColumn}
            >
                Continue to Pathway Selection →
            </button>
        </div>
    );
};
