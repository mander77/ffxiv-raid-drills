// The Home page (/): what the site does, a card that links to each tab, and About me.
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FigPicture } from "../components/arena/FigPicture";
import { PageContainer } from "../components/PageContainer";
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
  { path: "/next", name: "Timeline", step: "Step 2", about: "Which mechanic comes next.", count: `${NEXT_ITEMS.length} questions` },
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
        <section className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {fig && (
            <div className="w-full max-w-60 shrink-0 self-center">
              <FigPicture fig={fig} answered label="Raw Steel Trophy on the arena: your spot is the green area" className="h-auto w-full" />
            </div>
          )}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">M11S · The Tyrant (Savage) · Healers</p>
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

        <section className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="space-y-3">
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
          {/* My character: a static file in public/, cropped wide to the face, the card and both arms. */}
          <img
            src="/nydori-banner.jpeg"
            width={436}
            height={800}
            alt="My character in Final Fantasy XIV, in a green hooded robe, holding up a card"
            className="h-64 w-full rounded-xl object-cover md:h-auto md:w-56"
          />
        </section>
      </PageContainer>
    </main>
  );
}
