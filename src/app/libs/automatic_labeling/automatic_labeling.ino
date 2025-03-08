int Mode = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("Welcome to Automatic Labeling Machine");
  Serial.println("=====================================");
  Serial.println("| 1: Dedug Mode                     |");
  Serial.println("| 111: Print                        |");
  Serial.println("=====================================");
}

void loop() {
  if (Serial.available() > 0) {
    Mode = Serial.parseInt();
  }

  if (Mode == 1) {
    debug();
  }

  if (Mode == 110) {
    Serial.println("Mode 110");
    delay(5000);
    Serial.println("1"); //OK
  }
}

void debug() {
  Serial.println("  1: Exit          Dedug Mode                   ");
  Serial.println("================================================");
  Serial.println("|                 Product Lift                 |");
  Serial.println("| 11:  Lift UP           12:  Lift Down        |");
  Serial.println("| 111: Reach The Top     112: Reach the Bottom |");
  Serial.println("|                 Sticker Lift                 |");
  Serial.println("| 21:  Lift In           22:  Lift Out         |");
  Serial.println("| 23:  Clockwise         24:  Anticlockwise    |");
  Serial.println("|                 SCARA Robot                  |");
  Serial.println("| 31:  Inner Arm In      32:  Inner Arm Out    |");
  Serial.println("| 33:  Outer Arm In      34:  Outer Arm Out    |");
  Serial.println("| 35:  Lift UP           36:  Lift Down        |");
  Serial.println("================================================");
  while (true) {
    if (Serial.available() > 0) {
      Mode = Serial.parseInt();
    }

    if (Mode == 1) {
      break;
    }

    if (Mode == 11) {
      Serial.println("Mode 11");
    }

    if (Mode == 12) {
      Serial.println("Mode 12");
    }

    if (Mode == 111) {
      Serial.println("Mode 111");
      Serial.println("Mode 111 END");
    }

    if (Mode == 112) {
      Serial.println("Mode 112");
      Serial.println("Mode 112 END");
    }

    if (Mode == 21) {
      Serial.println("Mode 21");
    }

    if (Mode == 22) {
      Serial.println("Mode 22");
    }

    if (Mode == 23) {
      Serial.println("Mode 23");
    }

    if (Mode == 24) {
      Serial.println("Mode 24");
    }

    if (Mode == 31) {
      Serial.println("Mode 31");
    }

    if (Mode == 32) {
      Serial.println("Mode 32");
    }

    if (Mode == 33) {
      Serial.println("Mode 33");
    }

    if (Mode == 34) {
      Serial.println("Mode 34");
    }
    if (Mode == 35) {
      Serial.println("Mode 35");
    }

    if (Mode == 36) {
      Serial.println("Mode 36");
    }
  }
}