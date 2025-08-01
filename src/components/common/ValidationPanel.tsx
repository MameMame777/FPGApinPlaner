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
      default:
        return '⚪';
    }
  };

  const getSeverityColor = (severity: ValidationSeverity) => {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!validationResult) {
    return (
      <div className={`bg-white border-l border-gray-300 ${className}`}>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800">Validating...</h3>
          <div className="mt-2 text-sm text-gray-500">
            Validating project...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border-l border-gray-300 flex flex-col ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Validation Results</h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? '📉' : '📊'}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-3">
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
                  Severity
                </label>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value as ValidationSeverity | 'all')}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="all">All</option>
                  <option value="error">Errors</option>
                  <option value="warning">Warnings</option>
                  <option value="info">Info</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="all">All</option>
                  <option value="pin_conflict">Pin Conflicts</option>
                  <option value="differential_pair">Differential Pairs</option>
                  <option value="bank_constraint">Bank Constraints</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Issues List */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto">
          {filteredIssues.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {validationResult.summary.totalIssues === 0 ? (
                <div>
                  <div className="text-2xl mb-2">✅</div>
                  <div className="font-medium">No issues found</div>
                  <div className="text-xs mt-1">All validations passed</div>
                </div>
              ) : (
                <div>
                  <div className="font-medium">No issues match the current filters</div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  onClick={() => handleIssueClick(issue)}
                  className={`
                    p-3 rounded-lg border cursor-pointer transition-colors hover:bg-opacity-80
                    ${getSeverityColor(issue.severity)}
                  `}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getSeverityIcon(issue.severity)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium truncate">
                          {issue.title}
                        </h4>
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 p-2 bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          {validationResult.lastChecked && (
            <>
              Last checked: {new Date(validationResult.lastChecked).toLocaleTimeString()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// アイコンコンポーネント群
export const ValidationStatusIcon: React.FC<{ 
  validationResult: ValidationResult | null;
  className?: string;
}> = ({ validationResult, className = '' }) => {
  if (!validationResult) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse"></div>
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
