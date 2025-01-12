"use client";

import React, { useState } from 'react';

interface TabProps {
  label: string;
  children: React.ReactNode;
}

const Tabs: React.FC<{ children: React.ReactElement<TabProps>[] }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex space-x-4 mb-8">
        {children.map((child, index) => (
          <button
            key={index}
            className={`px-4 py-2 rounded-md border border-gray-300 ${activeTab === index ? 'bg-blue-500 text-white' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {child.props.label}
          </button>
        ))}
      </div>
      <div>
        {children.map((child, index) => (
          <div key={index} className={`${activeTab === index ? '' : 'hidden'}`}>
            {child.props.children}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tabs;