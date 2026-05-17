import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moncef AI — War Room",
  description: "Centre de commandement — Groupe Dislog Belkhyat",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <head>
        {/* Apply saved theme — default is light (no attribute needed) */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t = localStorage.getItem('theme');
            if(t === 'dark') document.documentElement.setAttribute('data-theme','dark');
          })();
        `}} />
      </head>
      <body className="h-screen overflow-hidden">{children}</body>
    </html>
  );
}
