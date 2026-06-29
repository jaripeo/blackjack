import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, {
  Defs,
  ClipPath,
  Rect,
  Path,
  Polyline,
  Line,
  Text as SvgText,
} from 'react-native-svg';
import { theme } from '../theme/theme';

interface Props {
  history: number[]; // net change per round (positive = won, negative = lost)
}

const CHART_H = 140;
const PAD = { top: 10, bottom: 18, left: 46, right: 10 };
// Modal has paddingHorizontal: theme.spacing(3) = 24 on each side
const MODAL_H_PAD = theme.spacing(3) * 2;

function downsample(arr: number[], max: number): number[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  return Array.from({ length: max }, (_, i) => arr[Math.round(i * step)]);
}

function fmtY(v: number): string {
  const abs = Math.abs(v);
  const sign = v >= 0 ? '+' : '-';
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs}`;
}

export const NetChart: React.FC<Props> = ({ history }) => {
  const { width: screenW } = useWindowDimensions();
  const totalW = screenW - MODAL_H_PAD;
  const plotW = totalW - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;

  if (history.length === 0) {
    return (
      <View style={[s.wrap, { width: totalW, height: CHART_H }]}>
        <Text style={s.emptyText}>Play some hands to see your chart</Text>
      </View>
    );
  }

  // Build cumulative net P&L starting from 0
  const raw = downsample(history, 300);
  const cum: number[] = [0];
  for (const d of raw) cum.push(cum[cum.length - 1] + d);
  const n = cum.length;

  // Scale — always include 0 in the range so baseline is visible
  const minVal = Math.min(0, ...cum);
  const maxVal = Math.max(0, ...cum);
  const range = maxVal - minVal || 1;

  const sx = (i: number) => PAD.left + (i / (n - 1)) * plotW;
  const sy = (v: number) => PAD.top + plotH - ((v - minVal) / range) * plotH;

  const zeroAbsY  = sy(0);
  const bottomAbsY = PAD.top + plotH;

  // Area fill path: trace the line, then close down to chart bottom
  const areaPath =
    cum.map((v, i) => `${i === 0 ? 'M' : 'L'}${sx(i)},${sy(v)}`).join(' ') +
    ` L${sx(n - 1)},${bottomAbsY} L${PAD.left},${bottomAbsY} Z`;

  const linePoints = cum.map((v, i) => `${sx(i)},${sy(v)}`).join(' ');

  return (
    <View style={[s.wrap, { width: totalW, height: CHART_H }]}>
      <Svg width={totalW} height={CHART_H}>
        <Defs>
          {/* Only show green fill above the zero line */}
          <ClipPath id="ncAbove">
            <Rect
              x={PAD.left} y={PAD.top}
              width={plotW}
              height={Math.max(0, zeroAbsY - PAD.top)}
            />
          </ClipPath>
          {/* Only show red fill below the zero line */}
          <ClipPath id="ncBelow">
            <Rect
              x={PAD.left} y={zeroAbsY}
              width={plotW}
              height={Math.max(0, bottomAbsY - zeroAbsY)}
            />
          </ClipPath>
        </Defs>

        {/* Filled areas */}
        <Path d={areaPath} fill="rgba(82,183,136,0.22)"  clipPath="url(#ncAbove)" />
        <Path d={areaPath} fill="rgba(230,57,70,0.22)"   clipPath="url(#ncBelow)" />

        {/* Zero baseline */}
        <Line
          x1={PAD.left}        y1={zeroAbsY}
          x2={PAD.left + plotW} y2={zeroAbsY}
          stroke="rgba(255,255,255,0.28)"
          strokeWidth={1}
          strokeDasharray="4,3"
        />

        {/* Line */}
        <Polyline
          points={linePoints}
          fill="none"
          stroke={theme.colors.text}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Y-axis labels */}
        {maxVal > 0 && (
          <SvgText
            x={PAD.left - 4} y={PAD.top + 8}
            textAnchor="end"
            fill={theme.colors.success}
            fontSize={9} fontWeight="600"
          >
            {fmtY(maxVal)}
          </SvgText>
        )}
        <SvgText
          x={PAD.left - 4} y={zeroAbsY + 4}
          textAnchor="end"
          fill="rgba(255,255,255,0.4)"
          fontSize={9}
        >
          $0
        </SvgText>
        {minVal < 0 && (
          <SvgText
            x={PAD.left - 4} y={bottomAbsY}
            textAnchor="end"
            fill={theme.colors.danger}
            fontSize={9} fontWeight="600"
          >
            {fmtY(minVal)}
          </SvgText>
        )}

        {/* Round count */}
        <SvgText
          x={PAD.left + plotW / 2} y={CHART_H - 2}
          textAnchor="middle"
          fill="rgba(255,255,255,0.28)"
          fontSize={9}
        >
          {n - 1} rounds
        </SvgText>
      </Svg>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    marginVertical: theme.spacing(1),
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: theme.spacing(2),
  },
});
