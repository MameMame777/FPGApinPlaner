import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface SelectableTableCellProps {
  value: string;
  onSave: (_newValue: string) => void;
  options: string[];
  editable?: boolean;
  placeholder?: string;
  className?: string;
  allowCustomValue?: boolean;
  getDisplayValue?: (_value: string) => string;
}

export const SelectableTableCell: React.FC<SelectableTableCellProps> = ({
  value,
  onSave,
  options,
  editable = false,
  placeholder = '',
  className = '',
  allowCustomValue = false,
  getDisplayValue
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  useEffect(() => {
    if (isEditing && selectRef.current) {
      selectRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  if (!editable) {
    const displayValue = getDisplayValue ? getDisplayValue(value) : value;
    return (
      <span className={`table-cell-readonly ${className}`}>
        {displayValue || '-'}
      </span>
    );
  }

  if (isEditing) {
    return (
      <select
        ref={selectRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyPress}
        className={`table-cell-select ${className}`}
        style={{
          width: '100%',
          border: '2px solid #007acc',
          padding: '4px 8px',
          fontSize: 'inherit',
          borderRadius: '2px',
          outline: 'none',
          backgroundColor: '#333',
          color: '#ffffff'
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option} value={option}>
            {getDisplayValue ? getDisplayValue(option) : option}
          </option>
        ))}
        {allowCustomValue && editValue && !options.includes(editValue) && (
          <option value={editValue}>
            {editValue} (Custom)
          </option>
        )}
      </select>
    );
  }

  const displayValue = getDisplayValue ? getDisplayValue(value) : value;
  
  return (
    <div 
      className={`table-cell-selectable ${className}`} 
      onClick={() => setIsEditing(true)}
      title="Click to select"
      style={{
        padding: '4px 8px',
        border: '1px solid transparent',
        cursor: 'pointer',
        minHeight: '20px',
        borderRadius: '2px',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#555';
        e.currentTarget.style.backgroundColor = '#2a2a2a';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'transparent';
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <span>
        {displayValue || (
          <span style={{ color: '#888', fontStyle: 'italic' }}>
            {placeholder}
          </span>
        )}
      </span>
      <span style={{ color: '#666', fontSize: '12px', marginLeft: '4px' }}>
        ▼
      </span>
    </div>
  );
};

interface EditableTableCellProps {
  value: string;
  onSave: (_newValue: string) => void;
  editable?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  type?: 'text' | 'select';
  options?: string[];
  allowCustomValue?: boolean;
  getDisplayValue?: (_value: string) => string;
}

export const EditableTableCell: React.FC<EditableTableCellProps> = ({
  value,
  onSave,
  editable = false,
  placeholder = '',
  maxLength = 500,
  className = '',
  type = 'text',
  options = [],
  allowCustomValue = false,
  getDisplayValue
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  // Use SelectableTableCell for select type
  if (type === 'select') {
    return (
      <SelectableTableCell
        value={value}
        onSave={onSave}
        options={options}
        editable={editable}
        placeholder={placeholder}
        className={className}
        allowCustomValue={allowCustomValue}
        getDisplayValue={getDisplayValue}
      />
    );
  }

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  if (!editable) {
    return (
      <span className={`table-cell-readonly ${className}`}>
        {value || '-'}
      </span>
    );
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyPress}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`table-cell-input ${className}`}
        style={{
          width: '100%',
          border: '2px solid #007acc',
          padding: '4px 8px',
          fontSize: 'inherit',
          borderRadius: '2px',
          outline: 'none',
          backgroundColor: '#333',
          color: '#ffffff'
        }}
      />
    );
  }

  return (
    <div 
      className={`table-cell-editable ${className}`} 
      onClick={() => setIsEditing(true)}
      title="Click to edit"
      style={{
        padding: '4px 8px',
        border: '1px solid transparent',
        cursor: 'text',
        minHeight: '20px',
        borderRadius: '2px',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#555';
        e.currentTarget.style.backgroundColor = '#2a2a2a';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'transparent';
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {value || (
        <span style={{ color: '#888', fontStyle: 'italic' }}>
          {placeholder}
        </span>
      )}
    </div>
  );
};
