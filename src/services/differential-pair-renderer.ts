// 差動ペア描画ユーティリティ
import { Pin, DifferentialPairGroup } from '../types/core';

export interface DifferentialPairRenderOptions {
  showConnectionLines: boolean;
  highlightPairs: boolean;
  pairLineColor: string;
  pairLineWidth: number;
  highlightColor: string;
  showPairLabels: boolean;
  labelFontSize: number;
  labelColor: string;
}

export class DifferentialPairRenderer {
  private static defaultOptions: DifferentialPairRenderOptions = {
    showConnectionLines: true,
    highlightPairs: true,
    pairLineColor: '#3b82f6',
    pairLineWidth: 2,
    highlightColor: '#dbeafe',
    showPairLabels: true,
    labelFontSize: 10,
    labelColor: '#1e40af'
  };

  /**
   * 差動ペアの視覚的表現を描画
   */
  static renderDifferentialPairs(
    ctx: CanvasRenderingContext2D,
    pairs: DifferentialPairGroup[],
    pins: Pin[],
    options: Partial<DifferentialPairRenderOptions> = {}
  ): void {
    const opts = { ...this.defaultOptions, ...options };
    
    for (const pair of pairs) {
      const positivePin = pins.find(p => p.id === pair.positivePinId);
      const negativePin = pins.find(p => p.id === pair.negativePinId);

      if (positivePin && negativePin) {
        this.renderSinglePair(ctx, pair, positivePin, negativePin, opts);
      }
    }
  }

  /**
   * 単一の差動ペアを描画
   */
  private static renderSinglePair(
    ctx: CanvasRenderingContext2D,
    pair: DifferentialPairGroup,
    positivePin: Pin,
    negativePin: Pin,
    options: DifferentialPairRenderOptions
  ): void {
    ctx.save();

    // ピンのハイライト
    if (options.highlightPairs) {
      this.highlightPin(ctx, positivePin, options.highlightColor, pair.status);
      this.highlightPin(ctx, negativePin, options.highlightColor, pair.status);
    }

    // 接続線の描画
    if (options.showConnectionLines) {
      this.drawConnectionLine(ctx, positivePin, negativePin, options, pair.status);
    }

    // ラベルの描画
    if (options.showPairLabels) {
      this.drawPairLabel(ctx, pair, positivePin, negativePin, options);
    }

    ctx.restore();
  }

  /**
   * ピンをハイライト
   */
  private static highlightPin(
    ctx: CanvasRenderingContext2D,
    pin: Pin,
    baseColor: string,
    status: string
  ): void {
    const statusColor = this.getStatusHighlightColor(baseColor, status);
    
    ctx.fillStyle = statusColor;
    ctx.strokeStyle = this.getStatusBorderColor(status);
    ctx.lineWidth = 2;

    // ピンサイズより少し大きめの円でハイライト
    const radius = 8;
    ctx.beginPath();
    ctx.arc(pin.position.x, pin.position.y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  /**
   * 差動ペア間の接続線を描画
   */
  private static drawConnectionLine(
    ctx: CanvasRenderingContext2D,
    pin1: Pin,
    pin2: Pin,
    options: DifferentialPairRenderOptions,
    status: string
  ): void {
    ctx.strokeStyle = this.getStatusLineColor(options.pairLineColor, status);
    ctx.lineWidth = options.pairLineWidth;
    ctx.setLineDash(status === 'invalid' ? [5, 5] : []);

    // 曲線で接続（視覚的に美しく）
    const midX = (pin1.position.x + pin2.position.x) / 2;
    const midY = (pin1.position.y + pin2.position.y) / 2;
    
    // コントロールポイントを計算
    const dx = pin2.position.x - pin1.position.x;
    const dy = pin2.position.y - pin1.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 距離に応じてカーブの強度を調整
    const curveOffset = Math.min(distance * 0.3, 30);
    const controlX = midX + (dy / distance) * curveOffset;
    const controlY = midY - (dx / distance) * curveOffset;

    ctx.beginPath();
    ctx.moveTo(pin1.position.x, pin1.position.y);
    ctx.quadraticCurveTo(controlX, controlY, pin2.position.x, pin2.position.y);
    ctx.stroke();

    // 矢印を描画（方向性を示す）
    this.drawArrowHead(ctx, controlX, controlY, pin2.position.x, pin2.position.y);
    
    ctx.setLineDash([]); // リセット
  }

  /**
   * 矢印の頭部を描画
   */
  private static drawArrowHead(
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): void {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowLength = 8;
    const arrowAngle = Math.PI / 6;

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - arrowLength * Math.cos(angle - arrowAngle),
      toY - arrowLength * Math.sin(angle - arrowAngle)
    );
    ctx.lineTo(
      toX - arrowLength * Math.cos(angle + arrowAngle),
      toY - arrowLength * Math.sin(angle + arrowAngle)
    );
    ctx.closePath();
    ctx.fill();
  }

  /**
   * ペアラベルを描画
   */
  private static drawPairLabel(
    ctx: CanvasRenderingContext2D,
    pair: DifferentialPairGroup,
    pin1: Pin,
    pin2: Pin,
    options: DifferentialPairRenderOptions
  ): void {
    const midX = (pin1.position.x + pin2.position.x) / 2;
    const midY = (pin1.position.y + pin2.position.y) / 2;

    ctx.font = `${options.labelFontSize}px Arial`;
    ctx.fillStyle = options.labelColor;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 背景描画（可読性向上のため）
    ctx.strokeText(pair.name, midX, midY - 15);
    ctx.fillText(pair.name, midX, midY - 15);

    // ステータス表示
    if (pair.status !== 'valid') {
      ctx.font = `${options.labelFontSize - 2}px Arial`;
      ctx.fillStyle = this.getStatusTextColor(pair.status);
      ctx.strokeText(pair.status.toUpperCase(), midX, midY - 5);
      ctx.fillText(pair.status.toUpperCase(), midX, midY - 5);
    }
  }

  /**
   * ステータスに応じたハイライト色を取得
   */
  private static getStatusHighlightColor(baseColor: string, status: string): string {
    switch (status) {
      case 'valid':
        return '#dcfce7'; // green-100
      case 'warning':
        return '#fef3c7'; // yellow-100
      case 'invalid':
        return '#fee2e2'; // red-100
      default:
        return baseColor;
    }
  }

  /**
   * ステータスに応じた境界色を取得
   */
  private static getStatusBorderColor(status: string): string {
    switch (status) {
      case 'valid':
        return '#16a34a'; // green-600
      case 'warning':
        return '#ca8a04'; // yellow-600
      case 'invalid':
        return '#dc2626'; // red-600
      default:
        return '#6b7280'; // gray-500
    }
  }

  /**
   * ステータスに応じた線の色を取得
   */
  private static getStatusLineColor(baseColor: string, status: string): string {
    switch (status) {
      case 'valid':
        return '#16a34a'; // green-600
      case 'warning':
        return '#ca8a04'; // yellow-600
      case 'invalid':
        return '#dc2626'; // red-600
      default:
        return baseColor;
    }
  }

  /**
   * ステータスに応じたテキスト色を取得
   */
  private static getStatusTextColor(status: string): string {
    switch (status) {
      case 'warning':
        return '#92400e'; // yellow-800
      case 'invalid':
        return '#991b1b'; // red-800
      default:
        return '#374151'; // gray-700
    }
  }

  /**
   * 差動ペアの統計情報を描画
   */
  static renderPairStatistics(
    ctx: CanvasRenderingContext2D,
    pairs: DifferentialPairGroup[],
    x: number,
    y: number
  ): void {
    if (pairs.length === 0) return;

    ctx.save();
    ctx.font = '12px Arial';
    ctx.fillStyle = '#374151';

    const stats = this.calculateStatistics(pairs);
    const lineHeight = 16;
    let currentY = y;

    // 背景
    const boxWidth = 150;
    const boxHeight = stats.length * lineHeight + 20;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.fillRect(x - 10, y - 15, boxWidth, boxHeight);
    ctx.strokeRect(x - 10, y - 15, boxWidth, boxHeight);

    // タイトル
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('Differential Pairs', x, currentY);
    currentY += lineHeight + 5;

    // 統計情報
    ctx.font = '11px Arial';
    for (const stat of stats) {
      ctx.fillStyle = stat.color;
      ctx.fillText(stat.label, x, currentY);
      ctx.fillText(stat.value.toString(), x + 100, currentY);
      currentY += lineHeight;
    }

    ctx.restore();
  }

  /**
   * 統計情報を計算
   */
  private static calculateStatistics(pairs: DifferentialPairGroup[]): Array<{
    label: string;
    value: number;
    color: string;
  }> {
    const total = pairs.length;
    const valid = pairs.filter(p => p.status === 'valid').length;
    const warnings = pairs.filter(p => p.status === 'warning').length;
    const invalid = pairs.filter(p => p.status === 'invalid').length;

    const categoryCount: Record<string, number> = {};
    pairs.forEach(pair => {
      const category = pair.category || 'CUSTOM';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const stats = [
      { label: 'Total:', value: total, color: '#374151' },
      { label: 'Valid:', value: valid, color: '#16a34a' },
      { label: 'Warnings:', value: warnings, color: '#ca8a04' },
      { label: 'Invalid:', value: invalid, color: '#dc2626' }
    ];

    // カテゴリ別統計を追加
    Object.entries(categoryCount).forEach(([category, count]) => {
      stats.push({
        label: `${category}:`,
        value: count,
        color: '#6b7280'
      });
    });

    return stats;
  }

  /**
   * ホバー時の詳細情報を描画
   */
  static renderPairTooltip(
    ctx: CanvasRenderingContext2D,
    pair: DifferentialPairGroup,
    pins: Pin[],
    mouseX: number,
    mouseY: number
  ): void {
    const positivePin = pins.find(p => p.id === pair.positivePinId);
    const negativePin = pins.find(p => p.id === pair.negativePinId);

    if (!positivePin || !negativePin) return;

    ctx.save();

    // ツールチップの内容を準備
    const lines = [
      `Name: ${pair.name}`,
      `Status: ${pair.status.toUpperCase()}`,
      `Category: ${pair.category || 'CUSTOM'}`,
      `Positive: ${positivePin.pinNumber} (${positivePin.signalName || 'Unassigned'})`,
      `Negative: ${negativePin.pinNumber} (${negativePin.signalName || 'Unassigned'})`
    ];

    if (pair.constraints) {
      const c = pair.constraints;
      if (c.diffImpedance) lines.push(`Diff. Impedance: ${c.diffImpedance}Ω`);
      if (c.ioStandard) lines.push(`I/O Standard: ${c.ioStandard}`);
      if (c.maxSkew) lines.push(`Max Skew: ${c.maxSkew}ps`);
    }

    if (pair.errors && pair.errors.length > 0) {
      lines.push('', 'Errors:');
      pair.errors.forEach((error: string) => lines.push(`  • ${error}`));
    }

    if (pair.warnings && pair.warnings.length > 0) {
      lines.push('', 'Warnings:');
      pair.warnings.forEach((warning: string) => lines.push(`  • ${warning}`));
    }

    // ツールチップのサイズを計算
    ctx.font = '11px Arial';
    const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    const tooltipWidth = maxWidth + 20;
    const tooltipHeight = lines.length * 14 + 10;

    // 位置調整（画面外に出ないように）
    let tooltipX = mouseX + 10;
    let tooltipY = mouseY - tooltipHeight - 10;

    if (tooltipX + tooltipWidth > ctx.canvas.width) {
      tooltipX = mouseX - tooltipWidth - 10;
    }
    if (tooltipY < 0) {
      tooltipY = mouseY + 10;
    }

    // 背景描画
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

    // 境界線描画
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 1;
    ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

    // テキスト描画
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    lines.forEach((line, index) => {
      let textColor = 'white';
      
      // エラー・警告行の色分け
      if (line.includes('Errors:') || line.startsWith('  • ') && lines[lines.indexOf(line) - 1].includes('Errors:')) {
        textColor = '#fca5a5'; // red-300
      } else if (line.includes('Warnings:') || line.startsWith('  • ') && lines[lines.indexOf(line) - 1].includes('Warnings:')) {
        textColor = '#fcd34d'; // yellow-300
      }

      ctx.fillStyle = textColor;
      ctx.fillText(line, tooltipX + 10, tooltipY + 5 + index * 14);
    });

    ctx.restore();
  }

  /**
   * マウス位置が差動ペアの近くにあるかチェック
   */
  static isPairNearMouse(
    pair: DifferentialPairGroup,
    pins: Pin[],
    mouseX: number,
    mouseY: number,
    threshold: number = 20
  ): boolean {
    const positivePin = pins.find(p => p.id === pair.positivePinId);
    const negativePin = pins.find(p => p.id === pair.negativePinId);

    if (!positivePin || !negativePin) return false;

    // 各ピンとの距離をチェック
    const distToPositive = Math.sqrt(
      Math.pow(mouseX - positivePin.position.x, 2) + 
      Math.pow(mouseY - positivePin.position.y, 2)
    );

    const distToNegative = Math.sqrt(
      Math.pow(mouseX - negativePin.position.x, 2) + 
      Math.pow(mouseY - negativePin.position.y, 2)
    );

    // 接続線との距離もチェック
    const distToLine = this.distanceToLine(
      mouseX, mouseY,
      positivePin.position.x, positivePin.position.y,
      negativePin.position.x, negativePin.position.y
    );

    return distToPositive <= threshold || 
           distToNegative <= threshold || 
           distToLine <= threshold;
  }

  /**
   * 点と線分の距離を計算
   */
  private static distanceToLine(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  }
}
