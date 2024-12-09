import namespace from '@rdfjs/namespace'
import * as RDF from '@rdfjs/types'
import { Index, IndexOptions } from 'flexsearch'
import { BaseQuad, Quad, Store, Term } from 'n3'

export const tsst = namespace('https://textstore.shapething.com/')

type TextStoreOptions = {
  storeOptions?: ConstructorParameters<typeof Store>[0]
  indexOptions?: IndexOptions<string>
}

export class TextStore<
  Q_RDF extends RDF.BaseQuad = RDF.Quad,
  Q_N3 extends BaseQuad = Quad,
  OutQuad extends RDF.BaseQuad = RDF.Quad,
  InQuad extends RDF.BaseQuad = RDF.Quad
> extends Store<Q_RDF, Q_N3, OutQuad, InQuad> {
  #textIndex: Index

  /** @ts-ignore */
  private _termToNumericId(term: RDF.Term): number
  /** @ts-ignore */
  private _termFromId(id: number): Term

  constructor(options: TextStoreOptions = {}) {
    super(options.storeOptions as Q_RDF[] | undefined)
    this.#textIndex = new Index({
      tokenize: 'full',
      ...(options.indexOptions ?? {})
    })
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

  countQuads(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term): number {
    const isTextSearch = tsst('search').equals(predicate)
    if (isTextSearch) return this.size // A somewhat reasonable number.
    return super.countQuads(subject, predicate, object, graph)
  }

  match(
    subject?: RDF.Term | null,
    predicate?: RDF.Term | null,
    object?: RDF.Term | null,
    graph?: RDF.Term | null
  ): RDF.Stream<Q_RDF> & RDF.DatasetCore<OutQuad, InQuad> {
    const isTextSearch = predicate?.equals(tsst('search'))
    const search = isTextSearch ? object?.value : undefined

    if (isTextSearch && search) {
      object = null
      predicate = null

      const objectIds = this.#textIndex.search(search)
      const results = new Store()

      for (const objectId of objectIds) {
        /** @ts-ignore */
        object = this._termFromId(this._entities[objectId])
        const subStream = super.match(subject as Term, null, object as Term, graph as Term)
        results.addQuads([...subStream] as RDF.Quad[])
      }

      return results.match() as RDF.Stream<Q_RDF> & RDF.DatasetCore<OutQuad, InQuad>
    }

    return super.match(subject as Term, predicate as Term, object as Term, graph as Term)
  }
}
