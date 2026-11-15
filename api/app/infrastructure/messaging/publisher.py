import aio_pika
from pydantic import BaseModel

from .client import RabbitClient


async def publish(client: RabbitClient, event: BaseModel, routing_key: str) -> None:
    """Publishes a validated event as JSON on the events exchange."""
    exchange = await client.declare_events_exchange()
    message = aio_pika.Message(
        body=event.model_dump_json().encode(),
        content_type="application/json",
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
    )
    await exchange.publish(message, routing_key=routing_key)
