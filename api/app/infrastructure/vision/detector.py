import asyncio
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import torch
from ultralytics import YOLO

from app.core import settings
from .codec import decode_jpeg
from .measurement import StandCamera, measure_width
from .results import Inference, RawBox

logger = logging.getLogger(__name__)

# api/app/infrastructure/vision/detector.py -> api/
API_DIR = Path(__file__).resolve().parents[3]


class YoloDetector:
    """Loads one Ultralytics model and runs it on its own single thread: the model isn't
    thread-safe, and inference must never block the event loop or FastAPI's shared threadpool."""

    def __init__(
        self,
        weights: str = settings.yolo_weights,
        weights_dir: str = settings.yolo_weights_dir,
        classes: list[str] | None = settings.yolo_classes,
        image_size: int = settings.yolo_image_size,
        confidence: float = settings.yolo_confidence,
        device: str = settings.yolo_device,
        threads: int = settings.yolo_threads,
    ):
        self.weights = weights
        self.weights_dir = API_DIR / weights_dir
        self.classes = classes
        self.image_size = image_size
        self.confidence = confidence
        self.device = device
        self.threads = threads
        self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="yolo")
        self._model: YOLO | None = None
        self._class_ids: list[int] | None = None

    @property
    def name(self) -> str:
        return Path(self.weights).name

    @property
    def is_ready(self) -> bool:
        return self._model is not None

    def __weights_path(self) -> Path:
        custom = Path(self.weights)
        if custom.is_absolute() or custom.parent != Path("."):
            return custom if custom.is_absolute() else API_DIR / custom
        # A bare built-in name: Ultralytics downloads it to this path on first load
        self.weights_dir.mkdir(parents=True, exist_ok=True)
        return self.weights_dir / custom.name

    def load(self) -> None:
        torch.set_num_threads(self.threads)
        started = time.perf_counter()
        model = YOLO(str(self.__weights_path()))

        if self.classes:
            self._class_ids = [index for index, label in model.names.items() if label in self.classes]
            missing = set(self.classes) - set(model.names.values())
            if missing:
                logger.warning("yolo_classes not in %s: %s", self.name, ", ".join(sorted(missing)))

        # The first predict builds the graph; pay that at startup, not on the first frame
        model.predict(np.zeros((self.image_size, self.image_size, 3), dtype=np.uint8), device=self.device, verbose=False)
        self._model = model
        logger.info("Loaded %s in %.1f s", self.name, time.perf_counter() - started)

    def __predict(self, jpeg: bytes, camera: StandCamera | None) -> Inference | None:
        image = decode_jpeg(jpeg)
        if image is None or self._model is None:
            return None

        started = time.perf_counter()
        result = self._model.predict(
            image,
            imgsz=self.image_size,
            conf=self.confidence,
            classes=self._class_ids,
            device=self.device,
            verbose=False,
        )[0]
        height, width = result.orig_shape
        boxes = tuple(
            RawBox(x1, y1, x2, y2, round(confidence, 3), result.names[int(class_id)])
            for (x1, y1, x2, y2), confidence, class_id in zip(
                result.boxes.xyxyn.tolist(),
                result.boxes.conf.tolist(),
                result.boxes.cls.tolist(),
            )
        )
        measurement = measure_width(image, boxes, camera) if camera else None
        return Inference(width, height, round((time.perf_counter() - started) * 1000, 1), boxes, measurement)

    async def infer_jpeg(self, jpeg: bytes, camera: StandCamera | None = None) -> Inference | None:
        """Decodes, detects and (given the stand's camera) measures on the detector's thread;
        None when the frame can't be decoded."""
        return await asyncio.get_running_loop().run_in_executor(self._executor, self.__predict, jpeg, camera)

    def close(self) -> None:
        self._executor.shutdown(wait=False, cancel_futures=True)
        self._model = None
