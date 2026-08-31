"use client";

import { Toaster, ToastBar, toast } from "react-hot-toast";

export default function CustomToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          border: "3px solid #111111",
          borderRadius: "12px",
          background: "#FAF8F5",
          color: "#111111",
          fontWeight: 700,
          boxShadow: "4px 4px 0px #111111",
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {icon}
                {message}
              </div>
              {t.type !== "loading" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.dismiss(t.id);
                  }}
                  className="ml-auto w-6 h-6 rounded-full border-2 border-[#111] flex items-center justify-center text-xs font-black bg-white hover:bg-[#F0625A] hover:text-white transition-colors cursor-pointer shrink-0 shadow-[1px_1px_0px_#111]"
                  aria-label="Close notification"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}

