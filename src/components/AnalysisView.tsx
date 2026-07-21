import { useState, useMemo } from 'react';
import { CheckInRecord } from '../types';
import { playClickSound, speakText } from '../utils/audio';
import { BarChart3, Volume2, Sparkles, TrendingUp, CalendarDays } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid, Cell, PieChart, Pie
} from 'recharts';
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  startOfYear, endOfYear, isWithinInterval, parseISO, format,
  eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval,
  getWeekOfMonth, getDay, getMonth, getDate
} from 'date-fns';

interface AnalysisViewProps {
  records: CheckInRecord[];
}

type TimeRange = 'week' | 'month' | 'year';

export default function AnalysisView({ records }: AnalysisViewProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  const { filteredRecords, dateIntervals, xAxisFormatter } = useMemo(() => {
    const now = new Date();
    let start, end, intervals;
    
    if (timeRange === 'week') {
      start = startOfWeek(now, { weekStartsOn: 0 }); // Sunday as 0
      end = endOfWeek(now, { weekStartsOn: 0 });
      intervals = eachDayOfInterval({ start, end });
    } else if (timeRange === 'month') {
      start = startOfMonth(now);
      end = endOfMonth(now);
      intervals = eachDayOfInterval({ start, end });
    } else {
      start = startOfYear(now);
      end = endOfYear(now);
      intervals = eachMonthOfInterval({ start, end });
    }

    const filtered = records.filter(r => {
      const d = parseISO(r.date);
      return isWithinInterval(d, { start, end });
    });

    return { filteredRecords: filtered, dateIntervals: intervals, start, end };
  }, [records, timeRange]);

  // Data for Chart
  const chartData = useMemo(() => {
    if (timeRange === 'week') {
      const days = ['日', '一', '二', '三', '四', '五', '六'];
      return dateIntervals.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayRecs = filteredRecords.filter(r => r.date === dateStr);
        const positiveCount = dayRecs.filter(r => r.moodType === 'positive').length;
        const heavyCount = dayRecs.filter(r => r.moodType === 'heavy').length;
        
        return {
          name: days[getDay(date)],
          positive: positiveCount,
          heavy: heavyCount,
          total: positiveCount + heavyCount
        };
      });
    } else if (timeRange === 'month') {
      // Group by weeks or just show days. Let's show days for clarity but tick every 5 days
      return dateIntervals.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayRecs = filteredRecords.filter(r => r.date === dateStr);
        const positiveCount = dayRecs.filter(r => r.moodType === 'positive').length;
        const heavyCount = dayRecs.filter(r => r.moodType === 'heavy').length;
        
        return {
          name: getDate(date).toString(),
          positive: positiveCount,
          heavy: heavyCount,
          total: positiveCount + heavyCount
        };
      });
    } else {
      // Year: group by month
      const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
      return dateIntervals.map(date => {
        const m = getMonth(date);
        const monthRecs = filteredRecords.filter(r => {
          const rDate = parseISO(r.date);
          return getMonth(rDate) === m;
        });
        const positiveCount = monthRecs.filter(r => r.moodType === 'positive').length;
        const heavyCount = monthRecs.filter(r => r.moodType === 'heavy').length;

        return {
          name: months[m],
          positive: positiveCount,
          heavy: heavyCount,
          total: positiveCount + heavyCount
        };
      });
    }
  }, [timeRange, dateIntervals, filteredRecords]);

  // 2. High frequency mood
  const highFrequencyMood = useMemo(() => {
    if (filteredRecords.length === 0) return { label: '無', emoji: '🌱', percentage: 0 };
    
    const moodCounts: Record<string, { emoji: string; count: number }> = {};
    filteredRecords.forEach((r) => {
      const key = r.moodLabel;
      if (!moodCounts[key]) moodCounts[key] = { emoji: r.moodEmoji, count: 0 };
      moodCounts[key].count += 1;
    });

    let topMoodLabel = '無';
    let topMoodEmoji = '🌱';
    let maxCount = 0;

    Object.entries(moodCounts).forEach(([label, info]) => {
      if (info.count > maxCount) {
        maxCount = info.count;
        topMoodLabel = label;
        topMoodEmoji = info.emoji;
      }
    });

    return {
      label: topMoodLabel,
      emoji: topMoodEmoji,
      percentage: Math.round((maxCount / filteredRecords.length) * 100)
    };
  }, [filteredRecords]);

  // 3. Trigger events (Tags)
  const topTriggerTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      if (r.tags) {
        r.tags.forEach((t) => {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        });
      }
    });

    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);

    return sortedTags.slice(0, 5);
  }, [filteredRecords]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 rounded-xl shadow-lg border border-brand-sand text-xs font-bold text-gray-700">
          <p className="mb-1 border-b border-brand-sand pb-1">{label}</p>
          <p className="text-emerald-500">陽光: {payload[0].value}</p>
          <p className="text-rose-400">雨天: {payload[1].value}</p>
        </div>
      );
    }
    return null;
  };

  const hasData = filteredRecords.length > 0;

  return (
    <div className="flex-1 flex flex-col p-2 space-y-4 overflow-y-auto scrollbar-thin pb-20">
      
      {/* Filters */}
      <div className="flex items-center justify-between bg-white/70 backdrop-blur-sm p-1.5 rounded-2xl border border-brand-sand shadow-sm w-full shrink-0">
        {(['week', 'month', 'year'] as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => {
              playClickSound(480, 'sine');
              setTimeRange(range);
            }}
            className={`flex-1 flex justify-center items-center gap-1 text-[12px] py-2 rounded-xl transition cursor-pointer font-bold ${
              timeRange === range
                ? 'bg-brand-sage text-white shadow-sm'
                : 'bg-transparent text-gray-500 hover:bg-brand-sand/30'
            }`}
          >
            {range === 'week' ? '本週' : range === 'month' ? '本月' : '今年'}
          </button>
        ))}
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center p-8 bg-white/50 rounded-3xl border-2 border-dashed border-brand-sand/80 text-center">
          <span className="text-4xl block mb-2 opacity-60">🍃</span>
          <p className="text-base font-bold text-gray-800">
            這個時段還沒有心情紀錄喔
          </p>
          <p className="text-sm font-semibold text-gray-400 mt-1.5">
            持續打卡，就能在這裡看到你的專屬情緒趨勢了！
          </p>
        </div>
      ) : (
        <>
          {/* Main Chart */}
          <div className="bg-white rounded-3xl border border-brand-sand p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-gray-800 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-brand-moss" /> 情緒變化趨勢
              </span>
            </div>
            
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 'bold' }} 
                    axisLine={false} 
                    tickLine={false}
                    interval={timeRange === 'month' ? 4 : 0} 
                  />
                  <YAxis 
                    allowDecimals={false} 
                    tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 'bold' }} 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F4F1EA', opacity: 0.5 }} />
                  <Bar dataKey="positive" stackId="a" fill="#34D399" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="heavy" stackId="a" fill="#FB7185" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-gray-500 pt-2 border-t border-brand-sand/50">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>陽光正向</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>陰雨重情緒</span>
            </div>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Top Mood */}
            <div className="bg-white rounded-3xl border border-brand-sand p-4 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-gray-500">最常出現的心情</span>
              <div className="flex items-end justify-between mt-2">
                <span className="text-4xl">{highFrequencyMood.emoji}</span>
                <div className="text-right">
                  <span className="block text-sm font-black text-gray-800">{highFrequencyMood.label}</span>
                  <span className="text-[10px] text-brand-moss font-bold">{highFrequencyMood.percentage}%</span>
                </div>
              </div>
            </div>

            {/* Total Check-ins */}
            <div className="bg-white rounded-3xl border border-brand-sand p-4 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-gray-500">打卡總數</span>
              <div className="flex items-end justify-between mt-2">
                <span className="text-4xl">📝</span>
                <div className="text-right">
                  <span className="block text-2xl font-black text-gray-800">{filteredRecords.length}</span>
                  <span className="text-[10px] text-brand-moss font-bold">篇日記</span>
                </div>
              </div>
            </div>
          </div>

          {/* Triggers */}
          <div className="bg-white rounded-3xl border border-brand-sand p-4 shadow-sm space-y-3">
            <span className="text-sm font-black text-gray-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-ochre" /> 常見觸發事件
            </span>
            {topTriggerTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {topTriggerTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-brand-sand/30 text-gray-700 px-3 py-1.5 rounded-full border border-brand-sand font-bold shadow-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 font-bold italic">這個時段沒有使用標籤喔。</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
