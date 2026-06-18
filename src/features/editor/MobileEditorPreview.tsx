import { Link } from 'react-router-dom'
import type { Project } from '../../domain/project'
import { ExportPanel } from '../export/ExportPanel'
import { PublishPanel } from '../publish/PublishPanel'
import { MobileChipPreview } from './MobileChipPreview'

// Mobile editor route: the Konva authoring canvas is desktop-only, so on phones we
// show a read-only preview of the chip plus its fake spec, share/export actions,
// and a clear path back to desktop. Reads the same project JSON; never mutates it.
export function MobileEditorPreview({ project }: { project: Project }) {
  const spec = project.spec
  return (
    <main aria-label="Chip preview" className="v2-page mobile-editor-preview">
      <div className="mobile-editor-preview__inner">
        <p className="v2-kicker">Concept Fabrication Terminal</p>
        <h1 className="mobile-editor-preview__title">{project.name}</h1>

        <MobileChipPreview project={project} />

        <section className="mobile-editor-preview__spec" aria-label="Fake spec sheet">
          <h2>
            {spec.brand} {spec.series}
          </h2>
          <dl className="gallery-spec__grid">
            <div>
              <dt>Generation</dt>
              <dd>{spec.generation}</dd>
            </div>
            <div>
              <dt>Process</dt>
              <dd>{spec.process}</dd>
            </div>
            <div>
              <dt>Cores</dt>
              <dd>{spec.cores}</dd>
            </div>
            <div>
              <dt>Bandwidth</dt>
              <dd>{spec.bandwidth}</dd>
            </div>
          </dl>
          {spec.description !== '' ? <p>{spec.description}</p> : null}
          {spec.features.length > 0 ? (
            <div className="gallery-spec__features">
              {spec.features.map((feature) => (
                <span key={feature}>{feature}</span>
              ))}
            </div>
          ) : null}
        </section>

        <PublishPanel project={project} />
        <ExportPanel project={project} />

        <section className="mobile-editor-preview__cta" aria-label="Edit on desktop">
          <h2>Edit on desktop</h2>
          <p>
            Editing the canvas is a desktop experience. Open this project on a larger screen to
            design.
          </p>
          <Link className="v2-button v2-button--muted" to="/dashboard">
            Back to Projects
          </Link>
        </section>
      </div>
    </main>
  )
}
