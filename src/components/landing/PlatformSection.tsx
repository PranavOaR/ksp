'use client';

import { pick, useLanguage } from '@/lib/i18n';

const HERO = {
  en: {
    title1: 'One system,',
    title2: 'from question to evidence.',
    sub: 'DRISHTI connects conversational AI, graph analysis and forecasting on top of the crime records Karnataka already has — nothing answers without a source.',
  },
  kn: {
    title1: 'ಒಂದೇ ವ್ಯವಸ್ಥೆ,',
    title2: 'ಪ್ರಶ್ನೆಯಿಂದ ಸಾಕ್ಷ್ಯದವರೆಗೆ.',
    sub: 'ಸಂವಾದ AI, ಜಾಲ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಮುನ್ಸೂಚನೆಯನ್ನು ಕರ್ನಾಟಕದ ಅಪರಾಧ ದಾಖಲೆಗಳ ಮೇಲೆ DRISHTI ಜೋಡಿಸುತ್ತದೆ — ಮೂಲವಿಲ್ಲದೆ ಯಾವ ಉತ್ತರವೂ ಇಲ್ಲ.',
  },
};

const PILLARS = [
  {
    icon: '⌘',
    en: {
      title: 'Ask in plain language',
      body: 'Officers ask in English or Kannada — typed or spoken. Claude translates the question into a validated database query; a rule engine takes over if the network is down.',
    },
    kn: {
      title: 'ಸಹಜ ಭಾಷೆಯಲ್ಲಿ ಕೇಳಿ',
      body: 'ಇಂಗ್ಲಿಷ್ ಅಥವಾ ಕನ್ನಡದಲ್ಲಿ — ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಮಾತನಾಡಿ. Claude ಪ್ರಶ್ನೆಯನ್ನು ಪರಿಶೀಲಿತ ದತ್ತಸಂಚಯ ಪ್ರಶ್ನೆಯಾಗಿ ಭಾಷಾಂತರಿಸುತ್ತದೆ.',
    },
  },
  {
    icon: '⬡',
    en: {
      title: 'Connections, not just records',
      body: 'People, FIRs, phones, vehicles and bank accounts become one graph. Repeat co-offenders surface as rings; money that circles back gets flagged.',
    },
    kn: {
      title: 'ದಾಖಲೆಗಳಲ್ಲ, ಸಂಪರ್ಕಗಳು',
      body: 'ವ್ಯಕ್ತಿಗಳು, FIRಗಳು, ಫೋನ್‌ಗಳು, ವಾಹನಗಳು ಮತ್ತು ಬ್ಯಾಂಕ್ ಖಾತೆಗಳು ಒಂದೇ ಜಾಲವಾಗುತ್ತವೆ. ಪುನರಾವರ್ತಿತ ಸಹ-ಅಪರಾಧಿಗಳು ಜಾಲಗಳಾಗಿ ಕಾಣುತ್ತಾರೆ.',
    },
  },
  {
    icon: '▲',
    en: {
      title: 'See what comes next',
      body: 'Trend forecasts, emerging hotspot alerts and explainable offender risk scores turn history into early warning.',
    },
    kn: {
      title: 'ಮುಂದೇನು ಎಂದು ನೋಡಿ',
      body: 'ಪ್ರವೃತ್ತಿ ಮುನ್ಸೂಚನೆಗಳು, ಹೊಸ ಹಾಟ್‌ಸ್ಪಾಟ್ ಎಚ್ಚರಿಕೆಗಳು ಮತ್ತು ವಿವರಿಸಬಹುದಾದ ಅಪಾಯ ಅಂಕಗಳು ಇತಿಹಾಸವನ್ನು ಮುನ್ನೆಚ್ಚರಿಕೆಯಾಗಿಸುತ್ತವೆ.',
    },
  },
  {
    icon: '✓',
    en: {
      title: 'Explainable by default',
      body: 'Every answer carries FIR evidence references, a reasoning trail and a confidence score. If it cannot be traced, it is not shown.',
    },
    kn: {
      title: 'ಸಹಜವಾಗಿ ವಿವರಿಸಬಹುದಾದದ್ದು',
      body: 'ಪ್ರತಿ ಉತ್ತರದ ಜೊತೆ FIR ಸಾಕ್ಷ್ಯ ಉಲ್ಲೇಖಗಳು, ತರ್ಕದ ಜಾಡು ಮತ್ತು ವಿಶ್ವಾಸಾಂಕ ಇರುತ್ತದೆ. ಮೂಲವಿಲ್ಲದ್ದನ್ನು ತೋರಿಸುವುದಿಲ್ಲ.',
    },
  },
];

const STEPS = [
  { number: '01', en: { title: 'Ask', body: 'A question in English or ಕನ್ನಡ.' }, kn: { title: 'ಕೇಳಿ', body: 'ಇಂಗ್ಲಿಷ್ ಅಥವಾ ಕನ್ನಡದಲ್ಲಿ ಪ್ರಶ್ನೆ.' } },
  { number: '02', en: { title: 'Ground', body: 'The query runs only against real records.' }, kn: { title: 'ಆಧಾರ', body: 'ಪ್ರಶ್ನೆ ನೈಜ ದಾಖಲೆಗಳ ಮೇಲೆ ಮಾತ್ರ ನಡೆಯುತ್ತದೆ.' } },
  { number: '03', en: { title: 'Explain', body: 'Answer + evidence + reasoning + confidence.' }, kn: { title: 'ವಿವರಿಸಿ', body: 'ಉತ್ತರ + ಸಾಕ್ಷ್ಯ + ತರ್ಕ + ವಿಶ್ವಾಸಾಂಕ.' } },
];

/** "Platform" landing section — one system from question to evidence. */
export function PlatformSection() {
  const { lang } = useLanguage();
  const hero = pick(lang, HERO);

  return (
    <section id="platform" className="mx-auto w-[min(1080px,90%)] scroll-mt-28 pb-14 pt-14">
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
        {PILLARS.map((pillar) => {
          const content = pick(lang, pillar);
          return (
            <div key={pillar.icon} className="card p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-lg text-[var(--accent)]">
                {pillar.icon}
              </span>
              <h3 className="font-display mt-4 text-lg font-bold text-[var(--text-primary)]">
                {content.title}
              </h3>
              <p className="font-serif-note mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                {content.body}
              </p>
            </div>
          );
        })}
      </div>

      <div className="stagger mt-14 grid gap-5 md:grid-cols-3">
        {STEPS.map((step) => {
          const content = pick(lang, step);
          return (
            <div key={step.number} className="border-t-2 border-dotted border-[var(--accent)]/50 pt-4">
              <span className="font-display text-sm font-black text-[var(--accent)]">
                {step.number}
              </span>
              <h3 className="font-display mt-1 text-xl font-extrabold text-[var(--text-primary)]">
                {content.title}
              </h3>
              <p className="font-serif-note mt-1 text-sm text-[var(--text-secondary)]">
                {content.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
