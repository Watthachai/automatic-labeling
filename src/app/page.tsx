'use client'

import { useState, useCallback } from 'react'
import ExcelFileReader from '@/src/app/components/ExcelFileReaderPage';
import ControlPanel from '@/src/app/components/ControlUserPanelPage';
import Tabs from '@/src/app/components/Tabs';
import ManualRobot from './components/ManualRobotPage';
import ProductionLogPage from './components/ProductionLogPage';
import AuthWrapper from './components/AuthWrapper';

interface SheetData {
  [key: string]: string | number | undefined;
}

function MainPageContent() {
  const [selectedRowData, setSelectedRowData] = useState<SheetData | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  
  const TabContent: React.FC<{ label: string; children: React.ReactNode }> = 
    ({ children }) => <>{children}</>;

  // Remove the redundant authentication check since AuthWrapper handles this

  const handleDataSelect = useCallback((data: SheetData, qrUrl: string) => {
    setSelectedRowData(data);
    setQrCodeDataUrl(qrUrl);
  }, []);

  const handleQrCodeGenerated = useCallback((qrUrl: string) => {
    setQrCodeDataUrl(qrUrl);
  }, []);

  return (
    <div className="flex">
      <div className="w-1/2">
        <Tabs>
          <TabContent label="ExcelFileReader">
            <ExcelFileReader 
              onDataSelect={handleDataSelect}
              onQrCodeGenerated={handleQrCodeGenerated}
            />
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
        <ControlPanel 
          productionData={selectedRowData}
          qrCodeDataUrl={qrCodeDataUrl}
          onQrCodeGenerated={handleQrCodeGenerated}
        />
      </div>
    </div>
  );
}

export default function MainPage() {
  return (
    <AuthWrapper>
      <MainPageContent />
    </AuthWrapper>
  );
}