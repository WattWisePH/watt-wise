export interface PriorityActionData {
  title: string;
  description: string;
  impact: "Low Impact" | "Medium Impact" | "High Impact";
}

export interface ConsumptionRow {
  label: string;
  value: number;
  isAverage?: boolean;
}
