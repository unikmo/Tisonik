import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerOfflineShell } from './offline'

registerOfflineShell()

const path = window.location.pathname
const operatorStatement = 'Tisonik is operated by TSquare Ventures LLC, a Wyoming (USA) limited liability company.'
const useLegacyProductShell = path.startsWith('/product-app/')
const useLegacyLegalShell = ['/imprint/', '/privacy/', '/terms/', '/cookies/'].some((route) => path.startsWith(route))
const usePortal = path.startsWith('/portal/')
const useSandbox = path.startsWith('/sandbox/')
const resortRoutes = [
  '/all-inclusive-resorts/',
  '/resort-live-demo/',
  '/resort-pilot/',
  '/resort-guest-engagement-software/',
  '/hotel-service-recovery-software/',
  '/resort-upselling-software/',
  '/hotel-ancillary-revenue-software/',
  '/resort-experience-discovery/',
  '/hotel-guest-rating-software/',
]
const useResort = resortRoutes.some(route => path.startsWith(route))

const loadRoute = async () => {
  if (useSandbox) return Promise.all([import('./Sandbox'), import('./sandbox.css')]).then(([module]) => module.default)
  if (usePortal) return import('./Portal').then(module => module.default)
  if (useLegacyProductShell) return Promise.all([import('./ExecutiveWalkthrough'), import('./executive-walkthrough.css')]).then(([module]) => module.default)
  if (useLegacyLegalShell) return Promise.all([import('./App'), import('./styles.css')]).then(([module]) => module.default)
  if (useResort) return Promise.all([import('./ResortSite'), import('./marketing.css'), import('./resort.css'), import('./resort-accessibility.css')]).then(([module]) => module.default)
  return Promise.all([import('./MarketingSite'), import('./marketing.css')]).then(([module]) => module.default)
}

const Route = await loadRoute()
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Route /></React.StrictMode>)

const ensureLink = (parent: HTMLElement | null, href: string, label: string, prepend = false) => {
  if (!parent || parent.querySelector(`a[href="${href}"]`)) return
  const link = document.createElement('a')
  link.href = href
  link.textContent = label
  if (prepend) parent.prepend(link)
  else parent.append(link)
}

const syncPublicIdentityAndNavigation = () => {
  const operatorLine = document.querySelector<HTMLElement>('.site-footer > div span')
  if (operatorLine) operatorLine.textContent = operatorStatement

  ensureLink(document.querySelector<HTMLElement>('.footer-links'), '/all-inclusive-resorts/', 'Hotels & Resorts', true)

  if (path === '/') {
    ensureLink(document.querySelector<HTMLElement>('.desktop-nav'), '/all-inclusive-resorts/', 'Hotels & Resorts')
    ensureLink(document.querySelector<HTMLElement>('.entity-links'), '/all-inclusive-resorts/', 'Hotels & resorts')
  }

  if (useResort) {
    const brand = document.querySelector<HTMLAnchorElement>('.resort-header .brand')
    if (brand) {
      brand.href = '/'
      brand.setAttribute('aria-label', 'Tisonik home')
    }
  }

  if (path.startsWith('/imprint/')) {
    const operatorParagraph = document.querySelector<HTMLElement>('#operator p')
    if (operatorParagraph) operatorParagraph.innerHTML = '<strong>Tisonik</strong> is operated by <strong>TSquare Ventures LLC</strong>, a Wyoming (USA) limited liability company.'

    const metaDescription = `Legal operator and contact information for Tisonik. ${operatorStatement}`
    document.querySelector('meta[name="description"]')?.setAttribute('content', metaDescription)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', metaDescription)
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', metaDescription)
  }
}

if (!useLegacyProductShell && !usePortal && !useSandbox) {
  requestAnimationFrame(() => requestAnimationFrame(syncPublicIdentityAndNavigation))
}
