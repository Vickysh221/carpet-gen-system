import { Heart, Plus, Minus } from "lucide-react";
import { useState } from "react";

type PatternCardProps = {
  image: string;
  onSelect: () => void;
};

export function PatternCard({ image, onSelect }: PatternCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative group cursor-pointer break-inside-avoid mb-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img 
        alt="地毯图片" 
        className="w-full h-auto object-cover"
        src={image}
      />
      
      {isHovered && (
        <>
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.45)]" />
          
          {/* Top left - More similar */}
          <button className="absolute top-[17px] left-[12.5px] flex items-center gap-2 text-white text-[12px] font-['PingFang_SC:Regular',sans-serif] hover:opacity-80">
            <Plus className="size-[20px]" strokeWidth={2} />
            <span>推荐更多类似地毯</span>
          </button>

          {/* Top right - Like */}
          <button className="absolute top-[17px] right-[12.5px] text-white hover:opacity-80">
            <Heart className="size-[20px]" />
          </button>

          {/* Center - Select button */}
          <button
            onClick={onSelect}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black px-[28px] py-[12px] border border-[rgba(255,255,255,0.5)] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] hover:bg-opacity-90"
          >
            <p className="font-['PingFang_SC:Regular',sans-serif] text-[16px] text-white whitespace-nowrap">
              选择该方案
            </p>
          </button>

          {/* Bottom left - Less similar */}
          <button className="absolute bottom-[17px] left-[12.5px] flex items-center gap-2 text-white text-[12px] font-['PingFang_SC:Regular',sans-serif] hover:opacity-80">
            <Minus className="size-[20px]" strokeWidth={2} />
            <span>推荐更少类似地毯</span>
          </button>
        </>
      )}
    </div>
  );
}
