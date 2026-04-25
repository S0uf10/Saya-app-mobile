import React from 'react'
import Svg, { Rect, Text as SvgText } from 'react-native-svg'
import { View } from 'react-native'

export interface BarChartBar {
  label: string
  value: number
  highlight?: boolean
  color?: string
}

interface MiniBarChartProps {
  data: BarChartBar[]
  width: number
  height?: number
  barColor?: string
  highlightColor?: string
  showLabels?: boolean
  labelStep?: number
  showLastLabel?: boolean
}

export function MiniBarChart({
  data,
  width,
  height = 120,
  barColor = '#9333ea',
  highlightColor = '#ddd6fe',
  showLabels = true,
  labelStep = 1,
  showLastLabel = true,
}: MiniBarChartProps) {
  const pL = 2, pR = 2, pT = 6, pB = showLabels ? 20 : 4
  const chartW = width - pL - pR
  const chartH = height - pT - pB
  const n = data.length

  if (n === 0) return <View style={{ width, height }} />

  const maxV = Math.max(...data.map(d => d.value), 1)
  const gap = n > 15 ? 2 : 3
  const barW = (chartW - gap * (n - 1)) / n

  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const bh = Math.max(2, (d.value / maxV) * chartH)
        const x = pL + i * (barW + gap)
        const y = pT + chartH - bh
        const fill = d.color ?? (d.highlight ? highlightColor : barColor)
        const isLast = i === n - 1
        const showLbl = showLabels && (i % labelStep === 0 || (isLast && showLastLabel))
        return (
          <React.Fragment key={i}>
            <Rect x={x} y={y} width={barW} height={bh} rx={3} ry={3} fill={fill} />
            {showLbl && (
              <SvgText
                x={x + barW / 2}
                y={height - 4}
                fontSize={9}
                fill="#94a3b8"
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            )}
          </React.Fragment>
        )
      })}
    </Svg>
  )
}
