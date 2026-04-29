# Nest Log Observation Workflow

Use the repo-local observation command when changing NestJS simulator logs:

```bash
npm run observe:nest -- simple
npm run observe:nest -- middle
npm run observe:nest -- heavy
```

The command:

- creates a fresh project with the official Nest CLI: `npx @nestjs/cli@latest new ... --package-manager npm --skip-git`
- leaves `simple` as the untouched generated template
- rewrites only `src/app.module.ts` for `middle` and `heavy` so the same official bootstrap path produces denser module/provider logs
- starts the app with `PORT=0 FORCE_COLOR=1 npm run start:dev`, which runs `nest start --watch`
- records stdout/stderr lines with `elapsedMs`
- writes both Markdown and JSONL under `docs/observations`

Use `--keep-project` to inspect the generated temporary Nest app after capture.
For advanced flags such as `--out` or `--timeout-ms`, call the script directly:

```bash
node scripts/capture-nest-observation.mjs --mode heavy --out docs/observations --timeout-ms 45000 --keep-project
```
