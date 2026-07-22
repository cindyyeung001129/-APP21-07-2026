import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlantState, CheckInRecord } from '../types';
import { playClickSound, playSuccessChime } from '../utils/audio';
import { ArrowLeft, Gift, Copy, Check, Home, Edit3, Download, Share2, Sparkles, RefreshCw } from 'lucide-react';
import AnimatedPlant from './AnimatedPlant';

interface GardenViewProps {
  plantState: PlantState;
  onUpdatePlantState: (state: PlantState) => void;
  latestMoodLabel: string;
  score: number;
  onUpdateScore: (score: number) => void;
  records: CheckInRecord[];
  gardenCycleOffset: number;
  onUpdateGardenCycleOffset: (offset: number) => void;
  initialMode?: 'main' | 'exchange' | 'success';
}

interface GiftItem {
  id: string;
  name: string;
  desc?: string;
  cost: number;
  emoji: string;
}

const GIFTS: GiftItem[] = [
  {
    id: 'gift-0',
    name: '情緒語錄卡牌',
    desc: '⭐每日打卡即可領取',
    cost: 1,
    emoji: '🃏'
  },
  {
    id: 'gift-1',
    name: '電子明信片',
    desc: '花園系列',
    cost: 2,
    emoji: '📮'
  },
  {
    id: 'gift-2',
    name: '貼紙',
    desc: '',
    cost: 4,
    emoji: '🌸'
  },
  {
    id: 'gift-3',
    name: '精美書籤',
    desc: '',
    cost: 8,
    emoji: '📖'
  },
  {
    id: 'gift-4',
    name: '筆記簿',
    desc: '',
    cost: 15,
    emoji: '📒'
  },
  {
    id: 'gift-5',
    name: '神秘獎品',
    desc: '意想不到的特別驚喜',
    cost: 50,
    emoji: '🏆'
  }
];

const POSTCARD_QUOTES = [
  "每一朵花都有自己盛開的季節，不慌不忙，慢慢長大吧！🌿",
  "就算今天有雨，明天依然會有溫暖的陽光照亮你的花園。☀️",
  "你對小苗的悉心照顧，就像你對自己心靈的灌溉。謝謝你這麼努力！🌼",
  "願你的生活像盛開的花朵一樣，充滿朝氣與色彩！🌷",
  "心晴的時候，連風吹過都是暖的。送你一朵花，祝你今天也快樂！🌻"
];

const POSTCARD_THEMES = [
  {
    name: '晨光溫暖',
    gradient: 'from-amber-100 via-orange-100 to-rose-100',
    border: 'border-amber-300/60',
    text: 'text-amber-950',
    accent: 'bg-amber-500/20 text-amber-800 border-amber-300/50',
    stampBg: 'bg-amber-600/15 border-amber-500 text-amber-700',
    iconColor: 'text-amber-600',
    illustration: '☀️🌸🌿'
  },
  {
    name: '薄荷森林',
    gradient: 'from-teal-50 via-emerald-100 to-green-100',
    border: 'border-emerald-300/60',
    text: 'text-emerald-950',
    accent: 'bg-emerald-500/20 text-emerald-800 border-emerald-300/50',
    stampBg: 'bg-emerald-600/15 border-emerald-500 text-emerald-700',
    iconColor: 'text-emerald-600',
    illustration: '🌱🌳☘️'
  },
  {
    name: '薰衣之境',
    gradient: 'from-indigo-100 via-purple-100 to-pink-100',
    border: 'border-purple-300/60',
    text: 'text-purple-950',
    accent: 'bg-purple-500/20 text-purple-800 border-purple-300/50',
    stampBg: 'bg-purple-600/15 border-purple-500 text-purple-700',
    iconColor: 'text-purple-600',
    illustration: '🌙✨🌷'
  },
  {
    name: '蔚藍海岸',
    gradient: 'from-blue-100 via-cyan-100 to-teal-50',
    border: 'border-cyan-300/60',
    text: 'text-cyan-950',
    accent: 'bg-cyan-500/20 text-cyan-800 border-cyan-300/50',
    stampBg: 'bg-cyan-600/15 border-cyan-500 text-cyan-700',
    iconColor: 'text-cyan-600',
    illustration: '🌊🕊️🍃'
  }
];

const isDevHost = typeof window !== 'undefined' && (
  window.location.hostname.includes('ais-dev') || 
  window.location.hostname.includes('localhost') ||
  window.location.hostname.includes('googleusercontent') ||
  window.location.hostname.includes('aistudio') ||
  new URLSearchParams(window.location.search).has('dev')
);

export default function GardenView({
  plantState,
  onUpdatePlantState,
  latestMoodLabel,
  score,
  onUpdateScore,
  records,
  gardenCycleOffset,
  onUpdateGardenCycleOffset,
  initialMode = 'main'
}: GardenViewProps) {
  // Screen mode states: 'main' | 'exchange' | 'success'
  const [mode, setMode] = useState<'main' | 'exchange' | 'success'>(initialMode);
  
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(plantState.name);
  
  // Selected gift & success state
  const [exchangedGift, setExchangedGift] = useState<GiftItem | null>(null);
  const [giftToConfirm, setGiftToConfirm] = useState<GiftItem | null>(null);
  const [successCode, setSuccessCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Postcard customizer states
  const [postcardName, setPostcardName] = useState('同學');
  const [postcardQuote, setPostcardQuote] = useState('每一朵花都有自己盛開的季節，不慌不忙，慢慢長大吧！🌿');
  const [postcardTheme, setPostcardTheme] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);

  // Harvest toast/feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Calculate dynamic check-in progress
  const checkInCount = Math.max(0, records.length - gardenCycleOffset);

  // Stage details based on actual count
  const getStageInfo = (count: number) => {
    if (count < 2) { // 0 to 1
      return {
        stageName: '種子期',
        label: '種子',
        desc: '種子喺泥土入面，等緊一個開始 🌰',
        progress: 10,
        stageIndex: 1,
      };
    } else if (count < 4) { // 2 to 3
      return {
        stageName: '萌芽期',
        label: '萌芽種子',
        desc: '小芽探出頭來，看到新世界 🌱',
        progress: 30,
        stageIndex: 2,
      };
    } else if (count < 7) { // 4 to 6
      return {
        stageName: '幼苗期',
        label: '3-4塊葉',
        desc: '開始長出葉子，每天都有變化 🌿',
        progress: 50,
        stageIndex: 3,
      };
    } else if (count < 10) { // 7 to 9
      return {
        stageName: '生長期',
        label: '枝葉茂盛',
        desc: '枝葉越發茂盛，展現生命活力 🌳',
        progress: 70,
        stageIndex: 4,
      };
    } else if (count < 15) { // 10 to 14
      return {
        stageName: '花蕾期',
        label: '出現花苞',
        desc: '小花苞悄悄出現，期待綻放 🌸',
        progress: 85,
        stageIndex: 5,
      };
    } else { // 15+
      return {
        stageName: '盛花期',
        label: '多朵花',
        desc: '繁花盛開，這是你悉心照顧的成果 🌺',
        progress: 100,
        stageIndex: 6,
      };
    }
  };

  const stageInfo = getStageInfo(checkInCount);

  const handleSaveName = () => {
    playSuccessChime();
    if (tempName.trim()) {
      onUpdatePlantState({
        ...plantState,
        name: tempName.trim()
      });
    }
    setIsEditingName(false);
  };

  const handleEnterExchange = () => {
    playClickSound(600, 'sine');
    setMode('exchange');
  };

  const handleExchange = (gift: GiftItem) => {
    if (score < gift.cost) return;

    // Deduct points
    onUpdateScore(score - gift.cost);
    
    // Generate code: GIFT-2026-XXX
    const randomNum = Math.floor(100 + Math.random() * 900);
    const code = `GIFT-2026-${randomNum}`;

    if (gift.id === 'gift-1') {
      const randQ = POSTCARD_QUOTES[Math.floor(Math.random() * POSTCARD_QUOTES.length)];
      setPostcardQuote(randQ);
      setPostcardName('同學');
      setPostcardTheme(0);
      setShowSaveSuccess(false);
      setShowShareSuccess(false);
    }

    setExchangedGift(gift);
    setSuccessCode(code);
    playSuccessChime();
    setMode('success');
  };

  const handleCopyToClipboard = () => {
    if (!exchangedGift) return;
    const details = `【心晴日記 兌換成功】\n您已成功兌換：「${exchangedGift.name}」\n兌換碼：${successCode}\n📌 請到輔導室領取\n有效期限：2026年8月31日`;
    
    try {
      navigator.clipboard.writeText(details);
    } catch (e) {
      console.warn("Failed to copy to native clipboard:", e);
    }
    
    playClickSound(580, 'sine');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBackToMain = () => {
    playClickSound(450, 'sine');
    setMode('main');
  };

  // Harvest the garden (+10 points and reset)
  const handleHarvest = () => {
    playSuccessChime();
    onUpdateScore(score + 10);
    onUpdateGardenCycleOffset(records.length);
    setToastMessage('🎉 收割成功！獲得了 10 積分！花園已重獲新生，重新播下希望的種子！🌱');
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Continue caring (gives a warm affirmation toast)
  const handleContinueCaring = () => {
    playSuccessChime();
    setToastMessage('🌸 謝謝你悉心照顧！你對小綠的愛心讓它在花園裡美麗常開。你可以隨時點擊「換禮物」兌換獎勵喔！');
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleSavePostcard = () => {
    setIsSaving(true);
    playClickSound(520, 'sine');
    setTimeout(() => {
      setIsSaving(false);
      setShowSaveSuccess(true);
      playSuccessChime();
      
      // Trigger a real text-based postcard download file as part of the simulation
      const element = document.createElement("a");
      const file = new Blob([
        `📮 【心晴日記 · 電子明信片】 📮\n\n` +
        `====================================\n` +
        `款式：${POSTCARD_THEMES[postcardTheme].name}\n` +
        `語錄：${postcardQuote}\n` +
        `致：${postcardName}\n` +
        `====================================\n` +
        `🌱 來自你的專屬心晴花園 · 心晴日記 2026\n` +
        `快來跟我一起灌溉心晴花園，培養專屬心靈植物吧！`
      ], {type: 'text/plain;charset=utf-8'});
      element.href = URL.createObjectURL(file);
      element.download = `心晴明信片-${postcardName || '同學'}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }, 1200);
  };

  const handleSharePostcard = () => {
    playClickSound(580, 'sine');
    const shareText = `📮 我的「心晴花園」專屬電子明信片 🌟\n\n「${postcardQuote}」\n—— 贈給：${postcardName || '同學'}\n\n🌱 快來跟我一起灌溉心晴花園，培養你的專屬心靈植物吧！\n👉 ${window.location.origin}`;
    try {
      navigator.clipboard.writeText(shareText);
    } catch (err) {
      console.warn("Clipboard share failed", err);
    }
    setShowShareSuccess(true);
    playSuccessChime();
  };

  // Render Page: SUCCESS SCREEN (GIFT REDEEMED)
  if (mode === 'success' && exchangedGift) {
    const isPostcard = exchangedGift.id === 'gift-1';

    return (
      <div className="flex-1 flex flex-col justify-between py-1 px-1 h-full overflow-y-auto">
        {isPostcard ? (
          /* ELECTRONIC POSTCARD INTERACTIVE PAGE */
          <div className="flex-1 flex flex-col justify-between space-y-4 py-2">
            <div className="text-center space-y-1 shrink-0">
              <div className="inline-flex items-center gap-1 bg-brand-sage/10 text-brand-moss border border-brand-sage/30 px-3 py-1 rounded-full text-xs font-black">
                <span>📮</span>
                <span>專屬電子明信片已生成</span>
              </div>
              <h3 className="text-base font-black text-gray-800">花園系列 · 即時明信片</h3>
            </div>

            {/* THE VISUAL POSTCARD PREVIEW */}
            <div className="relative shrink-0 py-1">
              <motion.div
                layout
                className={`relative w-full max-w-[440px] mx-auto p-4 rounded-2xl shadow-md border-2 overflow-hidden transition-all duration-300 bg-gradient-to-br ${POSTCARD_THEMES[postcardTheme].gradient} ${POSTCARD_THEMES[postcardTheme].border} ${POSTCARD_THEMES[postcardTheme].text}`}
              >
                {/* Save overlay spinner */}
                <AnimatePresence>
                  {isSaving && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 z-20 text-brand-moss"
                    >
                      <RefreshCw className="w-6 h-6 animate-spin" />
                      <span className="text-xs font-black">正在生成高畫質明信片...</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Postcard Layout */}
                <div className="flex flex-col h-full justify-between min-h-[220px]">
                  <div className="grid grid-cols-[1.2fr_1px_1fr] gap-3 relative h-full">
                    
            {/* Left Side: Quote & Polaroid-framed Plant Snapshot */}
            <div className="pr-1 flex flex-col justify-between h-full min-h-[220px]">
              {/* Top: Quotes (上面是語錄) */}
              <div className="text-left select-none mb-1">
                <p className="text-xs sm:text-[13px] font-black leading-relaxed italic text-slate-700 font-sans">
                  「{postcardQuote}」
                </p>
              </div>

              {/* Polaroid frame wrapping the plant snapshot */}
              <div className="flex-1 flex items-center justify-center relative mt-1 select-none">
                <div className="bg-white p-2 pb-4 rounded shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-slate-100 w-28 sm:w-32 rotate-[-1.5deg] transform hover:rotate-0 hover:scale-105 transition-all duration-300">
                  <div className="aspect-square w-full bg-linear-to-b from-slate-50 to-slate-100 border border-slate-200/50 overflow-hidden relative flex items-center justify-center rounded-xs">
                    {/* Grid/Texture Background */}
                    <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:8px_8px]" />
                    
                    <div className="scale-[0.5] sm:scale-[0.55] origin-center w-40 h-40 flex items-center justify-center -mt-6 select-none pointer-events-none">
                      <AnimatedPlant
                        progress={stageInfo.progress}
                        moodLabel={latestMoodLabel}
                        heightCm={10 + checkInCount}
                        isStatic={true}
                      />
                    </div>
                  </div>
                  {/* Handwritten title for current plant */}
                  <div className="mt-2 text-center">
                    <span className="font-serif font-black text-[10px] sm:text-[11px] text-slate-700 italic block tracking-wider truncate max-w-[100px] mx-auto">
                      🌱 {plantState.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>

                    {/* Separator Dashed Line */}
                    <div className="border-l border-dashed border-gray-400/30 h-full my-1" />

                    {/* Right Side: Stamp & To Address */}
                    <div className="pl-2 flex flex-col justify-between relative h-full min-h-[220px] pb-1">
                      {/* Stamp top-right corner */}
                      <div className="absolute top-0 right-0 flex flex-col items-center select-none">
                        {/* Stamp Box - Very standard and elegant postage stamp design */}
                        <div className={`w-11 h-14 border border-dashed rounded flex flex-col items-center justify-between p-1 relative shadow-xs ${POSTCARD_THEMES[postcardTheme].stampBg} border-slate-600/40`}>
                          <div className="text-[7px] font-bold tracking-widest text-slate-500 leading-none">POSTAGE</div>
                          <div className="text-sm leading-none my-0.5">🌸</div>
                          <div className="text-[8px] font-black text-slate-500 leading-none">$2.40</div>
                        </div>
                        {/* Postmark Circle overlay */}
                        <div className="absolute -top-1.5 -right-1.5 w-14 h-14 rounded-full border border-dashed border-slate-500/25 flex items-center justify-center rotate-12 pointer-events-none">
                          <span className="text-[7px] font-bold text-slate-400/55 font-mono tracking-widest scale-90 whitespace-nowrap">
                            HONG KONG
                          </span>
                        </div>
                      </div>

                      {/* Address Lines "To:" (Standard Postcard Design) */}
                      <div className="pt-16 space-y-2 text-left flex-1 flex flex-col justify-end">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold tracking-wider text-slate-400 block">收件人 / To:</span>
                          <div className="border-b border-slate-500/30 pb-0.5 pl-1">
                            <span className="text-[13px] font-bold tracking-wide font-sans text-slate-800 truncate block max-w-[130px]">
                              {postcardName || '親愛的同學'}
                            </span>
                          </div>
                        </div>
                        {/* Two standard address helper lines */}
                        <div className="border-b border-slate-400/20 h-1" />
                        <div className="border-b border-slate-400/20 h-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* CUSTOMIZATION PANEL CONTROLS */}
            <div className="bg-white/80 p-3.5 rounded-2xl border border-brand-sand/50 space-y-3.5 w-full max-w-[440px] mx-auto text-left">
              {/* Sign Name input */}
              <div className="space-y-1">
                <label className="text-xs font-black text-brand-moss flex items-center gap-1.5">
                  <span>✏️</span> <span>簽名區（寫上你的名字）：</span>
                </label>
                <input
                  type="text"
                  value={postcardName}
                  onChange={(e) => {
                    setPostcardName(e.target.value.slice(0, 10));
                  }}
                  className="w-full px-3 py-1.5 border border-brand-sand rounded-xl text-xs focus:outline-none focus:border-brand-sage font-black text-gray-700 bg-white shadow-2xs"
                  placeholder="輸入你的名字..."
                />
              </div>

              {/* Theme selection row */}
              <div className="space-y-1.5">
                <span className="text-xs font-black text-brand-moss flex items-center gap-1.5">
                  <span>🎨</span> <span>選擇明信片款式（即時生成）：</span>
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {POSTCARD_THEMES.map((theme, idx) => (
                    <button
                      key={theme.name}
                      onClick={() => {
                        playClickSound(480 + idx * 40, 'sine');
                        setPostcardTheme(idx);
                      }}
                      className={`py-1.5 px-1 rounded-lg border text-xs font-extrabold text-center transition cursor-pointer ${
                        postcardTheme === idx
                          ? 'border-brand-sage bg-brand-sage/10 text-brand-moss font-black shadow-2xs'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {theme.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quote shuffler */}
              <div className="flex items-center justify-between pt-1 border-t border-brand-sand/40">
                <span className="text-xs font-bold text-gray-400">覺得語錄不合適？</span>
                <button
                  onClick={() => {
                    playClickSound(560, 'sine');
                    const filtered = POSTCARD_QUOTES.filter(q => q !== postcardQuote);
                    const nextQ = filtered[Math.floor(Math.random() * filtered.length)];
                    setPostcardQuote(nextQ);
                  }}
                  className="text-xs font-black text-brand-sage hover:text-brand-moss flex items-center gap-1 transition active:scale-95 cursor-pointer border-0 bg-transparent"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>隨機換一句話</span>
                </button>
              </div>
            </div>

            {/* ACTION BUTTONS (儲存、分享、回到首頁) */}
            <div className="grid grid-cols-3 gap-2 shrink-0 pt-3 border-t border-brand-sand/40 max-w-[440px] mx-auto w-full">
              <button
                onClick={handleSavePostcard}
                className="py-2.5 bg-brand-sage hover:bg-brand-moss text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-2xs border-0"
                style={{ minHeight: '40px' }}
              >
                <Download className="w-4 h-4" />
                <span>儲存</span>
              </button>

              <button
                onClick={handleSharePostcard}
                className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-2xs border-0"
                style={{ minHeight: '40px' }}
              >
                <Share2 className="w-4 h-4" />
                <span>分享</span>
              </button>

              <button
                onClick={handleBackToMain}
                className="py-2.5 bg-[#f9f7f2] hover:bg-brand-sand text-brand-moss border border-brand-sand/80 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-2xs"
                style={{ minHeight: '40px' }}
              >
                <Home className="w-4 h-4" />
                <span>回到首頁</span>
              </button>
            </div>

            {/* SAVE SUCCESS POPUP MODAL */}
            <AnimatePresence>
              {showSaveSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/40 backdrop-blur-xs"
                    onClick={() => setShowSaveSuccess(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl border-2 border-brand-sand p-6 max-w-[300px] w-full text-center space-y-4 relative z-10 shadow-xl"
                  >
                    <div className="text-4xl">📸</div>
                    <h4 className="text-base font-black text-gray-800">已儲存至裝置相簿！</h4>
                    <p className="text-[12px] font-bold text-gray-500 leading-relaxed">
                      明信片文字檔案已成功下載！您也可以直接「長按明信片」截圖儲存精美畫面，永久留存這份溫暖！✨
                    </p>
                    <button
                      onClick={() => {
                        playClickSound(450, 'sine');
                        setShowSaveSuccess(false);
                      }}
                      className="w-full py-2 bg-brand-sage hover:bg-brand-moss text-white rounded-xl text-[13px] font-black transition cursor-pointer border-0"
                    >
                      太棒了
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* SHARE SUCCESS POPUP MODAL */}
            <AnimatePresence>
              {showShareSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/40 backdrop-blur-xs"
                    onClick={() => setShowShareSuccess(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl border-2 border-brand-sand p-6 max-w-[300px] w-full text-center space-y-4 relative z-10 shadow-xl"
                  >
                    <div className="text-4xl">✨</div>
                    <h4 className="text-base font-black text-gray-800">分享文案複製成功！</h4>
                    <p className="text-[12px] font-bold text-gray-500 leading-relaxed text-left bg-gray-50 p-2.5 rounded-xl border border-gray-100 font-sans max-h-[110px] overflow-y-auto">
                      {`📮 我的「心晴花園」專屬電子明信片 🌟\n\n「${postcardQuote}」\n—— 贈給：${postcardName || '同學'}`}
                    </p>
                    <p className="text-[11px] font-bold text-gray-400">
                      我們已將精美明信片文案及網址複製到您的剪貼簿，快貼給老師或同學們分享吧！🌸
                    </p>
                    <button
                      onClick={() => {
                        playClickSound(450, 'sine');
                        setShowShareSuccess(false);
                      }}
                      className="w-full py-2 bg-brand-sage hover:bg-brand-moss text-white rounded-xl text-[13px] font-black transition cursor-pointer border-0"
                    >
                      我知道了
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </div>
        ) : (
          /* STANDARD GIFT REDEMPTION SUCCESS TICKET */
          <div className="flex-1 flex flex-col justify-between py-1 px-1 h-full overflow-y-auto">
            <div className="flex-1 flex flex-col items-center justify-center py-6 text-center space-y-6">
              {/* Confetti & Celebratory animations */}
              <div className="text-5xl animate-bounce tracking-widest text-yellow-500">
                🎉
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-full text-base font-black">
                  <span>✅</span>
                  <span>兌換成功！</span>
                </div>
              </div>

              {/* Exchanged item summary */}
              <div className="bg-white/80 p-5 rounded-2xl border border-brand-sand/60 w-full max-w-[340px] shadow-xs space-y-4 font-sans text-left">
                <div>
                  <span className="text-xs text-gray-400 font-bold block mb-1">你已成功兌換：</span>
                  <p className="text-base font-black text-gray-800">「{exchangedGift.name}」</p>
                </div>

                <div className="bg-brand-sand/20 px-3 py-2.5 rounded-xl border border-brand-sand/50 font-mono">
                  <span className="text-[11px] text-gray-400 font-bold block">兌換碼：</span>
                  <p className="text-sm font-black text-brand-moss tracking-wider mt-0.5">{successCode}</p>
                </div>

                <div className="space-y-1 pt-1.5 border-t border-brand-sand/40 text-xs font-bold text-gray-600">
                  <p className="flex items-center gap-1.5">
                    <span>📌</span>
                    <span>請到輔導室領取</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-gray-400">
                    <span>📅</span>
                    <span>有效期限：2026年8月31日</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Dual Actions Bar */}
            <div className="grid grid-cols-2 gap-3 shrink-0 pt-3 border-t border-brand-sand/40">
              <button
                onClick={handleCopyToClipboard}
                className={`w-full py-2.5 rounded-xl text-[13px] font-black transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                  copied 
                    ? 'bg-emerald-500 text-white shadow-md' 
                    : 'bg-brand-sage text-white hover:bg-brand-moss shadow-sm shadow-brand-sage/10'
                }`}
                style={{ minHeight: '40px' }}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>已複製！</span>
                  </>
                ) : (
                  <>
                    <span>📋 複製兌換碼</span>
                  </>
                )}
              </button>

              <button
                onClick={handleBackToMain}
                className="w-full py-2.5 bg-[#f9f7f2] hover:bg-brand-sand text-brand-moss border border-brand-sand/80 rounded-xl text-[13px] font-black transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                style={{ minHeight: '40px' }}
              >
                <Home className="w-4 h-4" />
                <span>🏠 返回首頁</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Page: GIFT EXCHANGE LISTING SCREEN
  if (mode === 'exchange') {
    return (
      <div className="flex-1 flex flex-col justify-between py-1 px-1 h-full overflow-y-auto">
        <div className="space-y-4">
          {/* Header Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToMain}
              className="flex items-center gap-1 text-[13px] px-3 py-1.5 rounded-xl bg-brand-sand/40 text-brand-moss hover:bg-brand-sand/70 transition font-black cursor-pointer"
              style={{ minHeight: '36px' }}
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>返回</span>
            </button>

            <h2 className="text-[17px] font-black text-gray-800 font-sans tracking-tight pr-4">換禮物</h2>
            <div className="w-10" />
          </div>

          {/* Centered Neat Score Counter Card - Compact, clean, matches layout */}
          <div className="bg-[#f9f7f2] p-2.5 px-4 rounded-xl border border-brand-sand/80 shadow-xs flex items-center justify-between max-w-[240px] mx-auto">
            <span className="text-[13px] font-extrabold text-brand-moss">⭐ 我的積分</span>
            <span className="text-[14px] font-black text-amber-600 font-mono">{score} 分</span>
          </div>

          {/* Gift cards list with moderate, uniform fonts and beautifully styled cards */}
          <div className="space-y-3.5 overflow-y-auto max-h-[460px] pr-0.5">
            {GIFTS.map((gift) => {
              const isAffordable = score >= gift.cost;
              return (
                <div 
                  key={gift.id}
                  className="bg-white p-4 rounded-2xl border border-brand-sand flex items-center justify-between gap-4 shadow-xs hover:border-brand-sage/40 transition-all duration-300"
                >
                  <div className="space-y-1 text-left flex-1">
                    {/* Emoji + Name together */}
                    <h3 className="text-sm font-black text-gray-800 flex items-center gap-1">
                      <span>{gift.emoji}</span>
                      <span>{gift.name}</span>
                    </h3>
                    
                    {/* Description if present (e.g. 花園系列) */}
                    {gift.desc && (
                      <p className="text-xs font-bold text-gray-500 leading-tight">
                        {gift.desc}
                      </p>
                    )}
                    
                    {/* Points display */}
                    {gift.id !== 'gift-0' && (
                      <p className="text-xs font-black text-amber-600 flex items-center gap-1 pt-0.5">
                        <span>⭐</span>
                        <span>{gift.cost} 分</span>
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center justify-center">
                    <button
                      disabled={!isAffordable}
                      onClick={() => {
                        playClickSound(550, 'sine');
                        if (gift.id === 'gift-0') {
                          handleExchange(gift);
                        } else {
                          setGiftToConfirm(gift);
                        }
                      }}
                      className={`px-5 py-1.5 rounded-full text-xs font-black transition cursor-pointer text-center min-w-[70px] ${
                        isAffordable
                          ? 'bg-brand-sage text-white hover:bg-brand-moss active:scale-95 shadow-xs border-0'
                          : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                      }`}
                      style={{ minHeight: '34px' }}
                    >
                      {gift.id === 'gift-0' ? '領取' : '兌換'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {giftToConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  playClickSound(400, 'sine');
                  setGiftToConfirm(null);
                }}
                className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 15 }}
                className="bg-[#fcfaf6] rounded-2xl border-2 border-brand-sand/80 shadow-xl max-w-[300px] w-full p-6 relative z-10 text-center space-y-4"
              >
                <div className="text-4xl">{giftToConfirm.emoji}</div>
                
                <div className="space-y-1">
                  <h4 className="text-[16px] font-black text-gray-800">
                    確定要兌換嗎？
                  </h4>
                  <p className="text-[13px] font-bold text-gray-500 leading-relaxed">
                    您將使用 <span className="text-amber-600 font-extrabold">{giftToConfirm.cost}</span> 積分兌換
                    <br />
                    「{giftToConfirm.name}」
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => {
                      playClickSound(450, 'sine');
                      setGiftToConfirm(null);
                    }}
                    className="py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-[13px] font-black text-gray-600 transition active:scale-95 cursor-pointer"
                    style={{ minHeight: '38px' }}
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      setGiftToConfirm(null);
                      handleExchange(giftToConfirm);
                    }}
                    className="py-2 rounded-xl bg-brand-sage hover:bg-brand-moss text-white text-[13px] font-black transition active:scale-95 cursor-pointer border-0"
                    style={{ minHeight: '38px' }}
                  >
                    確定
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="text-center py-2.5 text-[12px] font-bold text-gray-400">
          🎁 更多精美禮物籌備中，敬請期待！
        </div>
      </div>
    );
  }

  // Render Page: GARDEN MAIN DASHBOARD SCREEN (Default)
  return (
    <div className="flex-1 flex flex-col justify-between py-1 px-1 space-y-3.5 h-full overflow-y-auto relative">
      {/* Centered Garden Title */}
      <div className="text-center relative shrink-0">
        <h2 className="text-[20px] sm:text-[22px] font-black text-gray-800 font-sans tracking-tight">
          我的花園
        </h2>
      </div>

      {/* Floating dynamic confirmation toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-12 left-2 right-2 z-50 bg-emerald-50 border-2 border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl shadow-md text-[14px] sm:text-[15px] font-bold text-center leading-relaxed"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Beautiful Animated Plant Visual Card - MATCHING HOMEVIEW STYLE */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-[220px] py-1 shrink-0">
        <AnimatedPlant
          progress={stageInfo.progress}
          moodLabel={latestMoodLabel}
          heightCm={10 + checkInCount}
        />
      </div>

      {/* Dynamic Plant Name & Multi-stage Label with moderate fonts */}
      <div className="text-center space-y-2 shrink-0 px-2">
        {/* Plant Name editor */}
        <div className="flex items-center justify-center gap-1.5">
          {isEditingName ? (
            <div className="flex items-center gap-1 bg-white border border-brand-sage/50 p-1 rounded-xl">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="text-[15px] font-bold text-gray-800 px-2 py-0.5 outline-none font-sans max-w-[120px]"
                maxLength={8}
                autoFocus
              />
              <button
                onClick={handleSaveName}
                className="text-[12px] px-2.5 py-1 bg-brand-moss text-white rounded-lg font-bold hover:bg-black transition cursor-pointer"
              >
                儲存
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-[16px] sm:text-[17px] font-black text-brand-moss">🌸 {plantState.name}</span>
              <button
                onClick={() => {
                  playClickSound(520, 'sine');
                  setIsEditingName(true);
                }}
                className="text-brand-moss/60 hover:text-black p-1 rounded-lg transition cursor-pointer"
                title="修改盆栽名字"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Dynamic stage status labels with moderate fonts */}
        <div className="space-y-1">
          <p className="text-[16px] sm:text-[18px] font-black text-brand-moss leading-none">
            階段 {Math.min(15, checkInCount + 1)}/15 · {stageInfo.stageName}
          </p>
          <p className="text-[14px] sm:text-[16px] font-bold text-gray-500 mt-0.5 italic max-w-sm mx-auto leading-relaxed">
            「{stageInfo.desc}」
          </p>
        </div>
      </div>

      {/* 心晴積分 Count Display */}
      <div className="bg-[#f9f7f2] p-2.5 px-4 rounded-xl border border-brand-sand/80 shadow-xs flex items-center justify-between shrink-0 max-w-[280px] mx-auto w-full">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">⭐</span>
          <span className="text-[13px] font-extrabold text-brand-moss font-sans">我的心晴積分：</span>
        </div>
        <span className="text-[14px] font-black text-amber-600 font-mono">{score} 分</span>
      </div>

      {/* Action Buttons Zone based on plant stage */}
      <div className="space-y-3 shrink-0">
        {/* 1. Harvest Garden Button (Always visible) */}
        {checkInCount >= 15 ? (
          <button
            onClick={handleHarvest}
            className="w-full py-3 bg-brand-sage hover:bg-brand-moss text-white rounded-[100px] text-[14px] sm:text-[16px] font-black shadow-[0_4px_12px_rgba(109,160,111,0.25)] flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border-0"
            style={{ minHeight: '44px' }}
          >
            <span>🧺 收割花園（+10積分）</span>
          </button>
        ) : (
          <div className="flex justify-center">
            <button
              disabled
              className="px-5 py-2.5 bg-gray-200 text-gray-400 rounded-full text-[12px] sm:text-[13px] font-extrabold flex items-center justify-center gap-1.5 cursor-not-allowed border-0 max-w-[280px]"
              style={{ minHeight: '38px' }}
            >
              <span>🧺 收割花園（未達到收割條件 {checkInCount}/15）</span>
            </button>
          </div>
        )}

        {/* 2. Caring & Gift options */}
        {checkInCount >= 15 ? (
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleContinueCaring}
              className="w-full py-3 bg-[#fdfbf7] hover:bg-brand-sand/30 text-brand-moss rounded-[100px] text-[14px] sm:text-[16px] font-black border-2 border-brand-sand flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              style={{ minHeight: '44px' }}
            >
              <span>🌸 繼續照顧（累積花園積分）</span>
            </button>
            <div className="text-center pt-1">
              <button
                onClick={handleEnterExchange}
                className="text-[13px] sm:text-[14px] text-brand-ochre hover:text-amber-700 font-black underline cursor-pointer border-0 bg-transparent"
              >
                前往「換禮物」兌換獎品
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={handleEnterExchange}
              className="w-full py-3 bg-brand-sage hover:bg-brand-moss text-white rounded-[100px] text-[14px] sm:text-[16px] font-black shadow-[0_4px_12px_rgba(109,160,111,0.2)] flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border-0"
              style={{ minHeight: '44px' }}
            >
              <span>🎁 前往「換禮物」兌換獎品</span>
            </button>
          </div>
        )}
      </div>

      {/* Score Rules board with moderate font sizes */}
      <div className="bg-[#f9f7f2] p-3.5 rounded-2xl border border-brand-sand/60 space-y-2 shrink-0">
        <span className="text-[14px] sm:text-[15px] font-black text-brand-moss block">💡 獲取積分方法：</span>
        <ul className="text-[13px] sm:text-[14px] font-bold text-gray-500 space-y-1.5 font-sans leading-relaxed">
          <li className="flex items-center gap-1.5">
            <span className="text-emerald-500">✅</span>
            <span>每日打卡 <span className="text-brand-sage font-black">+1</span></span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-emerald-500">✅</span>
            <span>每日寫日誌超過 10 字 <span className="text-brand-sage font-black">+1</span></span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-emerald-500">✅</span>
            <span>連續 3 日打卡 <span className="text-brand-ochre font-black">+2</span></span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-emerald-500">✅</span>
            <span>收割花園 <span className="text-brand-sage font-black">+10</span></span>
          </li>
        </ul>
      </div>
    </div>
  );
}
