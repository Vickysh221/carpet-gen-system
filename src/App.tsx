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
import { bootstrapSession, submitFeedback } from "@/lib/api";
import { analyzeUploadedImage, matchImages } from "@/lib/slotMatcher";
import type { CandidateDesign, ExplorationSession, ImageSlotValues } from "@/types/domain";

// Carpet pattern images (from design assets) — kept for fallback cycling
import img1 from "@/assets/b6dd505b250571fc53f58ad0fe392a93a3e7846a.png";
import img2 from "@/assets/13f99fecf4d10fae2e2ed4ba4174fc87fa3a3f96.png";
import img3 from "@/assets/c9e88114ceab979959b9b9326e445337371e2024.png";
import img4 from "@/assets/f388e72e028f6996638daecb2e4f1ddef9acc8f5.png";
import img5 from "@/assets/4d380627eec25cb6130ce419a12e70cf321ae37e.png";
import img6 from "@/assets/4f1130b3dd48bbf02568141e8d683b8f8a7a6fb5.png";
import img7 from "@/assets/fd407a342467125411c172ada697b4ff5262c37b.png";
import img8 from "@/assets/2219ff8640fb32b5fe4d36035933e968ad811d29.png";
import img9 from "@/assets/3b0f7e643a37e50bcc084af66c1676c7548863fd.png";
import img10 from "@/assets/06b2a022fae9627b99cd7cdcbde93041c712c19e.png";
import img11 from "@/assets/5802c8bd2d23935230bf071ebeffba91a400c6bd.png";
import img12 from "@/assets/a4a5725df8c842a1d1123ea35fafaec34755333e.png";

const PATTERN_IMAGES = [img1, img2, img3, img4, img5, img6, img7, img8, img9, img10, img11, img12];
const VISIT_COUNT_KEY = "carpet_app_visit_count";
const PATTERNS_PER_LOAD = 8;

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

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string>();
  const [session, setSession] = useState<ExplorationSession>(mockExplorationSession);
  const [allPatterns, setAllPatterns] = useState<DisplayPattern[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, "liked" | "disliked">>({});
  const [isLoading, setIsLoading] = useState(false);
  const [imageOffset, setImageOffset] = useState(0);
  const [debugTarget, setDebugTarget] = useState<DebugTarget | null>(null);

  // Initialize patterns from library and show modal on first visits
  useEffect(() => {
    const visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || "0");
    if (visitCount < 3) {
      setShowModal(true);
      localStorage.setItem(VISIT_COUNT_KEY, String(visitCount + 1));
    }

    // Show all 12 library images initially
    setAllPatterns(
      imageLibrary.map((lib, i) => ({
        candidate: {
          ...mockExplorationSession.candidates[i % mockExplorationSession.candidates.length],
          id: lib.id,
          title: lib.name,
        },
        image: lib.src,
        slots: lib.slots,
        prompt: lib.prompt,
        name: lib.name,
      }))
    );
  }, []);

  const handleUpload = async (file: File) => {
    const url = URL.createObjectURL(file);
    setUploadedImage(url);
    setIsLoading(true);
    setSelectedIds({});
    setDebugTarget(null);

    try {
      // Color analysis → slot matching
      let matched: DisplayPattern[] | null = null;
      try {
        const querySlots = await analyzeUploadedImage(file);
        const topLibImages = matchImages(querySlots, imageLibrary, PATTERNS_PER_LOAD);
        matched = topLibImages.map((lib, i) => ({
          candidate: {
            ...mockExplorationSession.candidates[i % mockExplorationSession.candidates.length],
            id: lib.id,
            title: lib.name,
          },
          image: lib.src,
          slots: lib.slots,
          prompt: lib.prompt,
          name: lib.name,
        }));
      } catch {
        // Color analysis failed — will fall back to API / mock
      }

      const nextSession = await bootstrapSession(file.name);
      startTransition(() => {
        setSession(nextSession);
        if (matched) {
          setAllPatterns(matched);
        } else {
          setAllPatterns(
            nextSession.candidates.map((c, i) => ({
              candidate: c,
              image: PATTERN_IMAGES[i % PATTERN_IMAGES.length],
            }))
          );
        }
      });
    } catch {
      // API failed — use color-matched results if available, else keep current
      const querySlots = await analyzeUploadedImage(file).catch(() => null);
      if (querySlots) {
        const topLibImages = matchImages(querySlots, imageLibrary, PATTERNS_PER_LOAD);
        setAllPatterns(
          topLibImages.map((lib, i) => ({
            candidate: {
              ...mockExplorationSession.candidates[i % mockExplorationSession.candidates.length],
              id: lib.id,
              title: lib.name,
            },
            image: lib.src,
            slots: lib.slots,
            prompt: lib.prompt,
            name: lib.name,
          }))
        );
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

    const nextOffset = imageOffset + PATTERNS_PER_LOAD;
    setImageOffset(nextOffset);

    try {
      const nextSession = await submitFeedback({
        sessionId: session.sessionId,
        likedIds,
        dislikedIds,
        continueGenerate: true,
      });
      startTransition(() => {
        setSession(nextSession);
        const newPatterns = nextSession.candidates.map((c, i) => ({
          candidate: c,
          image: PATTERN_IMAGES[(nextOffset + i) % PATTERN_IMAGES.length],
        }));
        setAllPatterns((prev) => [...prev, ...newPatterns]);
        setSelectedIds({});
      });
    } catch {
      const fallbackPatterns = Array.from({ length: PATTERNS_PER_LOAD }, (_, i) => ({
        candidate: {
          ...session.candidates[i % session.candidates.length],
          id: `fallback-${Date.now()}-${i}`,
        },
        image: PATTERN_IMAGES[(nextOffset + i) % PATTERN_IMAGES.length],
      }));
      setAllPatterns((prev) => [...prev, ...fallbackPatterns]);
    } finally {
      setIsLoading(false);
    }
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
      <div className="px-6 py-8">
        <ResponsiveMasonry columnsCountBreakPoints={{ 640: 2, 900: 3, 1200: 4 }}>
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
              />
            ))}
          </Masonry>
        </ResponsiveMasonry>

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
