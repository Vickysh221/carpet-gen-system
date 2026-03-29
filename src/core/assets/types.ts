export type AnnotationSource = "manual" | "assisted" | "inferred" | "inherited";
export type AnnotationConfidence = "low" | "medium" | "high";

export interface FirstOrderSlotValues {
  color: {
    warmth: number;
    saturation: number;
    lightness: number;
  };
  motif: {
    geometry: number;
    organic: number;
    complexity: number;
  };
  arrangement: {
    order: number;
    spacing: number;
    direction: number;
  };
}

export interface SecondOrderSlotValues {
  impression?: {
    calm: number;
    energy: number;
    softness: number;
  };
  style?: {
    graphic: number;
    painterly: number;
    heritage: number;
  };
}

export interface AssetSlotAnnotation {
  imageId: string;
  firstOrder: FirstOrderSlotValues;
  secondOrder?: SecondOrderSlotValues;
  annotationSource: AnnotationSource;
  confidence: AnnotationConfidence;
  notes?: string;
  nearestSeedIds?: string[];
  clusterId?: string;
}

export type AssetRole =
  | "retrieval_anchor"
  | "motif_prior"
  | "arrangement_prior"
  | "style_prior"
  | "evaluation_reference"
  /** Suitable for early-round dimensional probing: strong directionality, clear contrast */
  | "probe-carrier"
  /** Suitable for mid-round preference tracking: stable aesthetic, readable direction */
  | "preference-carrier"
  /** Suitable for late-round convergence: consistently close to a preference center */
  | "convergence-carrier";

export interface AssetRoleMap {
  imageId: string;
  roles: AssetRole[];
  strongSlots: Array<"color" | "motif" | "arrangement" | "impression" | "style">;
  weakSlots?: Array<"color" | "motif" | "arrangement" | "impression" | "style">;
  brandRepresentativeness?: number;
  /** 0–1: how well does this asset serve as a probing carrier in early rounds */
  probeSuitability?: number;
  /** 0–1: how well does this asset serve as a preference reference in mid rounds */
  preferenceSuitability?: number;
  /** 0–1: how well does this asset serve as a convergence reference in late rounds */
  convergenceSuitability?: number;
}

export interface AnnotatedAssetRecord {
  imageId: string;
  title: string;
  imageUrl: string;
  annotation?: AssetSlotAnnotation;
  roleMap?: AssetRoleMap;
  tags?: string[];
}
