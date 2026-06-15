export type Department = { id: string; name: string; short_name: string };

export type QualitySeriesPoint = {
  period: string;
  fact: number | null;
  target: number | null;
  marker: string;
};

export type QualityMetric = {
  id: string;
  department_id: string;
  department: string;
  title: string;
  goal: string;
  periodicity: string;
  owner: string;
  comment: string;
  fact_label: string;
  target_label: string;
  latest_period: string;
  latest_fact: number | null;
  latest_target: number | null;
  progress: number | null;
  status: string;
  series: QualitySeriesPoint[];
};

export type EventItem = {
  id: string;
  department_id: string;
  department: string;
  row_number: number;
  number: string;
  priority: string;
  name: string;
  owner: string;
  curator: string;
  moscow_yaroslavl: boolean;
  electoral_cycle: boolean;
  deadline: string;
  agent: string;
  status: string;
  raw_status: string;
  traffic: string;
  traffic_label: string;
  budget: string;
  notes: string;
  week: string;
  deviation: string;
  root_cause: string;
  countermeasure: string;
  responsible: string;
  term_weeks: string;
  status_code: number;
  closure_confirm: string;
  is_high_priority: boolean;
  is_done: boolean;
  is_problem: boolean;
};

export type MoraleEntry = {
  id: number;
  department_id: string;
  employee: string;
  week: string;
  value: number | null;
};

export type ClimatePoint = { week: string; value: number | null; count: number };

export type Climate = {
  department_id: string;
  department: string;
  title: string;
  question: string;
  target: number;
  employee_count: number;
  latest_week: string;
  latest_value: number | null;
  status: string;
  series: ClimatePoint[];
};

export type Meeting = {
  id: string;
  source_row: number;
  type: string;
  level: string;
  department: string;
  day: string;
  time: string;
  place: string;
  format: string;
  leader: string;
  leader_phone: string;
  quality_owner: string;
  quality_owner_phone: string;
};

export type Summary = {
  events_total: number;
  events_done: number;
  events_completion: number;
  high_priority_total: number;
  high_priority_done: number;
  high_priority_completion: number;
  problem_total: number;
  quality_total: number;
  quality_at_risk: number;
  climate_filled_departments: number;
  meetings_total: number;
  status_counts: Record<string, number>;
  priority_counts: Record<string, number>;
  department_counts: Record<string, number>;
};
