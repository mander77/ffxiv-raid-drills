// The Home page (/): what the site does, a card that links to each tab, and About me.
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FigPicture } from "../components/arena/FigPicture";
import { PageContainer } from "../components/PageContainer";
import { MAPS } from "../data/drills";
import { MECH_FIGS } from "../data/figs";
import { MECH, NEXT_ITEMS } from "../data/questions";
import { BOSSMOD, CACTBOT, WTFDIG } from "../data/sources";
import { useSlotStore } from "../stores/slot";

/** The Learn card whose answer picture is at the top of the page: the first mechanic of the
    fight, with the party's spot in green and you in it. */
const HERO_CARD = "k-raw-first";

/** A card under "Start here": one tab, in the order to learn the fight. */
interface StartCard {
  path: string;
  name: string;
  step: string;
  about: string;
  count: string;
}

/** The tabs to start with, in order. Each rebuild step adds its tab. */
const START: readonly StartCard[] = [
  { path: "/mech", name: "Learn", step: "Step 1", about: "What each mechanic does, with a picture.", count: `${MECH.length} questions` },
  {
    path: "/map",
    name: "Practice",
    step: "Step 2",
    about: "Click where you stand, one mechanic at a time.",
    count: `${MAPS.length} mechanics`,
  },
  { path: "/next", name: "Timeline", step: "Step 3", about: "Which mechanic comes next.", count: `${NEXT_ITEMS.length} questions` },
  { path: "/sheet", name: "Cheat sheet", step: "Reference", about: "Everything on one page.", count: "One page" },
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
  const fig = MECH_FIGS[HERO_CARD]?.(slot);
  return (
    <main>
      <PageContainer className="space-y-10 py-6">
        {/* The banner: a soft green gradient from the top left, with a Learn card's answer picture in
            a white frame. On a phone the picture is a short strip from the middle of the arena, and
            the frame still goes all the way around it. */}
        <section className="flex flex-col gap-6 rounded-xl border bg-linear-135 from-green-100 to-card to-60% p-6 shadow-sm sm:flex-row sm:items-center">
          {fig && (
            <div className="shrink-0 rounded-lg bg-card p-1.5 shadow-md sm:w-60">
              <div className="overflow-hidden rounded-md max-sm:h-28">
                <FigPicture
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
            <p className="text-xs font-semibold tracking-wider text-green-700 uppercase">M11S · The Tyrant (Savage) · Healers</p>
            <h2 className="text-2xl font-semibold tracking-tight text-balance">Practice savage mechanics without a party</h2>
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
          <h2 className="text-xl font-semibold">Start here</h2>
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
                      <Badge variant="secondary">{c.step}</Badge>
                      <CardTitle>{c.name}</CardTitle>
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
            <h2 className="text-xl font-semibold">About me</h2>
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
