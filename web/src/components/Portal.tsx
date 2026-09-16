"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { PasscodeGate } from "@/components/PasscodeGate";
import { UNLOCK_STORAGE_KEY } from "@/lib/passcode";

const Dashboard = dynamic(() => import("@/components/Dashboard").then((mod) => mod.Dashboard), {
  ssr: false,
  loading: () => <DarkSplash />,
});

function DarkSplash() {
  return (
    <div className="gate-bg flex min-h-screen items-center justify-center text-cyan-100/70">
      <p className="text-sm tracking-[0.18em] uppercase">Opening workbench…</p>
    </div>
  );
}

export function Portal() {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setUnlocked(window.localStorage.getItem(UNLOCK_STORAGE_KEY) === "1");
    setReady(true);
  }, []);

  function handleUnlock() {
    window.localStorage.setItem(UNLOCK_STORAGE_KEY, "1");
    setUnlocked(true);
  }

  function handleLock() {
    window.localStorage.removeItem(UNLOCK_STORAGE_KEY);
    setUnlocked(false);
  }

  if (!ready) return <DarkSplash />;
  if (!unlocked) return <PasscodeGate onUnlock={handleUnlock} />;
  return <Dashboard onLock={handleLock} />;
}
