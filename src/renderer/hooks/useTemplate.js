import { useState, useEffect, useCallback } from 'react'
import { readTemplateDataUrl } from '../constants/defaults'

export function useTemplate(model, setModel) {
  const [templateDataUrl, setTemplateDataUrl] = useState(null)
  const [templateLoadError, setTemplateLoadError] = useState(null)
  const [templateMeta, setTemplateMeta] = useState(null)
  const [templateDecodeError, setTemplateDecodeError] = useState(null)

  // Load template dataURL when template path changes
  useEffect(() => {
    let cancelled = false
      ; (async () => {
        if (!model.template?.path) {
          if (!cancelled) {
            setTemplateDataUrl(null)
            setTemplateLoadError(null)
            setTemplateMeta(null)
            setTemplateDecodeError(null)
          }
          return
        }

        const res = await readTemplateDataUrl(model.template?.path)
        if (cancelled) return
        setTemplateDataUrl(res?.url || null)
        setTemplateLoadError(res?.error || null)
        setTemplateMeta(res?.url ? { mime: res?.mime, byteLength: res?.byteLength, width: res?.width, height: res?.height } : null)
        setTemplateDecodeError(null)
      })()
    return () => { cancelled = true }
  }, [model.template?.path])

  const handleSelectTemplate = useCallback(async () => {
    const res = await window.cs2.selectTemplate()
    if (!res?.success) return
    setModel((m) => ({ ...m, template: { ...m.template, path: res.path } }))
  }, [setModel])

  const onTemplateImageError = useCallback(() => {
    setTemplateDecodeError('Template image failed to load.')
  }, [])

  return {
    templateDataUrl,
    templateLoadError,
    templateMeta,
    templateDecodeError,
    handleSelectTemplate,
    onTemplateImageError
  }
}
