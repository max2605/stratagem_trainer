# Catalog and language data

Snapshot: **2026-10-12**, checked against publicly available sources on that date.
The catalog contains **25 released Warbonds**, each with a separate JSON file,
plus a base-game/free-update pack and a mission-practice pack. There are **114
unique practice entries**: 67 base/free entries, 18 mission entries and 29
Warbond entries. The 29 Warbond entries belong to 14 Warbonds. The other 11
Warbonds contain no new stratagem call-in sequences and intentionally have an
empty `stratagems` array.

## Provenance

- [PlayStation's official Helldivers 2 update page](https://www.playstation.com/en-us/games/helldivers-2/latest-news-and-updates/) and Arrowhead-authored PlayStation Blog announcements establish Warbond releases and item associations. Each pack retains its relevant announcement URL in `source`.
- [The Helldivers Wiki Warbond list](https://helldivers.wiki.gg/wiki/Warbonds) establishes the complete 25-pack list, including the official in-universe names of the three Legendary Warbonds.
- [The Helldivers Wiki stratagem tables](https://helldivers.wiki.gg/wiki/Stratagems), [support-weapon table](https://helldivers.wiki.gg/wiki/Template%3AStratagem_Table), and individual linked item pages establish directional codes, free-unlock versus Warbond ownership, and mission variants. The community wiki is not an official Arrowhead source.
- [k33bs's MIT-licensed sequence database](https://github.com/k33bs/Helldivers-2-Stratagem-JSON-Generator) supplied a second, machine-readable comparison source. It is pinned at commit `eda04ed2f6a7a97f7253c21454f2926cf7c26c3f`; only factual names and direction sequences were used. The generator does not download or execute its program code and does not use its artwork.

The Arrowhead/PlayStation announcements generally do not publish directional
codes in text. Code verification therefore uses the community wiki and the
pinned community sequence list. This is not a claim that the trainer was
validated against a running copy of the game.

## Important association and variant checks

- Chemical Agents was the first Warbond adding stratagem variants. The earlier packs contain primary/secondary weapons, equipment or boosters, which do not receive invented call-in codes.
- Righteous Revenants is the Helldivers 2 x Killzone Legendary Warbond. StA-X3 W.A.S.P. Launcher is a free requisition unlock, and belongs in the base/free pack. It is not a reward in that Warbond.
- Siege Breakers contains Breaching Hammer, Leveller and Belt-Fed Grenade Launcher. TD-220 Bastion MK XVI belongs in the base/free pack. Its free release alongside the Warbond does not make it a Warbond reward.
- Exo Experts contains Bullet Storm, Lumberer and Breakthrough. Both new Exosuits have their own verified codes.
- Castellan's Creed is the Warhammer 40,000 Legendary Warbond. Its Meltagun is included. The official site's abbreviated weapon overview omits this support weapon; the [individual Meltagun entry](https://helldivers.wiki.gg/wiki/40-K_Meltagun) and stratagem table both identify it as the page 3 reward and agree on its code.
- Ironclad Democracy has no new stratagem code. [The official announcement](https://blog.playstation.com/2026/09/15/helldivers-2-ironclad-democracy-warbond-launches-sept-22/) identifies Surplus EAT Allocation as a booster supplying two uses of the existing EAT-17. TD-110 Maelstrom is a separate Armored Eagle campaign reward in the base/free pack.
- Redacted Regiment's actual release was January 22, 2026, following the delay from the originally announced January 20. Its C4 Pack code is included.
- [SSSD Delivery](https://helldivers.wiki.gg/wiki/SSSD_Delivery) has a five-input Super Earth variant and a seven-input Automaton-objective variant. Both are separate mission-practice entries.
- [Portable Hellbomb](https://helldivers.wiki.gg/wiki/B-100_Portable_Hellbomb) ends with `up` for the Warbond call-in and `down` for the free Spore Lung mission call-in. The mission variant is separate from the Warbond entry.
- GL-52 De-Escalator uses the current code starting with `down`, following the correction recorded by the wiki. The earlier erroneous initial direction is not retained.

## Scope and limitations

The catalog includes all released Warbonds identified by the sources above,
including packs without trainable codes. It does not promise an exhaustive
record of every past temporary mission permit or changing terminal puzzle.
Campaign rewards can have participation restrictions in the game; their
inclusion here means the code can be practiced, not that every player owns
the permit. M-103 Supply FRV, Eagle Gas Airstrike and TD-110 Maelstrom are
documented campaign rewards, not Warbond rewards.

Orbital Illumination Flare is unavailable and has conflicting community codes.
Dark Fluid Vessel belongs to a historical limited mission. M-104 Incinerator
FRV was a historical operational variation and is currently unavailable after
the Census Thunder outcome. These three do not appear in active practice
packs, and the manifest records why. No unverified future Warbond or guessed
sequence is included.

Game names are retained in canonical English to make searching and comparing
sources reliable. UI text is separately localized in `de.json` and `en.json`.
The files are dictionaries of string keys and string values. New languages
must supply the same keys as English; English can serve as the fallback for a
missing key. Imported custom packs may use user-selected names in any language.

## Maintaining the catalog

`shared/application/configs/index.json` is a manifest, not a practice pack.
Only its `packs` filenames are loaded by `shared/sourcecode/data/catalog.ts`.
JSON schema files, if added, must not be listed in the manifest. All pack and
entry IDs must be unique and stable. Direction values use only `up`, `down`,
`left`, and `right`, independently of keyboard bindings or translated labels.

The checked-in packs run offline. To reproduce this snapshot on Windows,
run `shared/sourcecode/data/generate-catalog.ps1` from the repository root.
The generator reads only the pinned factual source JSON over HTTPS and writes
the pack files and manifest. It checks expected Warbond totals, valid codes
and duplicate entry IDs. After a game update, change pack associations and
individual codes only with a documented source, update the snapshot date,
and run the repository's validation tests. Keep explicit mission variants.

MIT upstream attribution: Copyright (c) 2025 Keebs. Permission is hereby
granted, free of charge, to any person obtaining a copy of this software and
associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions: The above copyright notice and this
permission notice shall be included in all copies or substantial portions of
the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
