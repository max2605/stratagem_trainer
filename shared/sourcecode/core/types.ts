export const DIRECTIONS = ['up', 'down', 'left', 'right'] as const;

export type Direction = (typeof DIRECTIONS)[number];
export type PackKind = 'base' | 'warbond' | 'custom';

export interface Stratagem {
  id: string;
  name: string;
  sequence: Direction[];
  category?: string;
  tags?: string[];
  source?: string[];
}

export interface Pack {
  schemaVersion: 1;
  id: string;
  name: string;
  description?: string;
  kind: PackKind;
  stratagems: Stratagem[];
  source?: string[];
  verifiedAt?: string;
  releaseDate?: string;
  notes?: string;
}

export interface TrainingItem extends Stratagem {
  qualifiedId: string;
  packId: string;
  packName: string;
}

export function isDirection(value: unknown): value is Direction {
  return typeof value === 'string' && DIRECTIONS.includes(value as Direction);
}
