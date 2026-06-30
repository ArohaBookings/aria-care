"use client";

import { useEffect, useState } from "react";
import { Download, BellRing, Check, Smartphone } from "lucide-react";

type InstallEvent = Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> };

export default function PwaInstaller() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [reminderMins, setReminderMins] = useState<number | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as InstallEvent); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches) {
      setInstalled(true);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    setDeferred(null);
  };

  const remind = async (minutes: number) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm !== "granted") return;
    setReminderMins(minutes);
    window.setTimeout(() => {
      const body = "Log your shift note in Aria while it's fresh.";
      try {
        if (navigator.serviceWorker?.ready) {
          navigator.serviceWorker.ready.then((reg) => reg.showNotification("Aria Care", { body, icon: "/icon.svg" })).catch(() => {});
        } else {
          new Notification("Aria Care", { body, icon: "/icon.svg" });
        }
      } catch { /* notification may be blocked */ }
      setReminderMins(null);
    }, minutes * 60000);
  };

  const showInstall = !installed && !!deferred;
  const canRemind = typeof window !== "undefined" && "Notification" in window;
  if (!showInstall && !canRemind) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><Smartphone className="w-3.5 h-3.5 text-aria-600" /> On your phone</span>
      {showInstall && (
        <button onClick={install} className="btn-secondary text-xs"><Download className="w-4 h-4" /> Install Aria</button>
      )}
      {canRemind && (
        reminderMins ? (
          <span className="text-xs text-emerald-700 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Reminder set for {reminderMins >= 60 ? `${reminderMins / 60}h` : `${reminderMins}m`}</span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <BellRing className="w-3.5 h-3.5" /> Remind me to log:
            <button onClick={() => remind(30)} className="font-semibold text-aria-700 hover:underline">30m</button>
            <button onClick={() => remind(60)} className="font-semibold text-aria-700 hover:underline">1h</button>
            <button onClick={() => remind(120)} className="font-semibold text-aria-700 hover:underline">2h</button>
          </span>
        )
      )}
    </div>
  );
}
