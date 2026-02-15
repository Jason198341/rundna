import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — RunDNA',
  description: 'RunDNA Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-text mb-8">
          ← Back
        </a>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted mb-10">Last updated: February 15, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="text-lg font-semibold text-text mb-2">1. Overview</h2>
            <p>
              RunDNA (&quot;we&quot;, &quot;our&quot;, &quot;the Service&quot;) is an AI-powered running analytics
              platform operated by Jason Moon. This policy explains how we collect, use, and protect your
              information when you use our web application and mobile application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-2">2. Information We Collect</h2>
            <p className="mb-3">We collect the following data when you connect your Strava account:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-text">Strava Profile:</strong> Name, profile photo, city, and country</li>
              <li><strong className="text-text">Running Activities:</strong> Date, distance, duration, pace, heart rate, elevation, and activity name</li>
              <li><strong className="text-text">Authentication Tokens:</strong> Strava OAuth access and refresh tokens (stored securely server-side)</li>
            </ul>
            <p className="mt-3">We do <strong className="text-text">not</strong> collect:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>GPS route/location data or maps</li>
              <li>Payment or financial information</li>
              <li>Device identifiers or advertising IDs</li>
              <li>Contacts, photos, or other personal files</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-2">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Generate your Running DNA personality analysis</li>
              <li>Provide AI coaching advice based on your training history</li>
              <li>Create personalized race training plans</li>
              <li>Calculate training load (ACWR) and race predictions</li>
              <li>Generate weekly training report cards</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-2">4. Third-Party Services</h2>
            <p className="mb-3">We use the following third-party services to operate RunDNA:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-text">Strava API:</strong> To read your running activities (with your authorization)</li>
              <li><strong className="text-text">Supabase:</strong> Database hosting and data storage (encrypted at rest)</li>
              <li><strong className="text-text">Fireworks AI:</strong> AI model provider for coaching and plan generation</li>
              <li><strong className="text-text">Vercel:</strong> Web application hosting</li>
            </ul>
            <p className="mt-3">
              Your running data may be sent to AI services to generate coaching responses.
              We do not sell or share your personal data with advertisers or unrelated third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-2">5. Data Storage & Security</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Data is stored in Supabase (PostgreSQL) with Row Level Security (RLS) enabled</li>
              <li>Authentication tokens are stored server-side only and never exposed to the client</li>
              <li>Session cookies are HMAC-signed, httpOnly, and secure in production</li>
              <li>All connections use HTTPS/TLS encryption</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-2">6. Data Retention & Deletion</h2>
            <p>
              Your data is retained while your account is active. You can request complete deletion of
              your data at any time by contacting us at the email below. Upon request, we will delete
              your user record, cached activities, and all associated data within 30 days.
            </p>
            <p className="mt-2">
              You may also revoke RunDNA&apos;s access to your Strava data at any time through
              your <a href="https://www.strava.com/settings/apps" className="text-primary underline" target="_blank" rel="noopener noreferrer">Strava Settings</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-2">7. Children&apos;s Privacy</h2>
            <p>
              RunDNA is not intended for children under the age of 13. We do not knowingly collect
              personal information from children under 13. If you believe a child has provided us
              with personal data, please contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-2">8. Your Rights</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access your personal data stored by RunDNA</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Revoke Strava access at any time</li>
              <li>Export your data upon request</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-2">9. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. Changes will be posted on this page
              with an updated date. Continued use of the Service after changes constitutes acceptance
              of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-2">10. Contact</h2>
            <p>
              If you have questions about this privacy policy or wish to exercise your data rights,
              please contact:
            </p>
            <p className="mt-2">
              <strong className="text-text">Jason Moon</strong><br />
              Email: <a href="mailto:skypeople41@gmail.com" className="text-primary underline">skypeople41@gmail.com</a><br />
              Website: <a href="https://jasonmoon.dev" className="text-primary underline" target="_blank" rel="noopener noreferrer">jasonmoon.dev</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
