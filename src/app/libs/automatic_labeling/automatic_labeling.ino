void setup() {
  Serial.begin(9600);
  Serial.println("Arduino initialized!");
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    if (command == "hello") {
      Serial.println("Hello received from web!");
      int num1 = 50, num2 = 100;
      int sum = num1 + num2;
      Serial.println(sum);
    }
  }
}