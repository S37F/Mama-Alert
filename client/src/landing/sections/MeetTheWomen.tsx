import { motion } from 'framer-motion'
import { ScenarioCard } from '@/landing/components/ScenarioCard'
import {
  fadeUpVariants,
  staggerContainerVariants,
  useScrollReveal,
} from '@/landing/hooks/useScrollReveal'

function IconPhoneScreen() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect x="10" y="4" width="20" height="32" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M14 10h12v16H14z" fill="var(--color-sand)" stroke="currentColor" strokeWidth="1" />
      <circle cx="20" cy="28" r="2" fill="currentColor" />
    </svg>
  )
}

function IconKeypad() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect x="6" y="6" width="28" height="28" rx="3" stroke="currentColor" strokeWidth="2" />
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={10 + col * 8}
            y={10 + row * 8}
            width="5"
            height="5"
            rx="1"
            fill="currentColor"
            opacity="0.85"
          />
        )),
      )}
    </svg>
  )
}

function IconTap() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="18" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M20 8v6M20 22v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M14 26c2 4 10 4 12 0" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

export function MeetTheWomen() {
  const { ref, inView } = useScrollReveal(0.1)

  return (
    <section className="landing-section" style={{ background: 'var(--color-cream)' }}>
      <div className="landing-container">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={staggerContainerVariants}
        >
          <motion.h2
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, var(--text-5xl))',
              fontWeight: 700,
              color: 'var(--color-charcoal)',
              textAlign: 'center',
              margin: '0 0 48px',
              lineHeight: 1.15,
            }}
          >
            Real emergencies.
            <br />
            Real women.
            <br />
            Real minutes that mattered.
          </motion.h2>
          <motion.div
            variants={staggerContainerVariants}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 32,
              alignItems: 'stretch',
            }}
            className="landing-scenario-grid"
          >
            <ScenarioCard
              tag="2:41 AM · Maharashtra, India"
              nameBlock={
                <>
                  Priya, 24
                  <br />
                  <span style={{ fontWeight: 400, fontSize: 'var(--text-base)' }}>38 weeks pregnant</span>
                </>
              }
              situation={`Severe bleeding. Husband 200km away. Elderly mother-in-law. No vehicle. No phone credit.`}
              withoutTitle="Without MamaAlert:"
              withoutBody={`Waits until 4 AM. Reaches clinic at 5:15 AM.`}
              fatalDelay="FATAL DELAY: 2h 34min"
              withTitle="With MamaAlert:"
              withBody={`Ravi (1.2km) responds in 90 seconds.`}
              responseLabel="TOTAL RESPONSE: 22 minutes"
              triggerLabel="One tap. PWA bookmark."
              triggerIcon={<IconPhoneScreen />}
            />
            <ScenarioCard
              tag="11:17 AM · Adansi, Ghana"
              nameBlock={
                <>
                  Amara, 19
                  <br />
                  <span style={{ fontWeight: 400, fontSize: 'var(--text-base)' }}>
                    40 weeks · First pregnancy
                  </span>
                </>
              }
              situation={`Active labour. Alone. No internet. No smartphone. Just a basic Nokia.`}
              withoutTitle="Without MamaAlert:"
              withoutBody={`Neighbour walks 2km for help. Labour complications unattended.`}
              fatalDelay="FATAL DELAY: 3h 12min"
              withTitle="With MamaAlert:"
              withBody={`Sister Agnes + Kofi (taxi) mobilised.`}
              responseLabel="TOTAL RESPONSE: 38 minutes"
              triggerLabel="Dialled *456#. No internet needed."
              triggerIcon={<IconKeypad />}
            />
            <ScenarioCard
              tag="4:56 PM · Maiduguri, Nigeria"
              nameBlock={
                <>
                  Fatima, 31
                  <br />
                  <span style={{ fontWeight: 400, fontSize: 'var(--text-base)' }}>
                    Pre-eclampsia · Cannot speak
                  </span>
                </>
              }
              situation={`Blurred vision. Severe headache. Alone with two children aged 3 and 6. Cannot describe what's happening.`}
              withoutTitle="Without MamaAlert:"
              withoutBody={`Children try to get help. Critical window passes.`}
              fatalDelay="FATAL DELAY: UNKNOWN"
              withTitle="With MamaAlert:"
              withBody={`System detected no interaction. Auto-escalated. Nurse Blessing arrived.`}
              responseLabel="RESPONSE: 7 minutes"
              triggerLabel={`One tap. Couldn't do more. System did the rest.`}
              triggerIcon={<IconTap />}
            />
          </motion.div>
          <motion.p
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-lg)',
              color: 'var(--color-warm-gray)',
              textAlign: 'center',
              marginTop: 48,
              marginBottom: 0,
              lineHeight: 1.65,
              maxWidth: 720,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            These are not hypotheticals.
            <br />
            These are the documented patterns behind 260,000 deaths a year.
            <br />
            MamaAlert is built around every single edge case.
          </motion.p>
        </motion.div>
      </div>
      <style>{`
        @media (max-width: 991px) {
          .landing-scenario-grid {
            display: flex !important;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            gap: 20px;
            padding-bottom: 8px;
            -webkit-overflow-scrolling: touch;
          }
          .landing-scenario-grid > article {
            flex: 0 0 min(88vw, 360px);
            scroll-snap-align: start;
          }
        }
      `}</style>
    </section>
  )
}
