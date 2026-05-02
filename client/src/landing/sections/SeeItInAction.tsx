import { motion } from 'framer-motion'
import {
  fadeUpVariants,
  staggerContainerVariants,
  useScrollReveal,
} from '@/landing/hooks/useScrollReveal'
import patientSending from '@/assets/screenshots/patient-sending.jpeg'
import patientHelpComing from '@/assets/screenshots/patient-help-coming.jpeg'
import volunteerActiveAlert from '@/assets/screenshots/volunteer-active-alert.jpeg'
import volunteerResponding from '@/assets/screenshots/volunteer-responding.jpeg'
import clinicInbox from '@/assets/screenshots/clinic-inbox.jpeg'

type Scene = {
  id: string
  step: string
  role: string
  title: string
  body: string
  shots: { src: string; alt: string; caption: string }[]
}

const scenes: Scene[] = [
  {
    id: 'scene-patient',
    step: '01',
    role: 'Patient',
    title: 'One tap sends help.',
    body: 'Sageer opens MamaAlert, confirms her phone number, and taps the red button. The alert is queued offline first, then dispatched to volunteers and her clinic.',
    shots: [
      {
        src: patientSending,
        alt: 'Patient screen showing the SOS button mid-send with a "Sending alert..." spinner.',
        caption: 'Sending alert...',
      },
      {
        src: patientHelpComing,
        alt: 'Patient screen showing a green confirmation that help is coming and volunteers are notified.',
        caption: 'Help is coming.',
      },
    ],
  },
  {
    id: 'scene-volunteer',
    step: '02',
    role: 'Volunteer',
    title: 'The nearest person commits.',
    body: 'Volunteer Ramesh sees the alert with distance, age, and risk context. One tap on "I can go" routes directions to his phone and tells the patient he is on the way.',
    shots: [
      {
        src: volunteerActiveAlert,
        alt: 'Volunteer dashboard showing an active alert for Sageer with "I can go" and "Not available" buttons.',
        caption: 'Active alert · 25 weeks · 0 km away.',
      },
      {
        src: volunteerResponding,
        alt: 'Volunteer dashboard after responding, with directions confirmation and the alert moved to past alerts.',
        caption: 'Directions sent. Watching for next.',
      },
    ],
  },
  {
    id: 'scene-clinic',
    step: '03',
    role: 'Clinic',
    title: 'The facility prepares before she arrives.',
    body: 'The clinic inbox surfaces the patient name, weeks pregnant, blood type, risk flags, responding volunteer, and ETA — so the team is ready the moment she walks in.',
    shots: [
      {
        src: clinicInbox,
        alt: 'Clinic inbox showing an incoming alert with patient details, risk flags, volunteer name, and ETA controls.',
        caption: 'Incoming · ETA ~25 minutes.',
      },
    ],
  },
]

export function SeeItInAction() {
  const { ref, inView } = useScrollReveal(0.1)

  return (
    <section
      id="see-it-in-action"
      className="landing-section"
      style={{ background: 'var(--color-cream)' }}
    >
      <div className="landing-container">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={staggerContainerVariants}
        >
          <motion.p
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-terra)',
              textAlign: 'center',
              margin: '0 0 16px',
            }}
          >
            See it in action
          </motion.p>
          <motion.h2
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, var(--text-5xl))',
              fontWeight: 700,
              color: 'var(--color-charcoal)',
              textAlign: 'center',
              margin: '0 0 24px',
              lineHeight: 1.15,
            }}
          >
            Real screens.
            <br />
            Real flow. From SOS to clinic.
          </motion.h2>
          <motion.p
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-lg)',
              color: 'var(--color-warm-gray)',
              textAlign: 'center',
              margin: '0 auto 64px',
              lineHeight: 1.65,
              maxWidth: 720,
            }}
          >
            Captured from the live PWA. Patient, volunteer, and clinic — same alert, three points of view.
          </motion.p>

          <div
            className="landing-action-list"
            style={{ display: 'flex', flexDirection: 'column', gap: 80 }}
          >
            {scenes.map((scene, idx) => (
              <SceneRow key={scene.id} scene={scene} flip={idx % 2 === 1} />
            ))}
          </div>
        </motion.div>
      </div>

      <style>{`
        .landing-action-row {
          display: grid;
          grid-template-columns: 1fr minmax(280px, 520px);
          gap: 56px;
          align-items: center;
        }
        .landing-action-row.flip {
          grid-template-columns: minmax(280px, 520px) 1fr;
        }
        .landing-action-row.flip .landing-action-copy {
          order: 2;
        }
        .landing-action-row.flip .landing-action-shots {
          order: 1;
        }
        .landing-action-shots {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .landing-action-shot {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          flex: 0 1 240px;
        }
        .landing-action-shot img {
          width: 100%;
          height: auto;
          max-width: 240px;
          border-radius: 28px;
          border: 1px solid var(--color-sand-dark);
          background: var(--color-card);
          box-shadow: 0 18px 40px -24px rgba(44, 36, 22, 0.45);
          display: block;
        }
        .landing-action-shot figcaption {
          font-family: var(--font-body);
          font-size: var(--text-sm);
          color: var(--color-warm-gray);
          text-align: center;
          line-height: 1.4;
        }
        @media (max-width: 991px) {
          .landing-action-row,
          .landing-action-row.flip {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .landing-action-row.flip .landing-action-copy,
          .landing-action-row.flip .landing-action-shots {
            order: initial;
          }
          .landing-action-shot img {
            max-width: 220px;
          }
        }
      `}</style>
    </section>
  )
}

function SceneRow({ scene, flip }: { scene: Scene; flip: boolean }) {
  const { ref, inView } = useScrollReveal(0.1)
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={staggerContainerVariants}
      className={flip ? 'landing-action-row flip' : 'landing-action-row'}
    >
      <motion.div variants={fadeUpVariants} className="landing-action-copy">
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 12px',
            borderRadius: 999,
            background: 'var(--color-sand)',
            border: '1px solid var(--color-sand-dark)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-terra)',
            marginBottom: 16,
          }}
        >
          <span>{scene.step}</span>
          <span aria-hidden style={{ opacity: 0.4 }}>·</span>
          <span style={{ color: 'var(--color-charcoal)' }}>{scene.role}</span>
        </div>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 2.6vw, var(--text-3xl))',
            fontWeight: 700,
            color: 'var(--color-charcoal)',
            margin: '0 0 12px',
            lineHeight: 1.2,
          }}
        >
          {scene.title}
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            color: 'var(--color-warm-gray)',
            margin: 0,
            lineHeight: 1.7,
            maxWidth: 480,
          }}
        >
          {scene.body}
        </p>
      </motion.div>
      <motion.div variants={fadeUpVariants} className="landing-action-shots">
        {scene.shots.map((shot) => (
          <figure key={shot.src} className="landing-action-shot">
            <img src={shot.src} alt={shot.alt} loading="lazy" decoding="async" />
            <figcaption>{shot.caption}</figcaption>
          </figure>
        ))}
      </motion.div>
    </motion.div>
  )
}
