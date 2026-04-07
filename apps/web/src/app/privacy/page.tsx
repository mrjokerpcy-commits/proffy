import Link from "next/link";

export const metadata = { title: "Privacy Policy – Proffy", description: "How Proffy collects, uses, and protects your data." };

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "80px 32px" }}>
        <Link href="/" style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "40px" }}>
          ← Back to Proffy
        </Link>

        <h1 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: "8px" }}>Privacy Policy</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "48px" }}>Last updated: April 2026</p>

        {[
          {
            title: "What we collect",
            body: "We collect your name, email address, and university when you create an account. We also collect the course material you upload (slides, PDFs, notes) and your chat messages with Proffy AI. This data is used solely to provide and improve the service."
          },
          {
            title: "How we use your data",
            body: "Your course material is used to generate AI answers tailored to your courses. Chat messages are stored to maintain conversation history and to improve Proffy's understanding of course content over time. We do not sell your data to any third party."
          },
          {
            title: "Data storage",
            body: "Your data is stored on secure servers hosted in the EU. Course material and chat history are encrypted at rest. We retain your data for as long as your account is active. You may request deletion at any time by contacting us."
          },
          {
            title: "Cookies",
            body: "We use cookies for several purposes: (1) Essential cookies — required for authentication and keeping you logged in. (2) Preference cookies — storing your theme and language settings. (3) Analytics cookies — we use Google Analytics to understand how students use Proffy and improve the product. (4) Marketing cookies — we may use advertising pixels (e.g. Google Ads, Meta) to measure the effectiveness of our campaigns. Analytics and marketing cookies are only set after you give consent via the cookie banner."
          },
          {
            title: "Your cookie choices",
            body: "When you first visit Proffy, a cookie banner appears. You can accept all cookies or decline non-essential ones. If you decline, only essential cookies are set. You can change your choice at any time by clearing your browser's local storage for proffy.study. Declining analytics or marketing cookies does not affect the core functionality of the product."
          },
          {
            title: "Third-party services",
            body: "Proffy uses Anthropic (Claude AI) and OpenAI (embeddings) to process your queries. Your messages may be processed by these services under their respective privacy policies. We also use Google Analytics and may use Google Ads or Meta Pixel for marketing measurement, subject to your cookie consent. We do not share personally identifiable information with advertisers."
          },
          {
            title: "Your rights",
            body: "You have the right to access, correct, or delete your personal data at any time. To exercise these rights, contact us at hello@proffy.study. We will respond within 30 days."
          },
          {
            title: "Contact",
            body: "For any privacy-related questions, reach us at hello@proffy.study."
          },
        ].map(({ title, body }) => (
          <section key={title} style={{ marginBottom: "36px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "10px", color: "var(--text-primary)" }}>{title}</h2>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: "var(--text-secondary)" }}>{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
