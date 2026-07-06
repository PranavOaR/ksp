'use client';

import { pick, useLanguage } from '@/lib/i18n';
import { LandingFooter, LandingNav } from '@/components/landing/LandingChrome';

const HERO = {
  en: {
    title1: 'Ten modules,',
    title2: 'one investigation.',
    sub: 'Everything in the PRD, built as one connected workflow — from the first question to the audit record it leaves behind.',
  },
  kn: {
    title1: 'ಹತ್ತು ಮಾಡ್ಯೂಲ್‌ಗಳು,',
    title2: 'ಒಂದೇ ತನಿಖೆ.',
    sub: 'ಮೊದಲ ಪ್ರಶ್ನೆಯಿಂದ ಅದು ಬಿಡುವ ಲೆಕ್ಕಪರಿಶೋಧನಾ ದಾಖಲೆಯವರೆಗೆ — ಎಲ್ಲವೂ ಒಂದೇ ಜೋಡಿತ ಕೆಲಸದ ಹರಿವು.',
  },
};

interface ModuleCopy {
  title: string;
  body: string;
}

const MODULES: Array<{ code: string; icon: string; en: ModuleCopy; kn: ModuleCopy }> = [
  { code: 'A', icon: '⌘', en: { title: 'Conversational Copilot', body: 'Natural-language querying with context retention, voice, Kannada, and PDF/CSV export.' }, kn: { title: 'ಸಂವಾದ ಕೋಪೈಲಟ್', body: 'ಸಂದರ್ಭ ಉಳಿಸಿಕೊಳ್ಳುವ ಸಹಜ ಭಾಷಾ ಪ್ರಶ್ನೆ, ಧ್ವನಿ, ಕನ್ನಡ, PDF/CSV ರಫ್ತು.' } },
  { code: 'B', icon: '⬡', en: { title: 'Criminal Network Intelligence', body: 'Entity graphs across people, FIRs, phones, vehicles; organized rings detected from repeat co-offending.' }, kn: { title: 'ಅಪರಾಧ ಜಾಲ ಗುಪ್ತಚರ', body: 'ವ್ಯಕ್ತಿ, FIR, ಫೋನ್, ವಾಹನಗಳ ಜಾಲ; ಪುನರಾವರ್ತಿತ ಸಹ-ಅಪರಾಧದಿಂದ ಜಾಲ ಪತ್ತೆ.' } },
  { code: 'C', icon: '▤', en: { title: 'Pattern & Trend Analytics', body: 'Hour-of-day, district and crime-type patterns with hotspot intensity ranking.' }, kn: { title: 'ಮಾದರಿ ಮತ್ತು ಪ್ರವೃತ್ತಿ ವಿಶ್ಲೇಷಣೆ', body: 'ಸಮಯ, ಜಿಲ್ಲೆ, ಅಪರಾಧ ಪ್ರಕಾರದ ಮಾದರಿಗಳು; ಹಾಟ್‌ಸ್ಪಾಟ್ ಶ್ರೇಣೀಕರಣ.' } },
  { code: 'E', icon: '▲', en: { title: 'Offender Risk Profiling', body: 'Explainable risk scores from priors, network influence, recency and versatility.' }, kn: { title: 'ಅಪರಾಧಿ ಅಪಾಯ ವಿವರ', body: 'ಹಿಂದಿನ ಪ್ರಕರಣ, ಜಾಲ ಪ್ರಭಾವ, ಇತ್ತೀಚಿನ ಚಟುವಟಿಕೆ ಆಧರಿಸಿ ವಿವರಿಸಬಹುದಾದ ಅಂಕಗಳು.' } },
  { code: 'F', icon: '≡', en: { title: 'Investigator Decision Support', body: 'Auto case summaries, timelines, similar-case retrieval and suggested leads.' }, kn: { title: 'ತನಿಖಾ ನಿರ್ಧಾರ ಬೆಂಬಲ', body: 'ಸ್ವಯಂ ಪ್ರಕರಣ ಸಾರಾಂಶ, ಕಾಲರೇಖೆ, ಸಮಾನ ಪ್ರಕರಣ ಹುಡುಕಾಟ, ಸುಳಿವು ಸಲಹೆ.' } },
  { code: 'G', icon: '₹', en: { title: 'Financial Crime Analysis', body: 'Money trail graphs, high-value transfer tracking and circular-transfer ring detection.' }, kn: { title: 'ಹಣಕಾಸು ಅಪರಾಧ ವಿಶ್ಲೇಷಣೆ', body: 'ಹಣದ ಜಾಡು, ದೊಡ್ಡ ವರ್ಗಾವಣೆ ಪತ್ತೆ, ವೃತ್ತಾಕಾರ ವರ್ಗಾವಣೆ ಜಾಲ ಪತ್ತೆ.' } },
  { code: 'H', icon: '◔', en: { title: 'Forecasting & Early Warning', body: 'Three-month trend projection and emerging-hotspot alerts before spikes land.' }, kn: { title: 'ಮುನ್ಸೂಚನೆ ಮತ್ತು ಮುನ್ನೆಚ್ಚರಿಕೆ', body: 'ಮೂರು ತಿಂಗಳ ಪ್ರವೃತ್ತಿ ಪ್ರಕ್ಷೇಪಣೆ; ಏರಿಕೆಗೆ ಮೊದಲೇ ಎಚ್ಚರಿಕೆ.' } },
  { code: 'I', icon: '☰', en: { title: 'Explainable AI', body: 'Evidence references, reasoning trails and confidence scores on every answer.' }, kn: { title: 'ವಿವರಿಸಬಹುದಾದ AI', body: 'ಪ್ರತಿ ಉತ್ತರಕ್ಕೂ ಸಾಕ್ಷ್ಯ ಉಲ್ಲೇಖ, ತರ್ಕದ ಜಾಡು, ವಿಶ್ವಾಸಾಂಕ.' } },
  { code: 'J', icon: '✓', en: { title: 'Security & Governance', body: 'Role-based sign-in, module-level access control and a complete audit trail.' }, kn: { title: 'ಭದ್ರತೆ ಮತ್ತು ಆಡಳಿತ', body: 'ಪಾತ್ರ ಆಧಾರಿತ ಸೈನ್ ಇನ್, ಮಾಡ್ಯೂಲ್ ಮಟ್ಟದ ಪ್ರವೇಶ ನಿಯಂತ್ರಣ, ಪೂರ್ಣ ದಾಖಲೆ.' } },
];

export default function ModulesPage() {
  const { lang } = useLanguage();
  const hero = pick(lang, HERO);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <LandingNav />

      <section className="mx-auto w-[min(1180px,92%)] pb-14 pt-14">
        <div className="rise-in max-w-3xl">
          <h1 className="font-display text-[clamp(2.6rem,5.5vw,4.2rem)] font-black leading-[1.02] tracking-tight text-[var(--text-primary)]">
            {hero.title1}
            <br />
            <span className="text-[var(--accent)]">{hero.title2}</span>
          </h1>
          <div className="dot-rule mt-4 w-1/2" aria-hidden />
          <p className="font-serif-note mt-7 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)]">
            {hero.sub}
          </p>
        </div>

        <div className="stagger mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((moduleItem) => {
            const content = pick(lang, moduleItem);
            return (
              <div key={moduleItem.code} className="card p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-lg text-[var(--accent)]">
                    {moduleItem.icon}
                  </span>
                  <span className="font-display text-xs font-black tracking-[0.2em] text-[var(--text-muted)]">
                    MODULE {moduleItem.code}
                  </span>
                </div>
                <h2 className="font-display mt-4 text-base font-bold text-[var(--text-primary)]">
                  {content.title}
                </h2>
                <p className="font-serif-note mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {content.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <LandingFooter showCta />
    </div>
  );
}
