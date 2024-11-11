import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Moon, Sun, Sunrise, Sunset, LayoutGrid, List, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface PrayerTimes {
  [key: string]: string;
}

interface DayData {
  timings: PrayerTimes;
  date: {
    readable: string;
    gregorian: {
      date: string;
      format: string;
      day: string;
      weekday: {
        en: string;
      };
      month: {
        number: number;
        en: string;
      };
      year: string;
    };
    hijri: {
      date: string;
      format: string;
      day: string;
      weekday: {
        en: string;
        ar: string;
      };
      month: {
        number: number;
        en: string;
        ar: string;
      };
      year: string;
    };
  };
}

interface CachedData {
  coordinates: { latitude: number; longitude: number };
  monthData: DayData[];
  timestamp: number;
}

const CACHE_KEY = 'prayerTimesCache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export default function IslamicPrayerTimes() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isCardView, setIsCardView] = useState(true)
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes>({})
  const [currentDate, setCurrentDate] = useState<DayData['date'] | null>(null)
  const [monthData, setMonthData] = useState<DayData[]>([])
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const getLocation = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          console.error("Error getting location:", error)
          setIsLoading(false)
          setError("Unable to get your location. Please enable location services and refresh the page.")
          setIsLocationModalOpen(true)
        }
      )
    } else {
      setError("Geolocation is not supported by your browser")
      setIsLocationModalOpen(true)
    }
  }, [])

  useEffect(() => {
    getLocation()
  }, [getLocation])

  const fetchPrayerTimes = useCallback(async (latitude: number, longitude: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const currentMonth = currentTime.getMonth() + 1
      const currentYear = currentTime.getFullYear()
      const response = await fetch(`https://api.aladhan.com/v1/calendar?latitude=${latitude}&longitude=${longitude}&method=2&month=${currentMonth}&year=${currentYear}`)
      if (!response.ok) {
        throw new Error('Failed to fetch prayer times')
      }
      const data = await response.json()
      if (data.code === 200 && Array.isArray(data.data)) {
        setMonthData(data.data)
        updateCurrentDayData(data.data)
        // Cache the fetched data
        const cacheData: CachedData = {
          coordinates: { latitude, longitude },
          monthData: data.data,
          timestamp: Date.now()
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
      } else {
        throw new Error('Invalid data format received from API')
      }
    } catch (error) {
      console.error('Error fetching prayer times:', error)
      setError('Failed to load prayer times. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }, [currentTime])

  useEffect(() => {
    if (coordinates) {
      const cachedData = localStorage.getItem(CACHE_KEY)
      if (cachedData) {
        const parsedData: CachedData = JSON.parse(cachedData)
        const { latitude, longitude } = parsedData.coordinates
        const isLocationChanged = 
          Math.abs(latitude - coordinates.latitude) > 0.01 || 
          Math.abs(longitude - coordinates.longitude) > 0.01
        const isCacheExpired = Date.now() - parsedData.timestamp > CACHE_DURATION

        if (!isLocationChanged && !isCacheExpired) {
          setMonthData(parsedData.monthData)
          updateCurrentDayData(parsedData.monthData)
          setIsLoading(false)
          return
        }
      }
      fetchPrayerTimes(coordinates.latitude, coordinates.longitude)
    }
  }, [coordinates, fetchPrayerTimes])

  const updateCurrentDayData = (data: DayData[]) => {
    const today = currentTime.getDate() - 1 // API data is 0-indexed
    setCurrentDayIndex(today)
    if (data[today]) {
      setPrayerTimes(data[today].timings)
      setCurrentDate(data[today].date)
    }
  }

  const changeDay = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? currentDayIndex - 1 : currentDayIndex + 1
    if (newIndex >= 0 && newIndex < monthData.length) {
      setCurrentDayIndex(newIndex)
      setPrayerTimes(monthData[newIndex].timings)
      setCurrentDate(monthData[newIndex].date)
    }
  }

  const getNextPrayer = () => {
    const prayerNames = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
    const currentHours = currentTime.getHours()
    const currentMinutes = currentTime.getMinutes()
    const currentTimeInMinutes = currentHours * 60 + currentMinutes

    for (let prayer of prayerNames) {
      const prayerTime = prayerTimes[prayer]
      if (prayerTime) {
        const [hours, minutes] = prayerTime.split(' ')[0].split(':').map(Number)
        const prayerTimeInMinutes = hours * 60 + minutes
        if (prayerTimeInMinutes > currentTimeInMinutes) {
          return prayer
        }
      }
    }

    return 'Fajr' // If all prayers have passed, return Fajr for the next day
  }

  const calculateTimeLeft = () => {
    const nextPrayer = getNextPrayer()
    const nextPrayerTime = prayerTimes[nextPrayer]
    if (!nextPrayerTime) return '00:00:00'

    const [hours, minutes] = nextPrayerTime.split(' ')[0].split(':').map(Number)
    const nextPrayerDate = new Date(currentTime)
    nextPrayerDate.setHours(hours, minutes, 0, 0)

    if (nextPrayerDate <= currentTime) {
      nextPrayerDate.setDate(nextPrayerDate.getDate() + 1)
    }

    const timeDiff = nextPrayerDate.getTime() - currentTime.getTime()
    const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60))
    const minutesLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
    const secondsLeft = Math.floor((timeDiff % (1000 * 60)) / 1000)

    return `${hoursLeft.toString().padStart(2, '0')}:${minutesLeft.toString().padStart(2, '0')}:${secondsLeft.toString().padStart(2, '0')}`
  }

  const calculateDayProgress = () => {
    const totalMinutes = 24 * 60
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()
    return (currentMinutes / totalMinutes) * 100
  }

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      hour12: false 
    })
  }

  const prayerIcons: { [key: string]: React.ElementType } = {
    Fajr: Moon,
    Sunrise: Sunrise,
    Dhuhr: Sun,
    Asr: Sun,
    Maghrib: Sunset,
    Isha: Moon
  }

  const retryFetchPrayerTimes = () => {
    if (coordinates) {
      fetchPrayerTimes(coordinates.latitude, coordinates.longitude)
    } else {
      getLocation()
    }
    setIsLocationModalOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
        <p className="text-lg font-semibold text-indigo-800">Loading prayer times...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 max-w-2xl mx-auto font-sans">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-indigo-800 mb-2">Prayer Times</h1>
        <p className="text-indigo-600">Your Location : Casablanca</p>
      </header>

      <Card className="bg-white shadow-lg rounded-lg overflow-hidden mb-8 transition-all duration-300 hover:shadow-xl">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
          <div className="flex justify-between items-center mb-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => changeDay('prev')}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="text-center">
              <p className="text-sm mb-1">Next Prayer</p>
              <h2 className="text-3xl font-bold">{getNextPrayer()}</h2>
              <p className="text-sm">{currentDate?.gregorian.date}</p>
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => changeDay('next')}>
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
          <div className="text-5xl font-mono text-center mb-4">
            {formatCurrentTime()}
          </div>
          <div className="text-2xl font-mono text-center mb-4">
            Next prayer in: {calculateTimeLeft()}
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 mb-4">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-1000 ease-in-out"
              style={{ width: `${calculateDayProgress()}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm">
            <span>{currentDate?.hijri.date}</span>
            <span>{currentDate?.gregorian.date}</span>
          </div>
        </div>
      </Card>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-indigo-800">Prayer Schedule</h3>
        <div className="flex items-center space-x-2">
          <LayoutGrid className={`h-5 w-5 ${isCardView ? 'text-indigo-600' : 'text-gray-400'}`} />
          <Switch
            checked={!isCardView}
            onCheckedChange={() => setIsCardView(!isCardView)}
          />
          <List className={`h-5 w-5 ${!isCardView ? 'text-indigo-600' : 'text-gray-400'}`} />
        </div>
      </div>

      {isCardView ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {Object.entries(prayerTimes).map(([prayer, time]) => {
            if (['Sunrise', 'Sunset', 'Imsak', 'Midnight', 'Firstthird', 'Lastthird'].includes(prayer)) return null;
            const Icon = prayerIcons[prayer] || Sun;
            return (
              <Card 
                key={prayer} 
                className={`bg-white p-4 text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${
                  prayer === getNextPrayer() ? 'ring-2 ring-indigo-500' : ''
                }`}
              >
                <Icon className={`h-8 w-8 mx-auto mb-2 ${prayer === getNextPrayer() ? 'text-indigo-600' : 'text-gray-600'}`} />
                <div className={`text-lg font-bold mb-1 ${prayer === getNextPrayer() ? 'text-indigo-800' : 'text-gray-800'}`}>{prayer}</div>
                <div className={`text-sm font-mono ${prayer === getNextPrayer() ? 'text-purple-600' : 'text-gray-600'}`}>{time.split(' ')[0]}</div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
          <ul className="divide-y divide-gray-200">
            {Object.entries(prayerTimes).map(([prayer, time]) => {
              if (['Sunrise', 'Sunset', 'Imsak', 'Midnight', 'Firstthird', 'Lastthird'].includes(prayer)) return null;
              const Icon = prayerIcons[prayer] || Sun;
              return (
                <li 
                  key={prayer} 
                  className={`p-4 flex items-center justify-between hover:bg-indigo-50 transition-colors duration-150 ${
                    prayer === getNextPrayer() ? 'bg-indigo-100' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className={`h-6 w-6 mr-4 ${prayer === getNextPrayer() ? 'text-indigo-600' : 'text-gray-600'}`} />
                    <div className={`text-lg font-bold ${prayer === getNextPrayer() ? 'text-indigo-800' : 'text-gray-800'}`}>{prayer}</div>
                  </div>
                  <div className={`text-sm font-mono ${prayer === getNextPrayer() ? 'text-purple-600' : 'text-gray-600'}`}>{time.split(' ')[0]}</div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Location Access Required</DialogTitle>
            <DialogDescription>
              {error || "We need your location to provide accurate prayer times. Please enable location services and try again."}
            </DialogDescription>
          </DialogHeader>
          <Button onClick={retryFetchPrayerTimes}>Retry</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}