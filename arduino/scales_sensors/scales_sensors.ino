
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
 
// ================= WIFI CONFIGURATION =================
const char* WIFI_SSID = "Ezeeey_A6";          // edit only this
const char* WIFI_PASSWORD = "SeanEli050420!"; // edit only this

// ================= RABBITMQ CONFIGURATION =================
const char* MQTT_SERVER = "192.168.0.148";   // Server IP address: edit only this
const int MQTT_PORT = 1883;

const char* MQTT_USERNAME = "rabbitmq";
const char* MQTT_PASSWORD = "rabbitmq";
const char* MQTT_TOPIC = "crab/scale";

// ================= OBJECTS =================
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ================= LED CONFIGURATION =================
#define LED_PIN LED_BUILTIN

// ================= SENSOR CONFIGURATION =================
const int MIN_WEIGHT = 100;
const int MAX_WEIGHT = 1000;

const unsigned long PUBLISH_INTERVAL = 2000;
unsigned long previousMillis = 0;

// ================= LED FUNCTIONS =================
void ledOn() {
  digitalWrite(LED_PIN, LOW);
}

void ledOff() {
  digitalWrite(LED_PIN, HIGH);
}

// ================= 1. WIFI CONNECTION =================
void connectWifi() {
  Serial.print("Connecting to WiFi");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    ledOn();
    delay(500);
    ledOff();
    delay(500);

    Serial.print(".");
  }

  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  ledOff();
}

// NOTE!: DONT EDIT THIS
// ================= 2. RABBITMQ CONNECTION =================
void connectRabbitMQ() {
  while (!mqttClient.connected()) {
    Serial.println("Connecting to RabbitMQ...");

    if (mqttClient.connect(
      "NODEMCU_CRAB_SCALE_SENSOR",
      MQTT_USERNAME,
      MQTT_PASSWORD
    )) {
      Serial.println("RabbitMQ Connected!");
      ledOff();

    } else {
      Serial.print("Connection Failed. State: ");
      Serial.println(mqttClient.state());

      ledOn();
      delay(1000);
      ledOff();
      delay(1000);
    }
  }
}

// NOTE!: Weight sensor converted into Grams!
// ================= 3. WEIGHT SENSOR =================
float weighingScaleSensor() {
  return random(MIN_WEIGHT, MAX_WEIGHT + 1);
}


// NOTE!: DONT EDIT THIS, Follow what the parameters needed!
// ================= 4. RABBITMQ SENDING =================
void rabbitMQSending(float scales) {
  char payload[100];

  snprintf(
    payload,
    sizeof(payload),
    "{\"weight\":%.2f,\"unit\":\"grams\"}",
    scales
  );

  Serial.printf(
    "==============================\n"
    "Crab Weight: %.2f grams\n"
    "Publishing: %s\n",
    scales,
    payload
  );

  if (mqttClient.publish(MQTT_TOPIC, payload)) {
    Serial.println("RabbitMQ: Message Sent!");
  } else {
    Serial.println("RabbitMQ: Publish Failed!");
  }
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);
  ledOff();

  Serial.println();
  Serial.println("================================");
  Serial.println("   CRAB WEIGHT SCALES SENSOR  ");
  Serial.println("================================");

  randomSeed(analogRead(A0) + micros());

  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);

  connectWifi();
  connectRabbitMQ();
}

// ================= MAIN LOOP =================
void loop() {

  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }

  // Check RabbitMQ connection
  if (!mqttClient.connected()) {
    connectRabbitMQ();
  }

  mqttClient.loop();

  // Publish weight every 2 seconds
  unsigned long currentMillis = millis();

  if (currentMillis - previousMillis >= PUBLISH_INTERVAL) {
    previousMillis = currentMillis;

    float scales = weighingScaleSensor();

    rabbitMQSending(scales);
  }
}
