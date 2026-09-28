/**
 * A row of the monthly-consumption comparison.
 *
 * PriorityActionData used to live here too, describing the shape of the
 * placeholder list. The engine's Recommendation type replaces it — see
 * lib/insights.ts.
 */
export interface ConsumptionRow {
  label: string;
  value: number;
  isAverage?: boolean;
}
