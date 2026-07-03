import React from 'react';
import { Link } from 'react-router-dom';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
    <div className="text-sm text-slate-300 leading-relaxed space-y-3">{children}</div>
  </div>
);

const Privacy: React.FC = () => {
  const lastUpdated = 'July 3, 2026';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="text-xs font-bold text-indigo-400 hover:text-indigo-300">&larr; Back to Morniy</Link>

        <h1 className="text-3xl font-black text-white mt-6 mb-2">Privacy Policy</h1>
        <p className="text-xs text-slate-500 mb-10">Last updated: {lastUpdated}</p>

        <Section title="1. Who we are">
          <p>
            Morniy ("Morniy", "we", "us", or "our") provides a business management platform (transactions, clients,
            invoicing, payroll, and related tools). This policy explains what information we collect, how we use it,
            and the choices you have. We operate this service for customers worldwide, regardless of country.
          </p>
        </Section>

        <Section title="2. Information we collect">
          <p>We collect information you provide directly when you use Morniy, including:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account details: name, email address, password (stored hashed), and business information.</li>
            <li>Business data you enter or upload: clients, transactions, invoices, proposals, payroll records, and receipts.</li>
            <li>Documents you scan (receipts/invoices) for automated data extraction.</li>
            <li>Usage and activity logs (e.g. login times, actions taken) for security and audit purposes.</li>
          </ul>
        </Section>

        <Section title="3. Google user data">
          <p>
            If you connect a Google Account to export data to Google Sheets, Morniy requests limited permission to
            create and write to spreadsheets on your behalf. Morniy's use and transfer of information received from
            Google APIs adheres to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:text-indigo-300 underline"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>We only use this access to export your own business data (e.g. transactions) into a spreadsheet you choose.</li>
            <li>We do not read, collect, or store the contents of your other Google Sheets or Drive files.</li>
            <li>We do not use Google user data for advertising, and we do not sell it or share it with third parties.</li>
            <li>We do not use Google user data to train generalized AI/ML models.</li>
            <li>You can revoke Morniy's access at any time from your Google Account permissions page.</li>
          </ul>
        </Section>

        <Section title="4. How we use information">
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide, operate, and maintain the Morniy platform.</li>
            <li>To process transactions, generate invoices/receipts, and calculate business reports.</li>
            <li>To extract data from scanned receipts/invoices using OCR and AI-assisted parsing.</li>
            <li>To send transactional emails (e.g. invoice, proposal, payslip, and receipt notifications).</li>
            <li>To maintain security, prevent fraud, and keep an audit trail of account activity.</li>
            <li>To communicate with you about your account or respond to support requests.</li>
          </ul>
        </Section>

        <Section title="5. Data sharing">
          <p>
            We do not sell your personal information. We share data only with service providers that help us operate
            Morniy (e.g. cloud hosting, database, email delivery, payment processing, AI-assisted document parsing),
            each bound by their own confidentiality and data protection obligations, and only to the extent necessary
            to provide the service. We may disclose information if required by law.
          </p>
        </Section>

        <Section title="6. Data retention & security">
          <p>
            We retain business and account data for as long as your account is active, or as needed to provide the
            service and comply with legal obligations. Passwords are stored using industry-standard hashing.
            Access to your business data is restricted by role-based permissions within your account.
          </p>
        </Section>

        <Section title="7. Your rights">
          <p>
            You may access, correct, export, or request deletion of your account data at any time by contacting us.
            Depending on your country of residence, you may have additional rights under applicable data protection
            law (e.g. GDPR, NDPR).
          </p>
        </Section>

        <Section title="8. Children's privacy">
          <p>Morniy is intended for business use and is not directed to children. We do not knowingly collect data from children.</p>
        </Section>

        <Section title="9. Changes to this policy">
          <p>We may update this policy from time to time. Material changes will be reflected by updating the "Last updated" date above.</p>
        </Section>

        <Section title="10. Contact us">
          <p>
            Questions about this policy or your data? Contact us at{' '}
            <a href="mailto:sheeness2@gmail.com" className="text-indigo-400 hover:text-indigo-300 underline">
              sheeness2@gmail.com
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
};

export default Privacy;
