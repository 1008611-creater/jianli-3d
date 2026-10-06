import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const covers = [
  ['video', '视频生成平台', 'AIGC / VIDEO', '#d8ff3e', 'frame'],
  ['motion-portfolio', 'AIGC 动效作品集', 'AIGC / MOTION', '#ff9d5c', 'film'],
  ['ai', 'AI 创作中枢', 'AI / WORKFLOW', '#9f8cff', 'nodes'],
  ['edit', '智能剪辑', 'AI / EDITING', '#ff668c', 'timeline'],
  ['dh', '动态合成', 'AI / PIPELINE', '#55d9ff', 'orbit'],
  ['hb', '合成引擎', 'AI / DELIVERY', '#ffd34d', 'engine'],
  ['api', 'API 服务', 'FULLSTACK / API', '#55d9ff', 'api'],
  ['image2', '图像生成', 'FULLSTACK / IMAGE', '#d29aff', 'image'],
  ['app', '主站应用', 'PRODUCT / APP', '#65e6a7', 'dashboard'],
  ['tutor', 'AI 助教', 'AI / RAG', '#ffad45', 'search'],
  ['zhihu', '知乎智能体', 'AGENT / MULTI-ROLE', '#64a5ff', 'network'],
  ['ans', 'ANS·New Chapter', 'AGENT / PRODUCT', '#ff83aa', 'chapter'],
  ['hermes', 'Hermes 编排层', 'AGENT / ORCHESTRATION', '#b5f34b', 'orchestra'],
  ['acp', 'ACP 协作协议', 'AGENT / PROTOCOL', '#66e3ed', 'protocol'],
  ['chatcut', 'ChatCut', 'AGENT / CREATIVE', '#ffb36b', 'script'],
]

const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const outDir = join(process.cwd(), 'public', 'assets', 'covers')
await mkdir(outDir, { recursive: true })

const art = (kind, c) => {
  const stroke = `${c}cc`
  const common = `<g fill="none" stroke="${stroke}" stroke-width="2" opacity=".95">`
  const end = '</g>'
  const dot = (x, y, r = 6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="none"/>`
  const map = {
    frame: `${common}<rect x="420" y="54" width="194" height="260"/><rect x="443" y="77" width="148" height="100"/><path d="M443 218h148M443 244h95M443 270h122M405 93h-35M405 151h-52M405 210h-35" stroke-dasharray="4 8"/>${end}${dot(455,93,4)}${dot(579,93,4)}`,
    film: `${common}<path d="M380 90h260v190H380zM396 108h86v154h-86zM500 108h122v48H500zM500 180h122v82H500z"/><path d="M398 82v-18M426 82v-18M454 82v-18M482 82v-18M510 82v-18M538 82v-18M566 82v-18M594 82v-18"/>${end}<path d="M402 250l35-46 25 22 42-61 47 59" stroke="${c}" stroke-width="4"/>`,
    nodes: `${common}<path d="M400 246L486 122l84 104 52-122M400 246L570 226M486 122l136-20"/>${end}${dot(400,246,8)}${dot(486,122,8)}${dot(570,226,8)}${dot(622,102,8)}`,
    timeline: `${common}<path d="M380 102h270M380 150h270M380 198h270M380 246h270M420 88v176M494 88v176M560 88v176M620 88v176" stroke-dasharray="3 8"/>${end}<rect x="398" y="115" width="108" height="23" fill="${c}33" stroke="${c}"/><rect x="470" y="163" width="153" height="23" fill="${c}33" stroke="${c}"/><rect x="526" y="211" width="91" height="23" fill="${c}33" stroke="${c}"/>`,
    orbit: `${common}<ellipse cx="515" cy="174" rx="140" ry="61/><ellipse cx="515" cy="174" rx="61" ry="140" transform="rotate(58 515 174)"/><ellipse cx="515" cy="174" rx="108" ry="108" transform="rotate(22 515 174)"/>${end}${dot(515,174,14)}${dot(389,174)}${dot(606,115)}${dot(566,307)}`,
    engine: `${common}<rect x="407" y="72" width="214" height="204" rx="8"/><path d="M442 106h145M442 137h112M442 168h145M442 199h80M442 230h126M429 92h-31v166h31M601 92h31v166h-31"/>${end}<path d="M456 137l22 16 31-27 25 20 31-33" stroke="${c}" stroke-width="4"/>`,
    api: `${common}<path d="M388 96h250M388 145h250M388 194h250M388 243h250M427 76v184M503 76v184M579 76v184" stroke-dasharray="2 8"/>${end}${dot(427,145)}${dot(503,194)}${dot(579,96)}<text x="403" y="127" fill="${c}" stroke="none" font-size="18" font-family="monospace">GET</text><text x="524" y="227" fill="${c}" stroke="none" font-size="18" font-family="monospace">200</text>`,
    image: `${common}<rect x="390" y="70" width="250" height="205"/><path d="M406 248l64-74 48 44 43-56 63 86M421 239l49-58 48 37 43-52 48 73"/><circle cx="480" cy="126" r="24"/>${end}`,
    dashboard: `${common}<rect x="390" y="74" width="250" height="200"/><path d="M390 118h250M458 74v200M555 118v156M476 238v-64h22v64M512 238v-91h22v91M572 238v-116h22v116"/>${end}${dot(410,96,4)}${dot(426,96,4)}${dot(442,96,4)}`,
    search: `${common}<circle cx="505" cy="170" r="83"/><circle cx="505" cy="170" r="48"/><path d="M563 229l73 62" stroke-width="12"/>${end}<path d="M474 174l20 19 43-50" stroke="${c}" stroke-width="4"/>`,
    network: `${common}<path d="M404 119l78-42 103 58 44-53M404 119l30 115 78-42 73 66M434 234l78 34 73-66M482 77l30 190M585 135l-73 132"/>${end}${dot(404,119)}${dot(482,77)}${dot(585,135)}${dot(434,234)}${dot(512,267)}${dot(585,201)}`,
    chapter: `${common}<path d="M408 87h215M408 120h215M408 153h215M408 186h215M408 219h215M408 252h215M434 72v202M478 72v202M522 72v202M566 72v202"/>${end}<path d="M405 265l75-105 43 51 89-127" stroke="${c}" stroke-width="5"/>`,
    orchestra: `${common}<path d="M400 98c75 0 75 150 150 150 48 0 68-44 68-92M400 150c45 0 45 88 90 88 48 0 48-140 110-140M400 202c31 0 31 42 63 42 51 0 51-86 155-86"/>${end}${dot(400,98)}${dot(400,150)}${dot(400,202)}${dot(618,156)}`,
    protocol: `${common}<path d="M402 90h218v170H402zM427 121h168M427 158h100M427 195h144M427 232h117"/>${end}<path d="M575 145l27 27-27 27M594 172h-48" stroke="${c}" stroke-width="4"/>`,
    script: `${common}<path d="M410 72h190l35 35v167H410zM600 72v35h35M438 126h141M438 157h122M438 188h94M438 230h54"/>${end}<path d="M545 220l18 18 38-48" stroke="${c}" stroke-width="5"/>`,
  }
  return map[kind]
}

for (const [id, title, kicker, accent, kind] of covers) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" role="img" aria-labelledby="title desc"><title id="title">${esc(title)} 项目封面</title><desc id="desc">${esc(kicker)} · ${esc(title)}</desc><defs><linearGradient id="wash" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#15191e"/><stop offset="1" stop-color="#07090c"/></linearGradient><radialGradient id="light" cx="86%" cy="8%" r="75%"><stop stop-color="${accent}" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><rect width="720" height="420" fill="url(#wash)"/><rect width="720" height="420" fill="url(#light)"/><path d="M0 74H720M0 348H720M42 0V420M678 0V420" stroke="#fff" stroke-opacity=".07"/>${art(kind, accent)}<g fill="#fff" font-family="Arial, Microsoft YaHei, sans-serif"><text x="42" y="43" font-size="13" letter-spacing="3" fill="${accent}">${esc(kicker)}</text><text x="42" y="314" font-size="30" font-weight="700">${esc(title)}</text><text x="42" y="350" font-size="12" letter-spacing="2" opacity=".55">LIU SHUBIN / PROJECT SYSTEM</text><text x="678" y="43" text-anchor="end" font-size="13" letter-spacing="3" opacity=".6">2026</text><text x="678" y="383" text-anchor="end" font-size="11" letter-spacing="2" fill="${accent}" opacity=".75">${id.toUpperCase()}</text></g></svg>`
  await writeFile(join(outDir, `${id}.svg`), svg)
}
console.log(`generated ${covers.length} art-directed covers in ${outDir}`)
