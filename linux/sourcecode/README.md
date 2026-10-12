# Linux sources

The shared source is maintained at repository root in `shared/sourcecode`.
`node scripts/stage-platforms.mjs` copies a complete source snapshot here for the full platform ZIP. Run `pnpm build` and `pnpm dist:desktop --linux --x64 --publish never` from the snapshot or repository root. Native runtime needs a Linux graphical session.
