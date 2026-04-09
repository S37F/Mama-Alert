import { useInView } from 'react-intersection-observer'

const easeOut = [0.22, 1, 0.36, 1] as const

export function useScrollReveal(threshold = 0.15): {
  ref: (node?: Element | null) => void
  inView: boolean
} {
  const [ref, inView] = useInView({ threshold, triggerOnce: true })
  return { ref, inView }
}

export const fadeUpVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: easeOut },
  },
}

export const staggerContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
}

export const fadeUpChildVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOut },
  },
}
