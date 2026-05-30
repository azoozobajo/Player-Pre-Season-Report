export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  organization_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  season?: string;
  start_date?: string;
  end_date?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProgramGroup {
  id: string;
  program_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Player {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth?: string;
  nationality?: string;
  position?: string;
  jersey_number?: number;
  height_cm?: number;
  weight_kg?: number;
  photo_url?: string;
  phone?: string;
  email?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProgramPlayer {
  id: string;
  program_id: string;
  player_id: string;
  group_id?: string;
  joined_date?: string;
  status: 'active' | 'injured' | 'inactive';
  created_at: string;
  player?: Player;
  group?: ProgramGroup;
}

export interface Coach {
  id: string;
  user_id: string;
  full_name: string;
  specialization?: string;
  phone?: string;
  email?: string;
  photo_url?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProgramCoach {
  id: string;
  program_id: string;
  coach_id: string;
  role?: string;
  created_at: string;
  coach?: Coach;
}

export interface IndicatorCategory {
  id: string;
  user_id: string;
  name: string;
  name_ar?: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order: number;
  created_at: string;
}

export type IndicatorType = 'numeric' | 'rating' | 'text' | 'choice';
export type IndicatorDirection = 'higher_better' | 'lower_better' | 'neutral';

export interface Indicator {
  id: string;
  user_id: string;
  program_id?: string;
  category_id?: string;
  name: string;
  name_ar?: string;
  description?: string;
  type: IndicatorType;
  direction: IndicatorDirection;
  unit?: string;
  min_value?: number;
  max_value?: number;
  target_value?: number;
  choices?: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  category?: IndicatorCategory;
}

export interface AssessmentSession {
  id: string;
  program_id: string;
  user_id: string;
  name: string;
  session_date: string;
  notes?: string;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssessmentResult {
  id: string;
  session_id: string;
  player_id: string;
  indicator_id: string;
  value_numeric?: number;
  value_rating?: number;
  value_text?: string;
  value_choice?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  indicator?: Indicator;
  player?: Player;
}

export interface CoachNote {
  id: string;
  player_id: string;
  program_id: string;
  coach_id?: string;
  user_id: string;
  note_date: string;
  content: string;
  category?: string;
  created_at: string;
  coach?: Coach;
}

export interface Recommendation {
  id: string;
  player_id: string;
  program_id: string;
  user_id: string;
  recommendation_date: string;
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
}

export interface AttendanceSession {
  id: string;
  program_id: string;
  user_id: string;
  session_date: string;
  session_type?: string;
  notes?: string;
  created_at: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  attendance_session_id: string;
  player_id: string;
  status: AttendanceStatus;
  notes?: string;
  created_at: string;
  player?: Player;
}

export interface BodyCompositionRecord {
  id: string;
  player_id: string;
  program_id: string;
  user_id: string;
  measurement_date: string;
  weight_kg?: number;
  height_cm?: number;
  body_fat_percentage?: number;
  muscle_mass_kg?: number;
  bmi?: number;
  waist_cm?: number;
  chest_cm?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportExport {
  id: string;
  player_id: string;
  program_id: string;
  user_id: string;
  report_type: string;
  file_url?: string;
  generated_at: string;
}

export interface AppSettings {
  id: string;
  user_id: string;
  organization_name?: string;
  logo_url?: string;
  report_title?: string;
  primary_color?: string;
  accent_color?: string;
  report_footer?: string;
  created_at: string;
  updated_at: string;
}
