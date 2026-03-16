import { Heart, Plus, Minus } from "lucide-react";
import { useState } from "react";
import type { CSSProperties } from "react";
import type { CandidateDesign, ImageSlotValues } from "@/types/domain";

type PatternCardProps = {
  image: string;
  candidate: CandidateDesign;
  name?: string;
  slotValues?: ImageSlotValues;
  prompt?: string;
  className?: string;
  style?: CSSProperties;
  onSelect: (info: { image: string; name: string; slots: ImageSlotValues; prompt: string } | null) => void;
  onLike: () => void;
  onDislike: () => void;
};

export function PatternCard({
  image,
  candidate,
  name,
  slotValues,
  prompt,
  className,
  style,
  onSelect,
  onLike,
  onDislike,
}: PatternCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative w-full cursor-pointer break-inside-avoid ${className ?? ""}`}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-full overflow-hidden">
        <img alt="地毯纹样" className="block w-full h-auto min-w-0" src={image} />
      </div>

      {isHovered && (
        <>
          <div className="absolute inset-0 bg-black/45" />

          {/* Top left - More similar */}
          <button
            className="absolute top-[17px] left-[12px] flex items-center gap-2 text-white text-[12px] hover:opacity-80"
            style={{ fontFamily: "'PingFang SC', sans-serif" }}
            onClick={(e) => { e.stopPropagation(); onLike(); }}
          >
            <Plus className="w-5 h-5" strokeWidth={2} />
            <span>推荐更多类似地毯</span>
          </button>

          {/* Top right - Like / liked indicator */}
          <button
            className="absolute top-[17px] right-[12px] text-white hover:opacity-80"
            onClick={(e) => { e.stopPropagation(); onLike(); }}
          >
            <Heart
              className="w-5 h-5"
              fill={candidate.status === "liked" ? "currentColor" : "none"}
            />
          </button>

          {/* Center - Select button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(
                slotValues
                  ? { image, name: name ?? candidate.title, slots: slotValues, prompt: prompt ?? "" }
                  : null
              );
            }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black px-7 py-3 border border-white/50 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] hover:bg-opacity-90"
          >
            <p
              className="text-[16px] text-white whitespace-nowrap"
              style={{ fontFamily: "'PingFang SC', sans-serif" }}
            >
              选择该方案
            </p>
          </button>

          {/* Bottom left - Less similar */}
          <button
            className="absolute bottom-[17px] left-[12px] flex items-center gap-2 text-white text-[12px] hover:opacity-80"
            style={{ fontFamily: "'PingFang SC', sans-serif" }}
            onClick={(e) => { e.stopPropagation(); onDislike(); }}
          >
            <Minus className="w-5 h-5" strokeWidth={2} />
            <span>推荐更少类似地毯</span>
          </button>
        </>
      )}
    </div>
  );
}
