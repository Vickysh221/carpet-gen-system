type PreferenceHistoryPanelProps = {
  isOpen: boolean;
  isLoading: boolean;
  isMutating?: boolean;
  clientId?: string;
  likedIds: string[];
  dislikedIds: string[];
  items: Array<{
    id: string;
    title: string;
    imageUrl: string;
    sourceUrl: string;
    likedCount: number;
    dislikedCount: number;
    netScore: number;
    locked: boolean;
  }>;
  onClose: () => void;
  onClear: () => void;
  onUndo: () => void;
  onToggleLock: (candidateId: string, locked: boolean) => void;
};

export function PreferenceHistoryPanel({
  isOpen,
  isLoading,
  isMutating,
  clientId,
  likedIds,
  dislikedIds,
  items,
  onClose,
  onClear,
  onUndo,
  onToggleLock,
}: PreferenceHistoryPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
      <div className="h-full w-full max-w-[420px] bg-white shadow-[-12px_0_32px_rgba(0,0,0,0.18)] flex flex-col">
        <div className="px-5 py-4 border-b border-black/10 flex items-start justify-between">
          <div>
            <p className="text-[18px] font-semibold">偏好画像</p>
            <p className="text-[11px] text-black/50 mt-1 break-all">{clientId ?? "未识别 client_id"}</p>
          </div>
          <button className="text-sm text-black/60 hover:text-black" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="px-5 py-4 border-b border-black/10 flex gap-3 text-[12px]">
          <div className="px-3 py-2 bg-black text-white">喜欢 {likedIds.length}</div>
          <div className="px-3 py-2 border border-black/15">排斥 {dislikedIds.length}</div>
        </div>

        <div className="px-5 py-3 border-b border-black/10 flex gap-3">
          <button
            className="px-3 py-2 text-[12px] bg-black text-white disabled:opacity-40"
            disabled={isMutating}
            onClick={onUndo}
          >
            撤销最近反馈
          </button>
          <button
            className="px-3 py-2 text-[12px] border border-black/15 disabled:opacity-40"
            disabled={isMutating}
            onClick={onClear}
          >
            清空画像
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {(isLoading || isMutating) && <p className="text-sm text-black/50">正在读取历史画像...</p>}
          {!isLoading && items.length === 0 && <p className="text-sm text-black/50">还没有累计偏好记录。</p>}

          {items.map((item) => (
            <a
              key={item.id}
              className="block border border-black/10 p-3 hover:border-black/30 transition-colors"
              href={item.sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              <div className="flex gap-3">
                {item.imageUrl ? (
                  <img alt={item.title} className="w-16 h-16 object-cover flex-shrink-0" src={item.imageUrl} />
                ) : (
                  <div className="w-16 h-16 bg-black/5 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium leading-5">{item.title}</p>
                  <p className="text-[11px] text-black/45 mt-1">{item.id}</p>
                  <div className="mt-3 flex gap-2 text-[11px]">
                    <span className="px-2 py-1 bg-black text-white">+{item.likedCount}</span>
                    <span className="px-2 py-1 border border-black/15">-{item.dislikedCount}</span>
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200">
                      净分 {item.netScore}
                    </span>
                  </div>
                  <div className="mt-3">
                    <button
                      className={`px-3 py-1 text-[11px] border ${
                        item.locked ? "bg-black text-white border-black" : "border-black/15"
                      }`}
                      onClick={(event) => {
                        event.preventDefault();
                        onToggleLock(item.id, item.locked);
                      }}
                    >
                      {item.locked ? "取消锁定 anchor" : "锁定为长期 anchor"}
                    </button>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
