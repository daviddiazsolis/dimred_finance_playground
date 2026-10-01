// SPDX-License-Identifier: Apache-2.0
import { motion } from 'motion/react'
import { SlidersHorizontal, ExternalLink, Boxes } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export default function Sandbox() {
  const { t } = useLanguage()
  return (
    <section className="py-16 px-6 max-w-7xl mx-auto border-t border-zinc-800/50">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}
        className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
        <div className="w-12 h-12 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
          <SlidersHorizontal className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">{t('sandboxTitle')}</h2>
          <p className="text-zinc-400 leading-relaxed">{t('sandboxDesc')}</p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <a href="https://pca-playground.vercel.app" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-500 text-zinc-950 text-sm font-semibold hover:opacity-85 transition-opacity">
            {t('sandboxCTA1')} <ExternalLink className="w-4 h-4" />
          </a>
          <a href="https://autoencoder-embedding-playground.vercel.app" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-sky-500/40 text-sky-400 text-sm font-semibold hover:bg-sky-500/10 transition-colors">
            {t('sandboxCTA2')} <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 }}
        className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
        <div className="w-12 h-12 rounded-xl bg-zinc-800 text-sky-400 flex items-center justify-center shrink-0">
          <Boxes className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">{t('sisterTitle')}</h2>
          <p className="text-zinc-400 leading-relaxed">{t('sisterDesc')}</p>
        </div>
        <a href="https://classification-intro-playground.vercel.app" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-sky-500/40 text-sky-400 text-sm font-semibold hover:bg-sky-500/10 transition-colors shrink-0">
          {t('sisterCTA')} <ExternalLink className="w-4 h-4" />
        </a>
      </motion.div>
    </section>
  )
}
