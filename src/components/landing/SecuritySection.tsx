'use client';

import { pick, useLanguage } from '@/lib/i18n';

const HERO = {
  en: {
    title1: 'Built for trust,',
    title2: 'audited by design.',
    sub: 'A policing tool has to answer for itself. Every session, query and export in DRISHTI leaves a record — and every role sees only what it should.',
  },
  kn: {
    title1: 'ವಿಶ್ವಾಸಕ್ಕಾಗಿ ನಿರ್ಮಿತ,',
    title2: 'ವಿನ್ಯಾಸದಿಂದಲೇ ಲೆಕ್ಕಪರಿಶೋಧಿತ.',
    sub: 'ಪ್ರತಿ ಸೆಷನ್, ಪ್ರಶ್ನೆ ಮತ್ತು ರಫ್ತು ದಾಖಲೆ ಬಿಡುತ್ತದೆ — ಪ್ರತಿ ಪಾತ್ರವೂ ತನಗೆ ಸಲ್ಲುವಷ್ಟನ್ನೇ ನೋಡುತ್ತದೆ.',
  },
};

const SECTIONS = [
  {
    icon: '🛡',
    en: {
      title: 'Role-based access control',
      body: 'Four roles — Investigator, Analyst, Supervisor, Administrator. The audit trail is visible only to Supervisors and Administrators; financial intelligence needs Analyst level or above. Restricted modules disappear from the navigation and block direct URLs.',
    },
    kn: {
      title: 'ಪಾತ್ರ ಆಧಾರಿತ ಪ್ರವೇಶ ನಿಯಂತ್ರಣ',
      body: 'ನಾಲ್ಕು ಪಾತ್ರಗಳು — ತನಿಖಾಧಿಕಾರಿ, ವಿಶ್ಲೇಷಕ, ಮೇಲ್ವಿಚಾರಕ, ನಿರ್ವಾಹಕ. ಲೆಕ್ಕಪರಿಶೋಧನಾ ದಾಖಲೆ ಮೇಲ್ವಿಚಾರಕರಿಗೆ ಮಾತ್ರ; ನಿರ್ಬಂಧಿತ ಮಾಡ್ಯೂಲ್‌ಗಳು ನ್ಯಾವಿಗೇಷನ್‌ನಿಂದಲೇ ಮರೆಯಾಗುತ್ತವೆ.',
    },
  },
  {
    icon: '𝄃',
    en: {
      title: 'Complete audit trail',
      body: 'Sign-ins, sign-outs, every Copilot query, every page view and every export are recorded with the officer’s authenticated identity and role — 100% activity logging, as the requirement demands.',
    },
    kn: {
      title: 'ಪೂರ್ಣ ಲೆಕ್ಕಪರಿಶೋಧನಾ ದಾಖಲೆ',
      body: 'ಸೈನ್ ಇನ್/ಔಟ್, ಪ್ರತಿ ಕೋಪೈಲಟ್ ಪ್ರಶ್ನೆ, ಪ್ರತಿ ಪುಟ ವೀಕ್ಷಣೆ, ಪ್ರತಿ ರಫ್ತು — ಅಧಿಕಾರಿಯ ದೃಢೀಕೃತ ಗುರುತು ಮತ್ತು ಪಾತ್ರದೊಂದಿಗೆ ದಾಖಲಾಗುತ್ತದೆ.',
    },
  },
  {
    icon: '🔒',
    en: {
      title: 'Session security',
      body: 'HMAC-signed session tokens in httpOnly cookies with 12-hour expiry. Tampered or expired sessions are rejected server-side before any page renders.',
    },
    kn: {
      title: 'ಸೆಷನ್ ಭದ್ರತೆ',
      body: 'HMAC ಸಹಿಯ ಟೋಕನ್‌ಗಳು httpOnly ಕುಕೀಗಳಲ್ಲಿ, 12 ಗಂಟೆ ಅವಧಿ. ತಿದ್ದಿದ ಅಥವಾ ಅವಧಿ ಮೀರಿದ ಸೆಷನ್‌ಗಳು ಸರ್ವರ್ ಹಂತದಲ್ಲೇ ತಿರಸ್ಕೃತ.',
    },
  },
  {
    icon: '⚖',
    en: {
      title: 'Data governance',
      body: 'This prototype runs entirely on synthetic data — no real crime records, people or identifiers. AI answers are grounded in database results only; anything without a source is never shown.',
    },
    kn: {
      title: 'ದತ್ತಾಂಶ ಆಡಳಿತ',
      body: 'ಈ ಮೂಲಮಾದರಿ ಸಂಪೂರ್ಣ ಸಂಶ್ಲೇಷಿತ ದತ್ತಾಂಶದ ಮೇಲೆ ನಡೆಯುತ್ತದೆ. AI ಉತ್ತರಗಳು ದತ್ತಸಂಚಯ ಫಲಿತಾಂಶಗಳಲ್ಲಿ ಮಾತ್ರ ಆಧಾರಿತ.',
    },
  },
];

/** "Security" landing section — trust, RBAC and audit story. */
export function SecuritySection() {
  const { lang } = useLanguage();
  const hero = pick(lang, HERO);

  return (
    <section id="security" className="mx-auto w-[min(1080px,90%)] scroll-mt-28 pb-14 pt-14">
      <div className="max-w-3xl">
        <h2 className="font-display text-[clamp(2.2rem,4.5vw,3.4rem)] font-black leading-[1.02] tracking-tight text-[var(--text-primary)]">
          {hero.title1}
          <br />
          <span className="text-[var(--accent)]">{hero.title2}</span>
        </h2>
        <div className="dot-rule mt-4 w-1/2" aria-hidden />
        <p className="font-serif-note mt-7 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)]">
          {hero.sub}
        </p>
      </div>

      <div className="stagger mt-12 grid gap-5 md:grid-cols-2">
        {SECTIONS.map((section) => {
          const content = pick(lang, section);
          return (
            <div key={section.icon} className="card p-6">
              <span className="text-2xl" aria-hidden>
                {section.icon}
              </span>
              <h3 className="font-display mt-3 text-lg font-bold text-[var(--text-primary)]">
                {content.title}
              </h3>
              <p className="font-serif-note mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                {content.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
