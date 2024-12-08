import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ label, onClick, variant = 'primary' }) => {
  const styles = `
    px-4 py-2 rounded-md
    ${
      variant === 'primary'
        ? 'bg-blue-500 hover:bg-blue-600 text-white'
        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
    }
  `;

  return (
    <button className={styles} onClick={onClick}>
      {label}
    </button>
  );
};

export default Button;