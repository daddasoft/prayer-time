import { useState } from 'react'
import { IslamicPrayerTimes } from './components/islamic-prayer-times'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
     <IslamicPrayerTimes />
    </>
  )
}

export default App
