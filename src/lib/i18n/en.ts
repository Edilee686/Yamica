// English interface copy. Strings live here (not inline) so a Hebrew file can
// be added later with the same shape; layouts use logical CSS properties
// (start/end) so they mirror for RTL.

import type { StageId } from "@/lib/model/types";

export const en = {
  brand: "Yamica Studio",
  promise: "Turn your inspiration into a collection.",
  storageNote: "Saved in this browser only",
  storageNoteLong: "Your collections are saved in this browser on this device. They don't sync to other devices. Download a backup to keep a copy or move to another browser.",
  save: {
    saving: "Saving…",
    saved: "Saved",
    error: "Couldn't save",
    idle: "All changes saved",
  },
  nav: {
    studio: "My Studio",
    inspiration: "Inspiration",
    materials: "Fabrics & prints",
    garments: "Garment templates",
    saved: "Saved assets",
  },
  modes: {
    guided: "Guided",
    free: "Free studio",
    guidedHint: "Clear steps, short tips and a suggested next action.",
    freeHint: "Every tool at once, no prompts.",
  },
  stages: {
    concept: {
      label: "Concept",
      title: "Start with a feeling.",
      purpose: "Name your collection and describe the direction in a few words. This becomes your Collection DNA.",
      done: "Your direction is set.",
      next: "Gather inspiration",
    },
    moodboard: {
      label: "Moodboard",
      title: "Collect what moves you.",
      purpose: "Arrange images, notes and colours on a board. Move, resize and layer them until the mood feels right.",
      done: "Your mood is taking shape.",
      next: "Choose colours",
    },
    colors: {
      label: "Colours",
      title: "Find your palette.",
      purpose: "Pull colours from your moodboard images or add your own. Four to eight colours is a comfortable range.",
      done: "Your palette is ready.",
      next: "Explore fabrics & prints",
    },
    materials: {
      label: "Fabrics & Prints",
      title: "Choose how it feels.",
      purpose: "Save the fabrics and prints you'd like to work with. You'll find them in the garment editor.",
      done: "Your materials are chosen.",
      next: "Design a garment",
    },
    garments: {
      label: "Garments",
      title: "Make it yours.",
      purpose: "Pick a template, swap compatible parts and paint each panel with colours and prints.",
      done: "Your collection is taking shape.",
      next: "Bring it together",
    },
    collection: {
      label: "Collection",
      title: "Ready to bring it together?",
      purpose: "Order your designs, group them into looks and mark what's final.",
      done: "Your line-up is set.",
      next: "Build the presentation",
    },
    presentation: {
      label: "Presentation",
      title: "Share your collection.",
      purpose: "Choose a layout style, check every page and export a PDF of your collection.",
      done: "You've exported your collection.",
      next: "Back to My Studio",
    },
  } satisfies Record<StageId, { label: string; title: string; purpose: string; done: string; next: string }>,
  colorDisclaimer: "On-screen colours are visual references and may look different on real fabric. Names and values here aren't verified Pantone matches.",
  flatsDisclaimer: "These are fashion flats for visual design intent. They aren't sewing patterns and don't simulate fit, drape or fabric behaviour.",
  materialsDisclaimer: "Fabric details are general references, not specifications for a specific textile you can buy.",
  inspirationUsage: "Inspiration images are references for your boards. Don't assume an image can be used as a commercial textile print.",
  mobileCanvas: "Detailed canvas editing works best on a larger screen. On this screen you can move items, edit text and review your board.",
  confirmDelete: "Delete this collection?",
  undo: "Undo",
};

export type Copy = typeof en;
export const copy: Copy = en;
