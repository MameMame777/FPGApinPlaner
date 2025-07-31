// 差動ペア検出ユーティリティ
import { Pin } from '../types/core';

export class DifferentialPairUtils {
  /**
   * ピン名から差動ペアのタイプを判定
   */
  static getDifferentialPairType(pinName: string): 'positive' | 'negative' | null {
    const name = pinName.toLowerCase();
    
    // _P/_N suffix (Xilinxスタイル)
    if (name.endsWith('_p')) return 'positive';
    if (name.endsWith('_n')) return 'negative';
    
    // +/- suffix
    if (name.endsWith('+')) return 'positive';
    if (name.endsWith('-')) return 'negative';
    
    // P/N suffix (単一文字)
    if (name.endsWith('p') && !name.endsWith('_p')) {
      // 最後の文字がPで、その前が数字や区切り文字の場合
      const beforeP = name.charAt(name.length - 2);
      if (/[\d_-]/.test(beforeP)) return 'positive';
    }
    if (name.endsWith('n') && !name.endsWith('_n')) {
      // 最後の文字がNで、その前が数字や区切り文字の場合
      const beforeN = name.charAt(name.length - 2);
      if (/[\d_-]/.test(beforeN)) return 'negative';
    }
    
    // LVDS style patterns (例: IO_L1P_T0, IO_L1N_T0, IO_L6P_T0_34, IO_L6N_T0_VREF_34)
    const lvdsMatch = name.match(/^(.+_l\d+)([pn])(_.*)?$/);
    if (lvdsMatch) {
      const polarity = lvdsMatch[2];
      
      // コンソールログを無効化（パフォーマンス改善のため）
      // console.log(`🔍 LVDS pattern detected: ${pinName} -> ${polarity === 'p' ? 'positive' : 'negative'}`);
      
      if (polarity === 'p') return 'positive';
      if (polarity === 'n') return 'negative';
    }
    
    return null;
  }

  /**
   * 差動ペアの対となるピン名を生成
   */
  static getPairPinName(pinName: string): string | null {
    const name = pinName.toLowerCase();
    const originalCase = pinName;
    
    // _P/_N suffix (Xilinxスタイル)
    if (name.endsWith('_p')) {
      return originalCase.slice(0, -2) + '_N';
    }
    if (name.endsWith('_n')) {
      return originalCase.slice(0, -2) + '_P';
    }
    
    // +/- suffix
    if (name.endsWith('+')) {
      return originalCase.slice(0, -1) + '-';
    }
    if (name.endsWith('-')) {
      return originalCase.slice(0, -1) + '+';
    }
    
    // P/N suffix (単一文字)
    if (name.endsWith('p') && !name.endsWith('_p')) {
      const beforeP = name.charAt(name.length - 2);
      if (/[\d_-]/.test(beforeP)) {
        return originalCase.slice(0, -1) + 'N';
      }
    }
    if (name.endsWith('n') && !name.endsWith('_n')) {
      const beforeN = name.charAt(name.length - 2);
      if (/[\d_-]/.test(beforeN)) {
        return originalCase.slice(0, -1) + 'P';
      }
    }
    
    // LVDS style patterns (例: IO_L1P_T0 -> IO_L1N_T0, IO_L6P_T0_34 -> IO_L6N_T0_VREF_34)
    const lvdsMatch = originalCase.match(/^(.+_L\d+)([PN])(_.*)?$/i);
    if (lvdsMatch) {
      const baseName = lvdsMatch[1];
      const polarity = lvdsMatch[2].toUpperCase();
      const suffix = lvdsMatch[3] || '';
      
      if (polarity === 'P') {
        // For negative pins, we need to check if there might be a VREF variant
        return baseName + 'N' + suffix;
      }
      if (polarity === 'N') {
        return baseName + 'P' + suffix;
      }
    }
    
    // 数字による区別 (CLK0/CLK1)
    const numberMatch = name.match(/^(.+?)(\d+)$/);
    if (numberMatch) {
      const baseName = numberMatch[1];
      const number = parseInt(numberMatch[2]);
      
      // 偶数->奇数、奇数->偶数
      const pairNumber = number % 2 === 0 ? number + 1 : number - 1;
      
      // 元の大文字小文字を保持
      const baseOriginal = originalCase.substring(0, baseName.length);
      return baseOriginal + pairNumber;
    }
    
    return null;
  }

  /**
   * 差動ペアの対となるピンを検索
   */
  static findPairPin(pin: Pin, allPins: Pin[]): Pin | null {
    // まずピン名（物理ピン名）で検索 - これを優先
    const pairPinName = this.getPairPinName(pin.pinName);
    if (pairPinName) {
      const pairPin = allPins.find(p => 
        p.pinName.toLowerCase() === pairPinName.toLowerCase() &&
        p.bank === pin.bank // 同じバンク内でのみ検索
      );
      if (pairPin) return pairPin;
    }

    // LVDS パターンでより柔軟な検索（suffix が異なる場合）
    const lvdsMatch = pin.pinName.match(/^(.+_L\d+)([PN])(_.*)?$/i);
    if (lvdsMatch) {
      const baseName = lvdsMatch[1];
      const polarity = lvdsMatch[2].toUpperCase();
      const targetPolarity = polarity === 'P' ? 'N' : 'P';
      
      // 同じベース名で異なる極性のピンを検索（同じバンク内のみ）
      const pairPin = allPins.find(p => {
        if (p.bank !== pin.bank) return false; // バンクが異なる場合は除外
        
        const pairMatch = p.pinName.match(/^(.+_L\d+)([PN])(_.*)?$/i);
        if (pairMatch) {
          const pairBaseName = pairMatch[1];
          const pairPolarity = pairMatch[2].toUpperCase();
          return pairBaseName.toLowerCase() === baseName.toLowerCase() && 
                 pairPolarity === targetPolarity;
        }
        return false;
      });
      if (pairPin) return pairPin;
    }

    // 次に信号名で検索（割り当て済みの場合）
    if (pin.signalName) {
      const pairSignalName = this.getPairPinName(pin.signalName);
      if (pairSignalName) {
        const pairPin = allPins.find(p => 
          p.signalName && p.signalName.toLowerCase() === pairSignalName.toLowerCase() &&
          p.bank === pin.bank // 同じバンク内でのみ検索
        );
        if (pairPin) return pairPin;
      }
    }

    return null;
  }

  /**
   * ピンが差動ペアかどうかを判定
   */
  static isDifferentialPin(pin: Pin): boolean {
    // まずピン名（物理ピン名）で判定 - これを優先
    if (this.getDifferentialPairType(pin.pinName) !== null) {
      return true;
    }
    
    // 次に信号名で判定（割り当て済みの場合）
    if (pin.signalName && this.getDifferentialPairType(pin.signalName) !== null) {
      return true;
    }
    
    return false;
  }

  /**
   * 差動ペアのベース名を取得
   */
  static getDifferentialBaseName(pinName: string): string {
    const name = pinName.toLowerCase();
    
    // _P/_N suffix
    if (name.endsWith('_p') || name.endsWith('_n')) {
      return pinName.slice(0, -2);
    }
    
    // +/- suffix
    if (name.endsWith('+') || name.endsWith('-')) {
      return pinName.slice(0, -1);
    }
    
    // 数字による区別
    const numberMatch = name.match(/^(.+?)(\d+)$/);
    if (numberMatch) {
      return pinName.substring(0, numberMatch[1].length);
    }
    
    return pinName;
  }

  /**
   * 差動ペアの優先順位を取得（正側を優先）
   */
  static getDifferentialPriority(pin: Pin): number {
    // まずピン名（物理ピン名）を優先
    const pinType = this.getDifferentialPairType(pin.pinName);
    const signalType = pin.signalName ? this.getDifferentialPairType(pin.signalName) : null;
    
    const type = pinType || signalType;
    
    if (type === 'positive') return 1; // 正側を最初に
    if (type === 'negative') return 2; // 負側を次に
    
    return 3; // その他
  }
}
