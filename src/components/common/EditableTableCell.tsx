import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface EditableTableCellProps {
  value: string;
  onSave: (newValue: string) => void;
  editable?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export const EditableTableCell: React.FC<EditableTableCellProps> = ({
  value,
  onSave,
  editable = false,
  placeholder = '',
  maxLength = 500,
  className = ''
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
