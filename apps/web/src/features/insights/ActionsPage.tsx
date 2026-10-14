import { AnalysisLayout, type RouteTab } from "./AnalysisLayout";

/** What to do about it, and what it would save. */
const TABS: RouteTab[] = [
  { id: "priority-actions", label: "Priority Actions", also: ["archived"] },
  { id: "simulator", label: "Simulator" },
];

export const ActionsPage = () => <AnalysisLayout tabs={TABS} />;
