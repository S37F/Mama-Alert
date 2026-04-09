import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import CountUp from 'react-countup'
import { StatBlock } from '@/landing/components/StatBlock'
import {
  fadeUpVariants,
  staggerContainerVariants,
  useScrollReveal,
} from '@/landing/hooks/useScrollReveal'

export function TheTruth() {
  const { ref, inView } = useScrollReveal(0.12)
  const { ref: statsRef, inView: statsInView } = useInView({ threshold: 0.15, triggerOnce: true })

  return (
    <section
      className="landing-section"
      style={{
        background: 'var(--color-sand)',
        borderTop: '1px solid var(--color-sand-dark)',
        borderBottom: '1px solid var(--color-sand-dark)',
      }}
    >
      <div className="landing-container">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={staggerContainerVariants}
          style={{ textAlign: 'center' }}
        >
          <motion.h2
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, var(--text-5xl))',
              fontWeight: 700,
              color: 'var(--color-charcoal)',
              margin: '0 0 56px',
              lineHeight: 1.15,
            }}
          >
            The numbers they don&apos;t put on billboards.
          </motion.h2>
          <motion.div
            ref={statsRef}
            variants={staggerContainerVariants}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 32,
              textAlign: 'left',
            }}
            className="landing-truth-grid"
          >
            <StatBlock
              stat="42–52%"
              label={
                <>
                  of maternal deaths in South Asia
                  <br />
                  happen at home or in transit —
                  <br />
                  never reaching a hospital.
                </>
              }
            />
            <StatBlock
              stat={
                statsInView ? (
                  <CountUp start={0} end={4.1} decimals={1} duration={2.2} suffix="×" />
                ) : (
                  '0×'
                )
              }
              label={
                <>
                  more likely — rural mothers face
                  <br />
                  this delay than urban mothers,
                  <br />
                  even controlling for poverty.
                </>
              }
            />
            <StatBlock
              stat="0"
              label={
                <>
                  new technology needed.
                  <br />
                  The community is already there.
                  <br />
                  It just needs to be called.
                </>
              }
            />
          </motion.div>
        </motion.div>
      </div>
      <style>{`
        @media (max-width: 767px) {
          .landing-truth-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}
