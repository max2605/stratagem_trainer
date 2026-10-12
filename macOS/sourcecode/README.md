# macOS sources

The shared source is maintained at repository root in `shared/sourcecode`.
`node scripts/stage-platforms.mjs` copies a complete source snapshot here for the full platform ZIP. Run `pnpm build` and `pnpm dist:desktop --mac --x64 --arm64 --publish never` on macOS. Signing/notarization need your developer identity.
