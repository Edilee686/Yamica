"use client";
import { useState } from "react";
import { ArrowRight, Compass, LayoutGrid } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { useStudio } from "@/lib/store/studio";
import type { ExperienceMode, Preferences } from "@/lib/model/types";

const INTENTS = [
  { id: "casual", label: "Everyday pieces" },
  { id: "streetwear", label: "Streetwear" },
  { id: "occasion", label: "Occasionwear" },
  { id: "resort", label: "Resort & holiday" },
  { id: "neutral-essentials", label: "Gender-neutral basics" },
  { id: "scratch", label: "Not sure yet" },
];

const FAMILIARITY: { id: NonNullable<Preferences["familiarity"]>; label: string; hint: string }[] = [
  { id: "new", label: "I'm new to it", hint: "I have ideas but haven't designed clothes" },
  { id: "some", label: "A little", hint: "I've sketched or studied some" },
  { id: "experienced", label: "Experienced", hint: "I design regularly" },
];

export function Onboarding({ open, onDone }: { open: boolean; onDone: (starter?: string) => void }) {
  const setPrefs = useStudio((s) => s.setPrefs);
  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState<string>();
  const [fam, setFam] = useState<Preferences["familiarity"]>();
  const [mode, setMode] = useState<ExperienceMode>("guided");

  function finish(start: boolean) {
    setPrefs((p) => {
      p.onboarded = true;
      if (intent) p.intent = intent;
      if (fam) p.familiarity = fam;
      p.mode = mode;
    });
    onDone(start ? (intent ?? "scratch") : undefined);
  }

  const questions = ["What would you like to create?", "How familiar are you with fashion design?", "How would you like to work?"];
  return (
    <Dialog
      open={open}
      onClose={() => finish(false)}
      title={questions[step]}
      description={<span>Question {step + 1} of 3 · You can skip this and change it later.</span>}
      footer={
        <>
          <button className="me-auto text-sm text-ink-3 underline-offset-4 hover:text-ink hover:underline" onClick={() => finish(false)}>Skip for now</button>
          {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
          {step < 2 ? (
            <Button variant="primary" onClick={() => setStep(step + 1)} icon={<ArrowRight className="size-4" />}>Next</Button>
          ) : (
            <Button variant="brand" onClick={() => finish(true)}>Start my collection</Button>
          )}
        </>
      }
    >
      {step === 0 && (
        <div className="grid grid-cols-2 gap-2 py-2">
          {INTENTS.map((i) => (
            <button key={i.id} onClick={() => setIntent(i.id)} aria-pressed={intent === i.id} className={cx("rounded-lg border p-4 text-start text-[15px] transition-colors", intent === i.id ? "border-lilac-strong bg-lilac-wash" : "border-line hover:border-line-strong")}>
              {i.label}
            </button>
          ))}
        </div>
      )}
      {step === 1 && (
        <div className="grid gap-2 py-2">
          {FAMILIARITY.map((f) => (
            <button key={f.id} onClick={() => (setFam(f.id), setMode(f.id === "experienced" ? "free" : "guided"))} aria-pressed={fam === f.id} className={cx("rounded-lg border p-4 text-start transition-colors", fam === f.id ? "border-lilac-strong bg-lilac-wash" : "border-line hover:border-line-strong")}>
              <span className="block text-[15px] font-medium">{f.label}</span>
              <span className="text-[13px] text-ink-3">{f.hint}</span>
            </button>
          ))}
        </div>
      )}
      {step === 2 && (
        <div className="grid gap-2 py-2 sm:grid-cols-2">
          {([
            { id: "guided", icon: Compass, label: "Guided", hint: "Clear steps, short tips and a suggested next action." },
            { id: "free", icon: LayoutGrid, label: "Free studio", hint: "All tools at once. Jump anywhere." },
          ] as const).map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)} aria-pressed={mode === m.id} className={cx("rounded-lg border p-5 text-start transition-colors", mode === m.id ? "border-lilac-strong bg-lilac-wash" : "border-line hover:border-line-strong")}>
              <m.icon className="mb-3 size-5 text-lilac-strong" />
              <span className="block text-[15px] font-medium">{m.label}</span>
              <span className="text-[13px] text-ink-3">{m.hint}</span>
            </button>
          ))}
          <p className="text-[12px] text-ink-3 sm:col-span-2">Both modes use the same project, so you can switch at any time without losing work.</p>
        </div>
      )}
    </Dialog>
  );
}
