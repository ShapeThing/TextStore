import namespace from '@rdfjs/namespace'
import * as RDF from '@rdfjs/types'
import { Index, IndexOptions } from 'flexsearch'
import { BaseQuad, Quad, Store } from 'n3'

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
  private _getGraphs(graph: RDF.Term | null | undefined)
  /** @ts-ignore */
  private _findInIndex(
    index0: any,
    key0: any,
    key1: any,
    key2: any,
    name0: any,
    name1: any,
    name2: any,
    graphId: any
  ): any

  constructor(options: TextStoreOptions = {}) {
    super(options.storeOptions as Q_RDF[] | undefined)
    this.#textIndex = new Index({
      ...(options.indexOptions ?? {}),
      tokenize: 'full'
    })
  }

  add(quad: InQuad): this {
    const result = super.add(quad)
    if (quad.object.termType === 'Literal') {
      const id = this._termToNumericId(quad.object)
      this.#textIndex.add(id, quad.object.value)
    }

    return result
  }

  /** @ts-ignore */
  *match(subject?: RDF.Term | null, predicate?: RDF.Term | null, object?: RDF.Term | null, graph?: RDF.Term | null) {
    const isTextSearch = predicate?.equals(tsst('search'))
    const search = isTextSearch ? object?.value : undefined

    if (isTextSearch) {
      object = null
      predicate = null
    }

    const graphs = this._getGraphs(graph)
    let content, subjectId, predicateId, objectId

    // Translate IRIs to internal index keys.
    if (
      (subject && !(subjectId = this._termToNumericId(subject))) ||
      (predicate && !(predicateId = this._termToNumericId(predicate)) && !isTextSearch) ||
      (object && !(objectId = this._termToNumericId(object)))
    )
      return

    for (const graphId in graphs) {
      // Only if the specified graph contains triples, there can be results
      if ((content = graphs[graphId])) {
        if (isTextSearch && search) {
          const objectIds = this.#textIndex.search(search)

          for (const objectId of objectIds) {
            // If only object is given, the object index will be the fastest
            yield* this._findInIndex(content.objects, objectId, null, null, 'object', 'subject', 'predicate', graphId)
          }
        }
        // Choose the optimal index, based on what fields are present
        else if (subjectId) {
          if (objectId)
            // If subject and object are given, the object index will be the fastest
            yield* this._findInIndex(
              content.objects,
              objectId,
              subjectId,
              predicateId,
              'object',
              'subject',
              'predicate',
              graphId
            )
          // If only subject and possibly predicate are given, the subject index will be the fastest
          else
            yield* this._findInIndex(
              content.subjects,
              subjectId,
              predicateId,
              null,
              'subject',
              'predicate',
              'object',
              graphId
            )
        } else if (predicateId)
          // If only predicate and possibly object are given, the predicate index will be the fastest
          yield* this._findInIndex(
            content.predicates,
            predicateId,
            objectId,
            null,
            'predicate',
            'object',
            'subject',
            graphId
          )
        else if (objectId)
          // If only object is given, the object index will be the fastest
          yield* this._findInIndex(content.objects, objectId, null, null, 'object', 'subject', 'predicate', graphId)
        // If nothing is given, iterate subjects and predicates first
        else yield* this._findInIndex(content.subjects, null, null, null, 'subject', 'predicate', 'object', graphId)
      }
    }
  }
}
