void setup() {
  Serial.begin(9600);
  Serial.println("Arduino initialized!");
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    if (command == "hello") {
      Serial.println("Hello received from web!");
    }
  }
}