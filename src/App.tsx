import { startTransition, useEffect, useRef, useState } from "react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { LoaderCircle } from "lucide-react";

import { Header } from "@/components/Header";
import { UploadModal } from "@/components/UploadModal";
import { PatternCard } from "@/components/PatternCard";
import { BottomControls } from "@/components/BottomControls";
import { DebugPanel } from "@/components/DebugPanel";
import { mockExplorationSession } from "@/data/projectBlueprint";
import { imageLibrary } from "@/data/imageLibrary";
import { bootstrapSession, fetchReferenceLibrary, searchReferenceLibrary, submitFeedback } from "@/lib/api";
import { analyzeUploadedImage, matchImages } from "@/lib/slotMatcher";
import { buildRound1Candidates, correctBaseFromFeedback } from "@/lib/parameterManager";
import type { CandidateDesign, ExplorationSession, ImageSlotValues, LibraryImage } from "@/types/domain";

const VISIT_COUNT_KEY = "carpet_app_visit_count";
const PATTERNS_PER_LOAD = 8;
const ROUND1_COUNT = 5; // 1 base + 4 single-axis explorations
const MASONRY_BREAKPOINTS = { 640: 2, 900: 3, 1200: 4 };
const COLUMN_STAGGER = [0, 18, 8, 24];

interface DisplayPattern {
  candidate: CandidateDesign;
  image: string;
  slots?: ImageSlotValues;
  prompt?: string;
  name?: string;
}

type DebugTarget = {
  image: string;
  name: string;
  slots: ImageSlotValues;
  prompt: string;
};

function getColumnsCount(width: number) {
  if (width >= 1200) return 4;
  if (width >= 900) return 3;
  if (width >= 640) return 2;
  return 1;
}

function createLibraryBackedPattern(candidate: CandidateDesign, libraryIndex: number): DisplayPattern {
  const lib = imageLibrary[libraryIndex % imageLibrary.length];

  return {
    candidate: {
      ...candidate,
      title: lib.name,
    },
    image: lib.src,
    slots: lib.slots,
    prompt: lib.prompt,
    name: lib.name,
  };
}

function makeDisplayPattern(lib: LibraryImage, deltaLabel?: string): DisplayPattern {
  return {
    candidate: {
      id: lib.id,
      title: lib.name,
      rationale: lib.prompt,
      promptExcerpt: lib.prompt.slice(0, 80),
      deltaSummary: deltaLabel ?? "base",
      palette: ["#888888", "#aaaaaa", "#cccccc"],
      pattern: "scatter",
    },
    image: lib.src,
    slots: lib.slots,
    prompt: lib.prompt,
    name: lib.name,
  };
}

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadedFileRef = useRef<File | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string>();
  const [session, setSession] = useState<ExplorationSession>(mockExplorationSession);
  const [allPatterns, setAllPatterns] = useState<DisplayPattern[]>([]);
  const [referencePatterns, setReferencePatterns] = useState<DisplayPattern[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, "liked" | "disliked">>({});
  const [isLoading, setIsLoading] = useState(false);
  const [imageOffset, setImageOffset] = useState(12);
  const [debugTarget, setDebugTarget] = useState<DebugTarget | null>(null);
  const [baseSlots, setBaseSlots] = useState<ImageSlotValues | null>(null);
  const [columnsCount, setColumnsCount] = useState(() =>
    typeof window === "undefined" ? 4 : getColumnsCount(window.innerWidth)
  );

  // Initialize patterns from library and show modal on first visits
  useEffect(() => {
    const visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || "0");
    if (visitCount < 3) {
      setShowModal(true);
      localStorage.setItem(VISIT_COUNT_KEY, String(visitCount + 1));
    }

    const fallbackPatterns = imageLibrary.map((lib, i) =>
      createLibraryBackedPattern(
        {
          ...mockExplorationSession.candidates[i % mockExplorationSession.candidates.length],
          id: lib.id,
          title: lib.name,
        },
        i
      )
    );

    setAllPatterns(fallbackPatterns);
    void fetchReferenceLibrary(50)
      .then((items) => {
        const mapped = items.map((item, i) => ({
          candidate: {
            ...mockExplorationSession.candidates[i % mockExplorationSession.candidates.length],
            id: item.id,
            title: item.title,
            rationale: item.sourceUrl,
            promptExcerpt: item.tags.join(", ") || "FULI product reference",
            deltaSummary: "reference library",
            palette: ["#5e5e5e", "#9a9a9a", "#d8d8d8"] as [string, string, string],
            pattern: "scatter" as const,
          },
          image: item.imageUrl,
          name: item.title,
          prompt: item.tags.join(", "),
        }));
        setReferencePatterns(mapped);
        setAllPatterns(mapped.slice(0, 12));
        setImageOffset(12);
      })
      .catch(() => {
        setReferencePatterns(fallbackPatterns);
      });
  }, []);

  useEffect(() => {
    const syncColumnsCount = () => setColumnsCount(getColumnsCount(window.innerWidth));

    syncColumnsCount();
    window.addEventListener("resize", syncColumnsCount);

    return () => window.removeEventListener("resize", syncColumnsCount);
  }, []);

  const handleUpload = async (file: File) => {
    const url = URL.createObjectURL(file);
    uploadedFileRef.current = file;
    setUploadedImage(url);
    setIsLoading(true);
    setSelectedIds({});
    setDebugTarget(null);

    try {
      const retrieved = await searchReferenceLibrary(file, 12);
      const round1Patterns: DisplayPattern[] = retrieved.map((item, i) => ({
        candidate: {
          id: item.id,
          title: item.title,
          rationale: item.sourceUrl,
          promptExcerpt: `score ${(item.score ?? 0).toFixed(3)} / clip ${(item.clipScore ?? 0).toFixed(3)}`,
          deltaSummary: i === 0 ? "top match" : `top-${i + 1}`,
          palette: ["#4a4a4a", "#8d8d8d", "#d9d9d9"],
          pattern: "scatter",
        },
        image: item.imageUrl,
        slots: item.slotValues,
        prompt: item.tags.join(", "),
        name: item.title,
      }));
      setBaseSlots(retrieved[0]?.slotValues ?? null);

      bootstrapSession(file.name)
        .then((nextSession) => {
          startTransition(() => setSession(nextSession));
        })
        .catch(() => {/* silently ignore — session state is optional */});

      startTransition(() => setAllPatterns(round1Patterns));
    } catch {
      try {
        const querySlots = await analyzeUploadedImage(file);
        const round1 = buildRound1Candidates(querySlots, imageLibrary);
        setBaseSlots(round1.baseSlots);
        const round1Patterns: DisplayPattern[] = [
          makeDisplayPattern(round1.base, "base"),
          ...round1.explorations.map((e) => makeDisplayPattern(e.img, e.deltaSummary)),
        ];
        startTransition(() => setAllPatterns(round1Patterns));
      } catch {
        const topLibImages = matchImages(
          {
            colorPalette: { hueBias: 0.5, saturation: 0.5, lightness: 0.5 },
            motif: { geometryDegree: 0.5, organicDegree: 0.5, complexity: 0.5 },
            style: { graphicness: 0.5, painterlyDegree: 0.5, heritageSense: 0.5 },
            arrangement: { orderliness: 0.5, density: 0.5, directionality: 0.5 },
            impression: { calmness: 0.5, energy: 0.5, softness: 0.5 },
            shape: { angularity: 0.5, edgeSoftness: 0.5, irregularity: 0.5 },
            scale: { motifScale: 0.5, rhythm: 0.5, contrast: 0.5 },
          },
          imageLibrary,
          ROUND1_COUNT
        );
        startTransition(() => setAllPatterns(topLibImages.map((lib) => makeDisplayPattern(lib))));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = (candidateId: string, type: "liked" | "disliked") => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      if (next[candidateId] === type) {
        delete next[candidateId];
      } else {
        next[candidateId] = type;
      }
      return next;
    });
    setAllPatterns((prev) =>
      prev.map((p) =>
        p.candidate.id === candidateId
          ? {
              ...p,
              candidate: {
                ...p.candidate,
                status: p.candidate.status === type ? "neutral" : type,
              },
            }
          : p
      )
    );
  };

  const handleLoadMore = async () => {
    setIsLoading(true);

    const likedIds = Object.entries(selectedIds)
      .filter(([, v]) => v === "liked")
      .map(([k]) => k);
    const dislikedIds = Object.entries(selectedIds)
      .filter(([, v]) => v === "disliked")
      .map(([k]) => k);

    // Collect slot values for liked and disliked patterns
    const likedSlots = allPatterns
      .filter((p) => selectedIds[p.candidate.id] === "liked" && p.slots)
      .map((p) => p.slots!);
    const dislikedSlots = allPatterns
      .filter((p) => selectedIds[p.candidate.id] === "disliked" && p.slots)
      .map((p) => p.slots!);

    // Correct base parameters from user feedback
    const currentBase = baseSlots;
    const correctedBase =
      currentBase && (likedSlots.length + dislikedSlots.length > 0)
        ? correctBaseFromFeedback(currentBase, likedSlots, dislikedSlots)
        : currentBase;

    if (correctedBase) setBaseSlots(correctedBase);

    let newPatterns: DisplayPattern[] = [];
    const nextOffset = imageOffset + PATTERNS_PER_LOAD;

    if (uploadedFileRef.current) {
      try {
        const retrieved = await searchReferenceLibrary(uploadedFileRef.current, nextOffset);
        const shownIds = new Set(allPatterns.map((pattern) => pattern.candidate.id));
        newPatterns = retrieved
          .filter((item) => !shownIds.has(item.id))
          .slice(0, PATTERNS_PER_LOAD)
          .map((item, i) => ({
            candidate: {
              id: item.id,
              title: item.title,
              rationale: item.sourceUrl,
              promptExcerpt: `score ${(item.score ?? 0).toFixed(3)} / rerank ${(item.rerankScore ?? 0).toFixed(3)}`,
              deltaSummary: `more-${i + 1}`,
              palette: ["#4a4a4a", "#8d8d8d", "#d9d9d9"],
              pattern: "scatter",
            },
            image: item.imageUrl,
            slots: item.slotValues,
            prompt: item.tags.join(", "),
            name: item.title,
          }));
      } catch {
        newPatterns = [];
      }
    }

    if (newPatterns.length === 0) {
      if (referencePatterns.length > allPatterns.length) {
        newPatterns = referencePatterns.slice(imageOffset, nextOffset);
      } else {
        const matchBase = correctedBase ?? {
          colorPalette: { hueBias: 0.5, saturation: 0.5, lightness: 0.5 },
          motif: { geometryDegree: 0.5, organicDegree: 0.5, complexity: 0.5 },
          style: { graphicness: 0.5, painterlyDegree: 0.5, heritageSense: 0.5 },
          arrangement: { orderliness: 0.5, density: 0.5, directionality: 0.5 },
          impression: { calmness: 0.5, energy: 0.5, softness: 0.5 },
          shape: { angularity: 0.5, edgeSoftness: 0.5, irregularity: 0.5 },
          scale: { motifScale: 0.5, rhythm: 0.5, contrast: 0.5 },
        };
        const nextLibImages = matchImages(matchBase, imageLibrary, PATTERNS_PER_LOAD);
        newPatterns = nextLibImages.map((lib) => makeDisplayPattern(lib));
      }
    }

    setImageOffset(nextOffset);

    // Fire API feedback in background for session continuity
    submitFeedback({ sessionId: session.sessionId, likedIds, dislikedIds, continueGenerate: true })
      .then((nextSession) => startTransition(() => setSession(nextSession)))
      .catch(() => {/* non-critical */});

    startTransition(() => {
      setAllPatterns((prev) => [...prev, ...newPatterns]);
      setSelectedIds({});
    });

    setIsLoading(false);
  };

  const handleSelectPattern = (info: { image: string; name: string; slots: ImageSlotValues; prompt: string } | null) => {
    if (info) {
      setDebugTarget(info);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Masonry grid */}
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1480px]">
          <ResponsiveMasonry columnsCountBreakPoints={MASONRY_BREAKPOINTS}>
            <Masonry gutter="20px">
              {allPatterns.map((p, i) => (
                <PatternCard
                  key={`${p.candidate.id}-${i}`}
                  image={p.image}
                  candidate={p.candidate}
                  name={p.name}
                  slotValues={p.slots}
                  prompt={p.prompt}
                  onSelect={handleSelectPattern}
                  onLike={() => handleFeedback(p.candidate.id, "liked")}
                  onDislike={() => handleFeedback(p.candidate.id, "disliked")}
                  className="mb-5"
                  style={{
                    marginTop: columnsCount > 1 ? `${COLUMN_STAGGER[i % columnsCount] ?? 0}px` : "0px",
                  }}
                />
              ))}
            </Masonry>
          </ResponsiveMasonry>
        </div>

        {/* Load more button */}
        <div className="flex justify-center mt-16 mb-28">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="bg-black px-10 py-4 hover:bg-opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-3"
          >
            {isLoading && <LoaderCircle className="w-5 h-5 text-white animate-spin" />}
            <p
              className="text-[18px] text-white whitespace-nowrap"
              style={{ fontFamily: "'PingFang SC', sans-serif", fontWeight: 600 }}
            >
              想获取更多灵感？点击继续生成
            </p>
          </button>
        </div>
      </div>

      {/* Bottom controls */}
      <BottomControls
        uploadedImage={uploadedImage}
        onUpdateReference={() => setShowModal(true)}
        onViewHistory={() => console.log("View history")}
      />

      {/* Upload modal */}
      {showModal && (
        <UploadModal
          onClose={() => setShowModal(false)}
          onUpload={(file) => {
            setShowModal(false);
            void handleUpload(file);
          }}
        />
      )}

      {/* Hidden file input for BottomControls "更新参考图" */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleUpload(file);
        }}
      />

      {/* Debug panel — fixed right sidebar */}
      <DebugPanel target={debugTarget} />
    </div>
  );
}
