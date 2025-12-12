import React from 'react';
import './TemplatePicker.css';

interface TemplatePickerProps {
  onSelect: (pathwayId: string) => void;
  disabled?: boolean;
  dataType?: 'gene' | 'protein' | 'cell';
}

interface PathwayTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  types: ('gene' | 'protein' | 'cell')[];
}

const PATHWAY_TEMPLATES: PathwayTemplate[] = [
  { id: 'hsa04210', name: 'Apoptosis', description: 'Programmed cell death pathway', icon: '💀', types: ['gene', 'protein'] },
  { id: 'hsa04115', name: 'p53 signaling pathway', description: 'Tumor suppressor p53 regulation', icon: '🛡️', types: ['gene', 'protein'] },
  { id: 'hsa04110', name: 'Cell cycle', description: 'Mitosis and cell division control', icon: '🔄', types: ['gene', 'protein'] },
  { id: 'hsa04010', name: 'MAPK signaling pathway', description: 'Mitogen-activated protein kinase cascade', icon: '📶', types: ['gene', 'protein'] },
  { id: 'hsa04151', name: 'PI3K-Akt signaling', description: 'Cell survival and growth regulation', icon: '⚡', types: ['gene', 'protein'] },
  { id: 'hsa05010', name: 'Alzheimer disease', description: 'Neurodegenerative disease pathology', icon: '🧠', types: ['gene'] },
  { id: 'hsa04064', name: 'NF-kappa B signaling', description: 'Inflammation and immunity control', icon: '🔥', types: ['gene', 'protein'] },
  { id: 'hsa04630', name: 'JAK-STAT signaling', description: 'Cytokine receptor signaling', icon: '📡', types: ['gene', 'protein'] },
  // New Cell Lineage Maps
  { id: 'hsa04640', name: 'Hematopoietic Cell Lineage', description: 'Blood cell differentiation tree', icon: 'cell', types: ['cell'] },
  { id: 'hsa04658', name: 'Th1/Th2 Differentiation', description: 'T cell subset polarization', icon: 'cell', types: ['cell'] },
  { id: 'hsa04659', name: 'Th17 Differentiation', description: 'Th17 and Treg development', icon: 'cell', types: ['cell'] },
  { id: 'hsa00010', name: 'Glycolysis / Gluconeogenesis', description: 'Glucose metabolism and ATP generation', icon: '🍞', types: ['gene', 'protein'] },
];

export const TemplatePicker: React.FC<TemplatePickerProps> = ({ onSelect, disabled = false, dataType = 'gene' }) => {
  const [selectedId, setSelectedId] = React.useState<string>('');

  const handleSelect = (pathwayId: string) => {
    setSelectedId(pathwayId);
    onSelect(pathwayId);
  };

  return (
    <div className="template-picker">
      <h3>Select pathway template</h3>
      <p className="template-picker-hint">
        Choose a KEGG pathway layout for visualization; templates are filtered by data type.
      </p>

      <div className="template-grid">
        {PATHWAY_TEMPLATES.filter(t => t.types.includes(dataType)).map((template) => (
          <div
            key={template.id}
            className={`template-card ${selectedId === template.id ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && handleSelect(template.id)}
          >
            <div className="template-info">
              <div className="template-title-row">
                <h4 className="template-name">{template.name}</h4>
                <span className="template-id-pill">{template.id}</span>
              </div>
              <p className="template-description">{template.description}</p>
              <div className="template-tags">
                {template.types.map((t) => (
                  <span key={t} className="template-tag">
                    {t === 'gene' && 'Gene'}
                    {t === 'protein' && 'Protein'}
                    {t === 'cell' && 'Cell'}
                  </span>
                ))}
              </div>
            </div>
            {selectedId === template.id && (
              <div className="template-selected-badge">✓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplatePicker;
