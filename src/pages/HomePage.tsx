// The Home page (/): what the site does, a card that links to each tab, and About me.
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LearnPicture } from "../components/arena/LearnPicture";
import { PageContainer } from "../components/PageContainer";
import { DRILLS } from "../data/drills";
import { LEARN_PICTURES } from "../data/pictures";
import { LEARN_CARDS, TIMELINE_CARDS } from "../data/questions";
import { BOSSMOD, CACTBOT, WTFDIG } from "../data/sources";
import { useSlotStore } from "../stores/slot";

/** The Learn card whose answer picture is at the top of the page: the first mechanic of the
    fight, with the party's spot in green and you in it. */
const HERO_CARD = "k-raw-first";

/** A card under "Start here": one tab, in the order to learn the fight. */
interface StartCard {
  path: string;
  name: string;
  /** Its place in the order; the cheat sheet is a reference, with no step. */
  step?: number;
  about: string;
  count: string;
}

/** The tabs to start with, in order, then the cheat sheet. */
const START: readonly StartCard[] = [
  {
    path: "/learn",
    name: "Learn",
    step: 1,
    about: "What each mechanic does, with a picture.",
    count: `${LEARN_CARDS.length} questions`,
  },
  {
    path: "/practice",
    name: "Practice",
    step: 2,
    about: "Click where you stand, one mechanic at a time.",
    count: `${DRILLS.length} mechanics`,
  },
  { path: "/timeline", name: "Timeline", step: 3, about: "Which mechanic comes next.", count: `${TIMELINE_CARDS.length} questions` },
  {
    path: "/pressure",
    name: "Pressure",
    step: 4,
    about: "All of it fast: timed questions, or the whole fight on the clock.",
    count: "Quick round or full fight",
  },
  { path: "/sheet", name: "Cheat sheet", about: "Everything on one page.", count: "One page" },
];

/** Why the tool exists, in the author's words. */
const ABOUT_ME = [
  "I have played Final Fantasy XIV for more than ten years and tried savage raiding many times. As a casual player, I struggle to master the mechanics, and I cannot practice in the game as much as I would like.",
  "So I built this tool to learn fights outside the game, at my own pace, without making seven other people wait for me. I hope it helps you too.",
];

interface OutLinkProps {
  href: string;
  children: string;
}

/** A link to another site, which opens in a new tab. */
function OutLink({ href, children }: OutLinkProps) {
  return (
    <a href={href} target="_blank" rel="noopener" className="text-primary underline underline-offset-4">
      {children}
    </a>
  );
}

export function HomePage() {
  const slot = useSlotStore((s) => s.slot);
  const fig = LEARN_PICTURES[HERO_CARD]?.(slot);
  return (
    <main>
      <PageContainer className="space-y-10 py-6">
        {/* The banner: a gradient from the top left, sage in light mode and pale green in dark mode
            (the banner colour in app.css), with a Learn card's answer picture in a frame: white in light
            mode, dark in dark mode. On a phone the picture is a short strip from the middle of the
            arena, and the frame still goes all the way around it. */}
        <section className="flex flex-col gap-6 rounded-xl border bg-linear-135 from-banner/60 to-card dark:from-banner to-60% p-6 shadow-sm sm:flex-row sm:items-center">
          {fig && (
            <div className="shrink-0 rounded-lg bg-white p-1.5 shadow-md sm:w-60 dark:bg-card">
              <div className="overflow-hidden rounded-md max-sm:h-28">
                <LearnPicture
                  fig={fig}
                  answered
                  label="Raw Steel Trophy on the arena: your spot is the green area"
                  // On a phone: the picture is 108 units wide, with 4 units of room each side of the
                  // 100-unit arena. Make it 108% wide and move it 4% left, so the arena floor fills
                  // the strip from edge to edge and the white frame is the same on every side.
                  className="block h-auto w-full max-sm:-mt-[41%] max-sm:-ml-[4%] max-sm:w-[108%] max-sm:max-w-none"
                />
              </div>
            </div>
          )}
          <div className="space-y-3">
            <h2 className="font-display text-3xl tracking-wide text-balance">Practice savage mechanics without a party</h2>
            <p>
              Learn the mechanics, practice where you stand, then do it all fast. The answers follow Hector (Toxic), Kindred No Buddies and
              Fixed (3CJ) Ecliptic.
            </p>
            <p>
              You are set as <span className="font-semibold">{slot}</span>. Change it with the Group switch at the top. Your progress stays
              in this browser.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl tracking-wide">Start here</h2>
          <p className="text-sm text-muted-foreground">Go in order.</p>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {START.map((c) => (
              <li key={c.path}>
                <Link
                  to={c.path}
                  className="block h-full rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Card className="h-full transition-colors hover:bg-accent">
                    <CardHeader>
                      {/* The step's number, large, in the condensed face; the cheat sheet has none. */}
                      {c.step ? (
                        <span className="font-display text-4xl leading-none text-muted-foreground">{c.step}</span>
                      ) : (
                        <Badge variant="secondary">Reference</Badge>
                      )}
                      <CardTitle className="font-display text-xl tracking-wide">{c.name}</CardTitle>
                      <CardDescription>{c.about}</CardDescription>
                    </CardHeader>
                    <CardFooter className="mt-auto text-xs text-muted-foreground">{c.count}</CardFooter>
                  </Card>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* About me: the text, and my character beside it. On a phone the picture goes on top. */}
        <section className="flex flex-col-reverse gap-6 rounded-xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 space-y-3">
            <h2 className="font-display text-2xl tracking-wide">About me</h2>
            {ABOUT_ME.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">
              Today: M11S healers. Coming later: ranged, melee, tanks and more fights.
            </p>
            <p className="text-sm text-muted-foreground">
              Positions follow the <OutLink href={WTFDIG}>wtfdig guide</OutLink>; attack sizes come from{" "}
              <OutLink href={BOSSMOD}>BossMod</OutLink> and times from <OutLink href={CACTBOT}>cactbot</OutLink>.
            </p>
          </div>
          {/* My character: a static file in public/, cropped wide and aimed a fifth of the way down, so
              it shows the face, the card and both arms. */}
          <img
            src="/nydori-banner.jpeg"
            width={436}
            height={800}
            alt="My character in Final Fantasy XIV, in a green hooded robe, holding up a card"
            className="h-50 w-full shrink-0 rounded-lg object-cover object-[50%_20%] shadow-md sm:h-60 sm:w-[42%] sm:max-w-85"
          />
        </section>
      </PageContainer>
    </main>
  );
}
