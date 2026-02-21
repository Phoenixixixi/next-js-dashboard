'use client'
import { useState } from 'react'
import clsx from 'clsx'
export default function ButtonLog() {
  const [isClick, setIsClick] = useState<boolean>(true)

  return (
    <button
      className={clsx('px-2 py-1', {
        'bg-amber-300': isClick === true,
        'bg-amber-600': isClick === false,
      })}
      onClick={() => setIsClick((prev) => !prev)}
    >
      Click Me
    </button>
  )
}
