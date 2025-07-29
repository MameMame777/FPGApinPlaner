# Sample Data Directory

このディレクトリには、FPGA Pin Planner GUI Toolのサンプルデータが含まれています。

## ファイル一覧

### sample-pins.csv
基本的なFPGAピン配置のサンプルデータです。以下の情報を含みます：

- **Pin**: ピン番号（1-24）
- **Signal**: 信号名（CLK_IN, DATA_OUT[0]など）
- **Direction**: 信号方向（Input/Output/InOut/Power/Ground）
- **Voltage**: 電圧レベル（3.3V/1.8V/0V）
- **Package_Pin**: パッケージピン名（A1, B2など）
- **Row**: Y軸座標（A, B, C...）
- **Col**: X軸座標（1, 2, 3...）

### データ形式

CSVファイルのヘッダー形式：
```csv
Pin,Signal,Direction,Voltage,Package_Pin,Row,Col
```

### 使用例

1. アプリケーションでサンプルファイルを開く
2. ピン配置を確認・編集
3. XDC/SDC形式で制約ファイルを出力

### パッケージタイプ

このサンプルは24ピンの小規模なパッケージを想定しています：
- 8行 × 3列のグリッド配置
- 混在した信号タイプ（デジタル/電源/通信インターフェース）
- 複数の電圧レベル対応