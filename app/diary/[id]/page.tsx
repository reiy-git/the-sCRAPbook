import { Suspense } from "react";
import { getDiaryById } from "@/app/actions/getDiaryById";
import { getEntries } from "@/app/actions/getEntries";
import DiaryBook from "./diary-book";

function DiaryPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] animate-pulse">
      <div className="h-[72px] bg-[#FAF8F5]/90 border-b-4 border-[#111]" />
      <div className="h-16 bg-[#FAF8F5] border-b-4 border-[#111]" />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-0 border-4 border-[#111]/20 rounded-3xl overflow-hidden h-[600px]">
          <div className="flex-1 bg-white/40 p-6" />
          <div className="hidden md:block w-8 bg-black/5" />
          <div className="flex-1 bg-white/40 p-6" />
        </div>
      </div>
    </div>
  );
}

async function DiaryData({ id }: { id: string }) {
  const [diary, entries] = await Promise.all([getDiaryById(id), getEntries(id)]);
  return <DiaryBook diaryId={id} initialDiary={diary} initialEntries={entries} />;
}

export default async function DiaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<DiaryPageSkeleton />}>
      <DiaryData id={id} />
    </Suspense>
  );
}
