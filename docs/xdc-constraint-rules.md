# XDC制約の適用ルール - Input vs Output ピン

## 問題の背景

ユーザーから指摘された通り、`set_property DRIVE` はInputピンには不要で、OutputまたはInOut（双方向）ピンにのみ適用されるべきです。

## XDC制約の適用ルール

### DRIVE プロパティ
- **適用対象**: Output, InOut ピンのみ
- **適用不要**: Input ピン
- **理由**: Inputピンは信号を駆動しないため、Drive強度の設定は無意味

### SLEW プロパティ
- **適用対象**: Output, InOut ピンのみ  
- **適用不要**: Input ピン
- **理由**: Inputピンは信号を駆動しないため、Slew Rate制御は無意味

### IOSTANDARD プロパティ
- **適用対象**: 全てのピン (Input, Output, InOut)
- **理由**: 電圧レベルと互換性の定義に必要

## 修正前のコード

```typescript
// 問題のあるコード - ピン方向を考慮せず全てに適用
if (driveStrength && driveStrength !== '---DriveStrength---') {
  lines.push(`set_property DRIVE ${driveStrength} [get_ports ${pin.signalName}]`);
}

if (slewRate && slewRate !== '---SlewRate---') {
  lines.push(`set_property SLEW ${slewRate} [get_ports ${pin.signalName}]`);
}
```

## 修正後のコード

```typescript
// 正しいコード - ピン方向を考慮
const driveStrength = pin.attributes?.['Drive_Strength'];
if (driveStrength && driveStrength !== '---DriveStrength---') {
  if (pin.direction === 'Output' || pin.direction === 'InOut') {
    lines.push(`set_property DRIVE ${driveStrength} [get_ports ${pin.signalName}]`);
  }
}

const slewRate = pin.attributes?.['Slew_Rate'];
if (slewRate && slewRate !== '---SlewRate---') {
  if (pin.direction === 'Output' || pin.direction === 'InOut') {
    lines.push(`set_property SLEW ${slewRate} [get_ports ${pin.signalName}]`);
  }
}
```

## XDC出力例

### Input ピンの場合
```xdc
# Inputピン - DRIVEとSLEWは出力されない
set_property PACKAGE_PIN A1 [get_ports input_signal]
set_property IOSTANDARD LVCMOS33 [get_ports input_signal]
```

### Output ピンの場合
```xdc
# Outputピン - 全てのプロパティが出力される
set_property PACKAGE_PIN B1 [get_ports output_signal]
set_property IOSTANDARD LVCMOS33 [get_ports output_signal]
set_property DRIVE 12 [get_ports output_signal]
set_property SLEW FAST [get_ports output_signal]
```

## 技術的根拠

1. **DRIVE強度**: 出力バッファが駆動できる電流量を制御
   - Inputピンには出力バッファがないため適用不可

2. **SLEW Rate**: 出力信号の立ち上がり/立ち下がり速度を制御
   - Inputピンは信号を駆動しないため適用不可

3. **IOSTANDARD**: 電圧レベルと信号規格を定義
   - Input/Output関係なく、インターフェース仕様として必要

## この修正により

- ✅ **適切なXDC生成**: ピン方向に応じた正確な制約
- ✅ **Vivado互換性**: ツールでエラーや警告が発生しない
- ✅ **設計の明確性**: 意図がはっきりしたXDCファイル
- ✅ **ベストプラクティス**: 業界標準に準拠
