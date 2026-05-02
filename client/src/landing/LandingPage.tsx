import '@/landing/styles/landing.css'
import { Footer } from '@/landing/components/Footer'
import { NavBar } from '@/landing/components/NavBar'
import { GlobalImpact } from '@/landing/sections/GlobalImpact'
import { Hero } from '@/landing/sections/Hero'
import { HowItWorks } from '@/landing/sections/HowItWorks'
import { InstallSection } from '@/landing/sections/InstallSection'
import { JoinTheNetwork } from '@/landing/sections/JoinTheNetwork'
import { MeetTheWomen } from '@/landing/sections/MeetTheWomen'
import { RoleAccessHub } from '@/landing/sections/RoleAccessHub'
import { SeeItInAction } from '@/landing/sections/SeeItInAction'
import { TheTruth } from '@/landing/sections/TheTruth'
import { ThreeDelays } from '@/landing/sections/ThreeDelays'

export function LandingPage() {
  return (
    <div className="landing-page">
      <NavBar />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <TheTruth />
        <ThreeDelays />
        <MeetTheWomen />
        <HowItWorks />
        <SeeItInAction />
        <RoleAccessHub />
        <GlobalImpact />
        <JoinTheNetwork />
        <InstallSection />
      </main>
      <Footer />
    </div>
  )
}
