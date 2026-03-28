/**
 * Local fallback image library.
 *
 * Sources: data/fuli_products/metadata.json — all 50 FULI product images.
 * Images served from /public/products/ (Vite static, no backend required).
 *
 * Slot values are tag-based heuristic priors (not computed from pixels).
 * They will be overridden by backend-computed slot_values when available.
 *
 * Tag → slot heuristics used:
 *   geometric → high geometry (0.80), low organic (0.20), ordered
 *   organic   → high organic (0.80), low geometry (0.20), flowing
 *   bath-rug  → soft, low complexity, light
 *   light     → high lightness (0.75), low contrast (0.30)
 *   green     → cool hueBias (0.20), mid saturation
 *   red       → warm hueBias (0.85), high saturation
 *   (default) → neutral across all axes
 */

import type { LibraryImage, ImageSlotValues } from "@/types/domain";

// ---------------------------------------------------------------------------
// Slot value helpers
// ---------------------------------------------------------------------------

function neutral(): ImageSlotValues {
  return {
    colorPalette: { hueBias: 0.5, saturation: 0.5, lightness: 0.5 },
    motif: { geometryDegree: 0.5, organicDegree: 0.5, complexity: 0.5 },
    style: { graphicness: 0.5, painterlyDegree: 0.5, heritageSense: 0.5 },
    arrangement: { orderliness: 0.5, density: 0.5, directionality: 0.5 },
    impression: { calmness: 0.5, energy: 0.5, softness: 0.5 },
    shape: { angularity: 0.5, edgeSoftness: 0.5, irregularity: 0.5 },
    scale: { motifScale: 0.5, rhythm: 0.5, contrast: 0.5 },
  };
}

function fromTags(tags: string[]): ImageSlotValues {
  const s = neutral();
  const t = new Set(tags);

  if (t.has("geometric")) {
    s.motif.geometryDegree = 0.82;
    s.motif.organicDegree = 0.18;
    s.style.graphicness = 0.75;
    s.style.heritageSense = 0.65;
    s.arrangement.orderliness = 0.80;
    s.shape.angularity = 0.78;
    s.shape.edgeSoftness = 0.22;
    s.scale.rhythm = 0.75;
  }
  if (t.has("organic")) {
    s.motif.organicDegree = 0.82;
    s.motif.geometryDegree = 0.18;
    s.motif.complexity = 0.65;
    s.style.painterlyDegree = 0.68;
    s.arrangement.orderliness = 0.28;
    s.impression.softness = 0.72;
    s.shape.edgeSoftness = 0.78;
    s.shape.irregularity = 0.65;
  }
  if (t.has("bath-rug")) {
    s.impression.softness = 0.82;
    s.impression.calmness = 0.72;
    s.motif.complexity = 0.32;
    s.colorPalette.lightness = 0.68;
    s.scale.contrast = 0.30;
    s.shape.edgeSoftness = 0.75;
  }
  if (t.has("light")) {
    s.colorPalette.lightness = 0.76;
    s.scale.contrast = 0.28;
    s.impression.calmness = 0.68;
  }
  if (t.has("green")) {
    s.colorPalette.hueBias = 0.18;
    s.colorPalette.saturation = 0.52;
  }
  if (t.has("red")) {
    s.colorPalette.hueBias = 0.86;
    s.colorPalette.saturation = 0.62;
    s.impression.energy = 0.62;
  }

  return s;
}

function promptFromTags(title: string, tags: string[]): string {
  const t = new Set(tags);
  const parts: string[] = [];
  if (t.has("geometric")) parts.push("geometric structured pattern");
  else if (t.has("organic")) parts.push("organic flowing motifs");
  else parts.push("abstract textile pattern");
  if (t.has("bath-rug")) parts.push("soft bath rug texture");
  if (t.has("light")) parts.push("light airy palette");
  if (t.has("green")) parts.push("green tones");
  if (t.has("red")) parts.push("red warm tones");
  parts.push("carpet weaving style, top-down view");
  return `${title} — ${parts.join(", ")}`;
}

// ---------------------------------------------------------------------------
// Library entries — one per product in metadata.json
// Images at /products/<filename> (public/products/ in repo)
// ---------------------------------------------------------------------------

const P = "/products/"; // Vite serves public/ at root

export const imageLibrary: LibraryImage[] = [
  {
    id: "fuli-0002",
    src: P + "thumbnail.2024223-富立织锦-白底26470_20240312181443A027_5fbc0927.png",
    name: "富立织锦 白底",
    tags: ["light"],
    slots: fromTags(["light"]),
    prompt: promptFromTags("富立织锦 白底", ["light"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0003",
    src: P + "thumbnail.473243-AK990__1__20240229182003A049_ab1a75ce.png",
    name: "AK990",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("AK990", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0004",
    src: P + "thumbnail.473243-AK990__1__20240229182218A050_a63e1a99.png",
    name: "AK990 (2)",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("AK990", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0005",
    src: P + "thumbnail.ALICE浴毯__1__20231228180028A006_674db3d2.jpg",
    name: "ALICE浴毯",
    tags: ["bath-rug"],
    slots: fromTags(["bath-rug"]),
    prompt: promptFromTags("ALICE浴毯", ["bath-rug"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0006",
    src: P + "thumbnail.ALICE浴毯__1__20231229115448A116_27872963.jpg",
    name: "ALICE浴毯 (2)",
    tags: ["bath-rug"],
    slots: fromTags(["bath-rug"]),
    prompt: promptFromTags("ALICE浴毯", ["bath-rug"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0007",
    src: P + "thumbnail.BELLA浴毯__1__20231227154208A020_99fe2194.jpg",
    name: "BELLA浴毯",
    tags: ["bath-rug"],
    slots: fromTags(["bath-rug"]),
    prompt: promptFromTags("BELLA浴毯", ["bath-rug"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0008",
    src: P + "thumbnail.BELLA浴毯__1__20231229114448A114_5551f61b.jpg",
    name: "BELLA浴毯 (2)",
    tags: ["bath-rug"],
    slots: fromTags(["bath-rug"]),
    prompt: promptFromTags("BELLA浴毯", ["bath-rug"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0009",
    src: P + "thumbnail.FULI原创_不渝-1_20231208161013A001_36eec244.png",
    name: "FULI原创 不渝 1",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("FULI原创 不渝", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0010",
    src: P + "thumbnail.FULI原创_不渝-1_20231208161022A002_6f7c43d0.png",
    name: "FULI原创 不渝 1b",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("FULI原创 不渝", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0011",
    src: P + "thumbnail.FULI原创_不渝-2_20231208161028A003_668e6384.png",
    name: "FULI原创 不渝 2",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("FULI原创 不渝 2", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0012",
    src: P + "thumbnail.FULI原创_不渝-3_20231208161033A004_de9bd3f9.png",
    name: "FULI原创 不渝 3",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("FULI原创 不渝 3", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0013",
    src: P + "thumbnail.FULI原创_末日荒原-1_20231214170518A025_56a6cf14.png",
    name: "末日荒原 1",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("FULI原创 末日荒原 1", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0014",
    src: P + "thumbnail.FULI原创_末日荒原-1_20231214170526A026_42cf2ed8.png",
    name: "末日荒原 1b",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("FULI原创 末日荒原 1", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0015",
    src: P + "thumbnail.FULI原创_末日荒原-2_20231214170532A027_5e6a6d7b.png",
    name: "末日荒原 2",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("FULI原创 末日荒原 2", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0016",
    src: P + "thumbnail.FULI原创_末日荒原-3_20231214170540A028_82df2b9c.png",
    name: "末日荒原 3",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("FULI原创 末日荒原 3", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0017",
    src: P + "thumbnail.FULI原创_跳动的音符-1_20231214172101A029_917135ca.png",
    name: "跳动的音符 1",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("FULI原创 跳动的音符", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0018",
    src: P + "thumbnail.FULI原创_跳动的音符-1_20231214172113A030_822fca51.png",
    name: "跳动的音符 1b",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("FULI原创 跳动的音符", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0019",
    src: P + "thumbnail.FULI原创_跳动的音符-2_20231214172122A031_cdba0020.png",
    name: "跳动的音符 2",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("FULI原创 跳动的音符 2", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0020",
    src: P + "thumbnail.FULI原创_跳动的音符-3_20231214172129A032_f694ee05.png",
    name: "跳动的音符 3",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("FULI原创 跳动的音符 3", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0021",
    src: P + "thumbnail.HM-MC-268A-GREEN__1__20240229113613A029_26c61b40.png",
    name: "HM MC 268A 绿",
    tags: ["green", "geometric"],
    slots: fromTags(["green", "geometric"]),
    prompt: promptFromTags("HM MC 268A GREEN", ["green", "geometric"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0022",
    src: P + "thumbnail.HM-MC-268A-GREEN__1__20240229114122A030_892fefdd.png",
    name: "HM MC 268A 绿 (2)",
    tags: ["green", "geometric"],
    slots: fromTags(["green", "geometric"]),
    prompt: promptFromTags("HM MC 268A GREEN", ["green", "geometric"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0023",
    src: P + "thumbnail.HM-MC-268B-PAPERCORN__1__20240229114158A037_0e41ef1d.png",
    name: "HM MC 268B PAPERCORN",
    tags: ["geometric"],
    slots: fromTags(["geometric"]),
    prompt: promptFromTags("HM MC 268B PAPERCORN", ["geometric"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0024",
    src: P + "thumbnail.HM-MC-268D-SILVER-GREY__1__20240229114656A044_c1e61ad9.png",
    name: "HM MC 268D 银灰",
    tags: ["geometric"],
    slots: fromTags(["geometric"]),
    prompt: promptFromTags("HM MC 268D SILVER GREY", ["geometric"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0025",
    src: P + "thumbnail.MABEL浴毯__1__20231228175732A002_d5385ac6.jpg",
    name: "MABEL浴毯",
    tags: ["bath-rug"],
    slots: fromTags(["bath-rug"]),
    prompt: promptFromTags("MABEL浴毯", ["bath-rug"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0026",
    src: P + "thumbnail.SC-MC-051-IVORY__1__20240229112943A022_8484d003.png",
    name: "SC MC 051 IVORY",
    tags: ["light", "geometric"],
    slots: fromTags(["light", "geometric"]),
    prompt: promptFromTags("SC MC 051 IVORY", ["light", "geometric"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0027",
    src: P + "thumbnail.SC-MC-051-IVORY__1__20240229113440A023_90798c71.png",
    name: "SC MC 051 IVORY (2)",
    tags: ["light", "geometric"],
    slots: fromTags(["light", "geometric"]),
    prompt: promptFromTags("SC MC 051 IVORY", ["light", "geometric"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0028",
    src: P + "thumbnail.上海装_式_-粉__1__20240313104750A081_ba8a97b5.png",
    name: "上海装式 粉",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("上海装式 粉", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0029",
    src: P + "thumbnail.上海装_式_-绿__1__20240313104317A076_b6ad2155.png",
    name: "上海装式 绿",
    tags: ["green"],
    slots: fromTags(["green"]),
    prompt: promptFromTags("上海装式 绿", ["green"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0030",
    src: P + "thumbnail.上海装_式_-绿__1__20240313104732A077_ee4c41c1.png",
    name: "上海装式 绿 (2)",
    tags: ["green"],
    slots: fromTags(["green"]),
    prompt: promptFromTags("上海装式 绿", ["green"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0031",
    src: P + "thumbnail.上海装_式_-黄__1__20240313104841A084_3e130f89.png",
    name: "上海装式 黄",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("上海装式 黄", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0032",
    src: P + "thumbnail.中国书房_屏1_20231130174733A258_a7b4cb36.png",
    name: "中国书房 屏1",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("中国书房 屏1", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0033",
    src: P + "thumbnail.中国书房_屏1_20231130174738A259_ac60a1db.png",
    name: "中国书房 屏1 (2)",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("中国书房 屏1", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0034",
    src: P + "thumbnail.印迹_石音__20231130174450A251_18e471a9.png",
    name: "印迹 石音",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("印迹 石音", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0035",
    src: P + "thumbnail.印迹_石音__20231130174549A252_29124d22.png",
    name: "印迹 石音 (2)",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("印迹 石音", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0036",
    src: P + "thumbnail.发现自然_光影浅黄2_20231202130725A323_5765df35.png",
    name: "发现自然 光影浅黄",
    tags: ["light"],
    slots: fromTags(["light"]),
    prompt: promptFromTags("发现自然 光影浅黄", ["light"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0037",
    src: P + "thumbnail.发现自然_光影深_20231202130333A311_5fbe5f1f.png",
    name: "发现自然 光影深",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("发现自然 光影深", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0038",
    src: P + "thumbnail.发现自然_光影灰_20231202130656A319_2ae0a58f.png",
    name: "发现自然 光影灰",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("发现自然 光影灰", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0039",
    src: P + "thumbnail.发现自然_光影黄_20231202130614A314_9d2e74b2.png",
    name: "发现自然 光影黄",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("发现自然 光影黄", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0040",
    src: P + "thumbnail.发现自然_光影黄_20231202130740A327_16f817ac.png",
    name: "发现自然 光影黄 (2)",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("发现自然 光影黄", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0041",
    src: P + "thumbnail.咖色_20240313163742A210_92c02308.png",
    name: "咖色",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("咖色", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0042",
    src: P + "thumbnail.大千纹理_千纹__2_20231130135238A044_ab00cfd4.png",
    name: "大千纹理 千纹",
    tags: ["geometric"],
    slots: fromTags(["geometric"]),
    prompt: promptFromTags("大千纹理 千纹", ["geometric"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0043",
    src: P + "thumbnail.大千纹理_千纹__2_20231220093524A022_6e969f90.png",
    name: "大千纹理 千纹 (2)",
    tags: ["geometric"],
    slots: fromTags(["geometric"]),
    prompt: promptFromTags("大千纹理 千纹", ["geometric"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0044",
    src: P + "thumbnail.大千纹理_千纹__5_20231130134333A008_364f9477.png",
    name: "大千纹理 千纹 (3)",
    tags: ["geometric"],
    slots: fromTags(["geometric"]),
    prompt: promptFromTags("大千纹理 千纹", ["geometric"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0045",
    src: P + "thumbnail.大千纹理_千纹__5_20231130134732A015_fff098b7.png",
    name: "大千纹理 千纹 (4)",
    tags: ["geometric"],
    slots: fromTags(["geometric"]),
    prompt: promptFromTags("大千纹理 千纹", ["geometric"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0046",
    src: P + "thumbnail.微信图片_20231229132359_20231229132529A001_4127e6c1.jpg",
    name: "微信图片",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("微信图片", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0047",
    src: P + "thumbnail.未标题-01_20240312181735A033_7d0f18f3.png",
    name: "未标题 01",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("未标题 01", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0048",
    src: P + "thumbnail.未标题-01_20240312182101A034_42ac2d7f.png",
    name: "未标题 01 (2)",
    tags: [],
    slots: fromTags([]),
    prompt: promptFromTags("未标题 01", []),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0049",
    src: P + "thumbnail.海洋生态_皑川_20231130163514A128_620b695d.png",
    name: "海洋生态 皑川",
    tags: ["organic"],
    slots: fromTags(["organic"]),
    prompt: promptFromTags("海洋生态 皑川", ["organic"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0050",
    src: P + "thumbnail.海洋生态_皑川_20231130163707A129_dbf0c87d.png",
    name: "海洋生态 皑川 (2)",
    tags: ["organic"],
    slots: fromTags(["organic"]),
    prompt: promptFromTags("海洋生态 皑川", ["organic"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
  {
    id: "fuli-0051",
    src: P + "艺术家系列_KUONYESHA_红白_20240108184945A003_20240116095859A007_b1db6268.png",
    name: "艺术家系列 KUONYESHA 红白",
    tags: ["red", "light"],
    slots: fromTags(["red", "light"]),
    prompt: promptFromTags("艺术家系列 KUONYESHA 红白", ["red", "light"]),
    sourceUrl: "https://fuli-plus.com/product",
  },
];
