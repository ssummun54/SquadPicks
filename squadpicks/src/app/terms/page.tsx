import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms and Conditions — SquadPicks' }

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 text-slate-300">
      <h1 className="text-3xl font-black text-slate-100 mb-2">Terms and Conditions</h1>
      <p className="text-sm text-slate-500 mb-10">Last updated June 01, 2026</p>

      <p className="mb-6">We are SquadPicks, operated by Sergio M, registered in North Carolina, United States. We operate the website <a href="https://squadpicks.co" className="text-accent hover:underline">squadpicks.co</a>.</p>
      <p className="mb-6">SquadPicks is a free sports prediction game where users predict match scores, group standings, and knockout bracket results for major tournaments. Users create or join private groups to compete against friends, track standings on a leaderboard, and earn points for correct predictions. <strong className="text-slate-200">No real money is involved.</strong></p>
      <p className="mb-10">By accessing the Services, you have read, understood, and agreed to be bound by these Terms. If you do not agree, you must discontinue use immediately.</p>

      <Section title="1. Our Services">
        <p>The Services are intended for personal, non-commercial use. We are not responsible for ensuring the Services comply with laws in your jurisdiction — that is your responsibility.</p>
      </Section>

      <Section title="2. Intellectual Property Rights">
        <p>We own all intellectual property rights in the Services, including source code, design, and content. You may not copy, reproduce, or exploit any part of the Services for commercial purposes without our written permission.</p>
      </Section>

      <Section title="3. User Representations">
        <p>By using the Services you represent that: (1) all registration information you submit is true and accurate; (2) you will maintain the accuracy of such information; (3) you have the legal capacity to agree to these Terms; (4) you are not a minor in your jurisdiction or have parental consent; (5) you will not use the Services for any illegal or unauthorized purpose.</p>
      </Section>

      <Section title="4. User Registration">
        <p>You must register to use certain features. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.</p>
      </Section>

      <Section title="5. Prohibited Activities">
        <p className="mb-3">You may not:</p>
        <ul className="list-disc pl-5 space-y-2 text-sm">
          <li>Use the Services for any unlawful purpose</li>
          <li>Attempt to gain unauthorized access to any part of the Services</li>
          <li>Use automated scripts or bots to interact with the Services</li>
          <li>Harass, abuse, or harm other users</li>
          <li>Submit false or misleading information</li>
          <li>Interfere with or disrupt the Services</li>
        </ul>
      </Section>

      <Section title="6. User Generated Contributions">
        <p>Users may submit usernames and prediction data. You are responsible for ensuring your contributions do not violate any third-party rights or applicable laws.</p>
      </Section>

      <Section title="7. Services Management">
        <p>We reserve the right to monitor the Services, take appropriate legal action against anyone who violates these Terms, and terminate or restrict access to the Services at our sole discretion.</p>
      </Section>

      <Section title="8. Privacy Policy">
        <p>We care about data privacy and security. Please review our <a href="/privacy" className="text-accent hover:underline">Privacy Notice</a>, which is incorporated into these Terms.</p>
      </Section>

      <Section title="9. Term and Termination">
        <p>These Terms remain in effect while you use the Services. We may suspend or terminate your access at any time for any reason, including breach of these Terms. Upon termination, your right to use the Services will immediately cease.</p>
      </Section>

      <Section title="10. Modifications and Interruptions">
        <p>We reserve the right to modify or discontinue the Services at any time without notice. We will not be liable to you for any modification, suspension, or discontinuation of the Services.</p>
      </Section>

      <Section title="11. Governing Law">
        <p>These Terms are governed by the laws of the State of North Carolina, United States, without regard to conflict of law principles.</p>
      </Section>

      <Section title="12. Dispute Resolution">
        <p>For any disputes, you agree to first attempt to resolve the dispute informally by contacting us. If not resolved, disputes will be subject to binding arbitration in North Carolina.</p>
      </Section>

      <Section title="13. Disclaimer">
        <p>THE SERVICES ARE PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. WE DO NOT GUARANTEE THE ACCURACY OF SCORES, STANDINGS, OR ANY OTHER DATA ON THE PLATFORM.</p>
      </Section>

      <Section title="14. Limitations of Liability">
        <p>TO THE FULLEST EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICES.</p>
      </Section>

      <Section title="15. Miscellaneous">
        <p>These Terms constitute the entire agreement between you and SquadPicks. If any provision is found unenforceable, the remaining provisions will remain in full effect. Our failure to enforce any right does not constitute a waiver.</p>
      </Section>

      <Section title="16. Contact Us">
        <p>For questions about these Terms, contact us at <a href="mailto:hello@squadpicks.co" className="text-accent hover:underline">hello@squadpicks.co</a>.</p>
      </Section>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-slate-100 mb-4">{title}</h2>
      <div className="text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  )
}
