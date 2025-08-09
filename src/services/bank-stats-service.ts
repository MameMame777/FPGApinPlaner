import { Pin } from '../types';

export interface BankStatistics {
  bankId: string;
  totalPins: number;
  assignedPins: number;
  unassignedPins: number;
  utilizationRate: number;
  pinsByType: Record<string, number>;
  pinsByVoltage: Record<string, number>;
  pinsByDirection: Record<string, number>;
  differentialPairs: number;
  majorSignalTypes: string[];
}

export interface BankGroupsSummary {
  totalBanks: number;
  totalPins: number;
  overallUtilization: number;
  bankStats: BankStatistics[];
  mostUtilizedBank: string;
  leastUtilizedBank: string;
  bankTypes: string[];
}

export class BankStatsService {
  /**
   * 指定されたピンデータからBank統計を計算
   */
  static calculateBankStatistics(pins: Pin[]): BankGroupsSummary {
    const bankGroups = new Map<string, Pin[]>();
    
    // Bankごとにピンをグループ化
    pins.forEach(pin => {
      const bankId = pin.bank || 'UNASSIGNED';
      if (!bankGroups.has(bankId)) {
        bankGroups.set(bankId, []);
      }
      bankGroups.get(bankId)!.push(pin);
    });

    const bankStats: BankStatistics[] = [];
    let totalAssigned = 0;

    // 各Bankの統計を計算
    Array.from(bankGroups.entries()).forEach(([bankId, bankPins]) => {
      const assignedPins = bankPins.filter(p => p.isAssigned || Boolean(p.signalName?.trim()));
      const unassignedPins = bankPins.filter(p => !p.isAssigned && !p.signalName?.trim());
      
      totalAssigned += assignedPins.length;

      // ピンタイプ別統計
      const pinsByType: Record<string, number> = {};
      bankPins.forEach(pin => {
        const type = pin.pinType || 'UNKNOWN';
        pinsByType[type] = (pinsByType[type] || 0) + 1;
      });

      // 電圧別統計
      const pinsByVoltage: Record<string, number> = {};
      bankPins.forEach(pin => {
        const voltage = pin.voltage || 'UNSPECIFIED';
        pinsByVoltage[voltage] = (pinsByVoltage[voltage] || 0) + 1;
      });

      // 方向別統計
      const pinsByDirection: Record<string, number> = {};
      bankPins.forEach(pin => {
        const direction = pin.direction || 'UNSPECIFIED';
        pinsByDirection[direction] = (pinsByDirection[direction] || 0) + 1;
      });

      // 差動ペア数を計算
      const differentialPairs = bankPins.filter(pin => 
        pin.differentialPair || pin.pinName?.includes('_P') || pin.pinName?.includes('_N')
      ).length / 2;

      // 主要な信号タイプを特定
      const signalTypes = new Map<string, number>();
      assignedPins.forEach(pin => {
        if (pin.signalName) {
          // 信号名から一般的なパターンを抽出
          const signalType = this.inferSignalType(pin.signalName);
          signalTypes.set(signalType, (signalTypes.get(signalType) || 0) + 1);
        }
      });

      const majorSignalTypes = Array.from(signalTypes.entries())
        .filter(([, count]) => count >= 2) // 2個以上使用されている信号タイプ
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type);

      const utilizationRate = bankPins.length > 0 ? (assignedPins.length / bankPins.length) * 100 : 0;

      bankStats.push({
        bankId,
        totalPins: bankPins.length,
        assignedPins: assignedPins.length,
        unassignedPins: unassignedPins.length,
        utilizationRate,
        pinsByType,
        pinsByVoltage,
        pinsByDirection,
        differentialPairs: Math.floor(differentialPairs),
        majorSignalTypes
      });
    });

    // Bank統計をソート（数値Bank -> 英数字Bank -> UNASSIGNED）
    bankStats.sort((a, b) => {
      if (a.bankId === 'UNASSIGNED') return 1;
      if (b.bankId === 'UNASSIGNED') return -1;
      
      const aNum = parseInt(a.bankId);
      const bNum = parseInt(b.bankId);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      
      return a.bankId.localeCompare(b.bankId);
    });

    // 全体サマリー計算
    const totalPins = pins.length;
    const overallUtilization = totalPins > 0 ? (totalAssigned / totalPins) * 100 : 0;
    
    const utilizationRates = bankStats
      .filter(stat => stat.bankId !== 'UNASSIGNED')
      .map(stat => ({ id: stat.bankId, rate: stat.utilizationRate }));
    
    const mostUtilized = utilizationRates.length > 0 
      ? utilizationRates.reduce((max, curr) => curr.rate > max.rate ? curr : max)
      : { id: 'N/A', rate: 0 };
    
    const leastUtilized = utilizationRates.length > 0 
      ? utilizationRates.reduce((min, curr) => curr.rate < min.rate ? curr : min)
      : { id: 'N/A', rate: 0 };

    const bankTypes = Array.from(new Set(
      pins.map(pin => pin.pinType).filter(Boolean)
    )).sort();

    return {
      totalBanks: bankGroups.size,
      totalPins,
      overallUtilization,
      bankStats,
      mostUtilizedBank: mostUtilized.id,
      leastUtilizedBank: leastUtilized.id,
      bankTypes
    };
  }

  /**
   * 信号名から信号タイプを推測
   */
  private static inferSignalType(signalName: string): string {
    const name = signalName.toUpperCase();
    
    // 一般的な信号タイプのパターン
    if (name.includes('CLK')) return 'CLOCK';
    if (name.includes('RST') || name.includes('RESET')) return 'RESET';
    if (name.includes('PWR') || name.includes('VCC') || name.includes('POWER')) return 'POWER';
    if (name.includes('GND') || name.includes('GROUND')) return 'GROUND';
    if (name.includes('DATA') || name.includes('D[')) return 'DATA';
    if (name.includes('ADDR') || name.includes('A[')) return 'ADDRESS';
    if (name.includes('CS') || name.includes('CE') || name.includes('EN')) return 'CONTROL';
    if (name.includes('LED')) return 'LED';
    if (name.includes('BTN') || name.includes('SW')) return 'USER_INPUT';
    if (name.includes('UART') || name.includes('TX') || name.includes('RX')) return 'UART';
    if (name.includes('SPI') || name.includes('I2C')) return 'SERIAL';
    if (name.includes('USB')) return 'USB';
    if (name.includes('ETH') || name.includes('RMII') || name.includes('RGMII')) return 'ETHERNET';
    if (name.includes('DDR') || name.includes('SDRAM')) return 'MEMORY';
    if (name.includes('HDMI') || name.includes('LVDS')) return 'DISPLAY';
    if (name.includes('_P') || name.includes('_N')) return 'DIFFERENTIAL';
    
    return 'GENERAL_IO';
  }

  /**
   * Bank統計をCSV形式で出力
   */
  static exportBankStatisticsCSV(summary: BankGroupsSummary): string {
    const headers = [
      'Bank ID',
      'Total Pins',
      'Assigned Pins',
      'Unassigned Pins',
      'Utilization (%)',
      'Main Pin Types',
      'Main Voltages',
      'Differential Pairs',
      'Major Signal Types'
    ];

    const rows = summary.bankStats.map(stat => [
      stat.bankId,
      stat.totalPins.toString(),
      stat.assignedPins.toString(),
      stat.unassignedPins.toString(),
      stat.utilizationRate.toFixed(1),
      Object.entries(stat.pinsByType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([type, count]) => `${type}:${count}`)
        .join('; '),
      Object.entries(stat.pinsByVoltage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([voltage, count]) => `${voltage}:${count}`)
        .join('; '),
      stat.differentialPairs.toString(),
      stat.majorSignalTypes.join('; ')
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }

  /**
   * Bank利用率に基づいた推奨事項を生成
   */
  static generateRecommendations(summary: BankGroupsSummary): string[] {
    const recommendations: string[] = [];

    // 利用率に基づく推奨
    if (summary.overallUtilization > 90) {
      recommendations.push('⚠️ Overall utilization is very high (>90%). Consider using a larger package or optimizing pin assignments.');
    } else if (summary.overallUtilization < 30) {
      recommendations.push('💡 Overall utilization is low (<30%). A smaller package might be more cost-effective.');
    }

    // Bank間のバランスチェック
    const bankUtils = summary.bankStats
      .filter(stat => stat.bankId !== 'UNASSIGNED')
      .map(stat => stat.utilizationRate);
    
    if (bankUtils.length > 1) {
      const maxUtil = Math.max(...bankUtils);
      const minUtil = Math.min(...bankUtils);
      const variance = maxUtil - minUtil;

      if (variance > 50) {
        recommendations.push(`⚖️ Bank utilization is unbalanced (${variance.toFixed(1)}% variance). Consider redistributing signals.`);
      }
    }

    // 未使用Bankの検出
    const unusedBanks = summary.bankStats.filter(stat => 
      stat.bankId !== 'UNASSIGNED' && stat.assignedPins === 0
    );
    
    if (unusedBanks.length > 0) {
      recommendations.push(`📊 ${unusedBanks.length} banks are completely unused: ${unusedBanks.map(b => b.bankId).join(', ')}`);
    }

    return recommendations;
  }
}
