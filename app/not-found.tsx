import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-grid-pattern flex flex-col items-center justify-center p-6">
      <div className="vybe-card p-8 sm:p-12 max-w-md w-full text-center flex flex-col items-center gap-6 bg-[#FAF8F5]">
        {/* Big 404 Number */}
        <div className="relative select-none">
          <span
            className="text-[120px] sm:text-[160px] font-black uppercase leading-none tracking-tighter"
            style={{
              WebkitTextStroke: "4px #111",
              color: "transparent",
              textShadow: "8px 8px 0px #111",
            }}
          >
            404
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-black uppercase text-[#111] tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm font-semibold text-[#111]/70">
            This page doesn&apos;t exist or was moved. Check your URL and try again.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/dashboard"
            className="vybe-btn py-3 px-6 flex-1 font-black text-sm text-center"
          >
            ← My Diaries
          </Link>
          <Link
            href="/"
            className="vybe-btn vybe-btn-ink py-3 px-6 flex-1 font-black text-sm text-center"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
