import fs from 'fs'

const cssFile = 'src/index.css'
let content = fs.readFileSync(cssFile, 'utf8')

if (!content.includes('@tailwind')) {
  content = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n` + content
  fs.writeFileSync(cssFile, content)
}
