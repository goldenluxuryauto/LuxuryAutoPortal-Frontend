// Per-Car Income and Expense Page (singular)
// Accessed from: View Car → "Income and Expense" menu item
// Route: /admin/cars/:id/income-expense

import { useRoute } from "wouter";
import IncomeExpensePage from "./income-expenses/index";

export default function CarIncomeExpensePage() {
  const [, params] = useRoute("/admin/cars/:id/income-expense");
  const carId = params?.id ? parseInt(params.id, 10) : null;

  if (!carId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-400">Invalid car ID</p>
      </div>
    );
  }

  // Render the same IncomeExpensePage component but with carId from route params
  // The component will handle the car parameter properly
  return <IncomeExpensePage carIdFromRoute={carId} />;
}
