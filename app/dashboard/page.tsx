import { Suspense } from "react";
import { getDiaries } from "@/app/actions/getDiaries";
import { getProfile } from "@/app/actions/getProfile";
import DashboardView from "./dashboard-view";

// Skeleton shown while data loads
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-grid-pattern animate-pulse">
      <div className="h-[72px] bg-[#FAF8F5]/90 border-b-4 border-[#111]" />
      <div className="h-24 bg-[#FAF8F5]/85 border-b-4 border-[#111]" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 px-6 pt-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border-4 border-[#111]/20 bg-white/60 h-64"
          />
        ))}
      </div>
    </div>
  );
}

async function DashboardData() {
  const [diaries, profile] = await Promise.all([getDiaries(), getProfile()]);
  return <DashboardView initialDiaries={diaries} initialProfile={profile} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}
