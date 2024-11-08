import { useState, useEffect } from 'react';
import axios from 'axios';

interface PrayerTime {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface DayPrayerInfo {
  prayers: PrayerTime;
  date_fr: string;
  date_ar: string;
}

export const usePrayerTimes = () => {
  const [prayerData, setPrayerData] = useState<DayPrayerInfo[]>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState<number | null>(null);
  const [nextPrayerName, setNextPrayerName] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  useEffect(() => {
    // Get the user's current location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
      },
      (error) => {
        console.error("Error getting location:", error);
      }
    );
  }, []);

  useEffect(() => {
    // Fetch prayer times when location is set
    if (latitude && longitude) {
      fetchPrayerTimes(latitude, longitude);
    }
  }, [latitude, longitude]);

  const fetchPrayerTimes = async (lat: number, lon: number) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`http://api.aladhan.com/v1/calendar?latitude=${lat}&longitude=${lon}&method=21&month=${currentMonth}&year=${currentYear}`);
      const data = response.data.data;
      const processedData = processPrayerData(data);
      setPrayerData(processedData);
      const todayIndex = getTodayIndex(processedData);
      setCurrentDayIndex(todayIndex);
      if (todayIndex !== null) {
        setNextPrayer(todayIndex, processedData);
      }
    } catch (error) {
    
      console.error("Error fetching prayer times:", error);
    }
    finally {
      setIsLoading(false);
    }
  };

  const processPrayerData = (data: any[]): DayPrayerInfo[] => {
    return data.map((day) => {
      const prayers: PrayerTime = {
        Fajr: day.timings.Fajr,
        Dhuhr: day.timings.Dhuhr,
        Asr: day.timings.Asr,
        Maghrib: day.timings.Maghrib,
        Isha: day.timings.Isha,
      };

      const date_fr = day.date.readable;
      const date_ar = day.date.hijri.date;

      return { prayers, date_fr, date_ar };
    });
  };

  const getTodayIndex = (data: DayPrayerInfo[]): number | null => {
    const todayDate = new Date().getDate();
    const todayIndex = data.findIndex((day) => parseInt(day.date_fr.split(" ")[0]) === todayDate);
    return todayIndex !== -1 ? todayIndex : null;
  };

  const setNextPrayer = (index: number, data: DayPrayerInfo[]) => {
    const todayTimings = data[index].prayers;
    const now = new Date();
    const prayerTimes = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  
    let nextPrayerFound = false;
  
    for (const prayer of prayerTimes) {
      const prayerTime = formatToDate(todayTimings[prayer as keyof PrayerTime]);
      if (now < prayerTime) {
        setNextPrayerName(prayer);
        nextPrayerFound = true;
        break;
      }
    }
  
    // If no more prayers today, set next prayer to Fajr of the next day
    if (!nextPrayerFound) {
      if (index < data.length - 1) {
        const nextDayFajr = data[index + 1].prayers.Fajr;
        setNextPrayerName("Fajr");
      } else {
        // Last day in data, no more prayers
        setNextPrayerName(null);
      }
    }
  };

  const formatToDate = (time: string): Date => {
    const [hour, minute] = time.split(" ")[0].split(":").map(Number);
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date;
  };

  const goToPreviousDay = () => {
    if (currentDayIndex !== null && currentDayIndex > 0) {
      const newIndex = currentDayIndex - 1;
      setCurrentDayIndex(newIndex);
      setNextPrayer(newIndex, prayerData);
    }
  };

  const goToNextDay = () => {
    if (currentDayIndex !== null && currentDayIndex < prayerData.length - 1) {
      const newIndex = currentDayIndex + 1;
      setCurrentDayIndex(newIndex);
      setNextPrayer(newIndex, prayerData);
    }
  };

  return {
    prayerData,
    currentDay: currentDayIndex !== null ? prayerData[currentDayIndex] : null,
    nextPrayerName,
    goToPreviousDay,
    goToNextDay,
    isLoading,
  };
};
