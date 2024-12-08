import React, { useState } from 'react';
import QRCode from 'react-qr-code';

const DataDisplayAndControl = () => {
  const [selectedField, setSelectedField] = useState(null);
  const [fieldData, setFieldData] = useState(null);
  const [isTransmitting, setIsTransmitting] = useState(false);

  const handleFieldSelect = (field) => {
    setSelectedField(field);
    // Fetch data for the selected field and update fieldData state
    setFieldData(/* Fetch data */);
  };

  const handleStartStop = () => {
    setIsTransmitting(!isTransmitting);
    // Start or stop transmitting data to Arduino
  };

  return (
    <div className="flex flex-col w-1/2 p-4">
      <div className="flex justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">Selected Data Field</h2>
          {selectedField && <p>{selectedField}</p>}
        </div>
        <button
          onClick={handleStartStop}
          className={`px-4 py-2 rounded ${
            isTransmitting ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}
        >
          {isTransmitting ? 'Stop' : 'Start'} Transmitting
        </button>
      </div>
      <div className="flex justify-between">
        <div className="w-1/2">
          <h2 className="text-lg font-bold">Data Display</h2>
          {fieldData && (
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(fieldData, null, 2)}
            </pre>
          )}
        </div>
        <div className="w-1/2 flex flex-col items-center">
          <h2 className="text-lg font-bold mb-4">QR Code</h2>
          {selectedField && (
            <QRCode
              value={selectedField}
              size={200}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DataDisplayAndControl;