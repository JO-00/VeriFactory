import { createHeliaLight } from 'helia'
import { withHTTP } from '@helia/http'
import { unixfs, type UnixFS } from '@helia/unixfs'
import { CID } from 'multiformats/cid'

const DEFAULT_CID = 'bafybeif2hmbx4vaul2jkkkdqu6vk35d5zjceptey2x6ro4fgfrbnjoxi4u'

async function collectSorted(fs: UnixFS, cid: CID) {
  const entries = []
  for await (const entry of fs.ls(cid)) {
    entries.push(entry)
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))
}

async function main(): Promise<void> {
  const rawCid = process.argv[2] ?? DEFAULT_CID
  const rootCid = CID.parse(rawCid)

  const helia = withHTTP(createHeliaLight(), {
    delegatedRouters: [],
    recursiveGateways: [
      'https://trustless-gateway.link',
      'https://4everland.io'
    ]
  })
  await helia.start()

  const fs = unixfs(helia)

  try {
    console.log(`${rootCid.toString()}/`)
    const topDirs = await collectSorted(fs, rootCid)

    for (let i = 0; i < topDirs.length; i++) {
      const dir = topDirs[i]
      const isLastDir = i === topDirs.length - 1
      const dirConnector = isLastDir ? '└── ' : '├── '
      const childPrefix = isLastDir ? '    ' : '│   '

      console.log(`${dirConnector}${dir.name}/ (${dir.cid.toString()})`)

      const children = await collectSorted(fs, dir.cid)
      for (let j = 0; j < children.length; j++) {
        const child = children[j]
        const isLastChild = j === children.length - 1
        const childConnector = isLastChild ? '└── ' : '├── '
        console.log(`${childPrefix}${childConnector}${child.name}: ${child.cid.toString()}`)
      }
    }
  } finally {
    await helia.stop()
  }
}

main().catch((err) => {
  console.error('Failed to traverse IPFS DAG:', err)
  process.exitCode = 1
})