import React from 'react';
import { Link } from 'react-router-dom';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
    <div className="text-sm text-slate-300 leading-relaxed space-y-3">{children}</div>
  </div>
);

const Terms: React.FC = () => {
  const lastUpdated = 'July 3, 2026';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="text-xs font-bold text-indigo-400 hover:text-indigo-300">&larr; Back to Morniy</Link>

        <h1 className="text-3xl font-black text-white mt-6 mb-2">Terms of Service</h1>
        <p className="text-xs text-slate-500 mb-10">Last updated: {lastUpdated}</p>

        <Section title="1. Agreement">
          <p>
            These Terms of Service ("Terms") govern your use of Morniy, a business management platform provided by
            Morniy ("we", "us", "our"). By creating an account or using Morniy, you agree to these Terms. Morniy is
            available to customers in any country, subject to applicable local law.
          </p>
        </Section>

        <Section title="2. Your account">
          <p>
            You must provide accurate information when creating an account and are responsible for keeping your login
            credentials secure. You are responsible for all activity that occurs under your account, including actions
            taken by staff members you grant access to.
          </p>
        </Section>

        <Section title="3. Your data">
          <p>
            You retain ownership of the business data you enter into Morniy (clients, transactions, invoices, etc.).
            You grant us a limited license to store, process, and display that data solely to provide the service to
            you. You are responsible for the accuracy of the data you enter or upload.
          </p>
        </Section>

        <Section title="4. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use Morniy for any unlawful purpose or to store/process data you don't have the right to.</li>
            <li>Attempt to gain unauthorized access to other accounts or our systems.</li>
            <li>Interfere with or disrupt the integrity or performance of the service.</li>
            <li>Reverse engineer or resell the platform without our written permission.</li>
          </ul>
        </Section>

        <Section title="5. Payments & billing">
          <p>
            Certain features (e.g. invoice payment collection) may involve third-party payment processors. You are
            responsible for any fees charged by those processors. We are not responsible for disputes between you and
            your own clients or payers.
          </p>
        </Section>

        <Section title="6. Third-party integrations">
          <p>
            Morniy may integrate with third-party services (e.g. Google Sheets export, email delivery, payment
            processing). Your use of those integrations is also subject to the relevant third party's terms.
          </p>
        </Section>

        <Section title="7. Availability & changes">
          <p>
            We aim to keep Morniy available and reliable but do not guarantee uninterrupted access. We may modify,
            suspend, or discontinue features at any time, and will make reasonable efforts to notify you of material
            changes.
          </p>
        </Section>

        <Section title="8. Termination">
          <p>
            You may stop using Morniy and request account deletion at any time. We may suspend or terminate accounts
            that violate these Terms or pose a security risk to the platform or other users.
          </p>
        </Section>

        <Section title="9. Disclaimer & limitation of liability">
          <p>
            Morniy is provided "as is" without warranties of any kind. To the maximum extent permitted by law, we are
            not liable for indirect, incidental, or consequential damages arising from your use of the service,
            including reliance on automated features such as OCR/AI document scanning or tax calculations, which
            should be reviewed before relying on them for filings or payments.
          </p>
        </Section>

        <Section title="10. Changes to these Terms">
          <p>We may update these Terms from time to time. Continued use of Morniy after changes take effect constitutes acceptance of the updated Terms.</p>
        </Section>

        <Section title="11. Contact us">
          <p>
            Questions about these Terms? Contact us at{' '}
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

export default Terms;
