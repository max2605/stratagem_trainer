$ErrorActionPreference = 'Stop'

# Reproduce the checked-in factual catalog. No remote code is executed.
# The pinned community data is MIT licensed; factual call-in codes were checked
# against the linked Helldivers Wiki tables and individual items on 2026-10-12.
$taskRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$taskConfigDir = Join-Path $taskRoot 'application/configs'
$taskLangDir = Join-Path $taskRoot 'application/lang'
[System.IO.Directory]::CreateDirectory($taskConfigDir) | Out-Null
[System.IO.Directory]::CreateDirectory($taskLangDir) | Out-Null
$taskEncoding = [System.Text.UTF8Encoding]::new($false)
$taskCommit = 'eda04ed2f6a7a97f7253c21454f2926cf7c26c3f'
$taskSourceUrl = "https://raw.githubusercontent.com/k33bs/Helldivers-2-Stratagem-JSON-Generator/$taskCommit/sequences.json"
$taskSequenceSource = Invoke-RestMethod $taskSourceUrl
$taskDirections = @{ W = 'up'; S = 'down'; A = 'left'; D = 'right' }
$taskWiki = 'https://helldivers.wiki.gg/wiki/'
$taskPsb = 'https://blog.playstation.com/'

function Write-CatalogJson($File, $Value) {
  [System.IO.File]::WriteAllText($File, ($Value | ConvertTo-Json -Depth 20) + "`n", $taskEncoding)
}

function Get-CatalogId([string]$Name) {
  (($Name.ToLowerInvariant() -replace '[^a-z0-9]+', '-') -replace '^-|-$', '')
}

function New-CatalogEntry([string]$SourceName) {
  $taskName = $SourceName
  switch ($SourceName) {
    'Jump Pack' { $taskName = 'LIFT-850 Jump Pack' }
    'AX/LAS-5 Guard Dog Rover' { $taskName = 'AX/LAS-5 Rover' }
    'AX/MLS-4X Rocket Sentry' { $taskName = 'A/MLS-4X Rocket Sentry' }
    'AX/TX-13 Guard Dog Dog Breath' { $taskName = 'AX/TX-13 Dog Breath' }
    'AX/ARC-3 Guard Dog K-9' { $taskName = 'AX/ARC-3 K-9' }
    'AX/FLAM-75 Guard Dog Hot Dog' { $taskName = 'AX/FLAM-75 Hot Dog' }
    'B-MD C4 Pack' { $taskName = 'B/MD C4 Pack' }
    'Eagle Gas Strike' { $taskName = 'Eagle Gas Airstrike' }
    'Hellbomb' { $taskName = 'NUX-223 Hellbomb' }
  }
  $taskSequence = @($taskSequenceSource.$SourceName | ForEach-Object { $taskDirections[$_] })
  if ($taskSequence.Count -lt 3 -or @($taskSequence | Where-Object { $_ -notin @('up','down','left','right') }).Count) {
    throw "Missing or invalid sequence for $SourceName"
  }
  $taskCategory = 'supply'
  if ($taskName -match '^(Orbital |Eagle )') { $taskCategory = 'offensive' }
  if ($taskName -match '^(A/|E/|MD-|FX-)') { $taskCategory = 'defensive' }
  if ($taskName -match '^(Reinforce$|SOS Beacon$|Resupply$|Eagle Rearm$)') { $taskCategory = 'common' }
  [ordered]@{
    id = Get-CatalogId $taskName
    name = $taskName
    sequence = $taskSequence
    category = $taskCategory
    source = @(($taskWiki + [uri]::EscapeDataString($taskName.Replace(' ', '_'))), $taskSourceUrl)
  }
}

$taskDefinitions = @(
  @{ name='Helldivers Mobilize!'; date='2024-02-08'; tier='standard'; url='https://helldivers.wiki.gg/wiki/Helldivers_Mobilize_Standard_Warbond'; items=@() },
  @{ name='Steeled Veterans'; date='2024-02-08'; tier='premium'; url=$taskPsb+'2023/09/14/helldivers-2-launches-february-8-2024/'; items=@() },
  @{ name='Cutting Edge'; date='2024-03-14'; tier='premium'; url=$taskPsb+'2024/03/07/helldivers-2-new-warbond-launches-march-14-first-look-at-new-weapons-armor-and-more/'; items=@() },
  @{ name='Democratic Detonation'; date='2024-04-11'; tier='premium'; url=$taskPsb+'2024/04/04/helldivers-2-gets-an-explosive-new-warbond-on-april-11/'; items=@() },
  @{ name='Polar Patriots'; date='2024-05-09'; tier='premium'; url=$taskPsb+'2024/05/02/new-helldivers-2-warbond-brings-trap-laying-weaponry-arctic-themed-armor-and-more-may-9/'; items=@() },
  @{ name='Viper Commandos'; date='2024-06-13'; tier='premium'; url=$taskPsb+'2024/06/06/helldivers-ii-enlists-the-viper-commandos-warbond-on-june-13/'; items=@() },
  @{ name="Freedom's Flame"; date='2024-08-08'; tier='premium'; url=$taskPsb+'2024/07/30/new-helldivers-2-freedoms-flame-warbond-burns-bright-on-august-8/'; items=@() },
  @{ name='Chemical Agents'; date='2024-09-19'; tier='premium'; url=$taskPsb+'2024/09/12/helldivers-2-the-chemical-agents-warbond-launches-sept-19/'; items=@('TX-41 Sterilizer','AX/TX-13 Guard Dog Dog Breath') },
  @{ name='Truth Enforcers'; date='2024-10-31'; tier='premium'; url=$taskPsb+'2024/10/24/helldivers-2-truth-enforcers-warbond-launches-oct-31/'; items=@() },
  @{ name='Urban Legends'; date='2024-12-13'; tier='premium'; url=$taskPsb+'2024/12/13/helldivers-2-urban-legends-warbond-drops-today/'; items=@('SH-51 Directional Shield','A/FLAM-40 Flame Sentry','E/AT-12 Anti-Tank Emplacement') },
  @{ name='Servants of Freedom'; date='2025-02-06'; tier='premium'; url=$taskPsb+'?p=400972'; items=@('B-100 Portable Hellbomb') },
  @{ name='Borderline Justice'; date='2025-03-20'; tier='premium'; url=$taskPsb+'2025/03/18/helldivers-2-borderline-justice-warbond-launches-march-20/'; items=@('LIFT-860 Hover Pack') },
  @{ name='Masters of Ceremony'; date='2025-05-15'; tier='premium'; url=$taskPsb+'?p=404582'; items=@('CQC-1 One True Flag') },
  @{ name='Force of Law'; date='2025-06-12'; tier='premium'; url=$taskPsb+'2025/06/05/helldivers-2-force-of-law-warbond-launches-june-12/'; items=@('GL-52 De-Escalator','AX/ARC-3 Guard Dog K-9') },
  @{ name='Control Group'; date='2025-07-17'; tier='premium'; url=$taskPsb+'?p=407597'; items=@('PLAS-45 Epoch','A/LAS-98 Laser Sentry','LIFT-182 Warp Pack') },
  @{ name='Obedient Democracy Support Troopers'; date='2025-08-26'; tier='legendary'; url=$taskPsb+'?p=408548'; items=@(); notes='Helldivers 2 x Halo: ODST. Weapons and cosmetics, with no new stratagem call-in sequence.' },
  @{ name='Dust Devils'; date='2025-09-04'; tier='premium'; url=$taskPsb+'2025/08/26/helldivers-2-into-the-unjust-launches-september-2/'; items=@('S-11 Speargun','EAT-700 Expendable Napalm','MS-11 Solo Silo') },
  @{ name='Python Commandos'; date='2025-12-02'; tier='premium'; url=$taskPsb+'2025/11/25/helldivers-2-python-commandos-premium-warbond-airdrops-dec-2/'; items=@('AX/FLAM-75 Guard Dog Hot Dog','CQC-9 Defoliation Tool','M-1000 Maxigun') },
  @{ name='Righteous Revenants'; date='2025-12-18'; tier='legendary'; url=$taskPsb+'2025/12/11/the-helldivers-2-x-killzone-items-return-as-a-legendary-warbond-dec-18/'; items=@(); notes='Helldivers 2 x Killzone. The freely requisitioned StA-X3 W.A.S.P. Launcher is not a reward in this Warbond.' },
  @{ name='Redacted Regiment'; date='2026-01-22'; tier='premium'; url=$taskPsb+'2026/01/13/helldivers-2-redacted-regiment-warbond-launches-jan-20/'; items=@('B-MD C4 Pack'); notes='Actual release was delayed to January 22, 2026; the original announcement says January 20.' },
  @{ name='Siege Breakers'; date='2026-02-03'; tier='premium'; url=$taskPsb+'2026/01/27/helldivers-2-siege-breakers-premium-warbond-drops-february-3/'; items=@('CQC-20 Breaching Hammer','EAT-411 Leveller','GL-28 Belt-Fed Grenade Launcher'); notes='TD-220 Bastion MK XVI was a free requisition unlock released separately, not a Warbond reward.' },
  @{ name='Entrenched Division'; date='2026-03-17'; tier='premium'; url=$taskPsb+'2026/03/10/helldivers-2-entrenched-division-premium-warbond-out-march-17/'; items=@('A/GM-17 Gas Mortar Sentry','B/FLAM-80 Cremator') },
  @{ name='Exo Experts'; date='2026-04-28'; tier='premium'; url=$taskPsb+'2026/04/21/helldivers-2-the-exo-experts-warbond-drops-april-28/'; items=@('MGX-42 Bullet Storm','EXO-51 Lumberer Exosuit','EXO-55 Breakthrough Exosuit') },
  @{ name="Castellan's Creed"; date='2026-08-12'; tier='legendary'; url='https://www.playstation.com/en-us/games/helldivers-2/latest-news-and-updates/'; items=@('40-K Meltagun'); notes='Helldivers 2 x Warhammer 40,000. The overview page omits the Meltagun; the individual item and stratagem table document it as a page 3 Warbond reward.' },
  @{ name='Ironclad Democracy'; date='2026-09-22'; tier='premium'; url=$taskPsb+'2026/09/15/helldivers-2-ironclad-democracy-warbond-launches-sept-22/'; items=@(); notes='Surplus EAT Allocation is a booster granting uses of the existing EAT-17, not a new stratagem code. TD-110 Maelstrom is a separate Armored Eagle campaign reward.' }
)

$taskWarbondItems = @($taskDefinitions | ForEach-Object { $_.items })
$taskMissionItems = @('SSSD Delivery','Prospecting Drill','Super Earth Flag','Hellbomb','Upload Data','SE-45 Seismic Probe','SEAF Artillery','Tectonic Drill','Hive Breaker Drill','Cargo Container','Call In Super Destroyer')
$taskExcludedItems = @('Illumination Flare','Dark Fluid Vessel','M-104 Incinerator FRV')
$taskBaseItems = @($taskSequenceSource.PSObject.Properties.Name | Where-Object { $_ -notin $taskWarbondItems -and $_ -notin $taskMissionItems -and $_ -notin $taskExcludedItems })
$taskPacks = [System.Collections.Generic.List[object]]::new()
$taskPacks.Add([ordered]@{
  schemaVersion=1; id='base-game'; name='Base Game & Free Updates'; kind='base';
  description='Core stratagems, requisition unlocks and released campaign rewards. Warbond rewards are in their own packs.';
  verifiedAt='2026-10-12'; source=@(($taskWiki+'Stratagems'),$taskSourceUrl);
  stratagems=@($taskBaseItems | ForEach-Object { New-CatalogEntry $_ })
})

$taskMissionEntries = @($taskMissionItems | ForEach-Object { $taskItem=New-CatalogEntry $_; $taskItem.category='mission'; $taskItem.tags=@('mission'); $taskItem })
# These codes have distinct mission contexts and are not substitutions for Warbond rewards.
$taskExtraMissions = @(
  @{ name='SSSD Delivery (Automaton Objectives)'; id='sssd-delivery-automaton'; sequence=@('down','down','down','down','down','up','up'); url='SSSD_Delivery' },
  @{ name='B-100 Portable Hellbomb (Spore Lung Objective)'; id='portable-hellbomb-spore-lung'; sequence=@('down','right','up','up','down'); url='B-100_Portable_Hellbomb' },
  @{ name='Tactical Video Camera'; id='tactical-video-camera'; sequence=@('right','down','down','up','left','left','up'); url='Tactical_Video_Camera' },
  @{ name='Portable Comms Relay'; id='portable-comms-relay'; sequence=@('up','up','down','down','left','left','down'); url='Stratagems' },
  @{ name='Activate E-711 Extraction Drill'; id='activate-e-711-extraction-drill'; sequence=@('down','down','left','left','down','down'); url='Stratagems' },
  @{ name='Aquifer Drill'; id='aquifer-drill'; sequence=@('left','left','left','up','down','right','down','down'); url='Stratagems' },
  @{ name='Reinforcement Pods'; id='reinforcement-pods'; sequence=@('left','right','up','up','up'); url='Stratagems' }
)
foreach ($taskItem in $taskExtraMissions) {
  $taskMissionEntries += [ordered]@{ id=$taskItem.id; name=$taskItem.name; sequence=$taskItem.sequence; category='mission'; tags=@('mission'); source=@($taskWiki+$taskItem.url) }
}
$taskPacks.Add([ordered]@{
  schemaVersion=1; id='mission-practice'; name='Mission Practice'; kind='base';
  description='Objective-specific codes. SSSD delivery and Portable Hellbomb variants have their own context and sequence.';
  verifiedAt='2026-10-12'; source=@(($taskWiki+'Stratagems'),($taskWiki+'SSSD_Delivery'),($taskWiki+'B-100_Portable_Hellbomb'));
  stratagems=$taskMissionEntries
})

foreach ($taskDefinition in $taskDefinitions) {
  $taskId = Get-CatalogId $taskDefinition.name
  $taskNotes = $taskDefinition.notes
  if (!$taskNotes) {
    $taskNotes = if ($taskDefinition.items.Count -eq 0) { 'This released Warbond contains no stratagem call-in codes. Its weapons, armor, boosters and cosmetics are not directional call-ins.' } else { 'Directional codes verified from the linked community sources.' }
  }
  $taskPacks.Add([ordered]@{
    schemaVersion=1; id=$taskId; name=$taskDefinition.name; kind='warbond';
    description=$(if ($taskDefinition.items.Count) { 'Stratagem call-in codes unlocked in this Warbond.' } else { 'No new stratagem call-in codes in this Warbond.' });
    releaseDate=$taskDefinition.date; verifiedAt='2026-10-12';
    source=@($taskDefinition.url,($taskWiki+'Warbonds'),($taskWiki+'Stratagems')); notes=$taskNotes;
    stratagems=@($taskDefinition.items | ForEach-Object { New-CatalogEntry $_ })
  })
}

$taskAllIds = @($taskPacks | ForEach-Object { $_.stratagems | ForEach-Object { $_.id } })
if (($taskAllIds | Sort-Object -Unique).Count -ne $taskAllIds.Count) { throw 'Duplicate stratagem IDs' }
if ($taskDefinitions.Count -ne 25 -or $taskWarbondItems.Count -ne 29) { throw 'Unexpected Warbond totals' }
$taskManifest = [ordered]@{
  schemaVersion=1; catalogVersion='2026-10-12'; verifiedAt='2026-10-12';
  packs=@($taskPacks | ForEach-Object { $_.id+'.json' });
  totalWarbonds=$taskDefinitions.Count; totalStratagems=$taskAllIds.Count;
  source=@(($taskWiki+'Warbonds'),'https://www.playstation.com/en-us/games/helldivers-2/latest-news-and-updates/');
  excluded=@(
    @{ name='Orbital Illumination Flare'; reason='Unavailable. The pinned community database also disagrees with the wiki code; no playable entry is shipped.' },
    @{ name='Dark Fluid Vessel'; reason='Historical limited mission equipment; excluded from current practice packs.' },
    @{ name='M-104 Incinerator FRV'; reason='Historical operational variation; currently unavailable after the Census Thunder outcome.' }
  )
}
foreach ($taskPack in $taskPacks) { Write-CatalogJson (Join-Path $taskConfigDir ($taskPack.id+'.json')) $taskPack }
Write-CatalogJson (Join-Path $taskConfigDir 'index.json') $taskManifest
Write-Output ("Generated {0} packs ({1} Warbonds), {2} unique codes." -f $taskPacks.Count,$taskDefinitions.Count,$taskAllIds.Count)
