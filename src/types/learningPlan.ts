export interface LearningActionTarget {
  view_mode: string;
  subject_id: string;
  lesson_id?: string;
  lesson_code?: string;
  exercise_id?: string;
  chapter_number?: number;
}

export interface LearningPlanAction {
  id: string;
  kind: "review" | "practice" | "check_understanding" | "retest";
  label: string;
  instruction: string;
  target?: LearningActionTarget;
}

export interface LearningPlan {
  status: "no_verified_evidence" | "assessment_in_progress" | "needs_practice" | "on_track";
  summary: string;
  evidence: { kind: "quiz" | "sandbox" | "instructor"; source_id: string; label: string; detail: string }[];
  actions: LearningPlanAction[];
  progress: {
    verification_note: string;
    quiz?: {
      latest_score: number;
      latest_total: number;
      previous_score?: number;
      previous_total?: number;
      delta_percentage_points?: number;
      comparable: boolean;
    };
    sandbox?: {
      passed: number;
      total: number;
      previous_passed?: number;
      previous_total?: number;
      delta_passed?: number;
      comparable: boolean;
    };
  };
}
