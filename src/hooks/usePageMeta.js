import { useEffect } from 'react'

const BASE_TITLE = 'Make Your List'

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(name.startsWith('og:') ? 'property' : 'name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(url) {
  let el = document.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', url)
}

export function usePageMeta({ title, description, path = '/' }) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${BASE_TITLE}` : BASE_TITLE
    const baseUrl = window.location.origin
    const url = `${baseUrl}${path}`

    document.title = fullTitle

    setMeta('description', description || '')
    setMeta('og:title', fullTitle)
    setMeta('og:description', description || '')
    setMeta('og:url', url)
    setMeta('og:type', 'website')
    setMeta('og:site_name', BASE_TITLE)
    setMeta('twitter:title', fullTitle)
    setMeta('twitter:description', description || '')
    setCanonical(url)
  }, [title, description, path])
}
