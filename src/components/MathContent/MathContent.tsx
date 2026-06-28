import React, { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { marked } from 'marked'

interface MathContentProps {
  content: string
}

export default function MathContent({ content }: MathContentProps) {
  const html = useMemo(() => {
    if (!content) return ''

    const mathBlocks: string[] = []
    const mathInlines: string[] = []

    // 1. Replace block math $$ ... $$
    let processed = content.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      const placeholder = `MATHBLOCKXYZ${mathBlocks.length}XYZ`
      mathBlocks.push(math)
      return placeholder
    })

    // 2. Replace inline math $ ... $
    processed = processed.replace(/\$([\s\S]*?)\$/g, (_, math) => {
      const placeholder = `MATHINLINEXYZ${mathInlines.length}XYZ`
      mathInlines.push(math)
      return placeholder
    })

    // 3. Render Markdown to HTML using marked
    let htmlContent = marked.parse(processed) as string

    // 4. Post-process GitHub Alerts
    htmlContent = htmlContent.replace(
      /<blockquote>\s*<p>\[!(\w+)\](?:<br\s*\/?>)?([\s\S]*?)<\/p>\s*<\/blockquote>/gi,
      (_, type, body) => {
        let color = '#3b82f6'
        let title = 'ℹ️ Примітка'
        if (type === 'WARNING') {
          color = '#ef4444'
          title = '⚠️ Увага'
        } else if (type === 'IMPORTANT') {
          color = 'var(--pink)'
          title = '📝 Важливо'
        } else if (type === 'TIP') {
          color = '#10b981'
          title = '💡 Корисна порада'
        }

        return `<div class="alert-box alert-${type.toLowerCase()}" style="margin: 18px 0; padding: 16px; border-left: 4px solid ${color}; background: rgba(255, 255, 255, 0.015); border-radius: 8px; font-size: 13.5px; line-height: 1.55;">
        <strong style="display: block; margin-bottom: 6px; color: ${color}; font-weight: 600;">${title}</strong>
        <div style="color: #cccccc;">${body.trim()}</div>
      </div>`
      }
    )

    // 5. Restore block math
    mathBlocks.forEach((math, index) => {
      try {
        const rendered = katex.renderToString(math, { displayMode: true, throwOnError: false })
        const wrapped = `<p>MATHBLOCKXYZ${index}XYZ</p>`
        if (htmlContent.includes(wrapped)) {
          htmlContent = htmlContent.replace(wrapped, rendered)
        } else {
          htmlContent = htmlContent.replace(`MATHBLOCKXYZ${index}XYZ`, rendered)
        }
      } catch (e) {
        htmlContent = htmlContent.replace(`MATHBLOCKXYZ${index}XYZ`, `<pre>${math}</pre>`)
      }
    })

    // 6. Restore inline math
    mathInlines.forEach((math, index) => {
      try {
        const rendered = katex.renderToString(math, { displayMode: false, throwOnError: false })
        htmlContent = htmlContent.replace(`MATHINLINEXYZ${index}XYZ`, rendered)
      } catch (e) {
        htmlContent = htmlContent.replace(`MATHINLINEXYZ${index}XYZ`, `<code>${math}</code>`)
      }
    })

    return htmlContent
  }, [content])

  if (!content) return null

  return (
    <div
      className="math-notes-content"
      style={{
        color: '#cccccc',
        fontSize: '13.5px',
        lineHeight: '1.6',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
