import { X } from "lucide-react";
import imgImage264 from "figma:asset/836805b290abb7b6b5748066eb04a90c41623e8c.png";

type UploadModalProps = {
  onClose: () => void;
  onUpload: (file: File) => void;
};

export function UploadModal({ onClose, onUpload }: UploadModalProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 backdrop-blur-[8.2px] bg-[rgba(255,255,255,0.5)]" />
      
      {/* Modal */}
      <div className="relative bg-white shadow-[0px_6.772px_6.772px_0px_rgba(0,0,0,0.25)] w-[698.413px] overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-[18.62px] top-[18.62px] size-[20.317px] overflow-clip z-10 hover:opacity-70 transition-opacity"
        >
          <X className="size-full" strokeWidth={1.8} />
        </button>

        {/* Content */}
        <div className="px-[23.94px] py-[38.94px]">
          <p className="font-['PingFang_SC:Semibold',sans-serif] text-[27.09px] text-black text-center mb-[63px] leading-normal">
            上传任意图片，即刻创意生成专属你的地毯
          </p>

          {/* Image preview */}
          <div className="relative h-[320px] w-full mb-[20px]">
            <div className="overflow-hidden h-full w-full">
              <img 
                alt="" 
                className="h-full w-full object-cover"
                src={imgImage264}
              />
            </div>
            <div className="absolute border-[0.4px] border-black border-solid inset-0 pointer-events-none" />
          </div>

          {/* Upload button */}
          <div className="flex justify-center mb-[20px]">
            <label className="cursor-pointer">
              <div className="bg-black px-[22.011px] py-[13.545px] border-[0.423px] border-solid border-white rotate-[-6.82deg] hover:rotate-0 transition-transform">
                <p className="font-['PingFang_SC:Semibold',sans-serif] text-[13.545px] text-white whitespace-nowrap">
                  立刻上传
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Skip button */}
          <button
            onClick={onClose}
            className="mx-auto block group"
          >
            <p className="font-['PingFang_SC:Semibold',sans-serif] text-[13.545px] text-black mb-[3px]">
              稍后再传
            </p>
            <div className="h-[1px] w-full bg-black group-hover:w-0 transition-all" />
          </button>
        </div>
      </div>
    </div>
  );
}
