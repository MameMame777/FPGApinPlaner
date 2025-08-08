// デバッグ用のテストスクリプト
// ブラウザのコンソールで実行して状態を確認

console.log('=== FPGA Pin Planner Debug Test ===');

// 現在の状態をチェック
const debugState = () => {
  const store = window.__ZUSTAND_STORE__;
  if (store) {
    const state = store.getState();
    console.log('📊 Current Store State:');
    console.log('- pins.length:', state.pins?.length || 0);
    console.log('- filteredPins.length:', state.filteredPins?.length || 0);
    console.log('- package:', state.package?.name || 'None');
    console.log('- selectedPins:', state.selectedPins?.size || 0);
    
    // 保存/エクスポート機能のチェック
    console.log('\n🔧 Testing Export Functions:');
    
    // pinsとfilteredPinsの内容を詳しくチェック
    console.log('\n📋 Pins Analysis:');
    const pins = state.pins || [];
    const filteredPins = state.filteredPins || [];
    
    console.log('pins sample (first 3):', pins.slice(0, 3).map(p => ({
      id: p.id,
      pinNumber: p.pinNumber,
      signalName: p.signalName
    })));
    
    console.log('filteredPins sample (first 3):', filteredPins.slice(0, 3).map(p => ({
      id: p.id, 
      pinNumber: p.pinNumber,
      signalName: p.signalName
    })));
    
    return {
      pins: pins.length,
      filteredPins: filteredPins.length,
      package: state.package?.name,
      hasData: pins.length > 0 || filteredPins.length > 0
    };
  } else {
    console.log('❌ Zustand store not found');
    return null;
  }
};

// 関数をグローバルに公開
window.debugState = debugState;

console.log('✅ Debug functions loaded. Use debugState() to check current state.');
