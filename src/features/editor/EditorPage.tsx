import type { Block, BlockType, Project } from '../../domain/project'
import { BlockPalette } from './BlockPalette'
import { buildBlock, ChipStage } from './canvas/ChipStage'

type Props = {
  project: Project
  saveProject: (project: Project) => Promise<void>
}

export function EditorPage({ project, saveProject }: Props) {
  function addBlock(type: BlockType) {
    void saveProject({ ...project, blocks: [...project.blocks, buildBlock(project, type)] })
  }

  function updateBlock(block: Block) {
    void saveProject({
      ...project,
      blocks: project.blocks.map((candidate) => (candidate.id === block.id ? block : candidate)),
    })
  }

  return (
    <main className="flex min-h-screen bg-[#03080b] text-[#d8f7ff]">
      <BlockPalette addBlock={addBlock} />
      <section className="p-8">
        <h1 className="mb-4 text-lg tracking-[0.25em] uppercase">{project.name}</h1>
        <ChipStage project={project} updateBlock={updateBlock} />
      </section>
    </main>
  )
}
