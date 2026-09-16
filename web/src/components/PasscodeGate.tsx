"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";

import { BrandMark } from "@/components/BrandMark";
import { MEETING_PASSCODE } from "@/lib/passcode";

type PasscodeGateProps = {
  onUnlock: () => void;
};

export function PasscodeGate({ onUnlock }: PasscodeGateProps) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (response.ok || passcode === MEETING_PASSCODE) {
        onUnlock();
        return;
      }
      setError("Access denied.");
    } catch {
      if (passcode === MEETING_PASSCODE) {
        onUnlock();
        return;
      }
      setError("Access denied.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gate-bg relative min-h-screen overflow-hidden text-cyan-50">
      <div className="gate-grid pointer-events-none absolute inset-0" />
      <motion.div
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl"
        animate={{ x: [0, 24, 0], y: [0, 16, 0], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute right-0 top-24 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl"
        animate={{ x: [0, -18, 0], y: [0, 22, 0], opacity: [0.28, 0.5, 0.28] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 flex items-center justify-center gap-5"
        >
          <BrandMark name="novaflow" tone="light" className="h-8 w-auto" />
          <div className="h-6 w-px bg-white/20" />
          <BrandMark name="noveome" tone="light" className="h-8 w-auto" />
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-200/80">
            Private meeting access
          </p>
          <h1 className="font-serif mt-3 text-4xl tracking-tight text-white">SecretomeQC</h1>
          <p className="mt-3 text-sm leading-6 text-cyan-100/70">
            Novaflow × Noveome lot comparability workbench. Unlock to continue. No lot data,
            plots, or reports are shown until the meeting passcode is accepted.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/60">
              Passcode
              <input
                type="password"
                autoComplete="off"
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
                placeholder="Enter meeting passcode"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-base tracking-[0.18em] text-white outline-none placeholder:tracking-normal placeholder:text-white/30 focus:border-teal-300/60 focus:ring-2 focus:ring-teal-300/20"
              />
            </label>
            <motion.button
              type="submit"
              disabled={busy || !passcode}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-2xl bg-gradient-to-r from-teal-400 to-indigo-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {busy ? "Checking…" : "Unlock workbench"}
            </motion.button>
            {error ? (
              <motion.p
                initial={{ x: -8, opacity: 0 }}
                animate={{ x: [0, -6, 6, -3, 0], opacity: 1 }}
                className="text-sm font-medium text-rose-300"
              >
                {error}
              </motion.p>
            ) : null}
          </form>
        </motion.section>

        <p className="mt-8 text-center text-[11px] leading-5 text-cyan-100/40">
          App passcode is separate from Vercel Deployment Protection.
          <br />
          Not for regulatory submission.
        </p>
      </div>
    </div>
  );
}
