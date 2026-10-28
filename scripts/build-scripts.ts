import { build } from 'esbuild'

await build({
  entryPoints: ['scripts/migrate.ts', 'scripts/seed.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  outdir: '.output/scripts',
  external: ['pg', 'drizzle-orm', '@node-rs/argon2'],
})
