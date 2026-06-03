export interface ProductProfile {
  product_name: string | null;
  product_type: string;
  seat_height_mm: number | null;
  seat_height_lowest_mm: number | null;
  is_sidewalk: boolean;
  is_small_sidewalk: boolean;
  has_motor: boolean;
  motor_power_w: number | null;
  max_speed_mph: number | null;
  has_battery: boolean;
  has_charger: boolean;
  brake_type: string | null;
  gear_type: string | null;
  target_age_group: string | null;
  has_derailleur: boolean;
}

export interface BOMComponent {
  standard_name: string;
  display_name: string | null;
  category: string;
  sub_category: string | null;
  original_names: string[];
  quantity: number;
  material: string | null;
  specifications: { key: string; value: unknown; unit: string | null; confidence: number }[];
  norm_confidence: number;
}

export interface RegulationSource {
  regulation: string;
  section: string;
}

export interface Finding {
  rule_id: string;
  category: string;
  requirement_summary: string;
  regulation: RegulationSource;
  mandate: string;
  status: "MET" | "NOT_MET" | "PARTIALLY_MET" | "NOT_ASSESSED" | "EXEMPT";
  confidence: string | null;
  gap_description: string | null;
  gap_type: string | null;
  risk_level: "Critical" | "Major" | "Minor" | "Info";
  risk_score: number;
  remediation: string | null;
  consequences: string[];
  pending_verifications: string[];
}

export interface AnalysisSummary {
  total_rules: number;
  met_count: number;
  not_met_count: number;
  partially_met_count: number;
  not_assessed_count: number;
  exempt_count: number;
  critical_issues: number;
  major_issues: number;
  minor_issues: number;
}

export interface ApplicableRegulation {
  regulation: string;
  sections: string[];
}

export interface AnalysisResponse {
  id: string;
  product_name: string | null;
  product_type: string;
  product_profile: ProductProfile;
  components: BOMComponent[];
  findings: Finding[];
  compliance_score: number | null;
  compliance_status: string | null;
  risk_score: number | null;
  risk_level: string | null;
  summary: AnalysisSummary;
  applicable_regulations: ApplicableRegulation[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AnalysisListItem {
  id: string;
  product_name: string | null;
  product_type: string;
  compliance_score: number | null;
  risk_level: string | null;
  status: string;
  created_at: string;
}

export interface UploadResponse {
  id: string;
  status: string;
  message: string;
}

export interface RegulationRuleBrief {
  rule_id: string;
  category: string;
  requirement_summary: string;
  regulation: { regulation: string; section: string };
  mandate: string;
  applicable_products: string[];
  risk_level: string;
}
