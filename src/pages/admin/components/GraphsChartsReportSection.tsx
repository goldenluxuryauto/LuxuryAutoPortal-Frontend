import React, { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type GraphOption = "Total Rental Income and Expenses";

interface GraphsChartsReportSectionProps {
  title?: string;
  className?: string;
}

export function GraphsChartsReportSection({
  title = "Graphs and Charts Report",
  className,
}: GraphsChartsReportSectionProps) {
  const [selectedGraph, setSelectedGraph] = useState<GraphOption>("Total Rental Income and Expenses");
  const [fromYear, setFromYear] = useState<string>("2026");
  const [toYear, setToYear] = useState<string>("2026");

  // Placeholder chart data (currently no backend data source wired up)
  const chartData = useMemo(() => {
    return [
      {
        year: fromYear === toYear ? fromYear : `${fromYear}-${toYear}`,
        "Rental Income": 0,
        "Total Expenses": 0,
      },
    ];
  }, [fromYear, toYear]);

  const hasData = false;

  return (
    <div className={className}>
      <h1 className="text-3xl font-serif text-[#EAEB80] italic mb-6">{title}</h1>

      {/* Graph Selection and Date Range */}
      <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
          <div className="flex-1">
            <Label className="text-sm text-gray-400 mb-2 block">Select Graphs and Charts</Label>
            <Select value={selectedGraph} onValueChange={(v) => setSelectedGraph(v as GraphOption)}>
              <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                <SelectItem value="Total Rental Income and Expenses">Total Rental Income and Expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4">
            <div>
              <Label className="text-sm text-gray-400 mb-2 block">From</Label>
              <Select value={fromYear} onValueChange={setFromYear}>
                <SelectTrigger className="w-[120px] bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                  <SelectItem value="2021">2021</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm text-gray-400 mb-2 block">To</Label>
              <Select value={toYear} onValueChange={setToYear}>
                <SelectTrigger className="w-[120px] bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                  <SelectItem value="2021">2021</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-300 text-center mb-6">{selectedGraph}</h2>

          {hasData ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="year" stroke="#9ca3af" tick={{ fill: "#9ca3af" }} />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fill: "#9ca3af" }}
                  domain={[0, 1.0]}
                  ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    color: "#fff",
                  }}
                />
                <Legend wrapperStyle={{ color: "#9ca3af" }} iconType="square" />
                <Line
                  type="monotone"
                  dataKey="Rental Income"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ fill: "#38bdf8", r: 4 }}
                  name="Rental Income"
                />
                <Line
                  type="monotone"
                  dataKey="Total Expenses"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={{ fill: "#a78bfa", r: 4 }}
                  name="Total Expenses"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="relative" style={{ height: "400px" }}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="year" stroke="#9ca3af" tick={{ fill: "#9ca3af" }} />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fill: "#9ca3af" }}
                    domain={[0, 1.0]}
                    ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      color: "#fff",
                    }}
                  />
                  <Legend wrapperStyle={{ color: "#9ca3af" }} iconType="square" />
                  <Line
                    type="monotone"
                    dataKey="Rental Income"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={{ fill: "#38bdf8", r: 4 }}
                    name="Rental Income"
                  />
                  <Line
                    type="monotone"
                    dataKey="Total Expenses"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    dot={{ fill: "#a78bfa", r: 4 }}
                    name="Total Expenses"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex gap-8">
                  <div className="bg-black/80 px-4 py-2 rounded text-white text-sm">No data</div>
                  <div className="bg-black/80 px-4 py-2 rounded text-white text-sm">No data</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


