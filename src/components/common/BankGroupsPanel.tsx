import React, { useMemo, useState } from 'react';
import { Pin } from '../../types';
import { BankStatsService } from '../../services/bank-stats-service';
import { getOptimizedBankColor } from '../../utils/bank-color-utils';

interface BankGroupsPanelProps {
  pins: Pin[];
  // 将来的に使用予定のプロパティ
  // onPinSelect?: (pinId: string) => void;
  // selectedPins?: Set<string>;
}

export const BankGroupsPanel: React.FC<BankGroupsPanelProps> = ({
  pins,
}) => {
  const [expandedBank, setExpandedBank] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'bankId' | 'utilization' | 'totalPins'>('bankId');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Bank統計を計算
  const bankSummary = useMemo(() => {
    return BankStatsService.calculateBankStatistics(pins);
  }, [pins]);

  // ソート済みのBank統計
  const sortedBankStats = useMemo(() => {
    const sorted = [...bankSummary.bankStats];
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'bankId':
          if (a.bankId === 'UNASSIGNED') comparison = 1;
          else if (b.bankId === 'UNASSIGNED') comparison = -1;
          else {
            const aNum = parseInt(a.bankId);
            const bNum = parseInt(b.bankId);
            if (!isNaN(aNum) && !isNaN(bNum)) {
              comparison = aNum - bNum;
            } else {
              comparison = a.bankId.localeCompare(b.bankId);
            }
          }
          break;
        case 'utilization':
          comparison = a.utilizationRate - b.utilizationRate;
          break;
        case 'totalPins':
          comparison = a.totalPins - b.totalPins;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [bankSummary.bankStats, sortBy, sortOrder]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleExportCSV = () => {
    const csv = BankStatsService.exportBankStatisticsCSV(bankSummary);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank-statistics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const recommendations = useMemo(() => {
    return BankStatsService.generateRecommendations(bankSummary);
  }, [bankSummary]);

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const getBankColorStyle = (bankId: string) => {
    if (bankId === 'UNASSIGNED') return { backgroundColor: '#6b7280', color: 'white' };
    const color = getOptimizedBankColor(bankId);
    return { 
      backgroundColor: `${color}20`,
      borderLeft: `4px solid ${color}`,
      color: '#1f2937'
    };
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="bank-groups-panel p-4 space-y-4">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Bank Groups Statistics</h2>
        <button
          onClick={handleExportCSV}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          📊 Export CSV
        </button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Total Banks</h3>
          <p className="text-2xl font-bold text-blue-600">{bankSummary.totalBanks}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Total Pins</h3>
          <p className="text-2xl font-bold text-green-600">{bankSummary.totalPins}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Overall Utilization</h3>
          <p className="text-2xl font-bold text-purple-600">{formatPercentage(bankSummary.overallUtilization)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Most Utilized</h3>
          <p className="text-lg font-bold text-orange-600">Bank {bankSummary.mostUtilizedBank}</p>
        </div>
      </div>

      {/* 推奨事項 */}
      {recommendations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">💡 Recommendations</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            {recommendations.map((rec, index) => (
              <li key={index}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Banks統計テーブル */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-800">Bank Details</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('bankId')}
                >
                  Bank ID {getSortIcon('bankId')}
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalPins')}
                >
                  Total Pins {getSortIcon('totalPins')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('utilization')}
                >
                  Utilization {getSortIcon('utilization')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Main Types
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diff Pairs
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedBankStats.map((stat) => (
                <React.Fragment key={stat.bankId}>
                  <tr 
                    className="hover:bg-gray-50"
                    style={getBankColorStyle(stat.bankId)}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: stat.bankId === 'UNASSIGNED' ? '#6b7280' : getOptimizedBankColor(stat.bankId) }}
                        />
                        <span className="text-sm font-medium">
                          {stat.bankId === 'UNASSIGNED' ? 'Unassigned' : `Bank ${stat.bankId}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.totalPins}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="text-green-600 font-medium">{stat.assignedPins}</span>
                      <span className="text-gray-400">/{stat.unassignedPins}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(100, stat.utilizationRate)}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-700">{formatPercentage(stat.utilizationRate)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Object.entries(stat.pinsByType)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 2)
                        .map(([type, count]) => `${type}(${count})`)
                        .join(', ')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.differentialPairs > 0 ? stat.differentialPairs : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setExpandedBank(expandedBank === stat.bankId ? null : stat.bankId)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        {expandedBank === stat.bankId ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>
                  
                  {/* 展開された詳細情報 */}
                  {expandedBank === stat.bankId && (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Pin Types */}
                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">Pin Types</h4>
                            <div className="space-y-1">
                              {Object.entries(stat.pinsByType).map(([type, count]) => (
                                <div key={type} className="flex justify-between text-sm">
                                  <span className="text-gray-600">{type}</span>
                                  <span className="font-medium">{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Voltages */}
                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">Voltages</h4>
                            <div className="space-y-1">
                              {Object.entries(stat.pinsByVoltage).map(([voltage, count]) => (
                                <div key={voltage} className="flex justify-between text-sm">
                                  <span className="text-gray-600">{voltage}</span>
                                  <span className="font-medium">{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Signal Types */}
                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">Major Signal Types</h4>
                            <div className="space-y-1">
                              {stat.majorSignalTypes.length > 0 ? (
                                stat.majorSignalTypes.map((type) => (
                                  <span key={type} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1">
                                    {type}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500 text-sm">No major signal types</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
