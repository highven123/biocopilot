
import React, { useState, useMemo } from 'react';
import { useI18n } from '../i18n';
import { VolcanoPoint } from './VolcanoPlot';
import { EntityMeta } from '../entityTypes';
import './DataTable.css';

interface DataTableProps {
    data: VolcanoPoint[];
    onRowClick?: (gene: string) => void;
    labels: EntityMeta;
}

type SortField = 'gene' | 'x' | 'pvalue' | 'status';
type SortOrder = 'asc' | 'desc';

export const DataTable: React.FC<DataTableProps> = ({ data, onRowClick, labels }) => {
    const { t } = useI18n();
    const [sortField, setSortField] = useState<SortField>('pvalue');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [filterText, setFilterText] = useState('');

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc'); // Default to asc for new field? Usually P-val asc is good (smallest first)
        }
    };

    const sortedData = useMemo(() => {
        let processed = [...data];

        // Filter
        if (filterText) {
            const lowerInfo = filterText.toLowerCase();
            processed = processed.filter(d =>
                d.gene.toLowerCase().includes(lowerInfo)
            );
        }

        // Sort
        processed.sort((a, b) => {
            let valA: any = a[sortField];
            let valB: any = b[sortField];

            // Handle special cases if needed
            if (sortField === 'x') { // LogFC
                // Sort by absolute value? Or actual value? 
                // Standard is actual value.
                valA = a.x;
                valB = b.x;
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return processed;
    }, [data, sortField, sortOrder, filterText]);

    const pluralLabel = labels.labelPlural.toLowerCase();

    return (
        <div className="data-table-container">
            <div className="data-table-header">
                <input
                    type="text"
                    placeholder={t('Search {label}...', { label: pluralLabel })}
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="dt-search"
                />
                <div className="dt-stats">
                    {t('{count} {label}', { count: sortedData.length, label: pluralLabel })}
                </div>
            </div>

            <div className="data-table-scroll">
                <table className="dt-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('gene')} className={sortField === 'gene' ? 'active' : ''}>
                                {labels.labelSingular} {sortField === 'gene' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => handleSort('x')} className={sortField === 'x' ? 'active' : ''}>
                                {t('LogFC')} {sortField === 'x' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => handleSort('pvalue')} className={sortField === 'pvalue' ? 'active' : ''}>
                                {t('P-value')} {sortField === 'pvalue' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => handleSort('status')} className={sortField === 'status' ? 'active' : ''}>
                                {t('Status')} {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.slice(0, 100).map((row) => (
                            <tr
                                key={row.gene}
                                onClick={() => onRowClick?.(row.gene)}
                                className={`status-${row.status.toLowerCase()}`}
                            >
                                <td className="dt-cell-gene">{row.gene}</td>
                                <td className="dt-cell-num">{row.x.toFixed(3)}</td>
                                <td className="dt-cell-num">{row.pvalue.toExponential(2)}</td>
                                <td className="dt-cell-status">
                                    <span className={`badge ${row.status.toLowerCase()}`}>
                                        {row.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {sortedData.length > 100 && (
                            <tr>
                                <td colSpan={4} className="dt-more-row">
                                    {t('... and {count} more', { count: sortedData.length - 100 })}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
