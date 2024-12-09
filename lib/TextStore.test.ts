import { DataFactory } from 'n3'
import { expect, test } from 'vitest'
import { TextStore, tsst } from './TextStore'
const { namedNode, literal, quad } = DataFactory

test('adds 1 + 2 to equal 3', () => {
  const store = new TextStore()

  store.add(quad(namedNode(''), namedNode('https://schema.org/name'), literal('John Doe')))
  store.add(quad(namedNode(''), namedNode('https://schema.org/name'), literal('Johanna Doe')))
  store.add(quad(namedNode(''), namedNode('https://schema.org/name'), literal('Frank Doe')))

  const result = [...store.match(null, tsst('search'), literal('Jo'))]
  expect(result.length).toBe(2)

  const result1 = [...store.match(null, tsst('search'), literal('Fr'))]
  console.log(result1)
})
