export type EntityKind = 'gene' | 'protein' | 'cell' | 'other';

export interface EntityLabels {
  /** Singular form: Gene / Protein / Cell / Marker */
  labelSingular: string;
  /** Plural form: Genes / Proteins / Cells / Markers */
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
 * Infer entity type based on backend data_type / frontend config.dataType.
 * Does not modify existing IPC, only adds semantic mapping on frontend.
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
 * External resource links for different entity types.
 * Currently Gene uses NCBI / GeneCards, others reserved for future extension.
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
    // Reserved: e.g., CellMarker / PanglaoDB
  ],
  other: [],
};

