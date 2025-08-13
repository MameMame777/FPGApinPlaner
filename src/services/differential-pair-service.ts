// 差動ペア管理サービス
import { 
  Pin, 
  DifferentialPairGroup, 
  DifferentialConstraints, 
  DifferentialValidationResult,
  DifferentialPairTemplate 
} from '../types/core';

// 簡単なUUID生成関数
function generateId(): string {
  return 'dp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
}

export class DifferentialPairService {
  private static differentialPairs: Map<string, DifferentialPairGroup> = new Map();
  private static templates: Map<string, DifferentialPairTemplate> = new Map();
  
  static {
    // 組み込みテンプレートの初期化
    this.initializeBuiltInTemplates();
  }

  /**
   * 差動ペアを作成
   */
  static createDifferentialPair(
    name: string,
    positivePin: Pin,
    negativePin: Pin,
    constraints?: DifferentialConstraints,
    category: 'LVDS' | 'TMDS' | 'MIPI' | 'CUSTOM' = 'CUSTOM'
  ): Result<DifferentialPairGroup, string> {
    // バリデーション
    const validation = this.validateDifferentialPair(positivePin, negativePin, constraints);
    
    const pair: DifferentialPairGroup = {
      id: generateId(),
      name,
      positivePinId: positivePin.id,
      negativePinId: negativePin.id,
      constraints,
      verified: validation.isValid,
      status: validation.isValid ? 'valid' : (validation.warnings.length > 0 ? 'warning' : 'invalid'),
      errors: validation.errors,
      warnings: validation.warnings,
      category,
      created: new Date(),
      modified: new Date()
    };

    this.differentialPairs.set(pair.id, pair);
    
    return {
      success: true,
      data: pair
    };
  }

  /**
   * 差動ペアを削除
   */
  static deleteDifferentialPair(pairId: string): boolean {
    return this.differentialPairs.delete(pairId);
  }

  /**
   * 差動ペアを更新
   */
  static updateDifferentialPair(
    pairId: string,
    updates: Partial<Omit<DifferentialPairGroup, 'id' | 'created'>>
  ): Result<DifferentialPairGroup, string> {
    const existingPair = this.differentialPairs.get(pairId);
    if (!existingPair) {
      return {
        success: false,
        error: 'Differential pair not found'
      };
    }

    const updatedPair: DifferentialPairGroup = {
      ...existingPair,
      ...updates,
      modified: new Date()
    };

    this.differentialPairs.set(pairId, updatedPair);
    
    return {
      success: true,
      data: updatedPair
    };
  }

  /**
   * 全差動ペアを取得
   */
  static getAllDifferentialPairs(): DifferentialPairGroup[] {
    return Array.from(this.differentialPairs.values());
  }

  /**
   * 特定の差動ペアを取得
   */
  static getDifferentialPair(pairId: string): DifferentialPairGroup | undefined {
    return this.differentialPairs.get(pairId);
  }

  /**
   * ピンが差動ペアに属しているかチェック
   */
  static isPinInDifferentialPair(pinId: string): DifferentialPairGroup | null {
    for (const pair of this.differentialPairs.values()) {
      if (pair.positivePinId === pinId || pair.negativePinId === pinId) {
        return pair;
      }
    }
    return null;
  }

  /**
   * 差動ペアのバリデーション
   */
  static validateDifferentialPair(
    positivePin: Pin,
    negativePin: Pin,
    constraints?: DifferentialConstraints
  ): DifferentialValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 基本チェック
    if (positivePin.id === negativePin.id) {
      errors.push('Positive and negative pins cannot be the same');
    }

    // 既存の差動ペアチェック
    if (this.isPinInDifferentialPair(positivePin.id)) {
      errors.push(`Positive pin ${positivePin.pinNumber} is already part of another differential pair`);
    }
    if (this.isPinInDifferentialPair(negativePin.id)) {
      errors.push(`Negative pin ${negativePin.pinNumber} is already part of another differential pair`);
    }

    // バンク互換性チェック
    const bankCompatibility = this.checkBankCompatibility(positivePin, negativePin);
    if (!bankCompatibility.compatible) {
      errors.push(`Bank incompatibility: ${bankCompatibility.reason}`);
    }

    // 電圧互換性チェック
    if (positivePin.voltage !== negativePin.voltage) {
      warnings.push(`Voltage mismatch: ${positivePin.voltage} vs ${negativePin.voltage}`);
    }

    // 物理的近接性チェック
    const proximity = this.checkPhysicalProximity(positivePin, negativePin);
    if (!proximity.acceptable) {
      warnings.push(`Pins are physically distant (${proximity.distance.toFixed(2)} units apart)`);
      suggestions.push('Consider using pins that are physically closer for better signal integrity');
    }

    // I/Oタイプ互換性
    if (positivePin.ioType !== negativePin.ioType) {
      warnings.push(`Different I/O types: ${positivePin.ioType} vs ${negativePin.ioType}`);
    }

    // 制約チェック
    if (constraints) {
      this.validateConstraints(constraints, positivePin, negativePin, warnings, suggestions);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      bankCompatibility: bankCompatibility.compatible,
      voltageCompatibility: positivePin.voltage === negativePin.voltage,
      physicalProximity: proximity
    };
  }

  /**
   * バンク互換性チェック
   */
  private static checkBankCompatibility(pin1: Pin, pin2: Pin): { compatible: boolean; reason?: string } {
    // 差動ペアは必ず同じバンク内でなければならない
    if (pin1.bank !== pin2.bank) {
      return { 
        compatible: false, 
        reason: `Differential pairs must be in the same bank. Pin1: Bank ${pin1.bank}, Pin2: Bank ${pin2.bank}` 
      };
    }

    return { compatible: true };
  }

  /**
   * 物理的近接性チェック
   */
  private static checkPhysicalProximity(pin1: Pin, pin2: Pin): { distance: number; acceptable: boolean } {
    const dx = pin1.position.x - pin2.position.x;
    const dy = pin1.position.y - pin2.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 距離しきい値（調整可能）
    const maxAcceptableDistance = 50; // ピクセル単位

    return {
      distance,
      acceptable: distance <= maxAcceptableDistance
    };
  }

  /**
   * 制約バリデーション
   */
  private static validateConstraints(
    constraints: DifferentialConstraints,
    _positivePin: Pin,
    _negativePin: Pin,
    warnings: string[],
    suggestions: string[]
  ): void {
    // インピーダンス値チェック
    if (constraints.impedance && (constraints.impedance < 25 || constraints.impedance > 120)) {
      warnings.push(`Unusual single-ended impedance: ${constraints.impedance}Ω (typical range: 25-120Ω)`);
    }

    if (constraints.diffImpedance && (constraints.diffImpedance < 50 || constraints.diffImpedance > 200)) {
      warnings.push(`Unusual differential impedance: ${constraints.diffImpedance}Ω (typical range: 50-200Ω)`);
    }

    // スキュー制約
    if (constraints.maxSkew && constraints.maxSkew > 1000) {
      warnings.push(`High skew tolerance: ${constraints.maxSkew}ps`);
      suggestions.push('Consider tightening skew requirements for high-speed signals');
    }

    // ルーティング制約
    if (constraints.routingRules) {
      const rules = constraints.routingRules;
      
      if (rules.maxLength && rules.maxLength > 100) {
        suggestions.push('Long routing length may affect signal integrity');
      }

      if (rules.viaCount && rules.viaCount > 2) {
        warnings.push(`High via count (${rules.viaCount}) may introduce impedance discontinuities`);
      }
    }
  }

  /**
   * 差動ペアの自動検出
   */
  static autoDetectDifferentialPairs(pins: Pin[]): DifferentialPairGroup[] {
    const detectedPairs: DifferentialPairGroup[] = [];
    const usedPins = new Set<string>();

    // 信号名パターンによる検出
    for (const pin of pins) {
      if (usedPins.has(pin.id) || !pin.signalName) continue;

      const matches = this.findDifferentialPairMatches(pin, pins);
      for (const match of matches) {
        if (!usedPins.has(match.id)) {
          const pair = this.createDifferentialPair(
            `${pin.signalName}_PAIR`,
            pin,
            match,
            undefined,
            'CUSTOM'
          );

          if (pair.success) {
            detectedPairs.push(pair.data);
            usedPins.add(pin.id);
            usedPins.add(match.id);
            break;
          }
        }
      }
    }

    return detectedPairs;
  }

  /**
   * 信号名パターンによる差動ペア候補検索
   */
  private static findDifferentialPairMatches(pin: Pin, allPins: Pin[]): Pin[] {
    const signalName = pin.signalName.toLowerCase();
    const matches: Pin[] = [];

    // パターン1: _P/_N suffix
    if (signalName.endsWith('_p')) {
      const baseName = signalName.slice(0, -2);
      const negativeName = baseName + '_n';
      matches.push(...allPins.filter(p => 
        p.signalName.toLowerCase() === negativeName &&
        p.bank === pin.bank // 同じバンク内のみ
      ));
    } else if (signalName.endsWith('_n')) {
      const baseName = signalName.slice(0, -2);
      const positiveName = baseName + '_p';
      matches.push(...allPins.filter(p => 
        p.signalName.toLowerCase() === positiveName &&
        p.bank === pin.bank // 同じバンク内のみ
      ));
    }

    // パターン2: +/- suffix
    if (signalName.endsWith('+')) {
      const baseName = signalName.slice(0, -1);
      const negativeName = baseName + '-';
      matches.push(...allPins.filter(p => 
        p.signalName.toLowerCase() === negativeName &&
        p.bank === pin.bank // 同じバンク内のみ
      ));
    } else if (signalName.endsWith('-')) {
      const baseName = signalName.slice(0, -1);
      const positiveName = baseName + '+';
      matches.push(...allPins.filter(p => 
        p.signalName.toLowerCase() === positiveName &&
        p.bank === pin.bank // 同じバンク内のみ
      ));
    }

    // パターン3: 数字による区別 (CLK0/CLK1)
    const numberMatch = signalName.match(/^(.+?)(\d+)$/);
    if (numberMatch) {
      const baseName = numberMatch[1];
      const number = parseInt(numberMatch[2]);
      
      // 偶数->奇数、奇数->偶数 のペアを探す
      const pairNumber = number % 2 === 0 ? number + 1 : number - 1;
      const pairName = baseName + pairNumber;
      matches.push(...allPins.filter(p => 
        p.signalName.toLowerCase() === pairName &&
        p.bank === pin.bank // 同じバンク内のみ
      ));
    }

    return matches;
  }

  /**
   * テンプレートから差動ペアを作成
   */
  static createFromTemplate(
    templateId: string,
    name: string,
    positivePin: Pin,
    negativePin: Pin
  ): Result<DifferentialPairGroup, string> {
    const template = this.templates.get(templateId);
    if (!template) {
      return {
        success: false,
        error: 'Template not found'
      };
    }

    return this.createDifferentialPair(
      name,
      positivePin,
      negativePin,
      template.constraints,
      template.category
    );
  }

  /**
   * 組み込みテンプレートを初期化
   */
  private static initializeBuiltInTemplates(): void {
    const templates: DifferentialPairTemplate[] = [
      {
        id: 'lvds_100',
        name: 'LVDS 100Ω',
        category: 'LVDS',
        isBuiltIn: true,
        description: '標準LVDS差動ペア (100Ω差動インピーダンス)',
        constraints: {
          diffImpedance: 100,
          impedance: 50,
          ioStandard: 'LVDS',
          maxSkew: 100,
          slewRate: 'FAST'
        }
      },
      {
        id: 'tmds_100',
        name: 'TMDS 100Ω',
        category: 'TMDS',
        isBuiltIn: true,
        description: 'TMDS差動ペア (HDMI/DisplayPort用)',
        constraints: {
          diffImpedance: 100,
          impedance: 50,
          ioStandard: 'TMDS_33',
          maxSkew: 50,
          slewRate: 'FAST'
        }
      },
      {
        id: 'mipi_100',
        name: 'MIPI-CSI/DSI 100Ω',
        category: 'MIPI',
        isBuiltIn: true,
        description: 'MIPI CSI/DSI差動ペア',
        constraints: {
          diffImpedance: 100,
          impedance: 50,
          maxSkew: 200,
          terminationResistor: 100,
          routingRules: {
            maxLength: 50,
            minSpacing: 0.1
          }
        }
      }
    ];

    for (const template of templates) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * 全テンプレートを取得
   */
  static getAllTemplates(): DifferentialPairTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * カスタムテンプレートを追加
   */
  static addCustomTemplate(template: Omit<DifferentialPairTemplate, 'id' | 'isBuiltIn'>): string {
    const id = generateId();
    const customTemplate: DifferentialPairTemplate = {
      ...template,
      id,
      isBuiltIn: false
    };

    this.templates.set(id, customTemplate);
    return id;
  }

  /**
   * テンプレートを削除（カスタムのみ）
   */
  static deleteTemplate(templateId: string): boolean {
    const template = this.templates.get(templateId);
    if (!template || template.isBuiltIn) {
      return false;
    }

    return this.templates.delete(templateId);
  }

  /**
   * XDC制約の生成
   */
  static generateXDCConstraints(pairId: string): string {
    const pair = this.differentialPairs.get(pairId);
    if (!pair) {
      return '';
    }

    const constraints: string[] = [];
    
    if (pair.constraints?.ioStandard) {
      constraints.push(`set_property IOSTANDARD ${pair.constraints.ioStandard} [get_ports {${pair.name}_p ${pair.name}_n}]`);
    }

    if (pair.constraints?.diffImpedance) {
      constraints.push(`# Differential impedance: ${pair.constraints.diffImpedance}Ω`);
    }

    if (pair.constraints?.maxSkew) {
      constraints.push(`set_property DIFF_TERM TRUE [get_ports {${pair.name}_p ${pair.name}_n}]`);
      constraints.push(`# Maximum skew: ${pair.constraints.maxSkew}ps`);
    }

    if (pair.constraints?.slewRate && pair.constraints.slewRate !== '---SlewRate---') {
      constraints.push(`set_property SLEW ${pair.constraints.slewRate} [get_ports {${pair.name}_p ${pair.name}_n}]`);
    }

    return constraints.join('\n');
  }

  /**
   * 差動ペア統計を取得
   */
  static getStatistics(): {
    total: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    validationSummary: {
      valid: number;
      warnings: number;
      errors: number;
    };
  } {
    const pairs = this.getAllDifferentialPairs();
    
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const validationSummary = { valid: 0, warnings: 0, errors: 0 };

    for (const pair of pairs) {
      // カテゴリ別統計
      byCategory[pair.category || 'CUSTOM'] = (byCategory[pair.category || 'CUSTOM'] || 0) + 1;
      
      // ステータス別統計
      byStatus[pair.status] = (byStatus[pair.status] || 0) + 1;
      
      // バリデーション統計
      if (pair.status === 'valid') validationSummary.valid++;
      else if (pair.status === 'warning') validationSummary.warnings++;
      else validationSummary.errors++;
    }

    return {
      total: pairs.length,
      byCategory,
      byStatus,
      validationSummary
    };
  }
}

// ヘルパー型
type Result<T, E> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};
