import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { PhoneMockup } from '@/landing/components/PhoneMockup'
import { StepFlow, type FlowStep } from '@/landing/components/StepFlow'
import { fadeUpVariants, useScrollReveal } from '@/landing/hooks/useScrollReveal'

export function HowItWorks() {
  const { ref: headRef, inView: headInView } = useScrollReveal(0.12)

  const [setRef1, in1] = useInView({ threshold: 0.32, rootMargin: '-12% 0px -40% 0px' })
  const [setRef2, in2] = useInView({ threshold: 0.32, rootMargin: '-12% 0px -40% 0px' })
  const [setRef3, in3] = useInView({ threshold: 0.32, rootMargin: '-12% 0px -40% 0px' })
  const [setRef4, in4] = useInView({ threshold: 0.32, rootMargin: '-12% 0px -40% 0px' })
  const [setRef5, in5] = useInView({ threshold: 0.32, rootMargin: '-12% 0px -40% 0px' })

  const active = in5 ? 4 : in4 ? 3 : in3 ? 2 : in2 ? 1 : in1 ? 0 : 0

  const steps: FlowStep[] = useMemo(
    () => [
      {
        id: 'step-1',
        label: '01',
        title: 'One tap. Any phone.',
        body: 'Priya taps the MamaAlert button installed on her home screen. The system reads her profile — 38 weeks, blood type B+, risk flags, nearest clinic — instantly.',
        observeRef: setRef1,
      },
      {
        id: 'step-2',
        label: '02',
        title: 'Community activated in seconds.',
        body: "Every trained volunteer within 5km receives an SMS simultaneously. No app required. Reply YES. That's it.",
        observeRef: setRef2,
      },
      {
        id: 'step-3',
        label: '03',
        title: 'The nearest person commits.',
        body: 'Ravi is 1.2km away. He replies YES. The system sends him directions, alerts the clinic, and tells Priya: help is coming.',
        observeRef: setRef3,
      },
      {
        id: 'step-4',
        label: '04',
        title: 'The facility prepares before she arrives.',
        body: 'PHC Wai receives: patient name, blood type, risk flags, volunteer name, ETA. Staff are ready. This eliminates the third delay entirely.',
        observeRef: setRef4,
      },
      {
        id: 'step-5',
        label: '05',
        title: 'No one is left wondering.',
        body: "Her husband Rahul receives an SMS 800km away: 'Priya has been helped. Ravi is taking her to PHC Wai. Track here.' One link. No login.",
        observeRef: setRef5,
      },
    ],
    [setRef1, setRef2, setRef3, setRef4, setRef5],
  )

  return (
    <section
      id="how-it-works"
      className="landing-section"
      style={{ background: 'var(--color-sand)', borderTop: '1px solid var(--color-sand-dark)' }}
    >
      <div className="landing-container">
        <motion.div
          ref={headRef}
          initial="hidden"
          animate={headInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, var(--text-5xl))',
              fontWeight: 700,
              color: 'var(--color-charcoal)',
              textAlign: 'center',
              margin: '0 0 56px',
              lineHeight: 1.1,
            }}
          >
            60 seconds.
            <br />
            That&apos;s all it takes.
          </h2>
        </motion.div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: 48,
            alignItems: 'start',
          }}
          className="landing-how-grid"
        >
          <StepFlow steps={steps} activeIndex={active} />
          <div style={{ position: 'sticky', top: 100 }} className="landing-how-phone">
            <PhoneMockup step={active + 1} />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 991px) {
          .landing-how-grid {
            grid-template-columns: 1fr !important;
          }
          .landing-how-phone {
            position: relative !important;
            top: auto !important;
            order: -1;
          }
        }
      `}</style>
    </section>
  )
}
