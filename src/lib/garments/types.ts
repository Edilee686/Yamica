import type { GarmentCategory, GarmentView } from "@/lib/model/types";

export interface OptionValue {
  id: string;
  label: string;
  /** This value is only valid when every listed option has one of the listed values. */
  requires?: Record<string, string[]>;
  /** Shown when the value is unavailable, e.g. "Needs long sleeves". */
  requiresLabel?: string;
}

export interface TemplateOption {
  id: string;
  label: string;
  /** Short help shown under the control. */
  hint?: string;
  values: OptionValue[];
  default: string;
  /** Views this option is visible on (it still applies to both). */
  views?: GarmentView[];
}

export type PanelKind =
  | "body"
  | "sleeve"
  | "collar"
  | "cuff"
  | "waistband"
  | "pocket"
  | "panel"
  | "hem"
  | "trim"
  | "button"
  | "leg"
  | "skirt";

export interface BuiltPanel {
  id: string;
  label: string;
  kind: PanelKind;
  d: string;
  /** Panels sharing a mirror group can be linked and edited together. */
  mirrorGroup?: string;
  /** Not selectable; renders using another panel's configuration. */
  configFrom?: string;
  /** Darken (used for the inside of the garment seen through an opening). */
  shade?: number;
  /** Origin used for print placement inside this panel. */
  origin: [number, number];
}

export interface BuiltDetail {
  d: string;
  kind: "seam" | "stitch" | "fold" | "gather" | "hole";
}

export interface BuiltGarment {
  panels: BuiltPanel[]; // paint order
  details: BuiltDetail[];
}

export interface PanelDefaults {
  hex: string;
  fabricId: string;
}

export interface GarmentTemplate {
  id: string;
  name: string;
  category: GarmentCategory;
  description: string;
  views: GarmentView[];
  options: TemplateOption[];
  /** Plain-language compatibility notes shown in the editor. */
  notes: string[];
  /** Panel id -> defaults; anything missing falls back to `body`. */
  defaults: Record<string, PanelDefaults>;
  build(options: Record<string, string>, view: GarmentView): BuiltGarment;
}
