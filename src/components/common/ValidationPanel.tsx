import React, { useState } from 'react';
import { ValidationIssue, ValidationResult, ValidationSeverity } from '@/services/validation-service';

interface ValidationPanelProps {
  validationResult: ValidationResult | null;
  onIssueClick?: (issue: ValidationIssue) => void;
  onPinHighlight?: (pinIds: string[]) => void;
  className?: string;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  validationResult,
  onIssueClick,
  onPinHighlight,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<ValidationSeverity | 'all'>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const getTypeDisplayName = (type: string): string => {
    switch (type) {
      case 'pin_conflict':
        return 'Pin Conflict';
      case 'differential_pair':
        return 'Differential Pair';
      case 'bank_constraint':
        return 'Bank Constraint';
      case 'clock_constraint':
        return 'Clock Constraint';
      default:
        return type;
    }
  };

  const filteredIssues = validationResult?.issues.filter(issue => {
    const severityMatch = selectedSeverity === 'all' || issue.severity === selectedSeverity;
    const typeMatch = selectedType === 'all' || issue.type === selectedType;
    return severityMatch && typeMatch;
  }) || [];

  const handleIssueClick = (issue: ValidationIssue) => {
    onIssueClick?.(issue);
    onPinHighlight?.(issue.affectedPins);
  };

  const getSeverityIcon = (severity: ValidationSeverity) => {
    switch (severity) {
      case 'error':
        return '🔴';
      case 'warning':
        return '🟡';
      case 'info':
        return '🔵';
    }
  };

  if (!validationResult) {
    return (
      <div className={`bg-gray-50 flex flex-col h-full ${className}`}>
        <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
          <h3 className="text-lg font-semibold text-gray-800">Validation Results</h3>
          <p className="text-sm text-gray-500 mt-1">No validation data available</p>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <div className="text-sm">Run validation to see results</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Validation Results</h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? '📉' : '📊'}
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto right-sidebar-scroll">
        {isExpanded && (
          <div className="p-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {validationResult.summary.errorCount}
                </div>
                <div className="text-xs text-gray-500">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {validationResult.summary.warningCount}
                </div>
                <div className="text-xs text-gray-500">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {validationResult.summary.infoCount}
                </div>
                <div className="text-xs text-gray-500">Info</div>
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Filter by Severity
                </label>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value as ValidationSeverity | 'all')}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Issues ({validationResult.issues.length})</option>
                  <option value="error">Errors ({validationResult.summary.errorCount})</option>
                  <option value="warning">Warnings ({validationResult.summary.warningCount})</option>
                  <option value="info">Info ({validationResult.summary.infoCount})</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Filter by Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  {Array.from(new Set(validationResult.issues.map(i => i.type))).map(type => (
                    <option key={type} value={type}>
                      {getTypeDisplayName(type)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Issues List */}
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto right-sidebar-scroll">
              {filteredIssues.map((issue, index) => (
                <div
                  key={index}
                  onClick={() => handleIssueClick(issue)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    issue.severity === 'error' ? 'bg-red-50 border border-red-200 hover:bg-red-100' :
                    issue.severity === 'warning' ? 'bg-yellow-50 border border-yellow-200 hover:bg-yellow-100' :
                    'bg-blue-50 border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm">{getSeverityIcon(issue.severity)}</span>
                    <span className="text-xs px-2 py-0.5 bg-white bg-opacity-50 rounded">
                      {getTypeDisplayName(issue.type)}
                    </span>
                  </div>
                  
                  <p className="text-xs mb-2 line-clamp-2">
                    {issue.description}
                  </p>

                  {issue.affectedPins.length > 0 && (
                    <div className="text-xs mb-2">
                      <span className="font-medium">Affected pins: </span>
                      <span className="font-mono">
                        {issue.affectedPins.slice(0, 3).join(', ')}
                        {issue.affectedPins.length > 3 && ` +${issue.affectedPins.length - 3} more`}
                      </span>
                    </div>
                  )}

                  {issue.suggestion && (
                    <div className="text-xs mt-2 p-2 bg-white bg-opacity-50 rounded">
                      <span className="font-medium">💡 Suggestion: </span>
                      {issue.suggestion}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-200 p-3 bg-white">
        <div className="text-xs text-gray-500 text-center">
          {validationResult?.lastChecked && (
            <>
              Last checked: {new Date(validationResult.lastChecked).toLocaleTimeString()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Icon components
export const ValidationStatusIcon: React.FC<{ 
  validationResult: ValidationResult | null;
  className?: string; 
}> = ({ validationResult, className = '' }) => {
  if (!validationResult) {
    return (
      <div className={`inline-flex items-center text-gray-400 ${className}`}>
        <span className="text-sm">⚪</span>
      </div>
    );
  }
  
  const { summary } = validationResult;
  
  if (summary.errorCount > 0) {
    return (
      <div className={`inline-flex items-center text-red-600 ${className}`}>
        <span className="text-sm">🔴</span>
        <span className="ml-1 text-xs font-bold">{summary.errorCount}</span>
      </div>
    );
  }
  
  if (summary.warningCount > 0) {
    return (
      <div className={`inline-flex items-center text-yellow-600 ${className}`}>
        <span className="text-sm">🟡</span>
        <span className="ml-1 text-xs font-bold">{summary.warningCount}</span>
      </div>
    );
  }
  
  return (
    <div className={`inline-flex items-center text-green-600 ${className}`}>
      <span className="text-sm">✅</span>
    </div>
  );
};
