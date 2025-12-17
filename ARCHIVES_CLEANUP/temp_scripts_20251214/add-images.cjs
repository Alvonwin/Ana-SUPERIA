LIGNE1: const fs = require('fs')

LIGNE2: "E:/ANA/ana-interface/src/pages/ChatPage.jsx"

LIGNE3: let content = fs.readFileSync("path", 'utf8')

LIGNE4: content = content.replace(/image/webp|image/gif|image/bmp|image/x-icon|image/svg+xml|image/tiff|image/avif/, "image/webp")

LIGNE5: fs.writeFileSync("path", content)

LIGNE6: console.log('DONE')