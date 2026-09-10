/**
 * Pack timeline bars into non-overlapping lanes.
 *
 * A vehicle row on the trips calendar can legitimately hold two bars that share
 * days — a booking that runs past midnight into the next one, or an owner
 * block-off spanning a reservation. Drawing every bar at the same vertical
 * offset means the later one paints over the earlier one, which reads as the
 * booking having vanished.
 *
 * Greedy interval partitioning: walk the bars left-to-right and drop each into
 * the first lane whose previous bar has already ended, otherwise open a new
 * lane. This is the standard minimum-lane packing and is O(n·lanes), which is
 * nothing at calendar sizes.
 *
 * Positions are compared in RENDERED pixels rather than raw timestamps: pixels
 * are what actually collide on screen. Two bookings hours apart still occupy
 * the same day column, and the caller enforces a minimum bar width that can
 * make a short booking render wider than its true duration.
 */
export interface LanePos {
  left: number;
  width: number;
}

export interface Laid<T, P extends LanePos> {
  item: T;
  pos: P;
  lane: number;
}

/**
 * Bars closer than this many pixels are treated as touching, not overlapping,
 * so back-to-back bookings stay on one lane instead of being split apart by
 * the 3px inset and sub-pixel rounding.
 */
const TOUCH_SLACK = 3;

export function packLanes<T, P extends LanePos>(
  items: T[],
  posOf: (item: T) => P | null,
): Laid<T, P>[] {
  const placed = items
    .map((item) => ({ item, pos: posOf(item) }))
    .filter((x): x is { item: T; pos: P } => x.pos !== null)
    // Left-to-right; wider bar first on a tie so the long booking takes the
    // top lane and short ones stack under it, which reads more naturally.
    .sort((a, b) => a.pos.left - b.pos.left || b.pos.width - a.pos.width);

  const laneEnds: number[] = [];
  return placed.map(({ item, pos }) => {
    const end = pos.left + pos.width;
    let lane = laneEnds.findIndex((laneEnd) => pos.left >= laneEnd - TOUCH_SLACK);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = end;
    return { item, pos, lane };
  });
}

/** Highest lane index used, as a count (0 bars → 0 lanes). */
export function laneCountOf<T, P extends LanePos>(laid: Laid<T, P>[]): number {
  return laid.reduce((m, x) => Math.max(m, x.lane + 1), 0);
}
