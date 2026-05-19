"use client";
import { useEffect, useState } from "react";

export function JarvisClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const h = now.getHours();
  const greeting = h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";

  const days = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
  const months = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const dateStr = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;

  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div>
      <p style={{ fontSize: 13, color: "rgba(148,163,184,0.6)", margin: 0, marginBottom: 4 }}>
        {greeting}, Excellence
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontSize: 12, color: "rgba(148,163,184,0.5)" }}>{dateStr}</span>
        <span style={{
          fontSize: 36, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.03em",
          fontVariantNumeric: "tabular-nums",
        }}>{time}</span>
      </div>
    </div>
  );
}
