import { useState, useEffect } from "react";
import Masonry from "react-responsive-masonry";
import { UploadModal } from "./components/upload-modal";
import { PatternCard } from "./components/pattern-card";
import { Header } from "./components/header";
import { BottomControls } from "./components/bottom-controls";

// Import carpet pattern images from Figma
import imgPattern1 from "figma:asset/b6dd505b250571fc53f58ad0fe392a93a3e7846a.png";
import imgPattern2 from "figma:asset/13f99fecf4d10fae2e2ed4ba4174fc87fa3a3f96.png";
import imgPattern3 from "figma:asset/c9e88114ceab979959b9b9326e445337371e2024.png";
import imgPattern4 from "figma:asset/f388e72e028f6996638daecb2e4f1ddef9acc8f5.png";
import imgPattern5 from "figma:asset/4d380627eec25cb6130ce419a12e70cf321ae37e.png";
import imgPattern6 from "figma:asset/4f1130b3dd48bbf02568141e8d683b8f8a7a6fb5.png";
import imgPattern7 from "figma:asset/fd407a342467125411c172ada697b4ff5262c37b.png";
import imgPattern8 from "figma:asset/2219ff8640fb32b5fe4d36035933e968ad811d29.png";
import imgPattern9 from "figma:asset/3b0f7e643a37e50bcc084af66c1676c7548863fd.png";
import imgPattern10 from "figma:asset/06b2a022fae9627b99cd7cdcbde93041c712c19e.png";
import imgPattern11 from "figma:asset/5802c8bd2d23935230bf071ebeffba91a400c6bd.png";
import imgPattern12 from "figma:asset/a4a5725df8c842a1d1123ea35fafaec34755333e.png";

const INITIAL_PATTERNS = [
  imgPattern1, imgPattern2, imgPattern3, imgPattern4,
  imgPattern5, imgPattern6, imgPattern7, imgPattern8,
  imgPattern9, imgPattern10, imgPattern11, imgPattern12
];

const PATTERNS_PER_LOAD = 8;
const VISIT_COUNT_KEY = "carpet_app_visit_count";
const MAX_VISITS_FOR_MODAL = 3;

export default function App() {
  const [showModal, setShowModal] = useState(false);
  const [patterns, setPatterns] = useState(INITIAL_PATTERNS.slice(0, PATTERNS_PER_LOAD));
  const [uploadedImage, setUploadedImage] = useState<string>();
  const [selectedPattern, setSelectedPattern] = useState<string>();

  useEffect(() => {
    // Check visit count
    const visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || "0");
    
    if (visitCount < MAX_VISITS_FOR_MODAL) {
      setShowModal(true);
      localStorage.setItem(VISIT_COUNT_KEY, String(visitCount + 1));
    }
  }, []);

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLoadMore = () => {
    // Add more patterns from the pool (cycling if necessary)
    const currentCount = patterns.length;
    const newPatterns = [];
    
    for (let i = 0; i < PATTERNS_PER_LOAD; i++) {
      const index = (currentCount + i) % INITIAL_PATTERNS.length;
      newPatterns.push(INITIAL_PATTERNS[index]);
    }
    
    setPatterns([...patterns, ...newPatterns]);
  };

  const handleSelectPattern = (pattern: string) => {
    setSelectedPattern(pattern);
    console.log("Selected pattern:", pattern);
    // You can add more logic here, like showing a confirmation or saving to state
  };

  const handleUpdateReference = () => {
    setShowModal(true);
  };

  const handleViewHistory = () => {
    console.log("View history clicked");
    // Add history viewing logic here
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header />

      {/* Main content */}
      <div className="px-[23px] py-[32px]">
        {/* Masonry grid */}
        <Masonry columnsCount={4} gutter="20px">
          {patterns.map((pattern, index) => (
            <PatternCard
              key={`pattern-${index}`}
              image={pattern}
              onSelect={() => handleSelectPattern(pattern)}
            />
          ))}
        </Masonry>

        {/* Load more button */}
        <div className="flex justify-center mt-[60px] mb-[100px]">
          <button
            onClick={handleLoadMore}
            className="bg-black px-[40px] py-[16px] hover:bg-opacity-90 transition-opacity"
          >
            <p className="font-['PingFang_SC:Semibold',sans-serif] text-[18px] text-white whitespace-nowrap">
              想获取更多灵感？点击继续生成
            </p>
          </button>
        </div>
      </div>

      {/* Bottom controls */}
      <BottomControls
        uploadedImage={uploadedImage}
        onUpdateReference={handleUpdateReference}
        onViewHistory={handleViewHistory}
      />

      {/* Upload modal */}
      {showModal && (
        <UploadModal
          onClose={() => setShowModal(false)}
          onUpload={handleUpload}
        />
      )}
    </div>
  );
}
