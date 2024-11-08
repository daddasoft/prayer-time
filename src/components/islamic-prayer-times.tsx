import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { usePrayerTimes } from "@/services/prayerTime.service";

export function IslamicPrayerTimes() {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  
  // Use the custom hook for prayer times data and navigation
  const { currentDay, nextPrayerName, goToPreviousDay, goToNextDay, isLoading } = usePrayerTimes();
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="min-h-screen bg-[#F8F0E3] p-6 max-w-md mx-auto">
    {isLoading ? (
      <div className="flex justify-center items-center h-screen">
       <svg className="animate-spin h-12 w-12 text-[#1C6758]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      </div>
    ) : (<>
    {/* Header with Islamic Pattern */}
    <div className="relative mb-8">
        <div className="absolute inset-0 bg-[url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/islamic-pattern-NXXXXXXXXXX.png')] opacity-10"></div>
        <h1 className="text-4xl font-bold text-[#1C6758] text-center relative z-10 font-arabic">أوقات الصلاة</h1>
        <p className="text-[#1C6758] text-center relative z-10">Prayer Times - Casablanca</p>
      </div>

      {/* Main Timer Card */}
      <Card className="bg-white shadow-lg rounded-2xl mb-8 overflow-hidden border border-[#1C6758]">
        <div className="bg-[#1C6758] p-6 text-[#F8F0E3]">
          <div className="flex justify-between items-center mb-4">
            <ChevronLeft onClick={goToPreviousDay} className="w-6 h-6 cursor-pointer" />
            <div className="text-center">
              <p className="text-sm font-medium">Next Prayer</p>
              <h2 className="text-3xl font-bold font-arabic">{nextPrayerName || "No More Prayers"}</h2>
              {nextPrayerName && <p className="text-sm">({nextPrayerName})</p>}
            </div>
            <ChevronRight onClick={goToNextDay} className="w-6 h-6 cursor-pointer" />
          </div>
          <div className="text-5xl font-bold text-center mb-4 ltr:font-mono">{currentTime}</div>
          <div className="w-full bg-[#F8F0E3]/20 rounded-full h-2 mb-4">
            <div className="bg-[#F8F0E3] rounded-full h-2 w-1/3"></div>
          </div>
          <div className="flex justify-between text-sm">
            <span>{currentDay?.date_ar || "Loading..."}</span>
            <span>{currentDay?.date_fr || "Loading..."}</span>
          </div>
        </div>
      </Card>

      {/* Prayer Times Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {currentDay ? (
          Object.entries(currentDay.prayers).map(([prayer, time]) => (
            <Card
              key={prayer}
              className={`p-4 text-center ${
                nextPrayerName === prayer ? 'bg-[#1C6758] text-[#F8F0E3]' : 'bg-white text-[#1C6758] border border-[#1C6758]'
              }`}
            >
              <div className="text-lg font-bold mb-1 font-arabic">{prayer}</div>
              <div className="text-xs mb-2">{prayer}</div>
              <div className={`text-sm ${nextPrayerName === prayer ? 'text-[#F8F0E3]' : 'text-[#1C6758]'}`}>{time?.split(" ")[0]}</div>
            </Card>
          ))
        ) : (
          <p>Loading prayer times...</p>
        )}
      </div>
    </>)}

    </div>
  );
}
