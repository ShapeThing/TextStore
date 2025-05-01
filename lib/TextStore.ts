import namespace, { NamespaceBuilder } from '@rdfjs/namespace'
import * as RDF from '@rdfjs/types'
import { Index } from 'flexsearch'
import { BaseQuad, Quad, Store, Term } from 'n3'
import { PublicStore } from './PublicStore'

const tsst: NamespaceBuilder<string> = namespace('https://textstore.shapething.com/')
/**
 * The default IRI to use for searching with TextStore
 */
export const defaultSearchTerm: RDF.NamedNode = tsst('search')

type TextStoreOptions = {
  storeOptions?: ConstructorParameters<typeof Store>[0]
  indexOptions?: any
  searchTerm?: RDF.NamedNode
}

/**
 * A TextStore, an N3 store with fuzzy search capabilities
 */
export class TextStore<
  Q_RDF extends RDF.BaseQuad = RDF.Quad,
  Q_N3 extends BaseQuad = Quad,
  OutQuad extends RDF.BaseQuad = RDF.Quad,
  InQuad extends RDF.BaseQuad = RDF.Quad
> extends PublicStore<Q_RDF, Q_N3, OutQuad, InQuad> {
  #textIndex: Index
  #searchTerm: RDF.NamedNode

  constructor(options: TextStoreOptions = {}) {
    super(options.storeOptions as Q_RDF[] | undefined)

    this.#searchTerm = options.searchTerm ?? defaultSearchTerm

    this.#textIndex = new Index({
      tokenize: 'full',
      ...(options.indexOptions ?? {})
    })

    if (options.storeOptions) {
      const quads = [...options.storeOptions] as InQuad[]
      for (const quad of quads) this.add(quad)
    }
  }

  features = {
    quotedTripleFiltering: true
  }

  add(quad: InQuad): this {
    const result = super.add(quad)
    if (quad.object.termType === 'Literal') {
      const id = this._termToNumericId(quad.object)
      this.#textIndex.add(id, quad.object.value)
    }

    return result
  }

  delete(quad: InQuad): this {
    const result = super.delete(quad)
    if (quad.object.termType === 'Literal') {
      const otherQuads = result.getQuads(null, null, quad.object, null)
      if (!otherQuads.length) {
        const id = this._termToNumericId(quad.object)
        this.#textIndex.remove(id)
      }
    }

    return result
  }

  countQuads(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term | null): number {
    const isTextSearch = this.#searchTerm.equals(predicate)
    if (!isTextSearch) return super.countQuads(subject, predicate, object, graph)
    return this.size // A somewhat reasonable number.
  }

  match(
    subject?: RDF.Term | null,
    predicate?: RDF.Term | null,
    object?: RDF.Term | null,
    graph?: RDF.Term | null
  ): RDF.Stream<Q_RDF> & RDF.Dataset<OutQuad, InQuad> {
    const isTextSearch = predicate?.equals(this.#searchTerm)
    const search = isTextSearch ? object?.value : undefined

    if (!isTextSearch || !search) return super.match(subject as Term, predicate as Term, object as Term, graph as Term)

    object = null
    predicate = null

    const objectIds = this.#textIndex.search(search) as number[]
    const results = new Store()

    for (const objectId of objectIds) {
      /** @ts-expect-error This is a private object from Store */
      const id = this._entities[objectId]
      object = this._termFromId(id)
      const subStream = [...super.match(subject as Term, null, object as Term, graph as Term)]
      results.addQuads([...subStream] as RDF.Quad[])
    }

    return results.match() as RDF.Stream<Q_RDF> & RDF.Dataset<OutQuad, InQuad>
  }
}
