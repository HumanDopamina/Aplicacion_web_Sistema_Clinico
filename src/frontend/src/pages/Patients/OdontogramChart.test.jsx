import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import OdontogramChart from './OdontogramChart'

function setScrollMetrics(element, { clientWidth = 400, scrollWidth = 1200, scrollLeft = 0 } = {}) {
  Object.defineProperties(element, {
    clientWidth: { configurable: true, value: clientWidth },
    scrollWidth: { configurable: true, value: scrollWidth },
    scrollLeft: { configurable: true, writable: true, value: scrollLeft },
  })
}

function renderChart(props = {}) {
  render(<OdontogramChart dentition="PERMANENT" teeth={{}} {...props} />)
  const region = screen.getByRole('region', { name: 'Odontograma dental' })
  setScrollMetrics(region)
  return region
}

describe('OdontogramChart horizontal scrolling', () => {
  afterEach(cleanup)

  it('moves immediately with a vertical pixel wheel and keeps native horizontal touchpad input untouched', () => {
    const region = renderChart()

    expect(fireEvent.wheel(region, {
      deltaX: 0,
      deltaY: 48,
      deltaMode: 0,
      cancelable: true,
    })).toBe(false)
    expect(region.scrollLeft).toBe(48)

    expect(fireEvent.wheel(region, {
      deltaX: 36,
      deltaY: 2,
      deltaMode: 0,
      cancelable: true,
    })).toBe(true)
    expect(region.scrollLeft).toBe(48)
  })

  it('normalizes line and page wheel modes without an arbitrary sensitivity multiplier', () => {
    const region = renderChart()

    fireEvent.wheel(region, { deltaY: 2, deltaMode: 1, cancelable: true })
    expect(region.scrollLeft).toBe(32)

    fireEvent.wheel(region, { deltaY: 1, deltaMode: 2, cancelable: true })
    expect(region.scrollLeft).toBe(432)
  })

  it('releases vertical page scrolling when the horizontal edge cannot consume the wheel', () => {
    const region = renderChart()

    expect(fireEvent.wheel(region, { deltaY: -40, cancelable: true })).toBe(true)
    expect(region.scrollLeft).toBe(0)

    region.scrollLeft = 800
    expect(fireEvent.wheel(region, { deltaY: 40, cancelable: true })).toBe(true)
    expect(region.scrollLeft).toBe(800)
  })

  it('does not rerender the chart during wheel input and keeps tooth surfaces interactive', () => {
    const onRender = vi.fn()
    const onSelectTooth = vi.fn()
    const onSurfaceClick = vi.fn()
    render(
      <Profiler id="odontogram" onRender={onRender}>
        <OdontogramChart
          dentition="PERMANENT"
          teeth={{}}
          canModify
          onSelectTooth={onSelectTooth}
          onSurfaceClick={onSurfaceClick}
        />
      </Profiler>,
    )
    const region = screen.getByRole('region', { name: 'Odontograma dental' })
    setScrollMetrics(region)

    fireEvent.wheel(region, { deltaY: 64, cancelable: true })
    expect(onRender).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Pieza 18, superficie mesial' }))
    expect(onSelectTooth).toHaveBeenCalledWith('18')
    expect(onSurfaceClick).toHaveBeenCalledWith('18', 'MESIAL')
  })
})
