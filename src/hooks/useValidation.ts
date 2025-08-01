import { useState, useEffect, useCallback, useRef } from 'react';
import { ValidationService, ValidationResult } from '@/services/validation-service';
import { Pin, Package } from '@/types/core';

interface UseValidationOptions {
  enabled?: boolean;
  debounceMs?: number;
  backgroundCheck?: boolean;
}

export const useValidation = (
  packageData: Package | null,
  pins: Pin[],
  options: UseValidationOptions = {}
) => {
  const {
    enabled = true,
    debounceMs = 1000,
    backgroundCheck = true
  } = options;

  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidationRef = useRef<string>('');

  // 検証実行
  const runValidation = useCallback(async () => {
    if (!enabled || !packageData || pins.length === 0) {
      return;
    }

    // 重複実行を防ぐためのハッシュチェック
    const dataHash = JSON.stringify({
      packageId: packageData.id,
      pinsData: pins.map(p => ({ 
        id: p.id, 
        signalName: p.signalName, 
        bank: p.bank, 
        voltage: p.voltage,
        pinName: p.pinName
      }))
    });

    if (dataHash === lastValidationRef.current) {
      return; // データに変更がない場合はスキップ
    }

    lastValidationRef.current = dataHash;

    if (backgroundCheck) {
      setIsValidating(true);
      try {
        const result = await ValidationService.validateProjectAsync(packageData, pins);
        setValidationResult(result);
      } catch (error) {
        console.error('Validation error:', error);
      } finally {
        setIsValidating(false);
      }
    } else {
      const result = ValidationService.validateProject(packageData, pins);
      setValidationResult(result);
    }
  }, [packageData, pins, enabled, backgroundCheck]);

  // デバウンス付き検証実行
  const debouncedValidation = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      runValidation();
    }, debounceMs);
  }, [runValidation, debounceMs]);

  // ピンデータが変更されたときの自動検証
  useEffect(() => {
    if (enabled) {
      debouncedValidation();
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [pins, packageData, enabled, debouncedValidation]);

  // 手動検証実行
  const manualValidate = useCallback(() => {
    lastValidationRef.current = ''; // ハッシュをリセットして強制実行
    runValidation();
  }, [runValidation]);

  // 特定のピンの問題を取得
  const getIssuesForPin = useCallback((pinId: string) => {
    if (!validationResult) return [];
    return ValidationService.getIssuesForPin(pinId, validationResult.issues);
  }, [validationResult]);

  // 特定タイプの問題を取得
  const getIssuesByType = useCallback((type: string) => {
    if (!validationResult) return [];
    return ValidationService.getIssuesByType(type as any, validationResult.issues);
  }, [validationResult]);

  // 重要度別の問題を取得
  const getIssuesBySeverity = useCallback((severity: 'error' | 'warning' | 'info') => {
    if (!validationResult) return [];
    return ValidationService.getIssuesBySeverity(severity, validationResult.issues);
  }, [validationResult]);

  return {
    validationResult,
    isValidating,
    manualValidate,
    getIssuesForPin,
    getIssuesByType,
    getIssuesBySeverity,
    
    // 便利なヘルパー
    hasErrors: validationResult ? validationResult.summary.errorCount > 0 : false,
    hasWarnings: validationResult ? validationResult.summary.warningCount > 0 : false,
    hasIssues: validationResult ? validationResult.summary.totalIssues > 0 : false,
    errorCount: validationResult?.summary.errorCount || 0,
    warningCount: validationResult?.summary.warningCount || 0,
    totalIssues: validationResult?.summary.totalIssues || 0
  };
};

// ピンの検証状態を取得するヘルパーフック
export const usePinValidation = (pinId: string, validationResult: ValidationResult | null) => {
  const issues = validationResult ? 
    ValidationService.getIssuesForPin(pinId, validationResult.issues) : [];
  
  const hasError = issues.some(issue => issue.severity === 'error');
  const hasWarning = issues.some(issue => issue.severity === 'warning');
  const hasInfo = issues.some(issue => issue.severity === 'info');

  return {
    issues,
    hasError,
    hasWarning,
    hasInfo,
    hasAnyIssue: issues.length > 0,
    issueCount: issues.length,
    
    // 最も重要な問題を取得
    mostSevereIssue: issues.reduce((most, current) => {
      if (!most) return current;
      const severityOrder = { error: 3, warning: 2, info: 1 };
      return severityOrder[current.severity] > severityOrder[most.severity] ? current : most;
    }, issues[0] || null)
  };
};
