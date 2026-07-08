import { Bookmark, ChevronDown, ChevronUp, Heart, MessageCircle, Play, Share2 } from "lucide-react";
import { useState } from "react";

const reels = [
  {
    id: "oop-polymorphism",
    title: "Đa hình trong OOP qua ví dụ ngắn",
    source: "TikTok reel học nhanh",
    tags: ["OOP", "Java", "Đa hình"],
    likes: 847,
    tone: "from-blue-700 to-slate-950",
    videoUrl: "/reels/tiktok-oop-01.mp4",
  },
  {
    id: "agent-review",
    title: "Agent mode trong quy trình review pull request",
    source: "Tin ngắn DevTools",
    tags: ["GitHub", "AI", "Review"],
    likes: 1203,
    tone: "from-teal-700 to-slate-950",
    videoUrl: "/reels/tiktok-agent-review.mp4",
  },
  {
    id: "rust-ownership",
    title: "Rust ownership giải quyết lỗi bộ nhớ ra sao?",
    source: "Tóm tắt cho người học OOP",
    tags: ["Rust", "Memory", "Systems"],
    likes: 634,
    tone: "from-amber-700 to-slate-950",
    videoUrl: "/reels/tiktok-rust-ownership.mp4",
  },
];

export default function TechReels() {
  const [current, setCurrent] = useState(0);
  const [missingVideos, setMissingVideos] = useState<Record<string, boolean>>({});
  const [focusMode, setFocusMode] = useState(false);
  const [likedReels, setLikedReels] = useState<Record<string, boolean>>({});
  const [savedReels, setSavedReels] = useState<Record<string, boolean>>({});
  const [sharedReel, setSharedReel] = useState<string | null>(null);

  const reel = reels[current];
  const hasVideo = !missingVideos[reel.id];
  const liked = Boolean(likedReels[reel.id]);
  const saved = Boolean(savedReels[reel.id]);

  const navigate = (direction: 1 | -1) => {
    setCurrent((value) => Math.max(0, Math.min(reels.length - 1, value + direction)));
  };

  const shareReel = () => {
    setSharedReel(reel.id);
    window.setTimeout(() => setSharedReel(null), 650);
  };

  return (
    <div className="flex min-h-full items-center justify-center p-5">
      <div className={`grid gap-5 transition-all duration-300 ${focusMode ? "grid-cols-[390px]" : "grid-cols-[320px_190px]"}`}>
        <section
          className={`relative flex cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br ${reel.tone} shadow-lg shadow-slate-300 transition-all duration-300 ${
            focusMode ? "h-[690px] w-[390px]" : "h-[570px] w-[320px]"
          }`}
        >
          {hasVideo && (
            <video
              key={reel.videoUrl}
              className="absolute inset-0 h-full w-full object-cover"
              src={reel.videoUrl}
              autoPlay
              loop
              muted
              playsInline
              controls={false}
              onError={() => setMissingVideos((value) => ({ ...value, [reel.id]: true }))}
            />
          )}

          <button
            aria-label={focusMode ? "Thu nhỏ video" : "Phóng to video"}
            onClick={() => setFocusMode((value) => !value)}
            className="absolute inset-0 z-10 cursor-pointer bg-transparent"
          />

          {!hasVideo && (
            <div className="absolute inset-0">
              <div className="absolute inset-0 opacity-70">
                <div className="absolute left-8 top-20 h-24 w-24 rounded-full border border-white/15" />
                <div className="absolute right-7 top-36 h-36 w-20 rounded-full border border-white/10" />
                <div className="absolute bottom-28 left-10 h-1 w-44 rotate-[-18deg] rounded-full bg-white/20" />
                <div className="absolute bottom-40 right-8 h-1 w-32 rotate-[24deg] rounded-full bg-white/15" />
              </div>
              <div className="absolute left-5 right-5 top-12 rounded-xl border border-white/15 bg-slate-950/45 p-3 text-xs leading-5 text-white/80 backdrop-blur">
                <div className="font-semibold text-white">Đang chờ video local</div>
                <div className="mt-1 break-all">{reel.videoUrl}</div>
              </div>
            </div>
          )}

          {!focusMode && (
            <div className="pointer-events-none absolute left-5 right-5 top-5 z-20 flex gap-1">
              {reels.map((_, index) => (
                <div key={index} className={`h-1 flex-1 rounded-full ${index === current ? "bg-white" : "bg-white/25"}`} />
              ))}
            </div>
          )}

          {!hasVideo && !focusMode && (
            <button className="absolute left-1/2 top-[42%] flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-950 shadow-xl">
              <Play size={22} fill="currentColor" />
            </button>
          )}

          {!focusMode && (
            <div className="pointer-events-none relative z-20 mt-auto w-full p-5 text-white">
              <div className="mb-3 flex flex-wrap gap-2">
                {reel.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-950/25 px-2.5 py-1 text-xs text-white backdrop-blur-sm drop-shadow">
                    #{tag}
                  </span>
                ))}
              </div>
              <h1 className="text-xl font-semibold leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,.65)]">{reel.title}</h1>
              <p className="mt-3 text-sm leading-6 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.55)]">{reel.source}</p>
            </div>
          )}
        </section>

        {!focusMode && (
          <aside className="flex flex-col justify-center gap-4">
            <button
              onClick={() => navigate(-1)}
              disabled={current === 0}
              className="reel-nav-button flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm disabled:opacity-40"
            >
              <ChevronUp size={20} />
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setLikedReels((value) => ({ ...value, [reel.id]: !liked }))}
                className={`reel-action-button ${liked ? "is-liked" : ""}`}
              >
                <Heart size={20} fill={liked ? "currentColor" : "none"} />
              </button>
              <span className={`text-sm font-medium transition-colors ${liked ? "text-rose-500" : "text-slate-600"}`}>
                {(reel.likes + (liked ? 1 : 0)).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button className="reel-action-button">
                <MessageCircle size={20} />
              </button>
              <span className="text-sm font-medium text-slate-600">48</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSavedReels((value) => ({ ...value, [reel.id]: !saved }))}
                className={`reel-action-button ${saved ? "is-saved" : ""}`}
              >
                <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
              </button>
              <span className={`text-sm font-medium transition-colors ${saved ? "text-amber-600" : "text-slate-600"}`}>
                {saved ? "Đã lưu" : "Lưu"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={shareReel}
                className={`reel-action-button ${sharedReel === reel.id ? "is-shared" : ""}`}
              >
                <Share2 size={20} />
              </button>
              <span className={`text-sm font-medium transition-colors ${sharedReel === reel.id ? "text-blue-600" : "text-slate-600"}`}>
                {sharedReel === reel.id ? "Đã copy" : "Chia sẻ"}
              </span>
            </div>

            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${((current + 1) / reels.length) * 100}%` }}
              />
            </div>

            <button
              onClick={() => navigate(1)}
              disabled={current === reels.length - 1}
              className="reel-nav-button flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm disabled:opacity-40"
            >
              <ChevronDown size={20} />
            </button>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-950">Mục tiêu feed</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Tech Reels dùng để cập nhật kiến thức ngắn. Phần kiểm tra kiến thức nằm trong quiz của từng bài học.
              </p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
