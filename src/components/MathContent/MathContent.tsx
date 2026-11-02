import React, { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { marked } from 'marked'

interface MathContentProps {
  content: string
  className?: string
}

export default function MathContent({ content, className = '' }: MathContentProps) {
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

    // 4. Post-process GitHub Alerts / Callouts
    htmlContent = htmlContent.replace(
      /<blockquote>\s*<p>\[!(\w+)\](?:<br\s*\/?>)?([\s\S]*?)<\/p>\s*<\/blockquote>/gi,
      (_, type, body) => {
        let color = '#3b82f6'
        let title = 'ℹ️ Примітка'
        if (type.toUpperCase() === 'WARNING') {
          color = '#ef4444'
          title = '⚠️ Увага'
        } else if (type.toUpperCase() === 'IMPORTANT') {
          color = '#ec4899'
          title = '📝 Важливо'
        } else if (type.toUpperCase() === 'TIP') {
          color = '#10b981'
          title = '💡 Корисна порада'
        } else if (type.toUpperCase() === 'CAUTION') {
          color = '#f59e0b'
          title = '⚡ Застереження'
        }

        return `<div class="alert-box alert-${type.toLowerCase()}" style="margin: 22px 0; padding: 18px 22px; border-left: 4px solid ${color}; background: #262930; border-radius: 8px; font-size: 15px; line-height: 1.65; box-shadow: 0 4px 12px rgba(0,0,0,0.18);">
        <strong style="display: block; margin-bottom: 8px; color: ${color}; font-weight: 600; font-size: 15px;">${title}</strong>
        <div style="color: #e2e4e9;">${body.trim()}</div>
      </div>`
      }
    )

    // 5. Restore block math (use function replacer to prevent '$' token substitution bugs in JS)
    mathBlocks.forEach((math, index) => {
      try {
        const renderedKatex = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })
        const displayWrapper = `<div class="katex-display-wrapper" style="overflow-x: auto; margin: 20px 0; padding: 12px 16px; background: rgba(255, 255, 255, 0.02); border-radius: 8px; text-align: center;">${renderedKatex}</div>`
        const wrappedP = `<p>MATHBLOCKXYZ${index}XYZ</p>`
        if (htmlContent.includes(wrappedP)) {
          htmlContent = htmlContent.replace(wrappedP, () => displayWrapper)
        } else {
          htmlContent = htmlContent.replace(`MATHBLOCKXYZ${index}XYZ`, () => displayWrapper)
        }
      } catch (e) {
        htmlContent = htmlContent.replace(`MATHBLOCKXYZ${index}XYZ`, () => `<pre>${math}</pre>`)
      }
    })

    // 6. Restore inline math (use function replacer to prevent '$' token substitution bugs in JS)
    mathInlines.forEach((math, index) => {
      try {
        const rendered = katex.renderToString(math.trim(), { displayMode: false, throwOnError: false })
        htmlContent = htmlContent.replace(`MATHINLINEXYZ${index}XYZ`, () => rendered)
      } catch (e) {
        htmlContent = htmlContent.replace(`MATHINLINEXYZ${index}XYZ`, () => `<code>${math}</code>`)
      }
    })

    return htmlContent
  }, [content])

  if (!content) return null

  return (
    <div
      className={`math-notes-content ${className}`}
      style={{
        fontSize: 'inherit',
        lineHeight: 'inherit',
        color: 'inherit',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
