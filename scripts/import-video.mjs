// Imports the chapters, subtitles and still frames of a fight's guide videos, so the draft of a
// new fight can read the positions in them. A video is only for understanding: never take a fight
// time or an attack size from it, and mark every position read from it "owner to check".
//
//   npm run import:video -- m11s https://youtu.be/w1uuwzhyf5A https://www.youtube.com/watch?v=p8cL88OKEWE
//   npm run import:video -- m11s        imports again every video the fight already has notes for
//
// For each video it writes notes/<fight>/videos/<video id>.json: the video, and for each chapter
// its name, its time span, its subtitle lines (YouTube's English captions, each with its time)
// and its still frames, one every 3 seconds. A video with no chapters is one chapter. The video,
// the captions and the frames stay in .cache/video/<video id>/ (git ignores it); every download
// is cached, so a second run downloads nothing.
//
// It needs yt-dlp and ffmpeg (npm run setup says if one is missing). It reads only YouTube.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, ".cache", "video");
/** A still frame every this many seconds. */
const FRAME_EVERY = 3;
/** The video's height for the frames, in pixels: enough to read the arena and its markers. */
const HEIGHT = 720;

/** The id of a YouTube video address, or an error for any other address. */
export function videoId(url) {
  const m =
    /^https:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/.exec(url) ??
    /^https:\/\/youtu\.be\/([\w-]{11})(?:[?#].*)?$/.exec(url);
  if (!m) throw new Error(`Not a YouTube video address: ${url}`);
  return m[1];
}

/** A time in seconds as "m:ss". */
export const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/** Seconds from a caption time, "00:12:04.719". */
const seconds = (s) => s.split(":").reduce((n, x) => n * 60 + Number(x), 0);

/** The new text of each caption in YouTube's auto-captions, with its time. Each auto-caption
    shows the line before it again, and marks its new words with time tags ("<00:00:01.280><c>
    this</c>"), so only the lines with tags are new. Captions a person wrote have no tags: then
    every line is new, once. */
export function parseCaptions(vtt) {
  const out = [];
  const tagged = /<\d\d:\d\d:\d\d\.\d{3}>/.test(vtt);
  for (const cue of vtt.split(/\r?\n\r?\n/)) {
    const lines = cue.split(/\r?\n/);
    const at = lines.findIndex((l) => l.includes("-->"));
    if (at < 0) continue;
    const t = Math.round(seconds(lines[at].split(" --> ")[0]) * 10) / 10;
    for (const line of lines.slice(at + 1)) {
      if (tagged && !line.includes("<")) continue;
      const text = line
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (text && out.at(-1)?.text !== text) out.push({ t, text });
    }
  }
  return out;
}

/** The video's chapters, each with its start and end in seconds. A video with no chapters is one. */
export const chaptersOf = (info) =>
  info.chapters?.length
    ? info.chapters.map((c) => ({ title: c.title, start: c.start_time, end: c.end_time }))
    : [{ title: info.title, start: 0, end: info.duration }];

/** A chapter's folder name: "08-flatliner". */
const slug = (n, title) =>
  `${String(n).padStart(2, "0")}-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;

/** Run a tool, and stop with its message when it fails. */
function run(program, args) {
  const r = spawnSync(program, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw new Error(`${program} is not installed: see npm run setup`);
  if (r.status !== 0) throw new Error(`${program} ${args.join(" ")}\n${r.stderr.trim()}`);
  return r.stdout;
}

/** The notes of one video, from the cache, downloading what is missing. */
function importVideo(fight, url) {
  const id = videoId(url);
  const dir = join(CACHE, id);
  mkdirSync(dir, { recursive: true });
  const link = `https://www.youtube.com/watch?v=${id}`;
  const quiet = ["--quiet", "--no-warnings", "--no-playlist"];

  const infoFile = join(dir, "info.json");
  if (!existsSync(infoFile)) writeFileSync(infoFile, run("yt-dlp", [...quiet, "--skip-download", "--dump-single-json", link]));
  const info = JSON.parse(readFileSync(infoFile, "utf8"));

  const captionsFile = join(dir, "captions.en.vtt");
  if (!existsSync(captionsFile)) {
    run("yt-dlp", [
      ...quiet,
      "--skip-download",
      "--write-subs",
      "--write-auto-subs",
      "--sub-langs",
      "en",
      "--sub-format",
      "vtt",
      "-o",
      join(dir, "captions"),
      link,
    ]);
  }
  const captions = existsSync(captionsFile) ? parseCaptions(readFileSync(captionsFile, "utf8")) : [];

  let video = readdirSync(dir).find((f) => f.startsWith("video."));
  if (!video) {
    run("yt-dlp", [...quiet, "-f", `bv*[height<=${HEIGHT}]/b[height<=${HEIGHT}]`, "-o", join(dir, "video.%(ext)s"), link]);
    video = readdirSync(dir).find((f) => f.startsWith("video."));
    if (!video) throw new Error(`yt-dlp wrote no video for ${link}`);
  }

  const chapters = chaptersOf(info).map((c, i) => {
    const folder = join(dir, "frames", slug(i + 1, c.title));
    if (!existsSync(folder) || readdirSync(folder).length === 0) {
      mkdirSync(folder, { recursive: true });
      run("ffmpeg", [
        "-loglevel",
        "error",
        "-ss",
        String(c.start),
        "-to",
        String(c.end),
        "-i",
        join(dir, video),
        "-vf",
        `fps=1/${FRAME_EVERY}`,
        "-q:v",
        "4",
        join(folder, "%03d.jpg"),
      ]);
    }
    const frames = readdirSync(folder)
      .filter((f) => f.endsWith(".jpg"))
      .sort()
      .map((f, k) => ({
        t: Math.min(c.end, c.start + k * FRAME_EVERY),
        file: join(folder, f)
          .slice(ROOT.length + 1)
          .replaceAll("\\", "/"),
      }));
    return {
      n: i + 1,
      title: c.title,
      start: c.start,
      end: c.end,
      span: `${clock(c.start)} to ${clock(c.end)}`,
      lines: captions.filter((l) => l.t >= c.start && l.t < c.end),
      frames,
    };
  });

  const notes = {
    _generated: "By npm run import:video (scripts/import-video.mjs). Do not edit it by hand.",
    rule: "Only for understanding: never take a fight time or an attack size from the video. Mark every position read from it 'owner to check'.",
    video: { id, url: link, title: info.title, channel: info.uploader ?? info.channel, duration: info.duration },
    captions: existsSync(captionsFile) ? "YouTube's English captions (made by YouTube unless the channel wrote them): not exact" : "none",
    chapters,
  };
  const out = join(ROOT, "notes", fight, "videos", `${id}.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(notes, null, 2)}\n`);
  const frames = chapters.reduce((n, c) => n + c.frames.length, 0);
  console.log(`wrote ${out.slice(ROOT.length + 1)}: ${chapters.length} chapters, ${captions.length} caption lines, ${frames} frames`);
}

function main() {
  const [fight, ...urls] = process.argv.slice(2);
  if (!fight || !/^[a-z0-9]+$/.test(fight)) throw new Error("Name the fight first: npm run import:video -- m11s <video address>...");
  const known = join(ROOT, "notes", fight, "videos");
  const list = urls.length
    ? urls
    : existsSync(known)
      ? readdirSync(known)
          .filter((f) => f.endsWith(".json"))
          .map((f) => `https://www.youtube.com/watch?v=${f.slice(0, -5)}`)
      : [];
  if (list.length === 0) throw new Error(`No videos for ${fight} yet: give their addresses`);
  for (const url of list) importVideo(fight, url);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
