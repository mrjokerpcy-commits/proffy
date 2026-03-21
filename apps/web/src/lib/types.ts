export interface Course {
  id: string;
  user_id: string;
  name: string;
  name_hebrew: string | null;
  university: string;
  department: string | null;
  professor: string | null;
  semester: string | null;
  exam_date: string | null;
  credits: number | null;
  user_level: string | null;
  goal: string | null;
  hours_per_week: number | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  streaming?: boolean;
  thinkingText?: string;
}

export interface Source {
  filename: string;
  type: string;
  professor?: string;
  score: number;
}
