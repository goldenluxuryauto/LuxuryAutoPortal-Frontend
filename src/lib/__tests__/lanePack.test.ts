import { describe, it, expect } from "vitest";
import { packLanes, laneCountOf } from "../lanePack";

type Bar = { id: string; left: number; width: number };
const pos = (b: Bar) => ({ left: b.left, width: b.width });
const lanesOf = (bars: Bar[]) => {
  const laid = packLanes(bars, pos);
  return Object.fromEntries(laid.map((x) => [x.item.id, x.lane]));
};

describe("packLanes", () => {
  it("keeps non-overlapping bars on one lane", () => {
    const l = lanesOf([
      { id: "a", left: 0, width: 40 },
      { id: "b", left: 60, width: 40 },
      { id: "c", left: 120, width: 40 },
    ]);
    expect(l).toEqual({ a: 0, b: 0, c: 0 });
  });

  it("puts an overlapping bar on its own lane (the reported bug)", () => {
    const laid = packLanes(
      [
        { id: "first", left: 0, width: 100 },
        { id: "second", left: 50, width: 100 },
      ],
      pos,
    );
    // Both must survive — neither may be dropped or share a lane.
    expect(laid).toHaveLength(2);
    expect(new Set(laid.map((x) => x.lane)).size).toBe(2);
    expect(laneCountOf(laid)).toBe(2);
  });

  it("reuses a freed lane instead of growing forever", () => {
    // a and b overlap; c starts after a ends, so c belongs back on lane 0.
    const l = lanesOf([
      { id: "a", left: 0, width: 50 },
      { id: "b", left: 20, width: 50 },
      { id: "c", left: 80, width: 30 },
    ]);
    expect(l.a).toBe(0);
    expect(l.b).toBe(1);
    expect(l.c).toBe(0);
  });

  it("treats back-to-back bars as touching, not overlapping", () => {
    // Bar a ends exactly where b begins — a checkout/checkin on the same day.
    const l = lanesOf([
      { id: "a", left: 0, width: 44 },
      { id: "b", left: 44, width: 44 },
    ]);
    expect(l).toEqual({ a: 0, b: 0 });
  });

  it("stacks three mutually overlapping bars on three lanes", () => {
    const laid = packLanes(
      [
        { id: "a", left: 0, width: 200 },
        { id: "b", left: 10, width: 200 },
        { id: "c", left: 20, width: 200 },
      ],
      pos,
    );
    expect(laneCountOf(laid)).toBe(3);
    expect(new Set(laid.map((x) => x.lane)).size).toBe(3);
  });

  it("drops bars with no position but keeps the rest", () => {
    const laid = packLanes(
      [
        { id: "visible", left: 0, width: 40 },
        { id: "offscreen", left: 0, width: 0 },
      ],
      (b: Bar) => (b.id === "offscreen" ? null : pos(b)),
    );
    expect(laid.map((x) => x.item.id)).toEqual(["visible"]);
  });

  it("is order-independent — input order must not change the outcome", () => {
    const bars: Bar[] = [
      { id: "a", left: 0, width: 100 },
      { id: "b", left: 50, width: 100 },
      { id: "c", left: 300, width: 50 },
    ];
    expect(lanesOf(bars)).toEqual(lanesOf([...bars].reverse()));
  });

  it("returns no lanes for no bars", () => {
    expect(laneCountOf(packLanes([] as Bar[], pos))).toBe(0);
  });
});

// Real overlapping pairs pulled from prod (plate T994DT had 17 overlaps).
// Modelled at the calendar's real geometry: COL_W=44, bar = days*44 - 6.
const COL_W = 44;
const bar = (startDay: number, endDay: number) => ({
  left: startDay * COL_W,
  width: Math.max(COL_W * 0.6, (endDay - startDay + 1) * COL_W - 6),
});

describe("real overlapping bookings", () => {
  it("shows both bars when one booking starts before the other ends", () => {
    const bookings = [
      { id: "A", ...bar(2, 6) },
      { id: "B", ...bar(5, 9) }, // overlaps A on days 5-6
      { id: "C", ...bar(11, 13) },
    ];
    const laid = packLanes(bookings, (b) => ({ left: b.left, width: b.width }));
    expect(laid).toHaveLength(3);
    const byId = Object.fromEntries(laid.map((x) => [x.item.id, x.lane]));
    expect(byId.A).not.toBe(byId.B); // the bug: B used to cover A
    expect(byId.C).toBe(0); // C is clear, back to lane 0
    expect(laneCountOf(laid)).toBe(2);
  });

  it("same-day turnover stacks, because both occupy that day column", () => {
    // Guest checks out day 5, next guest checks in day 5. The calendar buckets
    // by MT calendar day, so day 5 is genuinely shared and must show both.
    const laid = packLanes(
      [{ id: "out", ...bar(1, 5) }, { id: "in", ...bar(5, 8) }],
      (b) => ({ left: b.left, width: b.width }),
    );
    expect(laneCountOf(laid)).toBe(2);
  });
});
