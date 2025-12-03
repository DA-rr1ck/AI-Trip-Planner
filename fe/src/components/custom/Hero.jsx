import React from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Map, Smartphone, Clock, RefreshCcw, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Button from '../ui/Button'

const coreFeatures = [
  {
    icon: Sparkles,
    titleKey: 'hero.features.aiPlanner.title',
    descKey: 'hero.features.aiPlanner.desc',
  },
  {
    icon: Map,
    titleKey: 'hero.features.manualPlanner.title',
    descKey: 'hero.features.manualPlanner.desc',
  },
  {
    icon: Wand2,
    titleKey: 'hero.features.hybridPlanner.title',
    descKey: 'hero.features.hybridPlanner.desc',
  },
  {
    icon: Smartphone,
    titleKey: 'hero.features.realTimeTracking.title',
    descKey: 'hero.features.realTimeTracking.desc',
  },
  {
    icon: Clock,
    titleKey: 'hero.features.timeManagement.title',
    descKey: 'hero.features.timeManagement.desc',
  },
  {
    icon: RefreshCcw,
    titleKey: 'hero.features.sync.title',
    descKey: 'hero.features.sync.desc',
  },
]

const steps = [
  {
    stepKey: 'hero.howItWorks.step1.stepLabel',
    titleKey: 'hero.howItWorks.step1.title',
    descKey: 'hero.howItWorks.step1.desc',
  },
  {
    stepKey: 'hero.howItWorks.step2.stepLabel',
    titleKey: 'hero.howItWorks.step2.title',
    descKey: 'hero.howItWorks.step2.desc',
  },
  {
    stepKey: 'hero.howItWorks.step3.stepLabel',
    titleKey: 'hero.howItWorks.step3.title',
    descKey: 'hero.howItWorks.step3.desc',
  },
]

function Hero() {
  const { t } = useTranslation()

  return (
    <main className="pb-16 md:pb-0">
      {/* HERO SECTION */}
      <section className="border-b bg-gradient-to-b from-sky-50 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 md:flex-row md:items-center md:gap-12 lg:px-8 lg:py-16">
          {/* Left content */}
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-medium text-sky-700 shadow-sm backdrop-blur dark:border-sky-500/30 dark:bg-slate-900/70 dark:text-sky-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t('hero.badge')}</span>
            </div>

            <h1 className="text-balance text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-extrabold tracking-tight leading-snug sm:leading-snug lg:leading-[1.2] text-slate-900 dark:text-slate-50">
              <span className="block">
                {t('hero.title.line1')}
              </span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-indigo-500 to-pink-500">
                {t('hero.title.line2')}
              </span>
            </h1>

            <p className="max-w-xl text-base text-slate-600 sm:text-lg dark:text-slate-300">
              {t('hero.description')}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/create-trip">
                <Button className="btn-gradient-spin w-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-2 text-base font-semibold text-white shadow-md hover:opacity-95 sm:w-auto transition-all duration-150 active:scale-95 md:cursor-pointer">
                  {t('hero.primaryButton')}
                </Button>
              </Link>

              <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <div className="flex -space-x-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white bg-sky-100 text-[11px] font-semibold text-sky-700 shadow-sm dark:border-slate-900 dark:bg-sky-900/60 dark:text-sky-200">
                    {t('hero.pill.ai')}
                  </span>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white bg-violet-100 text-[11px] font-semibold text-violet-700 shadow-sm dark:border-slate-900 dark:bg-violet-900/60 dark:text-violet-200">
                    {t('hero.pill.web')}
                  </span>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white bg-emerald-100 text-[11px] font-semibold text-emerald-700 shadow-sm dark:border-slate-900 dark:bg-emerald-900/60 dark:text-emerald-200">
                    {t('hero.pill.app')}
                  </span>
                </div>
                <span>{t('hero.pillCaption')}</span>
              </div>
            </div>

            <div className="grid gap-3 text-xs text-slate-500 sm:grid-cols-3 sm:text-sm dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>{t('hero.bullets.0')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span>{t('hero.bullets.1')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                <span>{t('hero.bullets.2')}</span>
              </div>
            </div>
          </div>

          {/* Right visual */}
          <div className="flex-1">
            <div className="relative mx-auto max-w-xl transition-all duration-500 hover:scale-[1.02]">
              <div className="absolute -inset-4 -top-6 rounded-3xl bg-gradient-to-tr from-sky-400/30 via-indigo-500/20 to-pink-500/20 blur-2xl dark:from-sky-500/25 dark:via-indigo-500/25 dark:to-pink-500/25" />
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-2xl shadow-sky-100/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                <img
                  src="/landing3.jpg"
                  alt="AI Travel Planner – Web & Mobile"
                  className="h-64 w-full object-cover sm:h-80 md:h-96"
                />

                {/* overlay card at bottom */}
                <div className="space-y-3 border-t border-slate-100 bg-gradient-to-r from-slate-50/90 via-white/90 to-sky-50/90 px-4 py-4 text-xs sm:px-6 sm:py-5 dark:border-slate-800 dark:from-slate-900/95 dark:via-slate-900/95 dark:to-slate-900/95">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-sky-600 dark:text-sky-300">
                        {t('hero.overlay.eyebrow')}
                      </p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                        {t('hero.overlay.title')}
                      </p>
                    </div>
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                      {t('hero.overlay.badge')}
                    </div>
                  </div>

                  <div className="grid gap-2 text-[11px] sm:grid-cols-3 sm:text-xs">
                    <div className="rounded-xl border border-slate-100 bg-white/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/80">
                      <p className="font-semibold text-slate-800 dark:text-slate-50">
                        {t('hero.overlay.cards.ai.title')}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('hero.overlay.cards.ai.desc')}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/80">
                      <p className="font-semibold text-slate-800 dark:text-slate-50">
                        {t('hero.overlay.cards.manual.title')}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('hero.overlay.cards.manual.desc')}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/80">
                      <p className="font-semibold text-slate-800 dark:text-slate-50">
                        {t('hero.overlay.cards.sync.title')}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('hero.overlay.cards.sync.desc')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* small floating badge */}
              <div className="absolute -bottom-4 right-3 hidden rounded-2xl bg-slate-900/95 px-4 py-2 text-[11px] text-slate-100 shadow-lg sm:flex sm:flex-col dark:bg-black/90">
                <span className="font-semibold">{t('hero.overlay.floating.title')}</span>
                <span className="text-[10px] text-slate-300">
                  {t('hero.overlay.floating.desc')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE FEATURES */}
      <section className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
                {t('hero.featuresSection.title')}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-300">
                {t('hero.featuresSection.subtitle')}
              </p>
            </div>
            <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              {t('hero.featuresSection.note')}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
            {coreFeatures.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.titleKey}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/80 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 group-hover:bg-sky-100 dark:bg-sky-900/40 dark:text-sky-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {t(item.titleKey)}
                    </h3>
                  </div>
                  <p className="mt-3 text-xs text-slate-600 sm:text-sm dark:text-slate-300">
                    {t(item.descKey)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b bg-muted/40 dark:bg-slate-950/70">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
                {t('hero.howItWorks.title')}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-slate-600 sm:text-base dark:text-slate-300">
                {t('hero.howItWorks.subtitle')}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5 sm:mt-8">
            {steps.map((step, index) => (
              <div key={step.titleKey} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white shadow-md">
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="mt-1 h-full w-px flex-1 bg-gradient-to-b from-sky-500/60 via-slate-300/60 to-transparent dark:from-sky-500/70 dark:via-slate-700/80" />
                  )}
                </div>
                <div className="flex-1 rounded-2xl border border-slate-200 bg-white/90 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/80 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
                    {t(step.stepKey)}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900 sm:text-base dark:text-slate-50">
                    {t(step.titleKey)}
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 sm:text-sm dark:text-slate-300">
                    {t(step.descKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WEB & MOBILE SECTION */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
                {t('hero.webMobile.title')}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-300">
                {t('hero.webMobile.subtitle')}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr,1fr]">
            {/* Web app card */}
            <div className="flex flex-col rounded-3xl border border-slate-200 bg-white/90 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/80 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
                    {t('hero.webMobile.web.eyebrow')}
                  </p>
                  <h3 className="text-sm font-semibold text-slate-900 sm:text-base dark:text-slate-50">
                    {t('hero.webMobile.web.title')}
                  </h3>
                </div>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-slate-100 dark:bg-black">
                  {t('hero.webMobile.web.badge')}
                </span>
              </div>

              {/* <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-3 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                {t('hero.webMobile.web.placeholder')}
              </div> */}

              <ul className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 sm:text-sm dark:text-slate-300">
                <li>• {t('hero.webMobile.web.bullets.0')}</li>
                <li>• {t('hero.webMobile.web.bullets.1')}</li>
                <li>• {t('hero.webMobile.web.bullets.2')}</li>
                <li>• {t('hero.webMobile.web.bullets.3')}</li>
              </ul>
            </div>

            {/* Mobile app card */}
            <div className="flex flex-col rounded-3xl border border-slate-200 bg-slate-50/90 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/80 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                    {t('hero.webMobile.mobile.eyebrow')}
                  </p>
                  <h3 className="text-sm font-semibold text-slate-900 sm:text-base dark:text-slate-50">
                    {t('hero.webMobile.mobile.title')}
                  </h3>
                </div>
                <span className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-emerald-50">
                  {t('hero.webMobile.mobile.badge')}
                </span>
              </div>

              {/* <div className="mt-4 flex items-center justify-center">
                <div className="relative h-52 w-28 rounded-[2rem] border border-slate-300 bg-slate-900/95 p-1 shadow-lg dark:border-slate-600">
                  <div className="mx-auto mt-1 h-1.5 w-10 rounded-full bg-slate-700" />
                  <div className="mt-2 h-40 rounded-2xl bg-gradient-to-b from-sky-500 via-indigo-500 to-slate-900 p-2 text-[10px] text-slate-100">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-sky-100">
                      {t('hero.webMobile.mobile.phone.todayLabel')}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold">
                      {t('hero.webMobile.mobile.phone.place')}
                    </p>
                    <p className="mt-1 text-[9px] text-slate-200">
                      {t('hero.webMobile.mobile.phone.checkin')}
                    </p>
                    <p className="mt-1 text-[9px] text-emerald-100">
                      {t('hero.webMobile.mobile.phone.status')}
                    </p>
                    <div className="mt-2 h-px bg-slate-200/40" />
                    <p className="mt-1 text-[9px]">
                      {t('hero.webMobile.mobile.phone.desc')}
                    </p>
                  </div>
                  <div className="absolute inset-x-7 bottom-1 h-5 rounded-full bg-slate-800" />
                </div>
              </div> */}

              <ul className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 sm:text-sm dark:text-slate-300">
                <li>• {t('hero.webMobile.mobile.bullets.0')}</li>
                <li>• {t('hero.webMobile.mobile.bullets.1')}</li>
                <li>• {t('hero.webMobile.mobile.bullets.2')}</li>
                <li>• {t('hero.webMobile.mobile.bullets.3')}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600">
        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-100/80">
                {t('hero.finalCta.eyebrow')}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white sm:text-2xl">
                {t('hero.finalCta.title')}
              </h2>
              <p className="mt-2 max-w-2xl text-xs text-sky-100/90 sm:text-sm">
                {t('hero.finalCta.subtitle')}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link to="/create-trip">
                <Button className="w-full rounded-full bg-white px-5 py-2 text-sm font-semibold text-sky-700 shadow-md hover:text-white hover:sky-600 sm:w-auto transition-all duration-150 active:scale-95 md:cursor-pointer">
                  {t('hero.finalCta.button')}
                </Button>
              </Link>
              <p className="text-[11px] text-sky-100/90 sm:text-xs">
                {t('hero.finalCta.note')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Hero
