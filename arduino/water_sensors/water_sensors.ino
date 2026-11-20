
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
const char* MQTT_TOPIC = "crab/sensor";

// ================= OBJECTS =================
WiFiClient espClient;
PubSubClient mqttClient(espClient); 

// ================= LED CONFIGURATION =================
#define LED_PIN LED_BUILTIN

// ================= SENSOR CONFIGURATION =================
const int MIN_WEIGHT = 100;
const int MAX_WEIGHT = 1000;

const unsigned long PUBLISH_INTERVAL = 800;
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
      "NODEMCU_CRAB_WATER_SENSORS",
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

// ================= 3. WATER SENSOR =================
float temperatureSensor() {
  return random(270, 311) / 10.0;  // 27.0 - 31.0 °C
}

float phSensor() {
  return random(75, 86) / 10.0;   // 7.5 - 8.5
}

float salinitySensor() {
  return random(150, 251) / 10.0; // 15.0 - 25.0 ppt
}

float ammoniaSensor() {
  return random(1, 11) / 100.0;   // 0.01 - 0.10 mg/L
}

float turbiditySensor() {
  return random(100, 401) / 10.0; // 10.0 - 40.0 NTU
}

float dissolvedOxygenSensor() {
  return random(40, 71) / 10.0;   // 4.0 - 7.0 mg/L
}

// NOTE!: DONT EDIT THIS, Follow what the parameters needed!
// ================= 4. RABBITMQ SENDING =================
void rabbitMQSending(
  float temperature,
  float ph,
  float salinity,
  float ammonia,
  float turbidity,
  float dissolvedOxygen
) {
  char payload[350];

  snprintf(
    payload,
    sizeof(payload),
    "{\"temperature\":%.2f,\"ph\":%.2f,\"salinity\":%.2f,\"ammonia\":%.3f,\"turbidity\":%.2f,\"dissolved_oxygen\":%.2f}",
    temperature,
    ph,
    salinity,
    ammonia,
    turbidity,
    dissolvedOxygen
  );

  Serial.printf(
    "==============================\n"
    "Temperature: %.2f C\n"
    "pH: %.2f\n"
    "Salinity: %.2f ppt\n"
    "Ammonia: %.3f mg/L\n"
    "Turbidity: %.2f NTU\n"
    "Dissolved Oxygen: %.2f mg/L\n"
    "Publishing: %s\n",
    temperature,
    ph,
    salinity,
    ammonia,
    turbidity,
    dissolvedOxygen,
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
  Serial.println("        CRAB WATER SENSOR       ");
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

    float temperature = temperatureSensor();
    float ph = phSensor();
    float salinity = salinitySensor();
    float ammonia = ammoniaSensor();
    float turbidity = turbiditySensor();
    float dissolvedOxygen = dissolvedOxygenSensor();

    rabbitMQSending(temperature,ph,salinity,ammonia,turbidity,dissolvedOxygen); 

  }
}
