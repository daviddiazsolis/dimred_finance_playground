// SPDX-License-Identifier: Apache-2.0
// Monta el motor (vanilla JS) de las siete pestañas. Al cambiar de idioma se vuelve a inyectar el cuerpo en ese
// idioma y se reinicia el motor conservando pestaña y paso.
import { useEffect, useRef } from 'react'
import { useLanguage } from '../context/LanguageContext'
import bodyEs from '../engine/body.es.html?raw'
import bodyEn from '../engine/body.en.html?raw'
import data from '../engine/data.json'
import { initEngine } from '../engine/engine.js'
import '../engine/engine.css'

type EngineState = { m: string; paso: number }
type Engine = { getState: () => EngineState; destroy: () => void }

declare global {
  interface Window { MathJax?: { typesetPromise?: (nodes?: Element[]) => Promise<void> } }
}

const BODIES = { es: bodyEs, en: bodyEn }

export default function Playground() {
  const { language } = useLanguage()
  const rootRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<Engine | null>(null)
  const firstRef = useRef(true)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const prev = firstRef.current ? undefined : engineRef.current?.getState()
    firstRef.current = false
    engineRef.current?.destroy()
    root.innerHTML = BODIES[language]
    engineRef.current = initEngine(data, prev, language) as Engine
    let tries = 0
    const tick = () => {
      const mj = window.MathJax
      if (mj && mj.typesetPromise) mj.typesetPromise([root]).catch(() => {})
      else if (tries++ < 40) setTimeout(tick, 250)
    }
    tick()
  }, [language])

  return <section id="playground" className="tfp scroll-mt-16"><div ref={rootRef} /></section>
}
