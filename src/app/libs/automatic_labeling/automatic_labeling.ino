int Mode = 0;
bool isProcessing = false;

void setup() {
  Serial.begin(115200);
}

void loop() {
  // รับคำสั่งจาก Serial
  if (Serial.available() > 0) {
    Mode = Serial.parseInt();
  }

  // เมื่อได้รับคำสั่ง 111 และยังไม่ได้กำลังประมวลผล
  if (Mode == 111 && !isProcessing) {
    isProcessing = true;
    
    // จำลองการทำงานของเครื่อง
    delay(10000);  // รอ 3 วินาที
    
    // ส่งสัญญาณว่าทำงานเสร็จ
    Serial.println("112");
    
    // รีเซ็ตสถานะ
    isProcessing = false;
    Mode = 0;
  }
}