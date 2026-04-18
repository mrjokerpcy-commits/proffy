import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import YaelShell from "@/components/layout/YaelShell";
import PracticeClient from "./PracticeClient";

export default async function YaelPracticePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Must be on yael subdomain or dev
  const host = headers().get("host") ?? "";
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && !host.startsWith("yael.")) redirect("https://yael.proffy.study/dashboard");

  return (
    <YaelShell>
      <PracticeClient />
    </YaelShell>
  );
}
