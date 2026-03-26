import { SectionHeader } from "@/components/admin/dashboard";

interface Notice {
  title: string;
  category: string;
  categoryColor: string;
  priority: string;
  priorityColor: string;
  date: string;
  body: string;
}

const categoryColors: Record<string, string> = {
  Operations: "bg-blue-100 text-blue-800",
  Policy: "bg-purple-100 text-purple-800",
  HR: "bg-green-100 text-green-800",
  Revenue: "bg-yellow-100 text-yellow-800",
  Compliance: "bg-orange-100 text-orange-800",
};

const priorityColors: Record<string, string> = {
  Urgent: "bg-red-100 text-red-800",
  Required: "bg-red-100 text-red-800",
  Important: "bg-[#FFD700]/20 text-[#B8860B]",
  Info: "bg-gray-100 text-gray-600",
};

function getCurrentMonthDate(day: number): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric" },
  );
}

const notices: Notice[] = [
  {
    title: "Fleet Inspection Schedule",
    category: "Operations",
    categoryColor: categoryColors.Operations,
    priority: "Important",
    priorityColor: priorityColors.Important,
    date: getCurrentMonthDate(1),
    body: "All vehicles must complete monthly inspections by the 15th. Please ensure pre-trip and post-trip photos are uploaded to the system.",
  },
  {
    title: "New Cleaning Protocol",
    category: "Policy",
    categoryColor: categoryColors.Policy,
    priority: "Required",
    priorityColor: priorityColors.Required,
    date: getCurrentMonthDate(3),
    body: "Updated vehicle cleaning checklist is now mandatory before every guest pickup. See the training manual for details.",
  },
  {
    title: "Holiday Schedule",
    category: "HR",
    categoryColor: categoryColors.HR,
    priority: "Info",
    priorityColor: priorityColors.Info,
    date: getCurrentMonthDate(5),
    body: "Office will operate with reduced hours during upcoming holidays. Contact management for scheduling questions.",
  },
  {
    title: "Turo Performance Update",
    category: "Revenue",
    categoryColor: categoryColors.Revenue,
    priority: "Info",
    priorityColor: priorityColors.Info,
    date: getCurrentMonthDate(8),
    body: "Great month! Fleet utilization up 12% compared to last month. Keep up the excellent guest reviews.",
  },
  {
    title: "Insurance Renewal Reminder",
    category: "Compliance",
    categoryColor: categoryColors.Compliance,
    priority: "Urgent",
    priorityColor: priorityColors.Urgent,
    date: getCurrentMonthDate(10),
    body: "Vehicle insurance policies are up for renewal. All paperwork must be submitted to the office by end of month.",
  },
  {
    title: "Team Meeting",
    category: "HR",
    categoryColor: categoryColors.HR,
    priority: "Important",
    priorityColor: priorityColors.Important,
    date: getCurrentMonthDate(12),
    body: "Monthly all-hands meeting scheduled. Attendance is mandatory for all staff. Agenda will be shared via email.",
  },
];

function NoticeCard({ notice }: { notice: Notice }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${notice.categoryColor}`}
        >
          {notice.category}
        </span>
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${notice.priorityColor}`}
        >
          {notice.priority}
        </span>
      </div>
      <h3 className="mb-1 font-semibold text-gray-900">{notice.title}</h3>
      <p className="mb-2 text-xs text-gray-400">{notice.date}</p>
      <p className="text-sm leading-relaxed text-gray-600">{notice.body}</p>
    </div>
  );
}

export default function NoticeBoardSection() {
  return (
    <div className="mb-8">
      <SectionHeader title="NOTICE BOARD" />
      <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {notices.map((notice) => (
          <NoticeCard key={notice.title} notice={notice} />
        ))}
      </div>
      <p className="mt-3 text-center text-xs italic text-gray-400">
        Notice board will be connected to a management system in a future
        update.
      </p>
    </div>
  );
}
