import { AnalysisLayout, type RouteTab } from "./AnalysisLayout";

/** How the establishment is doing. */
const TABS: RouteTab[] = [
  { id: "health-score", label: "Health Score" },
  { id: "benchmark", label: "Benchmark" },
];

export const InsightsPage = () => <AnalysisLayout tabs={TABS} />;
