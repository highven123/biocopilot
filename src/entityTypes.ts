export type EntityKind = 'gene' | 'protein' | 'cell' | 'other';

export interface EntityLabels {
  /** 单数形式：Gene / Protein / Cell / Marker */
  labelSingular: string;
  /** 复数形式：Genes / Proteins / Cells / Markers */
  labelPlural: string;
}

export interface EntityMeta extends EntityLabels {
  kind: EntityKind;
}

export const ENTITY_META: Record<EntityKind, EntityMeta> = {
  gene: {
    kind: 'gene',
    labelSingular: 'Gene',
    labelPlural: 'Genes',
  },
  protein: {
    kind: 'protein',
    labelSingular: 'Protein',
    labelPlural: 'Proteins',
  },
  cell: {
    kind: 'cell',
    labelSingular: 'Cell',
    labelPlural: 'Cells',
  },
  other: {
    kind: 'other',
    labelSingular: 'Marker',
    labelPlural: 'Markers',
  },
};

/**
 * 根据后端传来的 data_type / 前端 config.dataType 推断实体类型。
 * 不改动现有 IPC，只在前端做一层语义映射。
 */
export function resolveEntityKind(
  pathwayDataType?: string,
  configDataType?: string,
): EntityKind {
  const raw =
    (pathwayDataType || configDataType || '').toString().toLowerCase();

  if (raw.includes('cell') || raw.includes('flow')) return 'cell';
  if (raw.includes('protein') || raw.includes('proteomics')) return 'protein';
  if (raw.includes('gene') || raw.includes('rna')) return 'gene';

  return 'other';
}

export interface ExternalResource {
  id: string;
  label: string;
  buildUrl: (entityId: string) => string;
}

/**
 * 针对不同实体类型的外部资源入口。
 * 目前基因保留 NCBI / GeneCards，其余类型预留扩展位。
 */
export const EXTERNAL_RESOURCES: Record<EntityKind, ExternalResource[]> = {
  gene: [
    {
      id: 'ncbi',
      label: 'NCBI Gene',
      buildUrl: (g: string) =>
        `https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(g)}`,
    },
    {
      id: 'genecards',
      label: 'GeneCards',
      buildUrl: (g: string) =>
        `https://www.genecards.org/cgi-bin/carddisp.pl?gene=${encodeURIComponent(
          g,
        )}`,
    },
  ],
  protein: [
    {
      id: 'uniprot',
      label: 'UniProt',
      buildUrl: (p: string) =>
        `https://www.uniprot.org/uniprotkb?query=${encodeURIComponent(p)}`,
    },
  ],
  cell: [
    // 预留位：例如 CellMarker / PanglaoDB 等
  ],
  other: [],
};

