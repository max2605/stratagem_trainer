# Architecture and handover

The shared React UI is bundled by Vite. The pure TypeScript core validates version-1 pack JSONs and implements Fisher–Yates shuffle cycles, deferred mistake review, physical-key mappings and statistics. Qualified `packId:stratagemId` identities avoid cross-pack collisions.

Electron loads the same built UI through the local `app://trainer` scheme, with a sandboxed renderer and isolated preload exposing only bounded HTTPS JSON download. Capacitor embeds the web bundle into Android/iOS with Filesystem/Share export. Web exports use browser downloads and a generated service worker supplies offline assets. No account or server backend is required.

Browser/native local storage keeps user packs, groups, favorites, settings and statistics. JSON backups provide portable transfer. Local config/lang files are release assets, while runtime defaults are bundled; use import or rebuild to apply external edits.

CI verifies logic/data/storage/downloader and browser behavior before native jobs. Native jobs stage each requested platform layout and release checksums. Pages deploys the PWA from main. The signing workflow requires configured Apple credentials and is separate from unsigned development artifacts.

Root owns GitHub issue-linked commits. `codex/issues.json` records original issues. See docs for sources, installation, limits and operator procedures.
