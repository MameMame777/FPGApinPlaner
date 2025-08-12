import { Pin, Package } from '@/types/core';
import { DifferentialPairUtils } from '@/utils/differential-pair-utils';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  type: 'pin_conflict' | 'differential_pair' | 'bank_constraint' | 'clock_constraint';
  severity: ValidationSeverity;
  title: string;
  description: string;
  affectedPins: string[]; // ピンIDの配列
  suggestion?: string;
  autoFixable?: boolean;
  timestamp: number;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  summary: {
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  lastChecked: number;
}

export class ValidationService {
  private static listeners: Set<(_result: ValidationResult) => void> = new Set();

  /**
   * バックグラウンドでプロジェクト検証を実行
   */
  static async validateProjectAsync(
    packageData: Package | null, 
    pins: Pin[]
  ): Promise<ValidationResult> {
    return new Promise((resolve) => {
      // メインスレッドで同期実行（Web Workerは将来の最適化として残す）
      const result = this.validateProject(packageData, pins);
      resolve(result);
    });
  }

  /**
   * プロジェクト全体の検証を実行
   */
  static validateProject(_packageData: Package | null, pins: Pin[]): ValidationResult {
    const issues: ValidationIssue[] = [];
    
    // ピン競合チェック
    issues.push(...this.checkPinConflicts(pins));
    
    // 差動ペアチェック
    issues.push(...this.checkDifferentialPairs(pins));
    
    // バンク制約チェック（基本実装）
    issues.push(...this.checkBankConstraints(pins));

    const summary = this.calculateSummary(issues);
    
    return {
      issues,
      summary,
      lastChecked: Date.now()
    };
  }

  /**
   * ピン競合チェック - 同一信号が複数ピンに割り当てられていないかチェック
   */
  static checkPinConflicts(pins: Pin[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const signalMap = new Map<string, Pin[]>();

    // 信号名でグループ化
    pins.forEach(pin => {
      if (pin.signalName && pin.signalName.trim() !== '') {
        const signalName = pin.signalName.trim();
        
        // POWERとGROUNDピンは同一名の信号アサインを許可
        if (pin.pinType === 'POWER' || pin.pinType === 'GROUND') {
          return; // POWER/GROUNDピンはスキップ
        }
        
        if (!signalMap.has(signalName)) {
          signalMap.set(signalName, []);
        }
        signalMap.get(signalName)!.push(pin);
      }
    });

    // Check for duplicates
    signalMap.forEach((assignedPins, signalName) => {
      if (assignedPins.length > 1) {
        issues.push({
          id: `conflict_${signalName}_${Date.now()}`,
          type: 'pin_conflict',
          severity: 'error',
          title: `Pin Conflict`,
          description: `Signal "${signalName}" is assigned to ${assignedPins.length} pins.`,
          affectedPins: assignedPins.map(p => p.id),
          suggestion: 'Each signal should be assigned to only one pin.',
          autoFixable: false,
          timestamp: Date.now()
        });
      }
    });

    return issues;
  }

  /**
   * 差動ペアチェック - 差動ペアの整合性をチェック
   */
  static checkDifferentialPairs(pins: Pin[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const checkedPairs = new Set<string>();

    pins.forEach(pin => {
      // 差動ペア候補のピンかチェック
      if (!DifferentialPairUtils.isDifferentialPin(pin)) {
        return;
      }

      const pairType = DifferentialPairUtils.getDifferentialPairType(pin.pinName) ||
                       (pin.signalName ? DifferentialPairUtils.getDifferentialPairType(pin.signalName) : null);
      
      if (!pairType) return;

      // 対となるピンを検索
      const pairPin = DifferentialPairUtils.findPairPin(pin, pins);
      const baseName = DifferentialPairUtils.getDifferentialBaseName(pin.pinName);
      
      // Avoid duplicate checks
      const checkKey = `${pin.id}_${pairPin?.id || 'missing'}`;
      if (checkedPairs.has(checkKey)) return;
      checkedPairs.add(checkKey);

      if (!pairPin) {
        // Pair not found
        issues.push({
          id: `diff_pair_incomplete_${pin.id}_${Date.now()}`,
          type: 'differential_pair',
          severity: 'warning',
          title: `Incomplete differential pair: ${baseName}`,
          description: `Pin ${pin.pinNumber} (${pin.pinName}) has no differential pair partner.`,
          affectedPins: [pin.id],
          suggestion: `Find and assign the ${pairType === 'positive' ? 'negative' : 'positive'} side pin in the same bank.`,
          autoFixable: false,
          timestamp: Date.now()
        });
      } else {
        // Check consistency when pair is found
        
        // Bank matching check
        if (pin.bank !== pairPin.bank) {
          issues.push({
            id: `diff_pair_bank_mismatch_${pin.id}_${pairPin.id}_${Date.now()}`,
            type: 'differential_pair',
            severity: 'error',
            title: `Differential pair bank mismatch: ${baseName}`,
            description: `Differential pair pins are in different banks. Pin ${pin.pinNumber} (Bank ${pin.bank}) and Pin ${pairPin.pinNumber} (Bank ${pairPin.bank})`,
            affectedPins: [pin.id, pairPin.id],
            suggestion: 'Differential pair pins should be placed in the same bank.',
            autoFixable: false,
            timestamp: Date.now()
          });
        }

        // Voltage matching check
        if (pin.voltage !== pairPin.voltage) {
          issues.push({
            id: `diff_pair_voltage_mismatch_${pin.id}_${pairPin.id}_${Date.now()}`,
            type: 'differential_pair',
            severity: 'warning',
            title: `Differential pair voltage mismatch: ${baseName}`,
            description: `Differential pair pins have different voltages. Pin ${pin.pinNumber} (${pin.voltage}) and Pin ${pairPin.pinNumber} (${pairPin.voltage})`,
            affectedPins: [pin.id, pairPin.id],
            suggestion: 'Differential pair pins should be set to the same voltage level.',
            autoFixable: false,
            timestamp: Date.now()
          });
        }

        // 信号割り当ての整合性チェック
        const pinHasSignal = pin.signalName && pin.signalName.trim() !== '';
        const pairHasSignal = pairPin.signalName && pairPin.signalName.trim() !== '';

        if (pinHasSignal && pairHasSignal) {
          // 両方に信号が割り当てられている場合、ペア関係をチェック
          const expectedPairSignal = DifferentialPairUtils.getPairPinName(pin.signalName!);
          if (expectedPairSignal && expectedPairSignal.toLowerCase() !== pairPin.signalName!.toLowerCase()) {
            issues.push({
              id: `diff_pair_signal_mismatch_${pin.id}_${pairPin.id}_${Date.now()}`,
              type: 'differential_pair',
              severity: 'warning',
              title: `差動ペアの信号名不一致: ${baseName}`,
              description: `差動ペアの信号名が対応していません。"${pin.signalName}" と "${pairPin.signalName}"`,
              affectedPins: [pin.id, pairPin.id],
              suggestion: `信号名を対応させてください（例: "${pin.signalName}" と "${expectedPairSignal}"）`,
              autoFixable: false,
              timestamp: Date.now()
            });
          }
        } else if (pinHasSignal && !pairHasSignal) {
          // 片方のみ信号が割り当てられている場合
          issues.push({
            id: `diff_pair_incomplete_signal_${pin.id}_${pairPin.id}_${Date.now()}`,
            type: 'differential_pair',
            severity: 'info',
            title: `差動ペアの信号割り当てが片方のみ: ${baseName}`,
            description: `ピン ${pin.pinNumber} には信号 "${pin.signalName}" が割り当てられていますが、ペアのピン ${pairPin.pinNumber} には信号が割り当てられていません。`,
            affectedPins: [pin.id, pairPin.id],
            suggestion: `ペアのピンにも対応する信号を割り当てることを検討してください。`,
            autoFixable: false,
            timestamp: Date.now()
          });
        }
      }
    });

    return issues;
  }

  /**
   * バンク制約チェック（AMD/Xilinx UltraScale準拠）
   */
  static checkBankConstraints(pins: Pin[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const bankMap = new Map<string, Pin[]>();

    // Group pins by bank (only assigned pins)
    pins.forEach(pin => {
      if (pin.bank && pin.signalName && pin.signalName.trim() !== '') {
        if (!bankMap.has(pin.bank)) {
          bankMap.set(pin.bank, []);
        }
        bankMap.get(pin.bank)!.push(pin);
      }
    });

    // Check each bank for AMD/Xilinx UltraScale constraints
    bankMap.forEach((bankPins, bankName) => {
      // 1. VCCO voltage consistency check
      issues.push(...this.checkVCCOConsistency(bankName, bankPins));
      
      // 2. I/O Standard compatibility check  
      issues.push(...this.checkIOStandardCompatibility(bankName, bankPins));
      
      // 3. Differential pair bank constraints
      issues.push(...this.checkDifferentialPairBankConstraints(bankName, bankPins));
      
      // 4. Special function pin constraints
      issues.push(...this.checkSpecialPinConstraints(bankName, bankPins));
      
      // 5. High-speed signal constraints
      issues.push(...this.checkHighSpeedSignalConstraints(bankName, bankPins));
    });

    return issues;
  }

  /**
   * ヘルパー関数: I/O標準をattributesから取得
   */
  private static getIOStandard(pin: Pin): string | undefined {
    return pin.attributes?.['IO_Standard'] || pin.attributes?.['io_standard'] || pin.attributes?.['iostandard'];
  }

  /**
   * VCCO電圧一貫性チェック
   */
  private static checkVCCOConsistency(bankName: string, bankPins: Pin[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const voltages = new Set(
      bankPins
        .map(p => p.voltage)
        .filter(v => v && v !== '' && v !== '0V')
    );

    if (voltages.size > 1) {
      issues.push({
        id: `bank-vcco-${bankName}-${Date.now()}`,
        type: 'bank_constraint',
        severity: 'error',
        title: `VCCO voltage mismatch in Bank ${bankName}`,
        description: `Bank ${bankName} contains pins with different VCCO voltages: ${Array.from(voltages).join(', ')}. All pins in a bank must share the same VCCO.`,
        affectedPins: bankPins.map(p => p.id),
        suggestion: 'Configure all pins in the same bank to use the same VCCO voltage level.',
        autoFixable: false,
        timestamp: Date.now()
      });
    }

    return issues;
  }

  /**
   * I/O標準互換性チェック
   */
  private static checkIOStandardCompatibility(bankName: string, bankPins: Pin[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const ioStandards = bankPins
      .map(p => this.getIOStandard(p))
      .filter(ios => ios && ios !== '');

    if (ioStandards.length === 0) return issues;

    const uniqueStandards = [...new Set(ioStandards)];
    if (uniqueStandards.length <= 1) return issues;

    // AMD/Xilinx UltraScale I/O Standard compatibility rules
    const incompatibleCombinations = [
      // Different voltage families cannot coexist
      {
        group1: ['LVCMOS33', 'LVCMOS25', 'LVCMOS18', 'LVCMOS15', 'LVCMOS12'],
        group2: ['LVDS', 'LVDS_25', 'BLVDS_25', 'MLVDS_25'],
        reason: 'Single-ended and differential standards cannot share the same bank'
      },
      {
        group1: ['SSTL135', 'SSTL125', 'SSTL15'],
        group2: ['POD12', 'POD10'],
        reason: 'SSTL and POD standards require different reference voltages'
      },
      {
        group1: ['HSTL_I', 'HSTL_II', 'HSTL_I_18', 'HSTL_II_18'],
        group2: ['LVCMOS33', 'LVCMOS25'],
        reason: 'HSTL requires center-tap termination, incompatible with LVCMOS'
      },
      {
        group1: ['MIPI_DPHY_DCI'],
        group2: ['LVCMOS18', 'LVCMOS12'],
        reason: 'MIPI DPHY requires dedicated differential signaling'
      }
    ];

    for (const combo of incompatibleCombinations) {
      const hasGroup1 = combo.group1.some(std => uniqueStandards.includes(std));
      const hasGroup2 = combo.group2.some(std => uniqueStandards.includes(std));

      if (hasGroup1 && hasGroup2) {
        const conflictingPins = bankPins.filter(pin => 
          combo.group1.includes(this.getIOStandard(pin) || '') || 
          combo.group2.includes(this.getIOStandard(pin) || '')
        );

        issues.push({
          id: `bank-iostd-conflict-${bankName}-${Date.now()}`,
          type: 'bank_constraint',
          severity: 'error',
          title: `Incompatible I/O standards in Bank ${bankName}`,
          description: `${combo.reason}. Found: ${uniqueStandards.join(', ')}`,
          affectedPins: conflictingPins.map(p => p.id),
          suggestion: 'Separate incompatible I/O standards into different banks.',
          autoFixable: false,
          timestamp: Date.now()
        });
      }
    }

    return issues;
  }

  /**
   * 差動ペアバンク制約チェック
   */
  private static checkDifferentialPairBankConstraints(_bankName: string, bankPins: Pin[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Find differential pairs in this bank
    const diffPairs = new Map<string, Pin[]>();
    
    bankPins.forEach(pin => {
      if (!pin.signalName) return;
      
      const baseName = this.getDifferentialBaseName(pin.signalName);
      if (baseName) {
        if (!diffPairs.has(baseName)) {
          diffPairs.set(baseName, []);
        }
        diffPairs.get(baseName)!.push(pin);
      }
    });

    diffPairs.forEach((pairPins, baseName) => {
      if (pairPins.length === 2) {
        const [pin1, pin2] = pairPins;
        
        // Check if both pins are truly in the same bank
        if (pin1.bank !== pin2.bank) {
          issues.push({
            id: `diff-pair-bank-cross-${baseName}-${Date.now()}`,
            type: 'differential_pair',
            severity: 'error',
            title: `Differential pair crosses bank boundary`,
            description: `Differential pair "${baseName}" has pins in different banks: ${pin1.pinNumber} (Bank ${pin1.bank}) and ${pin2.pinNumber} (Bank ${pin2.bank})`,
            affectedPins: [pin1.id, pin2.id],
            suggestion: 'Place both pins of a differential pair in the same bank.',
            autoFixable: false,
            timestamp: Date.now()
          });
        }

        // Check I/O standard compatibility for differential pairs
        const ios1 = this.getIOStandard(pin1);
        const ios2 = this.getIOStandard(pin2);
        if (ios1 && ios2 && ios1 !== ios2) {
          issues.push({
            id: `diff-pair-iostd-${baseName}-${Date.now()}`,
            type: 'differential_pair',
            severity: 'error',
            title: `Differential pair I/O standard mismatch`,
            description: `Differential pair "${baseName}" has mismatched I/O standards: ${ios1} vs ${ios2}`,
            affectedPins: [pin1.id, pin2.id],
            suggestion: 'Use the same I/O standard for both pins in a differential pair.',
            autoFixable: false,
            timestamp: Date.now()
          });
        }
      }
    });

    return issues;
  }

  /**
   * 特殊機能ピン制約チェック
   */
  private static checkSpecialPinConstraints(bankName: string, bankPins: Pin[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Identify special function pins
    const specialPins = bankPins.filter(pin => 
      pin.pinType?.includes('CLOCK') || 
      pin.pinType?.includes('GLOBAL') ||
      pin.pinType?.includes('CONFIG') ||
      pin.pinName?.startsWith('IO_L') && pin.pinName?.includes('CC') // Clock capable pins
    );

    const regularPins = bankPins.filter(pin => !specialPins.includes(pin));

    if (specialPins.length > 0 && regularPins.length > 0) {
      // Check for high-speed clocks mixed with regular I/O
      const clockPins = specialPins.filter(pin => 
        pin.signalName?.toLowerCase().includes('clk') ||
        pin.signalName?.toLowerCase().includes('clock')
      );

      if (clockPins.length > 0) {
        const highSpeedClocks = clockPins.filter(pin =>
          pin.signalName?.includes('100') || // 100MHz+
          pin.signalName?.includes('200') ||
          pin.signalName?.includes('GHz') ||
          this.getIOStandard(pin)?.includes('LVDS')
        );

        if (highSpeedClocks.length > 0 && regularPins.length > 0) {
          issues.push({
            id: `bank-clock-isolation-${bankName}-${Date.now()}`,
            type: 'bank_constraint',
            severity: 'warning',
            title: `High-speed clocks mixed with regular I/O in Bank ${bankName}`,
            description: `High-speed clock signals may cause noise coupling with regular I/O signals`,
            affectedPins: [...highSpeedClocks.map(p => p.id), ...regularPins.slice(0, 3).map(p => p.id)],
            suggestion: 'Consider isolating high-speed clock signals in dedicated banks.',
            autoFixable: false,
            timestamp: Date.now()
          });
        }
      }
    }

    return issues;
  }

  /**
   * 高速信号制約チェック
   */
  private static checkHighSpeedSignalConstraints(bankName: string, bankPins: Pin[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Identify high-speed signals
    const highSpeedSignals = bankPins.filter(pin => {
      const signal = pin.signalName?.toLowerCase() || '';
      return signal.includes('ddr') ||
             signal.includes('pcie') ||
             signal.includes('serdes') ||
             signal.includes('mgt') ||
             signal.includes('lvds') ||
             this.getIOStandard(pin)?.includes('LVDS') ||
             this.getIOStandard(pin)?.includes('SSTL') ||
             this.getIOStandard(pin)?.includes('POD');
    });

    const lowSpeedSignals = bankPins.filter(pin => {
      const signal = pin.signalName?.toLowerCase() || '';
      return (signal.includes('gpio') ||
              signal.includes('led') ||
              signal.includes('button') ||
              this.getIOStandard(pin)?.includes('LVCMOS')) &&
             !highSpeedSignals.includes(pin);
    });

    if (highSpeedSignals.length > 0 && lowSpeedSignals.length > 0) {
      issues.push({
        id: `bank-speed-mix-${bankName}-${Date.now()}`,
        type: 'bank_constraint',
        severity: 'warning',
        title: `Mixed signal speeds in Bank ${bankName}`,
        description: `Bank ${bankName} contains both high-speed (${highSpeedSignals.length}) and low-speed (${lowSpeedSignals.length}) signals`,
        affectedPins: [...highSpeedSignals.slice(0, 2).map(p => p.id), ...lowSpeedSignals.slice(0, 2).map(p => p.id)],
        suggestion: 'Consider grouping signals by speed to minimize noise coupling.',
        autoFixable: false,
        timestamp: Date.now()
      });
    }

    return issues;
  }

  /**
   * 差動ペアのベース名を取得
   */
  private static getDifferentialBaseName(signalName: string): string | null {
    const name = signalName.toLowerCase();
    
    // _P/_N suffix
    if (name.endsWith('_p') || name.endsWith('_n')) {
      return signalName.slice(0, -2);
    }
    
    // +/- suffix
    if (name.endsWith('+') || name.endsWith('-')) {
      return signalName.slice(0, -1);
    }
    
    // Single character P/N
    if ((name.endsWith('p') && !name.endsWith('_p')) || 
        (name.endsWith('n') && !name.endsWith('_n'))) {
      const beforeChar = name.charAt(name.length - 2);
      if (/[\d_-]/.test(beforeChar)) {
        return signalName.slice(0, -1);
      }
    }
    
    return null;
  }

  /**
   * 検証結果サマリーを計算
   */
  private static calculateSummary(issues: ValidationIssue[]) {
    const summary = {
      totalIssues: issues.length,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0
    };

    issues.forEach(issue => {
      switch (issue.severity) {
        case 'error':
          summary.errorCount++;
          break;
        case 'warning':
          summary.warningCount++;
          break;
        case 'info':
          summary.infoCount++;
          break;
      }
    });

    return summary;
  }

  /**
   * 検証結果リスナーを追加
   */
  static addListener(callback: (_result: ValidationResult) => void) {
    this.listeners.add(callback);
  }

  /**
   * 検証結果リスナーを削除
   */
  static removeListener(callback: (_result: ValidationResult) => void) {
    this.listeners.delete(callback);
  }

  /**
   * Get issues related to a specific pin
   */
  static getIssuesForPin(pinId: string, issues: ValidationIssue[]): ValidationIssue[] {
    return issues.filter(issue => issue.affectedPins.includes(pinId));
  }

  /**
   * Get issues by type
   */
  static getIssuesByType(type: ValidationIssue['type'], issues: ValidationIssue[]): ValidationIssue[] {
    return issues.filter(issue => issue.type === type);
  }

  /**
   * 重要度別の問題を取得
   */
  static getIssuesBySeverity(severity: ValidationSeverity, issues: ValidationIssue[]): ValidationIssue[] {
    return issues.filter(issue => issue.severity === severity);
  }
}
