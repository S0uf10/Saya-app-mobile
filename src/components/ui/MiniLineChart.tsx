import React from 'react'
import Svg, { Path, Line, Text as SvgText } from 'react-native-svg'
import { View } from 'react-native'

export interface LineChartPoint {
  label: string
  v1: number
  v2?: number
}

interface MiniLineChartProps {
  data: LineChartPoint[]
  color1?: string
  color2?: string
  width: number
  height?: number
}

export function MiniLineChart({
  data,
  color1 = '#9333ea',
  color2 = '#10b981',
  width,
  height = 140,
}: MiniLineChartProps) {
  const pL = 4, pR = 4, pT = 10, pB = 22
  const chartW = width - pL - pR
  const chartH = height - pT - pB
  const n = data.length

  if (n === 0) return <View style={{ width, height }} />

  const allValues = data.flatMap(d => [d.v1, d.v2 ?? 0])
  const maxV = Math.max(...allValues, 1)

  const xOf = (i: number) =>
    n === 1 ? pL + chartW / 2 : pL + (i / (n - 1)) * chartW

  const yOf = (v: number) => pT + chartH - (v / maxV) * chartH

  const buildPath = (getValue: (d: LineChartPoint) => number) =>
    data
      .map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(getValue(d)).toFixed(1)}`)
      .join(' ')

  const hasV2 = data.some(d => (d.v2 ?? 0) > 0)

  // Show at most 6 labels spread across the data
  const labelStep = Math.max(1, Math.ceil(n / 6))
  const showLabel = (i: number) => i === 0 || i === n - 1 || i % labelStep === 0

  // 3 horizontal grid lines at 33%, 66%, 100%
  const gridYs = [0.33, 0.66, 1].map(f => pT + chartH * (1 - f))

  return (
    <Svg width={width} height={height}>
      {gridYs.map((y, i) => (
        <Line key={i} x1={pL} y1={y} x2={pL + chartW} y2={y}
          stroke="#f1f5f9" strokeWidth={1} />
      ))}

      {/* Line 1: scans (solid) */}
      <Path
        d={buildPath(d => d.v1)}
        stroke={color1}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Line 2: clients (dashed) */}
      {hasV2 && (
        <Path
          d={buildPath(d => d.v2 ?? 0)}
          stroke={color2}
          strokeWidth={2}
          fill="none"
          strokeDasharray="5,3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* X labels */}
      {data.map((d, i) =>
        showLabel(i) ? (
          <SvgText
            key={i}
            x={xOf(i)}
            y={height - 5}
            fontSize={9}
            fill="#94a3b8"
            textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
          >
            {d.label}
          </SvgText>
        ) : null
      )}
    </Svg>
  )
}
