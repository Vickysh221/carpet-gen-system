import { X } from "lucide-react";
import imgPreview from "@/assets/836805b290abb7b6b5748066eb04a90c41623e8c.png";

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
      <div
        className="absolute inset-0 bg-white/50"
        style={{ backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white shadow-[0px_7px_7px_0px_rgba(0,0,0,0.25)] w-[698px] max-w-[95vw] overflow-hidden z-10">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-[18px] top-[18px] w-5 h-5 flex items-center justify-center hover:opacity-70 transition-opacity z-10"
        >
          <X className="w-full h-full" strokeWidth={1.8} />
        </button>

        {/* Content */}
        <div className="px-6 py-10">
          <p
            className="text-[27px] text-black text-center mb-16 leading-normal"
            style={{ fontFamily: "'PingFang SC', sans-serif", fontWeight: 600 }}
          >
            上传任意图片，即刻创意生成专属你的地毯
          </p>

          {/* Image preview */}
          <div className="relative h-[320px] w-full mb-5">
            <div className="overflow-hidden h-full w-full">
              <img alt="" className="h-full w-full object-cover" src={imgPreview} />
            </div>
            <div className="absolute border border-black inset-0 pointer-events-none" />
          </div>

          {/* Upload button */}
          <div className="flex justify-center mb-5">
            <label className="cursor-pointer">
              <div
                className="bg-black px-6 py-3 border border-white hover:rotate-0 transition-transform"
                style={{ transform: "rotate(-6.82deg)" }}
              >
                <p
                  className="text-[14px] text-white whitespace-nowrap"
                  style={{ fontFamily: "'PingFang SC', sans-serif", fontWeight: 600 }}
                >
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
          <button onClick={onClose} className="mx-auto block group">
            <p
              className="text-[14px] text-black mb-1"
              style={{ fontFamily: "'PingFang SC', sans-serif", fontWeight: 600 }}
            >
              稍后再传
            </p>
            <div className="h-px w-full bg-black group-hover:w-0 transition-all duration-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
