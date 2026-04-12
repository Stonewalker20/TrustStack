import { expect, test } from '@playwright/test'
import path from 'path'

test('upload, prompt generation, query, risk, and history work through the real app', async ({ page }) => {
  const fixturePath = path.resolve(process.cwd(), 'e2e/fixtures/facility_safety_sop.txt')

  await page.goto('/')

  await expect(page.getByText('TrustStack Mission Control')).toBeVisible()

  await page.getByTestId('mission-control-open').click()
  await expect(page.getByText('Run the TrustStack standard from one screen.')).toBeVisible()
  const missionControl = page.getByTestId('mission-control-panel')

  await missionControl.getByTestId('upload-input').setInputFiles(fixturePath)
  await missionControl.getByTestId('upload-submit').click()

  await expect(missionControl.getByTestId('upload-status')).toContainText('Indexed facility_safety_sop.txt')
  await expect(missionControl.getByTestId('document-list')).toContainText('facility_safety_sop.txt')
  await expect(missionControl.getByTestId('query-suggestion').first()).toBeVisible()

  await missionControl.getByTestId('query-suggestion').first().click()
  await missionControl.getByTestId('query-submit').click()

  await expect(missionControl.getByText('Current evaluation output')).toBeVisible()
  await expect(missionControl).toContainText(/inspection|hazard|startup/i)

  await missionControl.getByRole('button', { name: 'Close' }).click()
  await page.getByTestId('planet-button-jupiter').click({ force: true })
  await expect(page.getByText('Trust status')).toBeVisible()
})
