# Windows sources

The shared source is maintained at repository root in `shared/sourcecode`.
`node scripts/stage-platforms.mjs` copies a complete, independently buildable source snapshot here for the full platform ZIP. Edit canonical sources rather than generated copies. Run `pnpm build` and `pnpm dist:desktop --win --x64 --publish never` from the snapshot or repository root.
