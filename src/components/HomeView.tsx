import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import AnimatedPlant from './AnimatedPlant';
import { playClickSound, speakText } from '../utils/audio';
import { Sparkles, Volume2, Heart, ArrowRight } from 'lucide-react';

interface HomeViewProps {
  onStartCheckIn: () => void;
  plantProgress: number;
  plantHeight: number;
  latestMoodLabel: string;
  wateredCount: number;
  lastWatered: string | null;
  onNavigateToGarden: () => void;
}

export default function HomeView({
  onStartCheckIn,
  plantProgress,
  plantHeight,
  latestMoodLabel,
  wateredCount,
  lastWatered,
  onNavigateToGarden
}: HomeViewProps) {
  const [greeting, setGreeting] = useState('☀️ 早晨，今日慢慢開始');
  const [plantTapCount, setPlantTapCount] = useState(0);
  const [showHeart, setShowHeart] = useState(false);

  // Set the greeting based on the current local time dynamically!
  useEffect(() => {
    const updateGreeting = () => {
      const hours = new Date().getHours();
      if (hours >= 5 && hours < 12) {
        setGreeting('☀️ 早晨，今日慢慢開始');
      } else if (hours >= 12 && hours < 18) {
        setGreeting('🍵 午安，放慢腳步稍息一下');
      } else {
        setGreeting('🌙 晚安，今天你辛苦了，好好休息');
      }
    };
    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSpeakGreeting = () => {
    speakText(`${greeting}。請點擊「今日情緒打卡」按鈕記錄你今天的心情。`);
  };

  const handleTapPlant = () => {
    playClickSound(580, 'sine');
    setPlantTapCount((prev) => prev + 1);
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
  };

  return (
    <div className="flex-1 flex flex-col space-y-2 py-1 px-1 overflow-y-auto -mt-1 pb-2">
      {/* Card 1: Dynamic Greeting Card */}
      <div className="bg-[#f9f7f2] px-4 py-2 rounded-2xl border-2 border-brand-sand/60 shadow-sm flex items-center justify-between shrink-0">
        <h1 className="text-[14px] sm:text-[15px] font-black text-brand-moss font-sans tracking-tight">
          {greeting}
        </h1>
        <button
          onClick={handleSpeakGreeting}
          className="p-2 rounded-full hover:bg-brand-sand text-brand-moss transition active:scale-90"
          title="朗讀問候語"
          style={{ minHeight: '40px', minWidth: '40px' }}
        >
          <Volume2 className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Card 2: Central Interactive Plant & Garden Entry Card */}
      <div className="bg-white px-3 py-2.5 rounded-2xl border-2 border-[#e6dfd3] shadow-sm flex flex-col items-center justify-between relative flex-1 min-h-[220px] -mt-0.5">
        {/* Interactive Plant Area (Shifted slightly upwards) */}
        <div
          onClick={handleTapPlant}
          className="cursor-pointer active:scale-95 transition-transform duration-200 w-full flex-1 flex items-center justify-center pt-1 pb-3 mt-[-14px]"
          title="點擊小綠，給它一點愛心！"
        >
          <AnimatedPlant
            progress={plantProgress}
            moodLabel={latestMoodLabel}
            heightCm={plantHeight}
          />
        </div>



        {/* Heart popup indicator */}
        {showHeart && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.5 }}
            animate={{ opacity: 1, y: -40, scale: 1.2 }}
            exit={{ opacity: 0 }}
            className="absolute text-rose-500 z-30 pointer-events-none"
          >
            <Heart className="w-8 h-8 fill-rose-500" />
          </motion.div>
        )}

        {/* Action to Garden page (with border) */}
        <div className="w-full mt-2 pt-2 border-t border-brand-sand/50">
          <button
            onClick={() => {
              playClickSound(580, 'sine');
              onNavigateToGarden();
            }}
            className="w-full py-2 bg-brand-sage/25 hover:bg-brand-sage/40 text-brand-moss rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 border border-brand-sage/40 active:scale-95"
            style={{ minHeight: '38px' }}
          >
            <span>🌳 進入我的花園 (看詳細盆栽狀態)</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Card 3: Prominent Emotion Check-In Action Card (Now at the bottom!) */}
      <div className="bg-white px-3 py-2.5 rounded-2xl border-2 border-[#e6dfd3] shadow-sm shrink-0 -mt-0.5">
        <motion.button
          onClick={() => {
            playClickSound(660, 'sine');
            onStartCheckIn();
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative w-full py-3 bg-brand-sage hover:bg-brand-moss text-white rounded-[100px] text-[16px] font-black shadow-[0_4px_12px_rgba(109,160,111,0.25)] flex items-center justify-center transition-colors cursor-pointer border-0"
          style={{ minHeight: '48px' }}
        >
          <div className="absolute left-5 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-brand-ochre animate-pulse" />
          </div>
          <span className="tracking-wide">今日情緒打卡</span>
        </motion.button>
      </div>
    </div>
  );
}
