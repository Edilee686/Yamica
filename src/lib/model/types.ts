// Yamica Studio project model.
//
// Everything a user creates lives inside a Collection document. Shared library
// content (inspiration, fabrics, prints, templates) is referenced by id and never
// copied into the document; user uploads are stored once as blobs and referenced
// by id as well. The document carries a schemaVersion so saved projects can be
// migrated when the model changes (see ./schema.ts).

export type ID = string;

export type StageId =
  | "concept"
  | "moodboard"
  | "colors"
  | "materials"
  | "garments"
  | "collection"
  | "presentation";

export type ExperienceMode = "guided" | "free";

/* ---------------------------------------------------------------- assets */

/** A reference to an image the moodboard or a print can display. */
export type ImageRef =
  | { kind: "library"; id: ID } // built-in inspiration asset
  | { kind: "upload"; id: ID }; // user upload stored in IndexedDB

export interface AssetLicense {
  /** Who made it. */
  creator: string;
  /** Short licence label shown in the UI, e.g. "Original · Yamica Studio". */
  license: string;
  /** Plain-language usage note. */
  usage: string;
  /** Where it came from (URL or description). */
  source: string;
}

export type InspirationCategory =
  | "architecture"
  | "nature"
  | "art"
  | "abstract"
  | "textures"
  | "urban"
  | "fashion-details"
  | "historical"
  | "lifestyle";

export type ColorFamily =
  | "neutral"
  | "warm"
  | "cool"
  | "green"
  | "pink"
  | "purple"
  | "yellow"
  | "blue"
  | "dark";

export interface InspirationAsset {
  id: ID;
  title: string;
  category: InspirationCategory;
  src: string;
  width: number;
  height: number;
  /** Dominant colour used as a placeholder while loading or if it fails. */
  dominant: string;
  colorFamilies: ColorFamily[];
  moods: string[];
  styles: string[];
  tags: string[];
  license: AssetLicense;
}

export interface UploadMeta {
  id: ID;
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
  createdAt: number;
  dominant?: string;
}

/* -------------------------------------------------------------- materials */

export type WeightCategory = "sheer" | "light" | "light-medium" | "medium" | "medium-heavy" | "heavy";
export type DrapeCategory = "crisp" | "structured" | "soft" | "fluid" | "very fluid";
export type StretchCategory = "none" | "slight" | "moderate" | "high";
export type OpacityCategory = "sheer" | "semi-sheer" | "opaque";

/** A general fabric type reference, e.g. linen. Not a purchasable textile spec. */
export interface FabricReference {
  id: ID;
  name: string;
  summary: string;
  weight: WeightCategory;
  drape: DrapeCategory;
  stretch: StretchCategory;
  opacity: OpacityCategory;
  uses: string[];
  /** Default surface texture for this fabric. */
  textureId: ID;
  /** Close-up preview colour for the swatch card. */
  swatchColor: string;
}

/** The visual appearance of a surface, rendered as an overlay on a panel. */
export interface SurfaceTexture {
  id: ID;
  name: string;
  description: string;
}

export type PrintCategory =
  | "florals"
  | "geometric"
  | "stripes"
  | "checks"
  | "dots"
  | "abstract"
  | "animal"
  | "botanical"
  | "hand-drawn"
  | "retro";

export interface PrintColorSlot {
  key: string;
  label: string;
  default: string;
}

/** Vector prints are recolourable; image prints (uploads) are not. */
export interface VectorPrint {
  id: ID;
  kind: "vector";
  name: string;
  category: PrintCategory;
  description: string;
  tags: string[];
  slots: PrintColorSlot[];
  /** Tile size in garment units at scale 1. */
  tile: { w: number; h: number };
  license: AssetLicense;
}

export interface ImagePrint {
  id: ID;
  kind: "image";
  name: string;
  category: PrintCategory;
  uploadId: ID;
  tile: { w: number; h: number };
  license: AssetLicense;
}

export type PrintAsset = VectorPrint | ImagePrint;

/* ---------------------------------------------------------------- palette */

export type SwatchRole = "primary" | "secondary" | "accent" | "neutral" | "none";

export interface Swatch {
  id: ID;
  hex: string;
  name: string;
  role: SwatchRole;
}

export interface Palette {
  id: ID;
  name: string;
  swatches: Swatch[];
}

/* -------------------------------------------------------------- moodboard */

export interface MoodItemBase {
  id: ID;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
}

export interface MoodImageItem extends MoodItemBase {
  type: "image";
  image: ImageRef;
  /** Image framing inside the item: zoom >= 1, focal offsets in -1..1. */
  crop: { zoom: number; fx: number; fy: number };
  caption?: string;
}

export interface MoodTextItem extends MoodItemBase {
  type: "text";
  text: string;
  font: "serif" | "sans";
  size: number;
  color: string;
  align: "start" | "middle" | "end";
  italic?: boolean;
  weight?: number;
}

export interface MoodSwatchItem extends MoodItemBase {
  type: "swatch";
  hex: string;
  swatchId?: ID;
  label?: string;
}

export interface MoodShapeItem extends MoodItemBase {
  type: "shape";
  shape: "rect" | "ellipse" | "line";
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export type MoodItem = MoodImageItem | MoodTextItem | MoodSwatchItem | MoodShapeItem;

export type MoodLayoutId = "editorial-grid" | "freeform" | "minimal" | "texture";

export interface Moodboard {
  id: ID;
  name: string;
  layout: MoodLayoutId;
  background: string;
  items: MoodItem[]; // array order = layer order (last is on top)
}

/* --------------------------------------------------------------- garments */

export type GarmentCategory = "tops" | "tshirts" | "dresses" | "skirts" | "trousers" | "jackets";
export type GarmentView = "front" | "back";

export interface ColorValue {
  hex: string;
  /** When set, the colour follows this palette swatch. */
  swatchId?: ID;
}

export interface PrintFill {
  type: "print";
  printId: ID;
  scale: number; // 0.25 .. 4
  rotation: number; // degrees
  offsetX: number; // garment units
  offsetY: number;
  /** Colour overrides per print slot (vector prints only). */
  colors: Record<string, ColorValue>;
}

export interface SolidFill {
  type: "solid";
  color: ColorValue;
}

export type PanelFill = SolidFill | PrintFill;

export interface PanelConfig {
  fill: PanelFill;
  fabricId?: ID;
  /** Overrides the fabric's default surface texture; "none" hides it. */
  textureId?: ID | "none";
  outline: boolean;
}

export type DesignStatus = "draft" | "exploring" | "selected" | "final";

export interface GarmentDesign {
  id: ID;
  name: string;
  templateId: ID;
  options: Record<string, string>;
  view: GarmentView;
  panels: Record<string, PanelConfig>;
  /** Mirror group id -> linked. Linked groups are edited together. */
  mirrorLinks: Record<string, boolean>;
  notes: string;
  status: DesignStatus;
  /** Root design this is a variation of (for grouping variations). */
  variationOf?: ID;
  variationKind?: "variation" | "colorway";
  onBoard: boolean;
  createdAt: number;
  updatedAt: number;
}

/* ------------------------------------------------------------- collection */

export interface Look {
  id: ID;
  name: string;
  description: string;
  designIds: ID[];
}

export interface CollectionConcept {
  statement: string;
  season: string;
  audience: string;
  keywords: string[];
  garmentTarget: number;
  silhouettes: string[];
  materials: string[];
}

export type PresentationStyle = "minimal" | "editorial" | "student";

export type PresentationSection =
  | "cover"
  | "concept"
  | "moodboard"
  | "palette"
  | "materials"
  | "lineup"
  | "garments"
  | "notes";

export interface PresentationSettings {
  style: PresentationStyle;
  sections: Record<PresentationSection, boolean>;
  designer: string;
  credits: string;
  /** Which designs get their own page. "board" = all designs on the board. */
  garmentPages: "board" | "selected";
  lastExportedAt?: number;
}

export interface Collection {
  id: ID;
  schemaVersion: number;
  name: string;
  starter: string;
  createdAt: number;
  updatedAt: number;
  concept: CollectionConcept;
  /** Library items and uploads saved to this collection. */
  saved: {
    inspiration: ID[];
    uploads: ID[];
    fabrics: ID[];
    prints: ID[];
  };
  moodboards: Moodboard[];
  activeMoodboardId: ID;
  palettes: Palette[];
  activePaletteId: ID;
  designs: GarmentDesign[];
  /** Order of designs on the collection board. */
  boardOrder: ID[];
  looks: Look[];
  notes: string;
  presentation: PresentationSettings;
  /** User-uploaded prints belonging to this collection. */
  imagePrints: ImagePrint[];
  isSample?: boolean;
}

export interface Preferences {
  mode: ExperienceMode;
  onboarded: boolean;
  intent?: string;
  familiarity?: "new" | "some" | "experienced";
  favorites: { inspiration: ID[]; prints: ID[]; fabrics: ID[] };
  recentInspiration: ID[];
  recentMaterials: { kind: "fabric" | "print"; id: ID }[];
  lastCollectionId?: ID;
}
