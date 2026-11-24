import { useLocation, useNavigate } from "react-router";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FIGHTS } from "../data/fights";
import { inFight } from "../fightScope";
import { useFightScope } from "../hooks/useFight";
import { tabOf } from "../tabs";
import { OpenMenuIcon, PickedIcon } from "./icons";

/** The fight picker in the header, when the site has more than one fight: the fight you are on,
    as a tag, with a menu of every fight. A pick opens the same tab in that fight. */
export function FightPicker() {
  const { fight } = useFightScope();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const label = fight ? `${fight.info.short} ${fight.info.full}` : "Pick a Fight";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5 text-sm font-medium whitespace-nowrap hover:bg-black/35 focus-visible:ring-3 focus-visible:ring-highlight focus-visible:outline-none">
        <span className="sr-only">Fight: </span>
        {label}
        <OpenMenuIcon aria-hidden="true" className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {FIGHTS.map((f) => (
          <DropdownMenuItem key={f.id} onClick={() => navigate(inFight(`/${f.id}`, tabOf(pathname)?.path ?? "/"))}>
            {f.info.short} {f.info.full}
            {f === fight && <PickedIcon aria-hidden="true" className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
