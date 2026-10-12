import type { Pack } from '../core/types';
import manifest from '../../application/configs/index.json';
import de from '../../application/lang/de.json';
import en from '../../application/lang/en.json';

// The manifest defines order and distinguishes practice packs from index/schema
// JSON. Bundling is local: the trainer never downloads its default catalog.
const packModules = import.meta.glob<Pack>('../../application/configs/*.json', {
  eager: true,
  import: 'default',
});

export const builtInPacks: Pack[] = manifest.packs.map((filename) => {
  const pack = packModules[`../../application/configs/${filename}`];
  if (!pack || pack.schemaVersion !== 1 || !Array.isArray(pack.stratagems)) {
    throw new Error(`Missing built-in practice pack: ${filename}`);
  }
  return pack;
});

export const catalogVersion = manifest.catalogVersion;
export const languages: Record<string, Record<string, string>> = { de, en };
