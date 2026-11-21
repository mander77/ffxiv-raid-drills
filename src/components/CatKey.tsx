import { CATS, type Cat } from "../data/abilities";
import { Marks } from "./Marks";

/** The colour key: every ability category with its mark. */
export function CatKey() {
  return <div class="cmkey">{(Object.keys(CATS) as Cat[]).map(c => <span key={c}><Marks cats={[c]} />{CATS[c]}</span>)}</div>;
}
