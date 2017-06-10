import test from 'ava'
import Nightmare from 'nightmare'

test.beforeEach(t => {
  t.context.browser = new Nightmare()

  return t.context.browser.goto('http://localhost:3000/')
})

test.afterEach(t => {
  return t.context.browser.end()
})

test('Test browser output', async t => {
  const snapshot = await t.context.browser.wait('h1').evaluate(() => document.querySelector('h1').innerText)

  t.snapshot(snapshot)
})
