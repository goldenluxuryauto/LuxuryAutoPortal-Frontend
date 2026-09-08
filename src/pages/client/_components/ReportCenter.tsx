import React from "react";
import { ReportLinkCard } from "./ReportLinkCard";

interface LinkItem {
  href: string;
  icon: React.ElementType;
  label: string;
  external?: boolean;
  /**
   * When true, renders an invisible cell that holds a slot in the grid.
   * Use this to force the next link onto a fresh row instead of letting
   * CSS Grid auto-flow tuck it into the leftover column.
   */
  placeholder?: boolean;
}

interface ReportCenterProps {
  reportLinks: LinkItem[];
  /**
   * Set on pages that also render <VehicleStatsQuickLinks /> ("View Stats").
   * That section already links to the same per-car stats pages, so showing them
   * here too duplicated five links — and worse, View Stats has its own car
   * dropdown, so for a multi-car client the two sections could point at
   * different cars at once. Drops the overlapping links and keeps the ones
   * only Report Center has.
   */
  hideVehicleStatsLinks?: boolean;
  /**
   * Set on client pages whose sidebar already carries these destinations.
   * "History" here is the same page as the sidebar's "Trip History", so the
   * client saw one route twice on a single screen.
   */
  hideSidebarDuplicateLinks?: boolean;
}

/** Destinations the client sidebar already provides, so Report Center should
 *  not repeat them. Matched on href, since the two places label them
 *  differently ("History" here vs "Trip History" in the sidebar). */
const SIDEBAR_HREFS = ["/client/trip-history"];

/** Labels covered by the View Stats section (matched case-insensitively, and
 *  tolerant of the "… Report"/"… Schedule" suffixes Report Center adds). */
const VEHICLE_STATS_LABELS = [
  "earnings",
  "totals",
  "graphs and charts",
  "nada depreciation",
  "payment history",
];

function isVehicleStatsLink(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return VEHICLE_STATS_LABELS.some(
    (l) => normalized === l || normalized === `${l} report` || normalized === `${l} schedule`,
  );
}

export function ReportCenter({
  reportLinks,
  hideVehicleStatsLinks,
  hideSidebarDuplicateLinks,
}: ReportCenterProps) {
  let links = hideVehicleStatsLinks
    ? reportLinks.filter((l) => l.placeholder || !isVehicleStatsLink(l.label))
    : reportLinks;
  if (hideSidebarDuplicateLinks) {
    links = links.filter((l) => l.placeholder || !SIDEBAR_HREFS.includes(l.href));
  }

  return (
    <div className="rounded-xl border-2 border-[#d3bc8d] bg-[#D3BC8D]/10 px-6 py-5 shadow-sm shadow-[#D3BC8D]/10">
      <h2 className="text-base font-bold text-foreground mb-3">Report Center</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1 pl-2">
        {links.map((link, idx) =>
          link.placeholder ? (
            <div key={`placeholder-${idx}`} aria-hidden className="invisible" />
          ) : (
            <ReportLinkCard
              key={link.label}
              href={link.href}
              icon={link.icon}
              label={link.label}
              external={link.external}
            />
          ),
        )}
      </div>
    </div>
  );
}
