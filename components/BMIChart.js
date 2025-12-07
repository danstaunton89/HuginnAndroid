import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Rect, Line, Circle, Polyline, G, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../config/theme';

const BMIChart = ({ data, labels, width = Dimensions.get('window').width - 64, height = 200 }) => {
  // BMI scale constants
  const chartMin = 15;
  const chartMax = 35;
  const totalRange = chartMax - chartMin; // 20

  // Chart dimensions
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate Y position for a BMI value
  const getY = (bmi) => {
    const percent = (chartMax - bmi) / totalRange;
    return padding.top + (percent * chartHeight);
  };

  // Calculate X position for a data point
  const getX = (index) => {
    const step = chartWidth / (labels.length - 1);
    return padding.left + (index * step);
  };

  // BMI zones (from bottom to top of chart)
  const zones = [
    { min: 15, max: 18.5, color: 'rgba(96, 165, 250, 0.3)', label: 'Under' },
    { min: 18.5, max: 24.9, color: 'rgba(34, 197, 94, 0.3)', label: 'Normal' },
    { min: 24.9, max: 29.9, color: 'rgba(245, 158, 11, 0.3)', label: 'Over' },
    { min: 29.9, max: 35, color: 'rgba(239, 68, 68, 0.3)', label: 'Obese' }
  ];

  // Create path data for the BMI line
  const validData = data.map((val, i) => ({ bmi: val || 0, index: i })).filter(d => d.bmi > 0);
  const pathData = validData.map((d, i) => {
    const x = getX(d.index);
    const y = getY(d.bmi);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ');

  // Y-axis labels (BMI values)
  const yLabels = [15, 18.5, 25, 30, 35];

  return (
    <View style={{ backgroundColor: COLORS.background.secondary, borderRadius: 12, padding: 8 }}>
      <Svg width={width} height={height}>
        {/* Background zones */}
        {zones.map((zone, i) => (
          <Rect
            key={i}
            x={padding.left}
            y={getY(zone.max)}
            width={chartWidth}
            height={getY(zone.min) - getY(zone.max)}
            fill={zone.color}
          />
        ))}

        {/* Horizontal grid lines */}
        {yLabels.map((bmi, i) => (
          <G key={i}>
            <Line
              x1={padding.left}
              y1={getY(bmi)}
              x2={padding.left + chartWidth}
              y2={getY(bmi)}
              stroke={COLORS.border}
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            <SvgText
              x={padding.left - 10}
              y={getY(bmi) + 4}
              fill={COLORS.text.secondary}
              fontSize="10"
              textAnchor="end"
            >
              {bmi}
            </SvgText>
          </G>
        ))}

        {/* BMI data line */}
        {pathData && (
          <Polyline
            points={validData.map(d => `${getX(d.index)},${getY(d.bmi)}`).join(' ')}
            fill="none"
            stroke={COLORS.accent.primary}
            strokeWidth="3"
          />
        )}

        {/* Data points */}
        {validData.map((d, i) => (
          <Circle
            key={i}
            cx={getX(d.index)}
            cy={getY(d.bmi)}
            r="4"
            fill={COLORS.accent.primary}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        ))}

        {/* X-axis labels */}
        {labels.map((label, i) => {
          // Show every other label to avoid crowding
          if (i % Math.ceil(labels.length / 7) !== 0 && i !== labels.length - 1) return null;
          return (
            <SvgText
              key={i}
              x={getX(i)}
              y={height - 10}
              fill={COLORS.text.secondary}
              fontSize="10"
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};

export default BMIChart;
