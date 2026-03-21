I want to build an AI-powered study assistant for Israeli university students. Here is everything about the product, architecture, and what needs to be built:



\---



\## PRODUCT OVERVIEW



An AI study assistant specifically for Israeli universities (TAU, Technion, HUJI, BGU, Bar Ilan) that:

\- Learns from all available course material online and from faculty Google Drives

\- Helps students study, understand material, and prepare for exams

\- Knows each professor's exam style and patterns

\- Knows exam dates, semester schedules, course lists per university

\- Builds a personalized learning path for each student per course

\- Is gated behind a paid subscription

\- Primary interfaces: Beautiful web app (like Claude.ai) + WhatsApp bot



\---



\## SEMESTER \& COURSE SYSTEM



\*\*Semester selector (UI):\*\*

\- Slider/toggle at top of dashboard: `← Semester A | Semester B | Summer →`

\- When student selects semester → system fetches all relevant data for that semester

\- Shows: courses available, exam dates, submission deadlines, important dates



\*\*Technion — cheesefork.co.il integration:\*\*

\- Scrape/API: `https://cheesefork.co.il` (Technion course and exam data)

\- Fetch per semester: course list, exam dates, course numbers, lecturer names, credit points, prerequisites

\- Auto-populate when Technion student selects their semester

\- Update every 24h to catch schedule changes



\*\*Other universities:\*\*

\- TAU: scrape `https://courses.tau.ac.il`

\- HUJI: scrape `https://shnaton.huji.ac.il`

\- BGU: scrape `https://in.bgu.ac.il/pages/courses.aspx`

\- Bar Ilan: scrape their course catalog

\- If scraping fails or data unavailable → student tells the agent manually

\- Agent asks: "What's your exam date for this course?" and stores it



\*\*Exam awareness:\*\*

\- When student says "I want to prepare for exam X" → AI already knows the date

\- AI calculates: days until exam, builds study plan accordingly

\- "You have 18 days until your Data Structures exam on Jan 15. Here's your study plan..."

\- Countdown timer visible on course page



\---



\## AGENT — PERSONALIZED LEARNING PATH BUILDER



When student mentions a new course for the first time, agent runs an onboarding flow:



```

Student: "I want to study for Algorithms with Prof. Feldman"



Agent: "Great! Let me set up your personalized study path for Algorithms.

&#x20;       I need a few details to build the best experience for you:



&#x20;       1. Which university are you at? \[TAU / Technion / HUJI / BGU / Bar Ilan / Other]

&#x20;       2. What semester is this? \[Semester A 2025 / Semester B 2025]

&#x20;       3. I found Prof. Feldman's exam is on Jan 23 — is that correct?

&#x20;       4. What material do you have? \[Upload slides / I'll find them / Use what's in the system]

&#x20;       5. How would you rate your current level in this subject?

&#x20;          \[Beginner / Some background / Strong background]

&#x20;       6. What's your goal? \[Pass / Good grade / Excellent grade]

&#x20;       7. How many hours per week can you study this course? \[\_\_]"



→ Agent builds personalized path:

&#x20; - Week by week study plan until exam

&#x20; - Topics ordered by: dependency + professor emphasis + difficulty

&#x20; - Daily goals

&#x20; - Checkpoints: "By day 5 you should know X, Y, Z"

&#x20; - Adjusts dynamically as student progresses

```



\*\*Path adapts over time:\*\*

\- Student answers quiz wrong repeatedly → more time on that topic

\- Student marks topic as understood → move forward

\- Exam date approaching → switch to intensive exam prep mode

\- Student uploads new material → path updates to include it



\*\*Agent collects missing info intelligently:\*\*

\- If exam date unknown → asks student

\- If no material found for course → asks student to upload or confirm which textbook

\- If professor unknown → asks which section/group they're in

\- Never leaves gaps — always has what it needs to give best help



\---



\## WEB APP — DESIGN \& UX



\*\*Feel:\*\* Premium, clean, modern — like Claude.ai, Notion, or Linear. Dark and light mode. Hebrew RTL + English LTR support throughout. Feels like a serious product students are proud to use.



\*\*Main layout:\*\*

```

Left sidebar:

&#x20; - My courses (list, with exam countdown)

&#x20; - Semester selector (slider A/B/Summer)

&#x20; - Upload material

&#x20; - Flashcard deck

&#x20; - Past sessions

&#x20; - Settings / billing



Center (main chat):

&#x20; - Chat with AI about selected course

&#x20; - Streams response letter by letter

&#x20; - Shows sources: "From Cohen's lecture 3, slide 12"

&#x20; - Renders math (KaTeX)

&#x20; - Renders code (syntax highlighted)

&#x20; - Images/diagrams inline

&#x20; - Voice input button



Right panel:

&#x20; - Course info: exam date, countdown

&#x20; - Study plan progress

&#x20; - Weak spots tracker

&#x20; - Upcoming flashcard reviews

&#x20; - Professor notes: "Cohen loves asking about..."

```



\*\*Key pages:\*\*

\- Landing page — beautiful, convincing, pricing, testimonials, Hebrew + English

\- Onboarding — choose university, upload first material, semester setup

\- Dashboard — all courses, study streaks, upcoming exams timeline

\- Course page — material chat, flashcards, past exams, study plan

\- Exam prep mode — focused, practice questions, timed mock exams

\- Upload page — drag and drop, WhatsApp link

\- Admin panel — manage material folders, crawler status, user stats



\*\*UI features:\*\*

\- Real-time streaming (like Claude.ai)

\- Copy button on responses

\- Thumbs up/down feedback

\- Source citation — click to see exact slide/page used

\- Math: KaTeX rendering

\- Code: syntax highlighting

\- Dark/light mode

\- Mobile fully responsive

\- RTL Hebrew support

\- Exam countdown timers on course cards

\- Study streak tracker

\- Progress bars per topic



\---



\## BUSINESS MODEL



\- Free tier: 10 questions/day

\- Pro: ₪29/month — unlimited, exam prep, flashcards, study path

\- Max: ₪59/month — all + study groups, predictions, priority

\- WhatsApp-only: ₪19/month

\- University B2B: ₪50k/year

\- Payment: Stripe + Payplus (Israeli, supports Bit)



\---



\## DATA SOURCES



\*\*1. Admin folder/Drive watcher:\*\*

```

/material

&#x20; /TAU /CS /data-structures / cohen\_lecture1.pdf

&#x20; /Technion /Math / calculus\_slides.pptx

```

\- Watches 24/7, auto-processes on new file

\- Google Drive: `https://drive.google.com/drive/folders/16g08YIerCR2YX-NcgI8bzy7sRA3xIi7t` (CS faculty drive, Technion, named after Shai Ben-David)

\- Access to multiple faculty drives across universities

\- Read via Google Drive API — never download to local PC

\- Store only embeddings (1-2% of file size)



\*\*2. Web crawler (every 24h):\*\*

\- cheesefork.co.il — Technion course/exam data

\- University public course pages (all 5 universities)

\- Google: `"TAU CS exam 2024 filetype:pdf"`, Hebrew searches

\- Professor personal pages, SlideShare, ResearchGate

\- YouTube Israeli lectures → Whisper transcription

\- Public Telegram groups

\- Exam archives: `ims.tau.ac.il`, `exam.cs.huji.ac.il`

\- GitHub student repos

\- Auto-tags everything: University, Department, Course, Professor, Year, Type



\*\*3. Student uploads:\*\*

\- Web drag-and-drop or WhatsApp photo/file

\- Each upload improves system for everyone in that course

\- This is the competitive moat



\*\*Duplicate handling:\*\* Content hash — skip if already exists



\---



\## PROCESSING PIPELINE



```

New file (any source)

↓

Extract text:

&#x20; PDF → pdf-parse

&#x20; PPT → python-pptx

&#x20; DOCX → mammoth

&#x20; Image/handwriting → OpenCV → Google Vision API → Claude Vision

&#x20; Video → Whisper

↓

AI detects type: exam / lecture / summary / notes

↓

Auto-tags: University, Department, Course, Professor, Year, Type

↓

Chunk (512 tokens with overlap)

↓

Embed (OpenAI text-embedding-3-small)

↓

Store in Qdrant

↓

Available instantly

```



\---



\## IMAGE \& HANDWRITING



Critical feature:

\- Handwritten Hebrew notes (phone photos in chat)

\- Mixed Hebrew/English handwriting

\- Hand-drawn diagrams (trees, graphs, flowcharts)

\- Low quality/blurry photos



\*\*Pipeline:\*\*

1\. OpenCV: deskew, denoise, enhance contrast, sharpen

2\. Google Vision API — best Hebrew OCR

3\. Claude Vision sees OCR output + original image

4\. Confidence score shown to user

5\. Future: fine-tune TrOCR on Hebrew student handwriting



\---



\## CORE FEATURES



\*\*Study mode:\*\*

\- Chat from actual professor's slides with citations

\- AI spontaneously quizzes student

\- Identifies weak spots

\- Math, code, diagram rendering



\*\*Exam prep mode:\*\*

\- Professor fingerprinting: style, favorites, trick questions

\- "Cohen asked this 3 times — appeared in 2019, 2021, 2022 exams"

\- Practice questions in professor's exact style

\- Exam date awareness + countdown

\- Timed mock exams

\- Predicts likely questions based on syllabus + coverage gaps



\*\*Active learning loop:\*\*

```

Student reads slide about recursion

→ AI quizzes them

→ Wrong answer

→ AI: "Cohen phrases it as... appeared in 2021 exam"

→ Past exam question shown

→ Student moves on stronger

```



\*\*Flashcards + spaced repetition:\*\*

\- Auto-generated from material

\- Optimal review timing

\- Streaks, progress tracking



\*\*Personalized study path:\*\*

\- Built on first mention of course

\- Agent collects missing info (exam date, level, hours/week, goal)

\- Week-by-week plan until exam

\- Adapts as student progresses

\- Switches to intensive mode near exam



\*\*Social:\*\*

\- Study groups per course

\- Share summaries

\- Leaderboard per course



\*\*Career bridge (premium):\*\*

\- CV builder from courses

\- Job matching

\- Interview prep for Israeli tech



\---



\## WHATSAPP / TELEGRAM BOT



Same AI, different interface:

\- Student pays → phone whitelisted

\- Text questions, photo uploads, voice messages

\- Same RAG system as web app

\- Start with Telegram (free), add WhatsApp after proven



\---



\## TECH STACK



| Component | Technology |

|---|---|

| Frontend | Next.js + Tailwind + Framer Motion |

| UI | Shadcn/ui |

| Math | KaTeX |

| Code | Prism.js |

| RTL | Built into Next.js |

| Streaming | Server-Sent Events |

| Backend | Node.js / Express |

| Vector DB | Qdrant (self-hosted) |

| Embeddings | OpenAI text-embedding-3-small |

| AI | Claude API (claude-sonnet-4-20250514) |

| OCR | Google Vision API |

| Image processing | OpenCV + Pillow |

| Video | Whisper |

| Crawler | Playwright + Cheerio |

| Search | SerpAPI |

| Folder watcher | Chokidar |

| Course data | cheesefork.co.il scraper + university scrapers |

| WhatsApp | WhatsApp Business API |

| Telegram | Telegram Bot API |

| Payment | Stripe + Payplus |

| Database | PostgreSQL |

| Auth | NextAuth.js |

| Hosting | Hetzner VPS |

| Storage | Cloudflare R2 |



\---



\## COST (1000 students/month)



| Service | Cost |

|---|---|

| Claude API | \~$200 |

| OpenAI Embeddings | \~$10 |

| Google Vision | \~$7.50 |

| SerpAPI | $50 |

| Hetzner VPS | €20 |

| WhatsApp API | \~$50 |

| Cloudflare R2 | \~$5 |

| \*\*Total\*\* | \*\*\~$345/month\*\* |



Break even: \~40 paying students.



\---



\## BUILD ORDER



\*\*Week 1 — Backend:\*\*

\- Day 1-2: VPS + Qdrant + Google Drive API connector

\- Day 3-4: File processor pipeline

\- Day 5: Basic RAG working

\- Day 6-7: Web crawler + cheesefork.co.il scraper



\*\*Week 2 — Frontend:\*\*

\- Day 8-9: Next.js, landing page, auth, dashboard

\- Day 10-11: Chat interface with streaming

\- Day 12: Semester selector + course/exam data integration

\- Day 13-14: Payment + image upload pipeline



\*\*Week 3 — Agent + channels:\*\*

\- Day 15-16: Learning path agent + onboarding flow

\- Day 17-18: Telegram bot

\- Day 19-21: Polish, test with 20 real students



\*\*After MVP:\*\*

\- Professor fingerprinting

\- Exam prediction

\- Spaced repetition

\- Social features

\- WhatsApp integration

\- Hebrew handwriting fine-tuning

\- Career bridge

\- Mobile app



\---



\## START WITH



1\. Connect Google Drive: `https://drive.google.com/drive/folders/16g08YIerCR2YX-NcgI8bzy7sRA3xIi7t`

2\. Set up Qdrant on Hetzner VPS

3\. Build file processing pipeline

4\. Build RAG query system

5\. Scrape cheesefork.co.il for Technion course/exam data

6\. Build Next.js chat interface with streaming

7\. Build learning path agent with onboarding flow

8\. Add auth + payment

9\. Deploy



Build everything production-grade. Web app must feel as premium as Claude.ai or Notion — no shortcuts on design or UX. Full Hebrew RTL support throughout.

