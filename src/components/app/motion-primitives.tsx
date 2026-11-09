"use client"

import { motion, useMotionValue, useTransform, animate, type Variants } from "framer-motion"
import { useEffect, useMemo, useState } from "react"

// --- CountUp: anima un número de 0 a value ---
export function CountUp({
  value,
  duration = 1.1,
  decimals = 0,
  suffix = "",
  className,
}: {
  value: number
  duration?: number
  decimals?: number
  suffix?: string
  className?: string
}) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => {
    const n = decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString("es-ES")
    return `${n}${suffix}`
  })
  const [display, setDisplay] = useState("0")

  useEffect(() => {
    const controls = animate(count, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    })
    const unsub = rounded.on("change", (v) => setDisplay(v))
    return () => {
      controls.stop()
      unsub()
    }
  }, [value, duration, count, rounded])

  return <span className={className}>{display}</span>
}

// --- Confetti: ráfaga de partículas desde el centro (para el #1 del podio) ---
const CONFETTI_COLORS = ["#10b981", "#f59e0b", "#0ea5e9", "#f43f5e", "#a855f7", "#facc15"]

export function Confetti({ count = 28, fire = true }: { count?: number; fire?: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4
        const dist = 60 + Math.random() * 90
        return {
          id: i,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 30,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          size: 5 + Math.random() * 6,
          delay: Math.random() * 0.15,
          rotate: Math.random() * 360,
        }
      }),
    [count]
  )

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center overflow-visible">
      {fire &&
        particles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute top-6 rounded-[2px]"
            style={{ width: p.size, height: p.size * 0.5, background: p.color }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: p.x,
              y: p.y,
              opacity: [1, 1, 0],
              scale: [1, 1.1, 0.4],
              rotate: p.rotate,
            }}
            transition={{
              duration: 1.4 + Math.random() * 0.6,
              delay: p.delay,
              ease: "easeOut",
            }}
          />
        ))}
    </div>
  )
}

// --- Variantes reutilizables ---
export const containerStagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

export const itemSlideUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
}

export const itemScaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

// --- Card con hover lift ---
export function MotionCard({
  children,
  className,
  delay = 0,
  hover = true,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  hover?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hover ? { y: -4 } : undefined}
      className={className}
    >
      {children}
    </motion.div>
  )
}
