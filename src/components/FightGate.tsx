import { Navigate, Outlet, useParams } from "react-router";
import { fightById } from "../data/fights";
import { useFightScope } from "../hooks/useFight";
import { FightChooser } from "./FightChooser";

/** The pages of a fight (App.tsx). An address with an unknown fight opens Home. An address with
    no fight opens its page when the site has one fight, and asks you to pick one when it has more. */
export function FightGate() {
  const { fight: id } = useParams();
  const { fight } = useFightScope();
  if (id !== undefined && !fightById(id)) return <Navigate to="/" replace />;
  if (!fight) return <FightChooser />;
  return <Outlet />;
}
