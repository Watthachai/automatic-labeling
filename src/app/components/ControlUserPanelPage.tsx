import { useState } from 'react';

interface ProductionLog {
  startTime: string;
  endTime?: string;
  material: string | undefined;
  batch: string | undefined;
  startCount: string;
  endCount?: string;
  operator: string;
}

interface SheetData {
  [key: string]: string | number | undefined;
}

interface Props {
  productionData: SheetData | null;
}

const ControlUserPanelPage: React.FC<Props> = ({ productionData }) => {
  const [startCount, setStartCount] = useState('0000');
  const [stopCount, setStopCount] = useState('0000');
  const [isProducing, setIsProducing] = useState(false);
  const [currentLog, setCurrentLog] = useState<ProductionLog | null>(null);
  const [operator, setOperator] = useState('');

  const material = productionData?.Material;
  const batch = productionData?.Batch;
  const vendorBatch = productionData?.["Vendor Batch"];
  const materialDescription = productionData?.["Material Description"];

  const handleStartProduction = () => {
    if (!isProducing) {
      const newLog: ProductionLog = {
        startTime: new Date().toISOString(),
        material: material?.toString(),
        batch: batch?.toString(),
        startCount,
        operator
      };
      setCurrentLog(newLog);
      setIsProducing(true);
      // You can also send this log to your backend/database
      console.log('Production Started:', newLog);
    }
  };

  const handleStopProduction = () => {
    if (isProducing && currentLog) {
      const completedLog = {
        ...currentLog,
        endTime: new Date().toISOString(),
        endCount: stopCount
      };
      setIsProducing(false);
      setCurrentLog(null);
      // Send completed log to backend/database
      console.log('Production Completed:', completedLog);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">

      {/* Production Group Section */}
      <div className="bg-gray-200 p-4 rounded-lg">
        <div className="text-lg font-semibold mb-4">กลุ่มการผลิต</div>
        <div className="grid grid-cols-2 gap-4">
          {/* Left Panel */}
          <div className="space-y-2">
            <div className="bg-gray-500 text-cyan-300 p-2 text-center">
              ผู้ควบคุมเครื่อง
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-500 text-cyan-300 p-2">Material</div>
              <div className="bg-gray-500 p-2">{material}</div>
              <div className="bg-gray-500 text-cyan-300 p-2">Batch</div>
              <div className="bg-gray-500 p-2">{batch}</div>
            </div>
          </div>
          
          {/* Right Panel */}
          <div className="space-y-2">
            <div className="bg-gray-500 text-white p-2 text-center">
              HEWWWW
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-500 text-cyan-300 p-2">Material Name</div>
              <div className="bg-gray-500 p-2">{materialDescription}</div>
              <div className="bg-gray-500 text-cyan-300 p-2">Vendor Batch</div>
              <div className="bg-gray-500 p-2">{vendorBatch}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Production Count Section */}
      <div className="bg-pink-200 p-4 rounded-lg">
        <div className="text-center text-2xl font-bold mb-4">ยอดการผลิต</div>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-200 p-2 text-center">
            <span className="text-pink-500 font-bold">Start</span>
          </div>
          <div className="bg-white p-2 text-center text-4xl font-bold">
            {startCount}
          </div>
          <div className="bg-gray-200 p-2 text-center">
            <span className="text-pink-500 font-bold">Stop</span>
          </div>
          <div className="bg-white p-2 text-center text-4xl font-bold text-green-500">
            {stopCount}
          </div>
        </div>

        {/* Production Control */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <input
            type="text"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            placeholder="Operator Name"
            className="p-2 border rounded"
          />
          <div className="flex gap-2">
            <button
              onClick={handleStartProduction}
              disabled={isProducing}
              className={`flex-1 p-2 rounded ${
                isProducing 
                  ? 'bg-gray-400' 
                  : 'bg-green-500 hover:bg-green-600'
              } text-white`}
            >
              Start
            </button>
            <button
              onClick={handleStopProduction}
              disabled={!isProducing}
              className={`flex-1 p-2 rounded ${
                !isProducing 
                  ? 'bg-gray-400' 
                  : 'bg-red-500 hover:bg-red-600'
              } text-white`}
            >
              Stop
            </button>
          </div>
        </div>

        {/* Production Status */}
        {isProducing && (
          <div className="mt-4 p-2 bg-green-100 rounded text-center">
            Production in progress - Started at {new Date(currentLog?.startTime || '').toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Camera Inspection Group */}
      <div className="bg-teal-700 p-4 rounded-lg">
        <div className="text-white text-lg font-semibold mb-4">กลุ่มตรวจด้วยกล้อง</div>
        <div className="grid grid-cols-4 gap-4">
          <div className="aspect-square bg-gray-300 border border-gray-400"></div>
          <div className="aspect-square bg-gray-300 border border-gray-400"></div>
          <div className="bg-white row-span-2 col-span-2"></div>
          
          <div className="col-span-2 bg-white h-8"></div>
          <div className="col-span-2 bg-white h-8"></div>
          
          <div className="bg-gray-200 p-2 text-center">
            <span className="text-pink-500">VisionSet</span>
          </div>
          <div className="bg-gray-200 p-2 text-center">
            <span className="text-pink-500">ReadData</span>
          </div>
          <div className="col-span-2 bg-gray-500 p-2 text-center text-gray-300">
            ....
          </div>
        </div>
        
        <div className="mt-4 bg-pink-200 p-2 text-center w-32 ml-auto">
          ผลการอ่านQRcode
        </div>
      </div>
    </div>
  );
};

export default ControlUserPanelPage;