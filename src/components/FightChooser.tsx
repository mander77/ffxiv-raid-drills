import { Link, useLocation } from "react-router";
import { FIGHTS } from "../data/fights";
import { inFight } from "../fightScope";
import { PageContainer } from "./PageContainer";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";

/** The page of an address that names no fight, when the site has more than one: pick a fight,
    and the same address opens in it. */
export function FightChooser() {
  const { pathname, search } = useLocation();
  return (
    <main>
      <PageContainer className="space-y-4 py-6">
        <h2 className="font-display text-3xl tracking-wide">Pick a Fight</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIGHTS.map((f) => (
            <li key={f.id}>
              <Link
                to={inFight(`/${f.id}`, pathname) + search}
                className="block h-full rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <Card className="h-full transition-colors hover:bg-accent">
                  <CardHeader>
                    <CardTitle className="font-display text-xl tracking-wide">{f.info.short}</CardTitle>
                    <CardDescription>{f.info.full}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </PageContainer>
    </main>
  );
}
