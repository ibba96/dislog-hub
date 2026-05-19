"use client";
import { useEffect, useState } from "react";

export function JarvisClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const h        = now.getHours();
  const greeting = h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
  const days     = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
  const months   = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const dateStr  = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
  const time     = now.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit", second:"2-digit" });

  return (
    <div style={{ fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <p style={{
        fontSize:12, fontWeight:500, letterSpacing:".01em",
        color:"var(--text-3)", margin:"0 0 4px",
      }}>
        {greeting}, Excellence
      </p>
      <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
        <span style={{ fontSize:12, color:"var(--text-4)", fontWeight:400 }}>{dateStr}</span>
        <span style={{
          fontSize:34, fontWeight:800, color:"var(--text-1)",
          letterSpacing:"-0.03em", fontVariantNumeric:"tabular-nums", lineHeight:1,
        }}>
          {time}
        </span>
      </div>
    </div>
  );
}
