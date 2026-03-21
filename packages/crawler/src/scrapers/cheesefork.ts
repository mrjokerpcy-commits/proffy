import * as cheerio from "cheerio";

export interface TechnionCourse {
  courseNumber: string;
  name: string;
  nameHebrew: string;
  lecturer: string;
  credits: number;
  semester: string;
  examDate: string | null;
  examType: string | null;
  prerequisites: string[];
}

const BASE_URL = "https://cheesefork.co.il";

export async function scrapeCheesefork(semester: string): Promise<TechnionCourse[]> {
  console.log(`[cheesefork] Scraping semester: ${semester}`);

  // cheesefork loads data dynamically — fetch the main JSON data endpoint
  const url = `${BASE_URL}/api/courses?semester=${semester}`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "StudyAI/1.0 (educational, contact: admin@studyai.co.il)" },
    });

    if (!response.ok) {
      throw new Error(`cheesefork returned ${response.status}`);
    }

    const data = await response.json();
    return parseCheeseforkData(data, semester);
  } catch (err) {
    console.error("[cheesefork] Error:", err);
    return [];
  }
}

function parseCheeseforkData(data: any, semester: string): TechnionCourse[] {
  // cheesefork returns an array or object of courses — normalize here
  const courses: TechnionCourse[] = [];

  const items = Array.isArray(data) ? data : Object.values(data);

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    courses.push({
      courseNumber: String(item.id || item.course_id || ""),
      name: item.name_en || item.name || "",
      nameHebrew: item.name_he || item.name || "",
      lecturer: item.lecturer || item.professor || "",
      credits: Number(item.credits || item.points || 0),
      semester,
      examDate: item.exam_date || item.examDate || null,
      examType: item.exam_type || null,
      prerequisites: Array.isArray(item.prerequisites) ? item.prerequisites : [],
    });
  }

  return courses;
}
