import { useState, useEffect } from 'react';
import { CheckInRecord, PlantState } from './types';
import { getPlantStage } from './moodsData';
import { playClickSound, playSuccessChime } from './utils/audio';
import HomeView from './components/HomeView';
import JournalView from './components/JournalView';
import FirstAidView from './components/FirstAidView';
import GardenView from './components/GardenView';
import CheckInWizard from './components/CheckInWizard';
import { Home, BookOpen, ShieldAlert, Heart, VolumeX, Volume2, Sprout } from 'lucide-react';

// Seeding standard initial logs so the app is lively from the start
const DEFAULT_RECORDS: CheckInRecord[] = [
  {
    id: 'dev-rec-1',
    date: '2026-07-21',
    time: '12:00',
    moodEmoji: '😊',
    moodLabel: '開心',
    moodType: 'positive',
    reason: '今天設計了精緻的拍立得相框，看到自己培育的植物長得這麼茂盛，心裡充滿了滿足感！',
    tags: ['開發', '成就感', '花園'],
    timestamp: new Date('2026-07-21T12:00:00').getTime()
  },
  {
    id: 'dev-rec-2',
    date: '2026-07-20',
    time: '18:30',
    moodEmoji: '😊',
    moodLabel: '開心',
    moodType: 'positive',
    reason: '同朋友一齊去茶餐廳食菠蘿油，傾咗好耐偈，感覺壓力全消。',
    tags: ['朋友', '美食', '放鬆'],
    timestamp: new Date('2026-07-20T18:30:00').getTime()
  },
  {
    id: 'dev-rec-3',
    date: '2026-07-19',
    time: '15:10',
    moodEmoji: '😌',
    moodLabel: '平靜',
    moodType: 'positive',
    reason: '落雨天留喺屋企聽雨聲，看了一本好書，享受難得的寧靜午後。',
    tags: ['好天氣', '個人空間'],
    timestamp: new Date('2026-07-19T15:10:00').getTime()
  },
  {
    id: 'dev-rec-4',
    date: '2026-07-18',
    time: '10:00',
    moodEmoji: '😲',
    moodLabel: '驚訝',
    moodType: 'positive',
    reason: '早起做咗半個鐘瑜伽，竟然感覺到前所未有的舒展！',
    tags: ['健康', '自我關懷'],
    timestamp: new Date('2026-07-18T10:00:00').getTime()
  },
  {
    id: 'dev-rec-5',
    date: '2026-07-17',
    time: '21:00',
    moodEmoji: '😢',
    moodLabel: '睏',
    moodType: 'heavy',
    reason: '洗完熱水澡，敷咗個保濕面膜，準備早啲休息，好好慰勞下自己。',
    tags: ['休息', '自我關懷'],
    timestamp: new Date('2026-07-17T21:00:00').getTime()
  },
  {
    id: 'dev-rec-6',
    date: '2026-07-16',
    time: '14:20',
    moodEmoji: '😌',
    moodLabel: '平靜',
    moodType: 'positive',
    reason: '買咗一盆新的薄荷葉放喺窗台，看著它安靜成長。',
    tags: ['生活', '希望'],
    timestamp: new Date('2026-07-16T14:20:00').getTime()
  },
  {
    id: 'dev-rec-7',
    date: '2026-07-15',
    time: '17:40',
    moodEmoji: '😊',
    moodLabel: '開心',
    moodType: 'positive',
    reason: '收到媽媽發來的問候訊息，叮囑我要多喝水，感受到家人的愛。',
    tags: ['家庭', '愛'],
    timestamp: new Date('2026-07-15T17:40:00').getTime()
  },
  {
    id: 'dev-rec-8',
    date: '2026-07-14',
    time: '19:00',
    moodEmoji: '😣',
    moodLabel: '討厭',
    moodType: 'heavy',
    reason: '今天的晚餐有我最不喜歡吃的蔬菜，好討厭這個味道。',
    tags: ['家庭', '美食'],
    timestamp: new Date('2026-07-14T19:00:00').getTime()
  }
];

const DEV_RECORDS: CheckInRecord[] = DEFAULT_RECORDS;

const DEFAULT_PLANT: PlantState = {
  name: '小綠',
  stage: 'growing',
  progress: 55, // Starting at 55% so they can see flowers soon!
  wateredCount: 8,
  height: 8,
  lastWatered: '2026-07-14'
};

const isDevHost = typeof window !== 'undefined' && (
  window.location.hostname.includes('ais-dev') || 
  window.location.hostname.includes('localhost') ||
  window.location.hostname.includes('googleusercontent') ||
  window.location.hostname.includes('aistudio') ||
  new URLSearchParams(window.location.search).has('dev')
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'journal' | 'firstaid' | 'garden'>('home');
  const [records, setRecords] = useState<CheckInRecord[]>([]);
  const [plantState, setPlantState] = useState<PlantState>(DEFAULT_PLANT);
  const [showGarden, setShowGarden] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [score, setScore] = useState<number>(100);
  const [gardenCycleOffset, setGardenCycleOffset] = useState<number>(0);

  // Load state on mount
  useEffect(() => {
    // Migration to ensure 15/15 fully bloomed stage starts immediately on first load of this update
    const hasMigrationV2 = localStorage.getItem('garden_migration_v2');
    if (!hasMigrationV2) {
      localStorage.setItem('mood_app_records', JSON.stringify(DEFAULT_RECORDS));
      localStorage.setItem('garden_cycle_offset', '0');
      localStorage.setItem('garden_migration_v2', 'true');
    }

    const storedRecords = localStorage.getItem('mood_app_records');
    const storedPlant = localStorage.getItem('mood_app_plant');
    const storedMute = localStorage.getItem('mood_app_muted');
    const storedScore = localStorage.getItem('mood_app_score');
    const storedOffset = localStorage.getItem('garden_cycle_offset');

    if (storedRecords) {
      try {
        let parsed = JSON.parse(storedRecords);
        const validMoods = ['開心', '焦慮', '憤怒', '睏', '平靜', '害怕', '討厭', '驚訝'];
        parsed = parsed.filter((r: CheckInRecord) => validMoods.includes(r.moodLabel));
        setRecords(parsed);
      } catch (e) {
        setRecords([]);
      }
    } else {
      const initialRecs = isDevHost ? DEV_RECORDS : DEFAULT_RECORDS;
      setRecords(initialRecs);
      localStorage.setItem('mood_app_records', JSON.stringify(initialRecs));
    }

    if (storedPlant) {
      setPlantState(JSON.parse(storedPlant));
    } else {
      setPlantState(DEFAULT_PLANT);
      localStorage.setItem('mood_app_plant', JSON.stringify(DEFAULT_PLANT));
    }

    if (storedMute) {
      setIsMuted(JSON.parse(storedMute));
    }

    if (storedScore) {
      const parsed = parseInt(storedScore, 10);
      const initialScore = parsed < 100 ? 100 : parsed;
      setScore(initialScore);
      localStorage.setItem('mood_app_score', initialScore.toString());
    } else {
      setScore(100);
      localStorage.setItem('mood_app_score', '100');
    }

    if (storedOffset) {
      setGardenCycleOffset(parseInt(storedOffset, 10));
    } else {
      setGardenCycleOffset(0);
      localStorage.setItem('garden_cycle_offset', '0');
    }
  }, []);

  // Save states helper
  const saveRecords = (newRecords: CheckInRecord[]) => {
    setRecords(newRecords);
    localStorage.setItem('mood_app_records', JSON.stringify(newRecords));
  };

  const savePlantState = (newPlant: PlantState) => {
    setPlantState(newPlant);
    localStorage.setItem('mood_app_plant', JSON.stringify(newPlant));
  };

  const saveScore = (newScore: number) => {
    setScore(newScore);
    localStorage.setItem('mood_app_score', newScore.toString());
  };

  const saveGardenCycleOffset = (newOffset: number) => {
    setGardenCycleOffset(newOffset);
    localStorage.setItem('garden_cycle_offset', newOffset.toString());
  };

  const checkInCount = Math.max(0, records.length - gardenCycleOffset);

  let computedProgress = 10;
  if (checkInCount < 2) computedProgress = 10;
  else if (checkInCount < 4) computedProgress = 30;
  else if (checkInCount < 7) computedProgress = 50;
  else if (checkInCount < 10) computedProgress = 70;
  else if (checkInCount < 15) computedProgress = 85;
  else computedProgress = 100;

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    localStorage.setItem('mood_app_muted', JSON.stringify(nextMute));
    if (!nextMute) {
      playClickSound(580, 'sine');
    }
  };

  // Start check-in wizard
  const handleStartCheckIn = () => {
    if (!isMuted) playClickSound(660, 'sine');
    setIsWizardOpen(true);
  };

  const calculatePointsForRecord = (newRecord: CheckInRecord, currentRecords: CheckInRecord[]) => {
    const dateStr = newRecord.date;
    let pointsEarned = 0;

    // 1. 每日打卡 +1
    const alreadyCheckedToday = currentRecords.some(r => r.date === dateStr);
    if (!alreadyCheckedToday) {
      pointsEarned += 1;
    }

    // 2. 每日寫日誌超過10字 +1
    const reason = newRecord.reason;
    if (reason && reason.trim().length > 10) {
      const alreadyWroteLongToday = currentRecords.some(
        r => r.date === dateStr && r.reason && r.reason.trim().length > 10
      );
      if (!alreadyWroteLongToday) {
        pointsEarned += 1;
      }
    }

    // 3. 連續3日打卡 +2
    try {
      const recDate = new Date(dateStr);
      const getPastDateStr = (daysAgo: number) => {
        const d = new Date(recDate);
        d.setDate(d.getDate() - daysAgo);
        return d.toISOString().split('T')[0];
      };
      const yesterdayStr = getPastDateStr(1);
      const twoDaysAgoStr = getPastDateStr(2);

      const hasYesterday = currentRecords.some(r => r.date === yesterdayStr);
      const hasTwoDaysAgo = currentRecords.some(r => r.date === twoDaysAgoStr);

      if (hasYesterday && hasTwoDaysAgo) {
        const alreadyCheckedTodayConsecutive = localStorage.getItem(`consecutive_awarded_${dateStr}`);
        if (!alreadyCheckedTodayConsecutive) {
          pointsEarned += 2;
          localStorage.setItem(`consecutive_awarded_${dateStr}`, 'true');
        }
      }
    } catch (err) {
      console.error(err);
    }

    return pointsEarned;
  };

  // Complete check-in wizard
  const handleCompleteCheckIn = (
    moodEmoji: string,
    moodLabel: string,
    moodType: 'positive' | 'heavy',
    reason: string,
    tags: string[],
    voiceAudioUrl?: string
  ) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().substring(0, 5);

    // Create a new record
    const newRecord: CheckInRecord = {
      id: `rec-${Date.now()}`,
      date: dateStr,
      time: timeStr,
      moodEmoji,
      moodLabel,
      moodType,
      reason,
      tags,
      timestamp: Date.now(),
      voiceAudioUrl
    };

    // --- POINTS SYSTEM CALCULATION BEFORE SAVING ---
    const pointsEarned = calculatePointsForRecord(newRecord, records);

    const nextRecords = [newRecord, ...records];
    saveRecords(nextRecords);

    // Update plant growth: +15% experience and +1cm height upon mood logger completion!
    const originalProgress = plantState.progress;
    let nextProgress = Math.min(100, originalProgress + 15);
    let nextHeight = plantState.height + 1; // Always grows taller when checking in
    const nextStage = getPlantStage(nextProgress);

    savePlantState({
      ...plantState,
      progress: nextProgress,
      stage: nextStage,
      height: nextHeight,
      lastWatered: dateStr
    });

    if (pointsEarned > 0) {
      const storedScore = localStorage.getItem('mood_app_score');
      const currentScore = storedScore ? parseInt(storedScore, 10) : score;
      const newScore = currentScore + pointsEarned;
      saveScore(newScore);
    }
  };

  // Delete log
  const handleDeleteRecord = (id: string) => {
    const nextRecords = records.filter((r) => r.id !== id);
    saveRecords(nextRecords);
  };

  // Manually log (backdated)
  const handleAddCustomRecord = (newRec: CheckInRecord) => {
    // --- POINTS SYSTEM CALCULATION BEFORE SAVING ---
    const pointsEarned = calculatePointsForRecord(newRec, records);

    const nextRecords = [newRec, ...records].sort((a, b) => b.timestamp - a.timestamp);
    saveRecords(nextRecords);

    if (pointsEarned > 0) {
      const storedScore = localStorage.getItem('mood_app_score');
      const currentScore = storedScore ? parseInt(storedScore, 10) : score;
      const newScore = currentScore + pointsEarned;
      saveScore(newScore);
    }
  };

  // Update existing record
  const handleUpdateRecord = (updatedRec: CheckInRecord) => {
    const nextRecords = records.map((r) => r.id === updatedRec.id ? updatedRec : r);
    saveRecords(nextRecords);
  };

  // Determine latest mood label to feed the plant on Home page
  const latestMoodLabel = records[0]?.moodLabel || '平靜';

  return (
    <div className="min-h-screen bg-brand-sand flex items-center justify-center p-3 sm:p-6 font-sans">
      
      {/* Smartphone Mockup Container */}
      <div className="relative bg-brand-beige w-full max-w-[420px] h-[780px] rounded-[42px] shadow-2xl border-[10px] border-brand-moss/10 flex flex-col justify-between overflow-hidden">
        
        {/* Phone Notch/Speaker Header */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-brand-moss/10 rounded-b-2xl z-40 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-1 bg-brand-moss/20 rounded-full" />
        </div>

        {/* Dynamic content rendering container */}
        <div className="flex-1 pt-6.5 px-4 pb-20 flex flex-col overflow-hidden relative">
          
          {/* Spacer below phone notch */}
          <div className="h-4 shrink-0" />

          {/* Tab Pages rendering */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === 'home' && (
              <HomeView
                onStartCheckIn={handleStartCheckIn}
                plantProgress={computedProgress}
                plantHeight={plantState.height}
                latestMoodLabel={latestMoodLabel}
                wateredCount={plantState.wateredCount}
                lastWatered={plantState.lastWatered}
                onNavigateToGarden={() => setActiveTab('garden')}
              />
            )}

            {activeTab === 'garden' && (
              <GardenView
                plantState={plantState}
                onUpdatePlantState={savePlantState}
                latestMoodLabel={latestMoodLabel}
                score={score}
                onUpdateScore={saveScore}
                records={records}
                gardenCycleOffset={gardenCycleOffset}
                onUpdateGardenCycleOffset={saveGardenCycleOffset}
              />
            )}

            {activeTab === 'journal' && (
              <JournalView
                records={records}
                onDeleteRecord={handleDeleteRecord}
                onAddCustomRecord={handleAddCustomRecord}
                onUpdateRecord={handleUpdateRecord}
              />
            )}

            {activeTab === 'firstaid' && <FirstAidView onGoToHome={() => setActiveTab('home')} />}
          </div>
        </div>

        {/* BOTTOM NAVIGATION TAB BAR (4-page navigation bar) */}
        <div className="absolute bottom-0 left-0 right-0 h-18 bg-white border-t border-brand-sand flex items-center justify-around px-2 py-2.5 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
          {[
            { id: 'home', label: '首頁', icon: <Home className="w-5 h-5" /> },
            { id: 'journal', label: '我的日誌', icon: <BookOpen className="w-5 h-5" /> },
            { id: 'firstaid', label: '急救箱', icon: <ShieldAlert className="w-5 h-5" /> },
            { id: 'garden', label: '我的花園', icon: <Sprout className="w-5 h-5" /> }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (!isMuted) playClickSound(560, 'sine');
                  setActiveTab(tab.id as any);
                  setShowGarden(false);
                }}
                className={`flex flex-col items-center justify-center flex-1 transition duration-200 cursor-pointer ${
                  isActive ? 'text-brand-sage font-extrabold' : 'text-gray-400 hover:text-brand-sage'
                }`}
                style={{ minHeight: '44px' }}
              >
                <div className={`p-1 rounded-xl transition ${isActive ? 'bg-brand-sage/10 text-brand-sage scale-110' : ''}`}>
                  {tab.icon}
                </div>
                <span className="text-[11px] tracking-tight font-black mt-0.5 font-sans">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Multi-step Check-in Flow Wizard Modal Overlays */}
        {isWizardOpen && (
          <CheckInWizard
            onClose={() => setIsWizardOpen(false)}
            onComplete={(emoji, label, type, rsn, tgs, voiceUrl) => {
              handleCompleteCheckIn(emoji, label, type, rsn, tgs, voiceUrl);
            }}
          />
        )}
      </div>
    </div>
  );
}
