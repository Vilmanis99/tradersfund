import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const entries = JSON.parse(readFileSync(new URL('../content/data/challenge-watch.json', import.meta.url), 'utf8'))
const verified = entries.filter(entry => entry.status === 'verified').length
const watches = entries.filter(entry => entry.status === 'watch').length

const svg = `<svg width="1800" height="945" viewBox="0 0 1800 945" xmlns="http://www.w3.org/2000/svg">
  <rect width="1800" height="945" fill="#f5faf9"/>
  <rect width="28" height="945" fill="#15948f"/>
  <g font-family="Arial, Helvetica, sans-serif">
    <text x="120" y="170" font-size="36" font-weight="700" letter-spacing="9" fill="#15948f">TRADERS FUND HUB</text>
    <text x="120" y="290" font-size="76" font-weight="700" fill="#142e39">Prop-firm challenge</text>
    <text x="120" y="380" font-size="76" font-weight="700" fill="#142e39">changes, tracked.</text>
    <text x="120" y="455" font-size="30" fill="#58727d">First-party rules, product moves and open watches</text>
    <line x1="120" y1="535" x2="1680" y2="535" stroke="#cfe2e2" stroke-width="3"/>
    <text x="120" y="650" font-size="92" font-weight="700" fill="#15948f">${entries.length}</text>
    <text x="120" y="700" font-size="28" fill="#58727d">DATED UPDATES</text>
    <text x="660" y="650" font-size="92" font-weight="700" fill="#15948f">${verified}</text>
    <text x="650" y="700" font-size="28" fill="#58727d">VERIFIED</text>
    <text x="1120" y="650" font-size="92" font-weight="700" fill="#15948f">${watches}</text>
    <text x="1120" y="700" font-size="28" fill="#58727d">OPEN WATCHES</text>
    <text x="120" y="855" font-size="28" fill="#58727d">tradersfundhub.com/prop-firm-challenge-changes</text>
  </g>
</svg>`

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(fileURLToPath(new URL('../app/prop-firm-challenge-changes/opengraph-image.png', import.meta.url)))
console.log(`Generated challenge-changes card: ${entries.length} entries, ${verified} verified, ${watches} watches.`)
