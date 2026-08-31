import { Suspense } from "react";
import { getProfile } from "@/app/actions/getProfile";
import SettingsForm from "./settings-form";

function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-grid-pattern animate-pulse">
      <div className="h-[72px] bg-[#FAF8F5]/90 border-b-4 border-[#111]" />
      <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
        <div className="h-12 bg-white/80 rounded-2xl border-3 border-[#111]/20 w-40" />
        <div className="vybe-card h-96 opacity-30" />
        <div className="vybe-card h-48 opacity-30" />
      </div>
    </div>
  );
}

async function SettingsData() {
  const profile = await getProfile();
  return <SettingsForm initialProfile={profile} />;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsData />
    </Suspense>
  );
}
