# FFXIV Raid Drills

Practice drills for Final Fantasy XIV raids. The site has one fight and one role today: M11S (The Tyrant, Savage) for healers. The M11S drills follow one static's strategy: Hector/Toxic, Kindred No Buddies split and Fixed (3CJ) Ecliptic.

The site is written in TypeScript and built with Vite. If you know C# and are new to TypeScript, read [TypeScript for C# developers](docs/typescript-for-csharp.md) first.

## Set up

You need git and Node.js 24 (the version in `.node-version`). Install them once, then open a new terminal:

- Windows: `winget install Git.Git OpenJS.NodeJS.24`
- macOS: `brew install git node@24`

Then clone the repository and run one command in the clone. It works in any shell, PowerShell too:

```sh
npm run setup
```

The setup installs the packages and the browsers for the browser tests, then runs the type check and the tests. At the end, it lists anything left to do, such as a missing git name and address for your commits. It shows your git identity but never changes it. This repository is public, so every commit shows that name and address: GitHub gives you a private noreply address at https://github.com/settings/emails.

npm refuses to run with another Node.js major version (`devEngines` in `package.json`).

## Run the site on your computer

Run this command, then open the local address that Vite prints. When you save a file, the page updates.

```sh
npm run dev
```

## Run the checks

The type check uses the TypeScript compiler. The tests use Vitest. They test the arena geometry, the answer zone of each drill, and the answer of each question. The browser tests use Playwright. The lint uses Biome.

```sh
npm run typecheck
npm test
npm run e2e
npm run lint
```

## Build

The build checks the types, then writes the site to `dist/`. Git ignores `dist/`.

```sh
npm run build
```

## Project layout

```text
index.html               page shell
src/main.tsx             start-up: draws the React app
src/App.tsx              the header and the routes
src/pages/               React pages, one per route (Home, Learn, Practice, Timeline, Cheat sheet)
src/components/          React components (header, page container, slot switch, tabs, shared pieces)
src/components/arena/    the arena pictures, drawn as SVG by React components
src/components/ui/       shadcn/ui components
src/hooks/               custom React hooks
src/stores/              state kept in the browser (Zustand)
src/app.css              Tailwind CSS and the shadcn/ui theme
src/types.ts             shared types for drills, questions and overlays
src/util.ts              small shared helpers
src/geometry.ts          arena geometry
src/data/                the fight: drills, pictures, questions, timeline, attacks
test/                    Vitest tests
scripts/                 setup, publish and wait-deploy (plain Node.js)
e2e/                     Playwright browser tests
```

## Change a drill or a question

The data for the drills and the questions is in `src/data/`. Each item has a `build` function. The function returns the scene or the question for one healer slot, H1 or H2.

1. Make a branch from `main`.
2. Edit the item in `src/data/`.
3. Run `npm run typecheck` and `npm test`.
4. Run `npm run dev` and try the drill.
5. Commit the change and push the branch. Without write access, open a pull request.
6. Open the Cloudflare preview of the branch at `https://<branch>.ffxiv-raid-drills.app/`. If it is correct, merge the branch into `main` and publish again.

## Publish

Cloudflare Workers builds the site from this repository. For each push to `main`, Cloudflare runs `npm run build`, then Wrangler uploads `dist/` and updates the live site. A push that changes only docs, tests or tooling does not build (the build watch paths in `docs/decisions.md`). `wrangler.jsonc` names the project and the `dist/` folder. For another branch, GitHub Actions makes a preview at its own address when the push changed the app and the owner approved it on GitHub.

GitHub Actions runs the checks (lint, type check, unit tests, build, browser tests) on every push. `main` takes only a commit on which those checks passed, so push the branch first, wait for its checks, then push `main`.

To test the Wrangler configuration without a deploy, run `npm run build`, then run this command:

```sh
npx wrangler deploy --dry-run
```

The publish script (only for the owner, `mander77`) runs the type check, the tests and the lint, then pushes the current branch as the repository owner and opens its pull request to `main`, if it has none yet. With `-- main` (`npm run publish -- main`), it also merges that pull request, from any checkout: it waits for the checks on the branch's last commit, then merges with "Rebase and merge", so a branch that fell behind `main` needs no rebase. The script ignores a `GH_TOKEN` or `GITHUB_TOKEN` in your shell. At the end, the script switches the GitHub CLI back to the account that was active before.

It needs the GitHub CLI, signed in as the owner (`gh auth login`, then `gh auth setup-git`).

```sh
npm run publish
```

To wait until a deploy serves a new build, give the site and the bundle name that `npm run build` printed:

```sh
npm run wait-deploy -- https://ffxiv-raid-drills.app index-AbCd1234.js
```

## Sources

- Strategy: [wtfdig M11S](https://wtfdig.info/74/m11s#hector:nobuddies:fixed) and [Hector's video guide](https://www.youtube.com/watch?v=w1uuwzhyf5A)
- Times: [cactbot r11s timeline](https://github.com/OverlayPlugin/cactbot/blob/main/ui/raidboss/data/07-dt/raid/r11s.txt)
- Mechanics: [Icy Veins M11S guide](https://www.icy-veins.com/ffxiv/aac-heavyweight-m3-savage-raid-guide) and [Thaliak M11S](https://thaliak.com/raids/m11s/)
- Attack sizes: the [BossMod](https://github.com/awgil/ffxiv_bossmod) M11S module
