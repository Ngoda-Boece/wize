import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { OnboardingFlow } from "@/components/profile/onboarding-flow";
import { ThemeToggle } from "@/components/theme";
import { requireViewer } from "@/lib/auth/viewer";
import { getRepository } from "@/lib/data";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function OnboardingPage() {
  const viewer = await requireViewer("/onboarding");
  const profile = await (await getRepository(viewer)).getProfile();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo href="/app" />
        <ThemeToggle />
      </header>
      <main id="contenu" className="mx-auto w-full max-w-xl flex-1 px-4 pb-16 pt-6 sm:pt-12">
        <OnboardingFlow initial={profile} />
      </main>
    </div>
  );
}
