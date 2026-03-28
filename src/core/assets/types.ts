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
  | "evaluation_reference";

export interface AssetRoleMap {
  imageId: string;
  roles: AssetRole[];
  strongSlots: Array<"color" | "motif" | "arrangement" | "impression" | "style">;
  weakSlots?: Array<"color" | "motif" | "arrangement" | "impression" | "style">;
  brandRepresentativeness?: number;
}

export interface AnnotatedAssetRecord {
  imageId: string;
  title: string;
  imageUrl: string;
  annotation?: AssetSlotAnnotation;
  roleMap?: AssetRoleMap;
  tags?: string[];
}
