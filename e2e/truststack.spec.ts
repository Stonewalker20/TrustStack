import { expect, test } from '@playwright/test'
import path from 'path'

test('upload, prompt generation, query, risk, and history work through the real app', async ({ page }) => {
  const fixturePath = path.resolve(process.cwd(), 'e2e/fixtures/facility_safety_sop.txt')

  await page.goto('/')

  await expect(page.getByText('TrustStack Mission Control')).toBeVisible()

  await page.getByTestId('planet-button-pluto').click()
  await expect(page.getByText('Use every major TrustStack feature from one screen.')).toBeVisible()

  await page.getByTestId('upload-input').setInputFiles(fixturePath)
  await page.getByTestId('upload-submit').click()

  await expect(page.getByTestId('upload-status')).toContainText('Indexed facility_safety_sop.txt')
  await expect(page.getByTestId('document-list')).toContainText('facility_safety_sop.txt')
  await expect(page.getByTestId('query-suggestion').first()).toBeVisible()

  await page.getByTestId('query-suggestion').first().click()
  await page.getByTestId('query-submit').click()

  await expect(page.getByTestId('answer-card')).toBeVisible()
  await expect(page.getByTestId('answer-text')).toContainText(/inspection|hazard|startup/i)

  await page.getByRole('button', { name: 'Next Planet' }).click()
  await expect(page.getByText('Trust status')).toBeVisible()

  await page.getByRole('button', { name: 'Next Planet' }).click()
  await expect(page.getByTestId('run-history')).toBeVisible()
  await expect(page.getByTestId('run-history-item').first()).toContainText(/inspection|required|startup/i)
})
