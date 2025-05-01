import { QueryEngine } from '@comunica/query-sparql'
import { DataFactory } from 'n3'
import { expect, test } from 'vitest'
import { TextStore, defaultSearchTerm } from './TextStore'
const { namedNode, literal, quad } = DataFactory

const createStore = () => {
  const store = new TextStore()

  store.add(quad(namedNode('a'), namedNode('https://schema.org/name'), literal('John Doe')))
  store.add(quad(namedNode('b'), namedNode('https://schema.org/name'), literal('Johanna Doe')))
  store.add(quad(namedNode('c'), namedNode('https://schema.org/name'), literal('Frank Doe')))

  return store
}

test('match, check additions and deletions', () => {
  const store = createStore()
  const result = [...store.match(null, defaultSearchTerm, literal('Jo'))]
  expect(result[0].object.value).toBe('John Doe')
  expect(result[1].object.value).toBe('Johanna Doe')
  expect(result.length).toBe(2)

  const result2 = [...store.match(null, defaultSearchTerm, literal('Peter'))]
  expect(result2.length).toBe(0)
  store.add(quad(namedNode('c'), namedNode('https://schema.org/name'), literal('Peter Peterson')))
  store.add(quad(namedNode('c'), namedNode('https://schema.org/name'), literal('Peter Jackson')))
  const result3 = [...store.match(null, defaultSearchTerm, literal('Peter'))]
  expect(result3.length).toBe(2)
  store.delete(quad(namedNode('c'), namedNode('https://schema.org/name'), literal('Peter Peterson')))
  const result4 = [...store.match(null, defaultSearchTerm, literal('Peter'))]
  expect(result4.length).toBe(1)
  store.delete(quad(namedNode('c'), namedNode('https://schema.org/name'), literal('Peter Jackson')))
  const result5 = [...store.match(null, defaultSearchTerm, literal('Peter'))]
  expect(result5.length).toBe(0)
})

test('query', async () => {
  const store = createStore()

  const engine = new QueryEngine()
  const response = await engine.queryBindings(
    `select * where { 
      ?s <https://textstore.shapething.com/search> "Fr" .
      ?s ?p ?o
    }`,
    {
      sources: [store]
    }
  )

  const bindings = await response.toArray()
  expect(bindings[0].get('p')?.value).toBe('https://schema.org/name')
  expect(bindings[0].get('o')?.value).toBe('Frank Doe')
  expect(bindings.length).toBe(1)
})

test('initialization with quads', () => {
  const store = new TextStore({
    storeOptions: [quad(namedNode('a'), namedNode('https://schema.org/name'), literal('John Doe'))]
  })
  const result = [...store.match(null, defaultSearchTerm, literal('Jo'))]
  expect(result[0].object.value).toBe('John Doe')
  expect(result.length).toBe(1)
})
