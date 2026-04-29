# Nest CLI Simple Log Observation

Date: 2026-04-29

## Source

The template was generated with the official Nest CLI, not copied from the GitHub starter:

```powershell
npx @nestjs/cli@latest new void-server-nest-cli-template --package-manager npm --skip-git
```

The command installed `@nestjs/cli@11.0.21` and created the default TypeScript app under `%TEMP%\void-server-nest-cli-template`.

The generated app shape was:

- `src/main.ts`: `NestFactory.create(AppModule)` then `app.listen(process.env.PORT ?? 3000)`
- `src/app.module.ts`: `AppController` plus `AppService`
- `src/app.controller.ts`: root `GET /` calls `AppService.getHello()`
- `src/app.service.ts`: returns `Hello World!`

## Captured Run

The generated app was started with:

```powershell
$env:PORT = "0"
npm run start
```

`PORT=0` avoided a fixed local port conflict while leaving the generated source untouched. New observations should use the version-controlled watch-mode command in [nest-log-observation-workflow.md](nest-log-observation-workflow.md).

| stream | observed elapsed from command start | captured line |
| --- | ---: | --- |
| stdout | 127ms | `> void-server-nest-cli-template@0.0.1 start` |
| stdout | 127ms | `> nest start` |
| stdout | 14718ms | `[Nest] 9120 - 2026. 04. 29. PM 11:17:07 LOG [NestFactory] Starting Nest application...` |
| stdout | 14721ms | `[Nest] 9120 - 2026. 04. 29. PM 11:17:07 LOG [InstanceLoader] AppModule dependencies initialized +3ms` |
| stdout | 14722ms | `[Nest] 9120 - 2026. 04. 29. PM 11:17:07 LOG [RoutesResolver] AppController {/}: +2ms` |
| stdout | 14724ms | `[Nest] 9120 - 2026. 04. 29. PM 11:17:07 LOG [RouterExplorer] Mapped {/, GET} route +1ms` |
| stdout | 14724ms | `[Nest] 9120 - 2026. 04. 29. PM 11:17:07 LOG [NestApplication] Nest application successfully started +1ms` |

The raw captured Nest lines included ANSI color escapes because `nest start` emitted colored terminal output. The simulator keeps the existing plain Nest-style formatter and reproduces the message order plus the observed Nest delta suffixes.
