import Image from "next/image";

// ─── Mascot image map ─────────────────────────────────────────────────────────
export type MascotVariant =
  | "hero"       // Sitting at desk with laptop — homepage hero
  | "wave"       // Waving hello — intro / meet the assistant
  | "thumbsup"   // Thumbs up — onboarding complete / success inline
  | "notes"      // Taking notes — onboarding setup / forms
  | "reading"    // Deep in study — flashcards / study materials
  | "thinking"   // Thought bubble — chat loading / processing
  | "confused"   // Question marks — 404 / errors
  | "celebrate"  // Jumping with sparkles — success / celebration
  | "pointing"   // Pointing — tooltips / callouts
  | "sleeping"   // Sleeping on textbooks — empty states
  | "avatar";    // Face close-up — favicon / chat avatar

const SRC: Record<MascotVariant, string> = {
  hero:      "/mascot/hero.png",
  wave:      "/mascot/wave.png",
  thumbsup:  "/mascot/thumbsup.png",
  notes:     "/mascot/notes.png",
  reading:   "/mascot/reading.png",
  thinking:  "/mascot/thinking.png",
  confused:  "/mascot/confused.png",
  celebrate: "/mascot/celebrate.png",
  pointing:  "/mascot/pointing.png",
  sleeping:  "/mascot/sleeping.png",
  avatar:    "/mascot/avatar.png",
};

interface MascotProps {
  variant: MascotVariant;
  size?: number;        // px — applied to both width and height
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  alt?: string;
}

export default function Mascot({ variant, size = 120, className, style, priority, alt }: MascotProps) {
  return (
    <Image
      src={SRC[variant]}
      alt={alt ?? `Proffy mascot — ${variant}`}
      width={size}
      height={size}
      priority={priority}
      className={className}
      style={{ objectFit: "contain", ...style }}
      draggable={false}
    />
  );
}
