import { useEffect, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";

const KEY = "sm_location_v1";

export function LocationBar() {
  const [label, setLabel] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cached = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (cached) setLabel(cached);
    else detect();
  }, []);

  function detect() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLabel("Lunawada");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=14`,
            { headers: { Accept: "application/json" } },
          );
          const j = await r.json();
          const a = j.address ?? {};
          const place =
            a.suburb || a.neighbourhood || a.village || a.town || a.city || a.county || "Your area";
          const state = a.state ? `, ${a.state}` : "";
          const text = `${place}${state}`;
          setLabel(text);
          localStorage.setItem(KEY, text);
        } catch {
          setLabel("Your area");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLabel("Lunawada");
        setLoading(false);
      },
      { timeout: 8000 },
    );
  }

  return (
    <button
      onClick={detect}
      className="flex items-center gap-2 text-left"
      aria-label="Change delivery location"
    >
      <MapPin className="h-5 w-5 text-primary" />
      <div className="leading-tight">
        <div className="text-xs font-semibold text-muted-foreground">Deliver to</div>
        <div className="flex items-center gap-1 text-sm font-bold">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : label || "Detecting..."}
        </div>
      </div>
    </button>
  );
}
