import imgImage271 from "figma:asset/1ba2666d0da91802c1ffd7f710bfbfe0a34ad7e5.png";

type BottomControlsProps = {
  onUpdateReference: () => void;
  onViewHistory: () => void;
  uploadedImage?: string;
};

export function BottomControls({ onUpdateReference, onViewHistory, uploadedImage }: BottomControlsProps) {
  return (
    <div className="fixed bottom-[20px] left-[45px] z-40 bg-white shadow-[9px_-10px_16.9px_0px_rgba(0,0,0,0.25)] flex items-center gap-[17px] px-[17px] py-[20px]">
      {/* Uploaded image thumbnail */}
      <div className="h-[70.324px] w-[50.329px] relative">
        {uploadedImage ? (
          <>
            <img 
              alt="参考图" 
              className="w-full h-full object-cover"
              src={uploadedImage}
            />
            <div className="absolute border-[2.221px] border-solid border-white inset-0 shadow-[1.48px_1.48px_1.48px_0px_rgba(0,0,0,0.25)]" />
          </>
        ) : (
          <>
            <img 
              alt="默认参考图" 
              className="w-full h-full object-cover"
              src={imgImage271}
            />
            <div className="absolute border-[2.221px] border-solid border-white inset-0 shadow-[1.48px_1.48px_1.48px_0px_rgba(0,0,0,0.25)]" />
          </>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-[20px]">
        <button
          onClick={onUpdateReference}
          className="bg-black px-[8px] py-[9px] h-[60px] w-[161px] border border-[rgba(0,0,0,0.5)] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] hover:bg-opacity-90"
        >
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[16px] text-white whitespace-nowrap">
            更新参考图
          </p>
        </button>

        <button
          onClick={onViewHistory}
          className="bg-black px-[8px] py-[9px] h-[60px] w-[161px] border border-[rgba(0,0,0,0.5)] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] hover:bg-opacity-90"
        >
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[16px] text-white whitespace-nowrap">
            历史记录
          </p>
        </button>
      </div>
    </div>
  );
}
