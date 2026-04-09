import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { fadeUpVariants, useScrollReveal } from '@/landing/hooks/useScrollReveal'

export function JoinTheNetwork() {
  const { ref: textRef, inView: textInView } = useScrollReveal(0.12)
  const { ref: vizRef, inView: vizInView } = useScrollReveal(0.12)

  return (
    <section className="landing-section" style={{ background: 'var(--color-sand)', borderTop: '1px solid var(--color-sand-dark)' }}>
      <div className="landing-container">
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 4vw, var(--text-5xl))',
            fontWeight: 700,
            color: 'var(--color-charcoal)',
            textAlign: 'center',
            margin: '0 0 48px',
            lineHeight: 1.15,
            maxWidth: 720,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          The more communities join,
          <br />
          the faster every woman gets help.
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 48,
            alignItems: 'center',
            marginBottom: 40,
          }}
          className="landing-network-grid"
        >
          <motion.div
            ref={textRef}
            initial="hidden"
            animate={textInView ? 'visible' : 'hidden'}
            variants={fadeUpVariants}
          >
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-lg)',
                color: 'var(--color-warm-gray)',
                lineHeight: 1.7,
                margin: '0 0 20px',
              }}
            >
              MamaAlert runs on the people already surrounding every pregnant woman.
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-base)',
                color: 'var(--color-warm-gray)',
                lineHeight: 1.7,
                margin: '0 0 20px',
              }}
            >
              The neighbour with a motorcycle.
              <br />
              The retired nurse two streets over.
              <br />
              The community health worker who already knows her name.
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-base)',
                color: 'var(--color-charcoal)',
                lineHeight: 1.7,
                margin: 0,
                fontWeight: 500,
              }}
            >
              We don&apos;t build infrastructure.
              <br />
              We activate the one that exists.
            </p>
          </motion.div>

          <motion.div
            ref={vizRef}
            initial="hidden"
            animate={vizInView ? 'visible' : 'hidden'}
            variants={fadeUpVariants}
            className="landing-network-viz will-change-transform"
            aria-hidden="true"
            style={{
              position: 'relative',
              aspectRatio: '1',
              maxWidth: 420,
              margin: '0 auto',
              width: '100%',
            }}
          >
            <div className="landing-network-rings" />
            <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', display: 'block' }}>
              <line x1="100" y1="100" x2="100" y2="40" className="landing-net-line" />
              <line x1="100" y1="100" x2="155" y2="58" className="landing-net-line" style={{ animationDelay: '0.15s' }} />
              <line x1="100" y1="100" x2="168" y2="100" className="landing-net-line" style={{ animationDelay: '0.3s' }} />
              <line x1="100" y1="100" x2="145" y2="145" className="landing-net-line" style={{ animationDelay: '0.45s' }} />
              <line x1="100" y1="100" x2="100" y2="165" className="landing-net-line" style={{ animationDelay: '0.6s' }} />
              <line x1="100" y1="100" x2="55" y2="145" className="landing-net-line" style={{ animationDelay: '0.75s' }} />
              <circle cx="100" cy="100" r="10" fill="var(--color-alert)" className="landing-net-center" />
              <circle cx="100" cy="40" r="7" fill="var(--color-forest)" className="landing-net-node" />
              <circle cx="155" cy="58" r="7" fill="var(--color-forest)" className="landing-net-node" />
              <circle cx="168" cy="100" r="7" fill="var(--color-forest)" className="landing-net-node" />
              <circle cx="145" cy="145" r="7" fill="var(--color-forest)" className="landing-net-node" />
              <circle cx="100" cy="165" r="7" fill="var(--color-forest)" className="landing-net-node" />
              <circle cx="55" cy="145" r="7" fill="var(--color-forest)" className="landing-net-node" />
            </svg>
            <span className="landing-net-label landing-net-label--2">2km</span>
            <span className="landing-net-label landing-net-label--5">5km</span>
            <span className="landing-net-label landing-net-label--10">10km</span>
          </motion.div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-lg)',
              color: 'var(--color-warm-gray)',
              margin: '0 0 20px',
              lineHeight: 1.6,
            }}
          >
            Are you a community health worker, nurse,
            <br />
            or someone who wants to help?
          </p>
          <Link
            to="/app/volunteer"
            className="landing-btn landing-btn--ghost landing-btn--install-cta"
            style={{ display: 'inline-flex' }}
          >
            Register as a volunteer →
          </Link>
        </div>
      </div>
      <style>{`
        .landing-network-rings {
          position: absolute;
          inset: 8%;
          border: 1px dashed var(--color-sand-dark);
          border-radius: 50%;
          pointer-events: none;
        }
        .landing-network-rings::before,
        .landing-network-rings::after {
          content: '';
          position: absolute;
          border: 1px dashed rgba(232, 213, 188, 0.65);
          border-radius: 50%;
          inset: -14%;
        }
        .landing-network-rings::after {
          inset: -28%;
          border-color: rgba(232, 213, 188, 0.45);
        }
        .landing-net-line {
          stroke: var(--color-sand-dark);
          stroke-width: 1.2;
          stroke-dasharray: 4 5;
          animation: landing-dash 3s linear infinite;
        }
        .landing-net-center {
          animation: landing-pulse-center 2s ease-in-out infinite;
        }
        .landing-net-node {
          opacity: 0.95;
        }
        .landing-net-label {
          position: absolute;
          font-size: 10px;
          font-family: var(--font-body);
          color: var(--color-muted);
        }
        .landing-net-label--2 { bottom: 18%; left: 50%; transform: translateX(-50%); }
        .landing-net-label--5 { bottom: 8%; right: 22%; }
        .landing-net-label--10 { top: 4%; right: 8%; }
        @keyframes landing-dash {
          to { stroke-dashoffset: -36; }
        }
        @keyframes landing-pulse-center {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.9; }
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-net-line { animation: none; }
          .landing-net-center { animation: none; }
        }
        @media (max-width: 767px) {
          .landing-network-grid {
            grid-template-columns: 1fr !important;
          }
          .landing-btn--install-cta { width: 100%; max-width: 360px; }
        }
      `}</style>
    </section>
  )
}
