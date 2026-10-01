// SPDX-License-Identifier: Apache-2.0
import { ScanSearch, ShieldAlert, LineChart, Network } from 'lucide-react'
import { motion } from 'motion/react'
import { useLanguage } from '../context/LanguageContext'

export default function Hero() {
  const { t } = useLanguage()
  const tags = [
    { key: 'heroTag1', icon: <ScanSearch className="w-4 h-4" /> },
    { key: 'heroTag2', icon: <ShieldAlert className="w-4 h-4" /> },
    { key: 'heroTag3', icon: <LineChart className="w-4 h-4" /> },
    { key: 'heroTag4', icon: <Network className="w-4 h-4" /> },
  ]
  return (
    <section className="pt-20 pb-12 px-6 max-w-7xl mx-auto text-center">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-sm font-medium mb-6">
          <ScanSearch className="w-4 h-4" />
          {t('heroBadge')}
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-zinc-100 mb-4 tracking-tight">{t('heroTitle')}</h1>
        <p className="text-xl text-sky-400 font-medium mb-4">{t('heroSubtitle')}</p>
        <p className="text-zinc-400 max-w-3xl mx-auto mb-10 leading-relaxed text-left sm:text-center">{t('heroDesc')}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {tags.map(tag => (
            <span key={tag.key} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-medium">
              <span className="text-sky-500">{tag.icon}</span>
              {t(tag.key)}
            </span>
          ))}
        </div>
        <p className="text-zinc-500 text-sm mt-10 max-w-2xl mx-auto">
          <span className="text-zinc-300 font-semibold">{t('howTitle')}.</span> {t('howDesc')}
        </p>
      </motion.div>
    </section>
  )
}
