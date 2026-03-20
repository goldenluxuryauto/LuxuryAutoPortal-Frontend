import React from "react";
import { CARD_BG_BLACK, CARD_BG_GOLD, CARD_BG_LIGHT, CARD_TEXT_DARK, CARD_TEXT_LIGHT } from "./constants";

interface SummaryCardProps {
  label: string;
  value: string;
  variant?: "black" | "light" | "gold";
  valueColor?: string;
  className?: string;
}

export function SummaryCard({ label, value, variant = "gold", valueColor, className = "" }: SummaryCardProps) {
  const bg       = variant === "black" ? CARD_BG_BLACK : variant === "gold" ? CARD_BG_GOLD : CARD_BG_LIGHT;
  const valueClr = valueColor ?? (variant === "black" ? CARD_TEXT_LIGHT : CARD_TEXT_DARK);
  return (
    <div
      style={{ backgroundColor: bg, minHeight: "54px" }}
      className={`flex flex-col items-center justify-center px-3 py-1.5 border border-[#d8d0b8] rounded-lg ${className}`}
    >
      {label && <p className="text-xs text-gray-400 mb-0.5">{label}</p>}
      <p className="text-lg font-extrabold leading-tight text-center" style={{ color: valueClr }}>{value}</p>
    </div>
  );
}
