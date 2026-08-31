import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { DashboardPage } from '@/pages/DashboardPage'

/**
 * Regression test for a real bug: DashboardSidebar's "New Project" button
 * asked DashboardPage to open its create-project dialog through a
 * `createProjectRequest` counter in a shared store. Clicking it from any
 * route OTHER than /dashboard incremented that counter *before*
 * DashboardPage mounted — and DashboardPage's `useState(createProjectRequest)`
 * initializer captured the already-incremented value as its own starting
 * point, so the "has this changed?" check was false on the very first
 * render and the dialog never opened. Silently — no error, no toast — which
 * is exactly what "Create Project fails" looks like from outside. Fixed by
 * carrying the request as router navigation state instead, which arrives
 * atomically with the navigation and can't be swallowed by mount timing.
 */
function renderAppAt(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/teams" element={<div>Teams page placeholder</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('DashboardSidebar "New Project" -> DashboardPage create dialog', () => {
  it('opens the create-project dialog when clicked from a different page (/teams)', async () => {
    renderAppAt('/teams')
    expect(screen.getByText('Teams page placeholder')).toBeInTheDocument()

    const newProjectButtons = screen.getAllByRole('button', { name: /New Project/i })
    fireEvent.click(newProjectButtons[0])

    await waitFor(() => {
      expect(screen.getByText('New project')).toBeInTheDocument()
    })
  })

  it('still opens the dialog when clicked while already on /dashboard', async () => {
    renderAppAt('/dashboard')
    await waitFor(() => {
      expect(screen.getByLabelText('Search projects')).toBeInTheDocument()
    })

    const newProjectButtons = screen.getAllByRole('button', { name: /New Project/i })
    fireEvent.click(newProjectButtons[0])

    await waitFor(() => {
      expect(screen.getByText('New project')).toBeInTheDocument()
    })
  })
})
