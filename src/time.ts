// Fight times as text. A fight time is seconds into the fight; the text is minutes and seconds.

/** "1:24" to 84. */
export const sec = (t: string): number => {
  const [m, s] = t.split(":").map(Number);
  return m * 60 + s;
};
/** 84 to "1:24". The seconds round down, as on a clock, so 119.6 is "1:59". */
export const clock = (t: number): string => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
