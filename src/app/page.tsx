'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation';
import ExcelFileReader from '@/app/components/ExcelFileReaderPage';
import ControlPanel from '@/app/components/ControlUserPanelPage';
import Tabs from '@/app/components/Tabs';
import ManualRobot from './components/ManualRobotPage';
import ProductionLogPage from './components/ProductionLogPage';
import AuthWrapper from './components/AuthWrapper';
import { ArduinoProvider, useArduino } from './contexts/ArduinoContext';

interface SheetData {
  [key: string]: string | number | undefined;
}

function MainPageContent() {
  const [selectedRowData, setSelectedRowData] = useState<SheetData | null>(null);
  const router = useRouter();
  const { connect, disconnect } = useArduino();
  
  const TabContent: React.FC<{ label: string; children: React.ReactNode }> = 
    ({ children }) => <>{children}</>;

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Connect to Arduino when component mounts
    connect();

    return () => {
      // Cleanup Arduino connection when component unmounts
      disconnect();
    };
  }, [router, connect, disconnect]);

  const handleDataSelect = useCallback((data: SheetData) => {
    setSelectedRowData(data);
  }, []);

  return (
    <AuthWrapper>
      <div className="flex">
        <div className="w-1/2">
          <Tabs>
            <TabContent label="ExcelFileReader">
              <ExcelFileReader onDataSelect={handleDataSelect} />
            </TabContent>
            <TabContent label="บันทึกการผลิตประจำวัน">
              <ProductionLogPage />
            </TabContent>
            <TabContent label="debug mode">
              <ManualRobot />
            </TabContent>
      
          </Tabs>
        </div>
        
        <div className="w-1/2">
          <ControlPanel productionData={selectedRowData} />
        </div>
      </div>
    </AuthWrapper>
  );
}

export default function MainPage() {
  return (
    <ArduinoProvider>
      <MainPageContent />
    </ArduinoProvider>
  );
}