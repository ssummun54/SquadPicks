import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Notice — SquadPicks' }

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 text-slate-300">
      <h1 className="text-3xl font-black text-slate-100 mb-2">Privacy Notice</h1>
      <p className="text-sm text-slate-500 mb-10">Last updated June 01, 2026</p>

      <p className="mb-6">This Privacy Notice for SquadPicks (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) describes how and why we might access, collect, store, use, and/or share your personal information when you use our services, including when you visit <a href="https://squadpicks.co" className="text-accent hover:underline">squadpicks.co</a>.</p>
      <p className="mb-10"><strong className="text-slate-200">Questions or concerns?</strong> Contact us at <a href="mailto:hello@squadpicks.co" className="text-accent hover:underline">hello@squadpicks.co</a>.</p>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Summary of Key Points</h2>
        <ul className="space-y-3 text-sm">
          <li><strong className="text-slate-200">What personal information do we process?</strong> When you visit or use our Services, we may process personal information depending on how you interact with us.</li>
          <li><strong className="text-slate-200">Do we process sensitive personal information?</strong> No. We do not process sensitive personal information.</li>
          <li><strong className="text-slate-200">Do we collect information from third parties?</strong> No.</li>
          <li><strong className="text-slate-200">How do we process your information?</strong> To provide and improve our Services, communicate with you, and for security and fraud prevention.</li>
          <li><strong className="text-slate-200">What are your rights?</strong> Depending on your location, you may have rights regarding your personal information including access, correction, and deletion.</li>
        </ul>
      </section>

      <Section title="1. What Information Do We Collect?">
        <h3 className="font-semibold text-slate-200 mb-2">Personal information you disclose to us</h3>
        <p className="mb-3">We collect personal information that you voluntarily provide when you register, including your username and email address.</p>
        <p className="mb-3"><strong className="text-slate-200">Sensitive information.</strong> We do not process sensitive information.</p>
        <h3 className="font-semibold text-slate-200 mb-2">Information automatically collected</h3>
        <p>We automatically collect certain information when you visit our Services, such as your IP address, browser type, and device characteristics. This information is used to maintain security and for internal analytics.</p>
      </Section>

      <Section title="2. How Do We Process Your Information?">
        <p>We process your information to provide, improve, and administer our Services, communicate with you, and for security and fraud prevention. We process your information only when we have a valid legal reason to do so.</p>
      </Section>

      <Section title="3. When and With Whom Do We Share Your Personal Information?">
        <p className="mb-3">We may share information in specific situations:</p>
        <ul className="list-disc pl-5 space-y-2 text-sm">
          <li><strong className="text-slate-200">Service providers.</strong> We share data with Supabase (database and authentication), Vercel (hosting), and Resend (transactional email).</li>
          <li><strong className="text-slate-200">Business transfers.</strong> We may share or transfer your information in connection with a merger, sale, or acquisition.</li>
        </ul>
      </Section>

      <Section title="4. Do We Use Cookies and Other Tracking Technologies?">
        <p>We use cookies solely for authentication purposes (strictly necessary cookies). These cookies are required for the app to function and cannot be opted out of while using the service. We do not use advertising or analytics cookies.</p>
      </Section>

      <Section title="5. How Do We Handle Your Social Logins?">
        <p>If you register or log in using Google, we may receive basic profile information such as your name and email address from Google. We use this information only to create and manage your account.</p>
      </Section>

      <Section title="6. Is Your Information Transferred Internationally?">
        <p>Our servers are located in the United States. If you access our Services from outside the US, your information may be transferred to, stored, and processed in the United States.</p>
      </Section>

      <Section title="7. How Long Do We Keep Your Information?">
        <p>We keep your personal information for as long as your account is active or as necessary to provide our Services. You may request deletion of your account and data at any time by contacting us.</p>
      </Section>

      <Section title="8. Do We Collect Information from Minors?">
        <p>We do not knowingly collect data from or market to children under 13 years of age. By using the Services, you represent that you are at least 13 years old. If we learn that personal information from users under 13 has been collected, we will deactivate the account and delete the data.</p>
      </Section>

      <Section title="9. What Are Your Privacy Rights?">
        <p className="mb-3">You may review, change, or delete your account information at any time. To request account termination or data deletion, contact us at <a href="mailto:hello@squadpicks.co" className="text-accent hover:underline">hello@squadpicks.co</a>.</p>
        <p>If you are located in the EEA or UK, you have rights under GDPR including the right to access, rectify, or erase your personal data.</p>
      </Section>

      <Section title="10. Controls for Do-Not-Track Features">
        <p>We do not currently respond to Do-Not-Track browser signals as no uniform standard has been finalized.</p>
      </Section>

      <Section title="11. Do We Make Updates to This Notice?">
        <p>We may update this Privacy Notice from time to time. The updated version will be indicated by an updated date at the top of this page. We will notify you of material changes by email.</p>
      </Section>

      <Section title="12. How Can You Contact Us?">
        <p>If you have questions or comments about this notice, email us at <a href="mailto:hello@squadpicks.co" className="text-accent hover:underline">hello@squadpicks.co</a>.</p>
      </Section>

      <Section title="13. How Can You Review, Update, or Delete Your Data?">
        <p>You have the right to request access to, correction of, or deletion of your personal information. To submit a request, contact us at <a href="mailto:hello@squadpicks.co" className="text-accent hover:underline">hello@squadpicks.co</a>.</p>
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
