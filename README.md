# FFXIV Raid Drills

Practice drills for Final Fantasy XIV raids. The site has one fight and one role today: M11S (The Tyrant, Savage) for healers. The M11S drills follow one static's strategy: Hector/Toxic, Kindred No Buddies split and Fixed (3CJ) Ecliptic.

The site is written in TypeScript and built with Vite. If you know C# and are new to TypeScript, read [TypeScript for C# developers](docs/typescript-for-csharp.md) first.

## Set up

You need Node.js 24, the version in `.node-version`. Install the tools once:

```sh
npm install
```

## Run the site on your computer

Run this command, then open the local address that Vite prints. When you save a file, the page updates.

```sh
npm run dev
```

## Run the checks

The type check uses the TypeScript compiler. The tests use Vitest. They test the arena geometry, the answer zone of each drill, and the answer of each question.

```sh
npm run typecheck
npm test
```

## Build

The build checks the types, then writes the site to `dist/`. Git ignores `dist/`.

```sh
npm run build
```

## Project layout

```text
index.html             page shell
src/main.ts            start-up, tabs and keyboard keys
src/types.ts           shared types for drills, questions and overlays
src/core.ts            shared state, decks and scoring
src/util.ts            small shared helpers
src/geometry.ts        arena geometry
src/arena.ts           SVG drawing of the arena
src/views/             one module for each tab
src/data/timeline.ts   fight timeline
src/data/drills.ts     map drills
src/data/questions.ts  mechanic, raise and timeline questions
src/data/jobs.ts       White Mage and Sage plans
src/styles.css         all styles
test/                  Vitest tests
docs/                  guides
scripts/publish.sh     push the current branch to GitHub
wrangler.jsonc         Cloudflare deploy configuration
```

## Change a drill or a question

The data for the drills and the questions is in `src/data/`. Each item has a `build` function. The function returns the scene or the question for one healer slot, H1 or H2.

1. Make a branch from `main`.
2. Edit the item in `src/data/`.
3. Run `npm run typecheck` and `npm test`.
4. Run `npm run dev` and try the drill.
5. Commit the change, then run `sh scripts/publish.sh` to push the branch.
6. Open the Cloudflare preview of the branch. If it is correct, merge the branch into `main` and publish again.

## Publish

Cloudflare Workers builds the site from this repository. For each push, Cloudflare runs `npm run build`, then Wrangler uploads `dist/`. `wrangler.jsonc` names the project and the `dist/` folder. A push to `main` updates the live site. A push to another branch makes a preview at its own address.

To test the Wrangler configuration without a deploy, run `npm run build`, then run this command:

```sh
npx wrangler deploy --dry-run
```

The publish script runs the type check and the tests, then pushes the current branch as the repository owner. The script ignores a `GH_TOKEN` or `GITHUB_TOKEN` in your shell. At the end, the script switches the GitHub CLI back to the account that was active before.

```sh
sh scripts/publish.sh
```

## Sources

- Strategy: [wtfdig M11S](https://wtfdig.info/74/m11s#hector:nobuddies:fixed) and [Hector's video guide](https://www.youtube.com/watch?v=w1uuwzhyf5A)
- Times: [cactbot r11s timeline](https://github.com/OverlayPlugin/cactbot/blob/main/ui/raidboss/data/07-dt/raid/r11s.txt)
- Mechanics: [Icy Veins M11S guide](https://www.icy-veins.com/ffxiv/aac-heavyweight-m3-savage-raid-guide) and [Thaliak M11S](https://thaliak.com/raids/m11s/)
- Job abilities: the official [White Mage](https://na.finalfantasyxiv.com/jobguide/whitemage/) and [Sage](https://na.finalfantasyxiv.com/jobguide/sage/) job guides
