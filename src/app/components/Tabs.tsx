"use client";

import React, { useState } from 'react';

const Tabs: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex space-x-4 mb-8">
        {React.Children.map(children, (child, index) => (
          <button
            key={index}
            className={`px-4 py-2 rounded-md border border-gray-300 ${activeTab === index ? 'bg-blue-500 text-white' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {(child as React.ReactElement).props.label}
          </button>
        ))}
      </div>
      <div>
        {React.Children.map(children, (child, index) => (
          <div key={index} className={`${activeTab === index ? '' : 'hidden'}`}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tabs;