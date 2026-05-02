import { motion } from 'framer-motion'
import { StatBlock } from '@/landing/components/StatBlock'
import {
  fadeUpVariants,
  staggerContainerVariants,
  useScrollReveal,
} from '@/landing/hooks/useScrollReveal'

export function TheTruth() {
  const { ref, inView } = useScrollReveal(0.12)

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
              stat="260k"
              label={
                <>
                  women died during and following
                  <br />
                  pregnancy and childbirth in 2023,
                  <br />
                  according to WHO estimates.
                </>
              }
            />
            <StatBlock
              stat="2 min"
              label={
                <>
                  is roughly how often one maternal
                  <br />
                  death occurred worldwide in 2023.
                  <br />
                  Timely response still matters.
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
          <motion.p
            variants={fadeUpVariants}
            style={{
              margin: '28px auto 0',
              maxWidth: 720,
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-muted)',
              lineHeight: 1.6,
            }}
          >
            Source:{' '}
            <a
              href="https://www.who.int/news-room/fact-sheets/detail/maternal-mortality"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              WHO maternal mortality fact sheet
            </a>
            , 2023 estimates.
          </motion.p>
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
