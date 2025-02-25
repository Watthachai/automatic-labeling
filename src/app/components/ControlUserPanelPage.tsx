import { useState } from 'react';
interface SheetData {
  [key: string]: string | number | undefined;
}

interface Props {
  productionData: SheetData | null;
  onLogProduction?: (logData: ProductionLog) => void;
}

const ControlUserPanelPage: React.FC<Props> = ({ productionData, onLogProduction }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [startCount, setStartCount] = useState('0000');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [stopCount, setStopCount] = useState('0000');

  const handleStart = () => {
    setIsRunning(true);
    setStartTime(new Date());
    // Save start count
    setStartCount(currentCount);
  };

  const handleStop = () => {
    setIsRunning(false);
    if (onLogProduction && startTime) {
      onLogProduction({
        date: new Date().toISOString().split('T')[0],
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
        operator: "Current Operator", // Add operator name handling
        startCount: parseInt(startCount),
        endCount: parseInt(stopCount),
        totalProduced: parseInt(stopCount) - parseInt(startCount),
        material: productionData?.Material,
        batch: productionData?.Batch,
        vendorBatch: productionData?.["Vendor Batch"],
        materialDescription: productionData?.["Material Description"]
      });
    }
  };

  const material = productionData?.Material;
  const batch = productionData?.Batch;
  const vendorBatch = productionData?.["Vendor Batch"]; // Access with bracket notation for keys with spaces
  const materialDescription = productionData?.["Material Description"];


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
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleStart}
            disabled={isRunning}
            className={`p-4 rounded-lg ${
              isRunning 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-500 hover:bg-green-600'
            } text-white font-bold text-xl`}
          >
            Start Production
          </button>
          <button
            onClick={handleStop}
            disabled={!isRunning}
            className={`p-4 rounded-lg ${
              !isRunning 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-red-500 hover:bg-red-600'
            } text-white font-bold text-xl`}
          >
            Stop Production
          </button>
        </div>
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