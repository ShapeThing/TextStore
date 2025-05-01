import * as RDF from '@rdfjs/types'
import { BaseQuad, Quad, Store, Term } from 'n3'

/** This file exists because I wanted to use the private methods from the N3 Store as if they are public methods */
export class PublicStore<
  Q_RDF extends RDF.BaseQuad = RDF.Quad,
  Q_N3 extends BaseQuad = Quad,
  OutQuad extends RDF.BaseQuad = RDF.Quad,
  InQuad extends RDF.BaseQuad = RDF.Quad
> extends Store<Q_RDF, Q_N3, OutQuad, InQuad> {
  /** @ts-expect-error we declare it because it is a private from Store */
  public _termToNumericId(term: RDF.Term): number
  /** @ts-expect-error we declare it because it is a private from Store */
  public _termFromId(id: number): Term
}
