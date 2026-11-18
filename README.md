# M11S Healer Drills

Practice drills for a healer in the Final Fantasy XIV fight M11S (The Tyrant, Savage). The drills follow one static's strategy: Hector/Toxic, Kindred No Buddies split and Fixed (3CJ) Ecliptic.

The live site is at https://mander77.github.io/m11s-healer-drills/.

## Run the site on your computer

The site is static HTML, CSS and JavaScript modules. It has no build step and no dependencies. Browsers load JavaScript modules only over HTTP, so you need a local web server.

Run this command in the repository folder, then open http://localhost:8000:

```sh
npm start
```

## Run the tests

The tests use the test runner that Node.js includes (Node 18 or later). They test the arena geometry, the answer zone of each drill, and the answer of each question. They do not need a browser.

```sh
npm test
```

## Project layout

```text
index.html            page shell
css/styles.css        all styles
js/main.js            start-up, tabs and keyboard keys
js/core.js            shared state, decks and scoring
js/util.js            small shared helpers
js/geometry.js        arena geometry
js/arena.js           SVG drawing of the arena
js/views/             one module for each tab
js/data/timeline.js   fight timeline
js/data/drills.js     map drills
js/data/questions.js  mechanic, raise and timeline questions
js/data/jobs.js       White Mage and Sage plans
test/                 tests for node --test
scripts/publish.sh    push to GitHub Pages
```

## Change a drill or a question

The data for the drills and the questions is in `js/data/`. Each item has a `build` function. The function returns the scene or the question for one healer slot, H1 or H2.

1. Edit the item in `js/data/`.
2. Run `npm test`.
3. Open the site on your computer and try the drill.
4. Commit the change on a branch, then merge it into `main`.

## Publish

GitHub Pages serves the `main` branch of this repository. A push to `main` updates the live site in about one minute.

The publish script runs the tests, then pushes `main` as the repository owner. The script ignores a `GH_TOKEN` or `GITHUB_TOKEN` in your shell. At the end, the script switches the GitHub CLI back to the account that was active before.

```sh
sh scripts/publish.sh
```

## Sources

- Strategy: [wtfdig M11S](https://wtfdig.info/74/m11s#hector:nobuddies:fixed) and [Hector's video guide](https://www.youtube.com/watch?v=w1uuwzhyf5A)
- Times: [cactbot r11s timeline](https://github.com/OverlayPlugin/cactbot/blob/main/ui/raidboss/data/07-dt/raid/r11s.txt)
- Mechanics: [Icy Veins M11S guide](https://www.icy-veins.com/ffxiv/aac-heavyweight-m3-savage-raid-guide)
- Job abilities: the official [White Mage](https://na.finalfantasyxiv.com/jobguide/whitemage/) and [Sage](https://na.finalfantasyxiv.com/jobguide/sage/) job guides
