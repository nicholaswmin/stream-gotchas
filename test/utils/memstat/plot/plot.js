/*
 * # ascii-plot
 *
 * Plots a chart in ascii, extension of asciichart  
 * https://github.com/kroitor/asciichart
 *
 * ## Original Authors:
 *
 * Igor Kroitor (@kroitor)
 *
 * ### Extended by:
 * - Alexander Klimetschek (@alexkli)
 *   - https://github.com/kroitor/asciichart/issues/56#issuecomment-1320508054
 *
 * - Nik Kyriakides (@nicholaswmin)
 */

import asciichart from 'asciichart'
import stripAnsi from 'strip-ansi'

export default function plot(yArray, config = {}) {
  const getColor = () => {
    return Array.isArray(config.colors) ?
      (config.colors[0] || '') :
      asciichart.default;
  }

  yArray = Array.isArray(yArray[0]) ? yArray : [yArray];

  const originalWidth = yArray[0].length;

  if(config.width) {
    yArray = yArray.map((arr) => {
      const newArr = [];
      for(let i = 0; i < config.width; i++) {
        newArr.push(arr[Math.floor(i * arr.length / config.width)]);
      }
      return newArr;
    });
  }

  const plot = asciichart.plot(yArray, config);

  const xArray = config.xArray || (Array.isArray(yArray[0]) ? yArray[0] :
      yArray)
    .map((v, i) => i);

  // determine the overall width of the plot (in characters)
  const plotFirstLine = stripAnsi(plot)
    .split('\n')[0];
  const fullWidth = plotFirstLine.length;
  // get the number of characters reserved for the y-axis legend
  const leftMargin = plotFirstLine.split(/┤|┼╮|┼/)[0].length + 1;

  // the difference between the two is the actual width of the x axis
  const widthXaxis = fullWidth - leftMargin;

  // get the number of characters of the longest x-axis label
  const longestXLabel = xArray.map(l => l.toString()
      .length)
    .sort((a, b) => b - a)[0]
  const tickDistance = longestXLabel + 2;

  let ticks = ' '.repeat(leftMargin - 1);
  for(let i = 0; i < widthXaxis; i++) {
    if((i % tickDistance === 0 && (i + tickDistance) < widthXaxis) || i === (
        widthXaxis - 1)) {
      ticks += "┬";
    }
    else {
      ticks += "─";
    }
  }

  const lastTickValue = originalWidth - 1;

  let tickLabels = ' '.repeat(leftMargin - 1);
  if(widthXaxis <= tickDistance) {
    // too short, just last tick
    tickLabels += (lastTickValue.toFixed())
      .padStart(widthXaxis - (tickLabels.length - leftMargin + 1));
  }
  else {
    for(let i = 0; i < widthXaxis; i++) {
      const tickValue = Math.round(i / widthXaxis * originalWidth);
      if((i % tickDistance === 0 && (i + tickDistance) < widthXaxis)) {
        tickLabels += tickValue.toFixed()
          .padEnd(tickDistance);

        // final tick
        if(i >= (widthXaxis - 2 * tickDistance)) {
          if(widthXaxis % tickDistance === 0) {
            tickLabels += (lastTickValue.toFixed())
              .padStart(widthXaxis - (tickLabels.length - leftMargin + 1));
          }
          else {
            tickLabels += (lastTickValue.toFixed())
              .padStart(widthXaxis - (tickLabels.length - leftMargin + 1));
          }
        }
      }
    }
  }

  const title = config.title ?
    `${' '.repeat(leftMargin + (widthXaxis - config.title.length)/2)}${config.title}\n\n` :
    '';
  const xLabelMargin = 5

  let yLabel = '';
  if(config.yLabel || Array.isArray(config.lineLabels)) {
    if(config.yLabels) {
      for(let i = 0; i <= config.yLabels.length - 1; i++) {
        const color = getColor()

        yLabel +=
          `${color}${' '.repeat(xLabelMargin)}${config.yLabels[i]}${asciichart.reset}${i === config.yLabels.length - 1 ? '' : '\n'}`;
      }
    }
    if(Array.isArray(config.lineLabels)) {
      let legend = '';
      for(let i = 0; i < Math.min(yArray.length, config.lineLabels
        .length); i++) {
        const color = getColor()

        legend += `    ${color}─── ${config.lineLabels[i]}${asciichart.reset}`;
      }

      for(let j = 0; j <= config.sublabels.length - 1; j++) {
        const color = getColor()

        legend += `      ${color}${config.sublabels[j]}${asciichart.reset}`;
      }

      yLabel += ' '.repeat(fullWidth - 1 - stripAnsi(legend)
        .length - stripAnsi(yLabel)
        .length) + legend;
    }
    yLabel += `\n${'╷'.padStart(leftMargin)}\n`;
  }

  const xStartLabel = ' '.repeat(xLabelMargin) + config.xStartLabel
  const xLabel = config.xLabel ?
    `\n${asciichart.darkgray}${xStartLabel}${config.xLabel.padStart(fullWidth - xStartLabel.length - 1)}${asciichart.reset}` :
    '';

  return `*\n${title}${yLabel}${plot}\n${ticks}\n${xLabel}\n${' '.repeat(xLabelMargin)}\n`;
}
