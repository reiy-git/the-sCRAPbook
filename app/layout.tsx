import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import CustomToaster from "@/app/components/custom-toaster";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "The sCRAPbook",
  description: "scrapbook diaries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var c = localStorage.getItem("vybe_header_color");
                if (c && c.startsWith("#")) {
                  document.documentElement.style.setProperty("--vybe-theme", c);
                  var hex = c.replace("#", "");
                  var r = 0, g = 0, b = 0;
                  if (hex.length === 3) {
                    r = parseInt(hex[0] + hex[0], 16);
                    g = parseInt(hex[1] + hex[1], 16);
                    b = parseInt(hex[2] + hex[2], 16);
                  } else if (hex.length === 6) {
                    r = parseInt(hex.substring(0, 2), 16);
                    g = parseInt(hex.substring(2, 4), 16);
                    b = parseInt(hex.substring(4, 6), 16);
                  }
                  var yiq = (r * 299 + g * 587 + b * 114) / 1000;
                  document.documentElement.style.setProperty("--vybe-theme-text", yiq >= 140 ? "#111111" : "#FAF8F5");
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-space-grotesk)]">
        {children}
        <CustomToaster />
      </body>
    </html>
  );
}
