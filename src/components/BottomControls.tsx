import imgDefault from "@/assets/1ba2666d0da91802c1ffd7f710bfbfe0a34ad7e5.png";

type BottomControlsProps = {
  uploadedImage?: string;
  onUpdateReference: () => void;
  onViewHistory: () => void;
};

export function BottomControls({ uploadedImage, onUpdateReference, onViewHistory }: BottomControlsProps) {
  return (
    <div className="fixed bottom-5 left-[45px] z-40 bg-white shadow-[9px_-10px_17px_0px_rgba(0,0,0,0.25)] flex items-center gap-4 px-4 py-5">
      {/* Uploaded image thumbnail */}
      <div className="h-[70px] w-[50px] relative flex-shrink-0">
        <img
          alt="参考图"
          className="w-full h-full object-cover"
          src={uploadedImage ?? imgDefault}
        />
        <div className="absolute border-[2px] border-white inset-0 shadow-[1.5px_1.5px_1.5px_0px_rgba(0,0,0,0.25)]" />
      </div>

      {/* Buttons */}
      <div className="flex gap-5">
        <button
          onClick={onUpdateReference}
          className="bg-black px-2 py-2 h-[60px] w-[161px] border border-black/50 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] hover:bg-opacity-90 transition-opacity"
        >
          <p
            className="text-[16px] text-white whitespace-nowrap"
            style={{ fontFamily: "'PingFang SC', sans-serif" }}
          >
            更新参考图
          </p>
        </button>

        <button
          onClick={onViewHistory}
          className="bg-black px-2 py-2 h-[60px] w-[161px] border border-black/50 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] hover:bg-opacity-90 transition-opacity"
        >
          <p
            className="text-[16px] text-white whitespace-nowrap"
            style={{ fontFamily: "'PingFang SC', sans-serif" }}
          >
            历史记录
          </p>
        </button>
      </div>
    </div>
  );
}
