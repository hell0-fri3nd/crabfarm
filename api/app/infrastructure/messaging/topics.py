EVENTS_EXCHANGE = "crabfarm.events"
AMQ_TOPIC = "amq.topic"

SYSTEM_EVENTS = "system.#"
SYSTEM_EVENT_PREFIX = "system"

FORECAST_EVENTS = "forecast.#"
FORECAST_MODEL_STATUS = "forecast.model"  # also the SSE event name

# Device topics: the MQTT plugin publishes into amq.topic with "/" turned into "."
CRAB_SCALES = "crab.scale"  # the crab weighing scale (ESP32) on MQTT topic crab/scale
CRAB_SENSORS = "crab.sensor"  # the crab water sensors (ESP32) on MQTT topic crab/sensor