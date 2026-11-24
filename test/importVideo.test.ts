// The video import (scripts/import-video.mjs): YouTube addresses, YouTube's captions and the
// chapters, and the committed notes of M11S's guide videos.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { assert, test } from "vitest";
// @ts-expect-error: a plain Node.js script with no type declarations.
import { chaptersOf, clock, parseCaptions, videoId } from "../scripts/import-video.mjs";

test("a YouTube address gives the video's id; any other address stops", () => {
  assert.equal(videoId("https://youtu.be/w1uuwzhyf5A"), "w1uuwzhyf5A");
  assert.equal(videoId("https://www.youtube.com/watch?v=p8cL88OKEWE"), "p8cL88OKEWE");
  assert.equal(videoId("https://www.youtube.com/watch?list=x&v=p8cL88OKEWE&t=5"), "p8cL88OKEWE");
  assert.throws(() => videoId("https://example.com/watch?v=p8cL88OKEWE"));
  assert.equal(clock(724), "12:04");
});

test("auto-captions: only the new words of each caption, once, with its time", () => {
  const vtt = [
    "WEBVTT",
    "",
    "00:00:00.719 --> 00:00:02.470 align:start position:0%",
    " ",
    "Warning,<00:00:01.280><c> this</c><00:00:01.520><c> guide</c>",
    "",
    "00:00:02.470 --> 00:00:02.480 align:start position:0%",
    "Warning, this guide",
    " ",
    "",
    "00:12:04.960 --> 00:12:06.630 align:start position:0%",
    "Warning, this guide",
    "features<00:12:05.120><c> week 1</c>",
  ].join("\n");
  assert.deepEqual(parseCaptions(vtt), [
    { t: 0.7, text: "Warning, this guide" },
    { t: 725, text: "features week 1" },
  ]);
});

test("captions a person wrote: every line, once", () => {
  const vtt = [
    "WEBVTT",
    "",
    "00:00:01.000 --> 00:00:03.000",
    "Raw Steel Trophy.",
    "",
    "00:00:03.000 --> 00:00:05.000",
    "Tanks stack.",
  ].join("\n");
  assert.deepEqual(parseCaptions(vtt), [
    { t: 1, text: "Raw Steel Trophy." },
    { t: 3, text: "Tanks stack." },
  ]);
});

test("a video with no chapters is one chapter", () => {
  assert.deepEqual(chaptersOf({ title: "Mini-Guide", duration: 174 }), [{ title: "Mini-Guide", start: 0, end: 174 }]);
  assert.deepEqual(chaptersOf({ title: "x", duration: 60, chapters: [{ title: "Intro", start_time: 0, end_time: 60 }] }), [
    { title: "Intro", start: 0, end: 60 },
  ]);
});

test("M11S's video notes: each chapter has its span, and frames 3 seconds apart inside it", () => {
  const dir = join(import.meta.dirname, "..", "notes", "m11s", "videos");
  assert.isTrue(existsSync(join(dir, "w1uuwzhyf5A.json")), "Hector's guide");
  for (const file of readdirSync(dir)) {
    const notes = JSON.parse(readFileSync(join(dir, file), "utf8"));
    assert.equal(`${notes.video.id}.json`, file);
    assert.match(notes.rule, /never take a fight time or an attack size/);
    for (const c of notes.chapters) {
      for (const l of c.lines) assert.isTrue(l.t >= c.start && l.t < c.end, `${c.title}: a caption inside the chapter`);
      for (const [k, f] of c.frames.entries()) assert.equal(f.t, Math.min(c.end, c.start + k * 3), `${c.title}: frame ${k + 1}`);
    }
  }
});
