'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Webcam from 'react-webcam';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, CameraOff, CircleCheck, ScanLine, SwitchCamera } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import type { Batch, Crab } from '@/types/crab-management';

import CustomDetectionOverlay from './custom-detection-overlay';
import { useCameraDevices } from './use-camera-devices';
import { useDetectionSocket } from './use-detection-socket';
import { useFrameCapture } from './use-frame-capture';
import { useSteadyWidth } from './use-steady-width';
import { formatMm } from '../lib/format-measure';
import { readSavedCamera, saveCamera } from '../lib/scan-preferences';
import { createQrReader } from '../lib/qr-reader';
import { barcodeResultsSchema, buildManualCodeFormSchema, buildStickerSchema } from '../types/scan';

import type { DetectionResult, DetectionStatus } from '../types/detection';
import type { ManualCodeFormInput, ManualCodeFormOutput, ScannedSticker } from '../types/scan';

type CameraState = 'off' | 'starting' | 'on' | 'blocked' | 'unavailable';

type CustomScanViewportProps = {
  batches: Batch[];
  crabs: Crab[];
  sticker: ScannedSticker | null;
  onScan: (sticker: ScannedSticker) => void;
  onMeasure: (widthMm: number | null, isSteady: boolean) => void;
};

const DETECT_EVERY_MS = 500;

// Rear camera on phones; laptops fall back to whatever camera they have
const DEFAULT_CONSTRAINTS = { facingMode: 'environment' } satisfies MediaTrackConstraints;

const toVideoConstraints = (cameraId: string | null): MediaTrackConstraints =>
  cameraId ? { deviceId: { exact: cameraId } } : DEFAULT_CONSTRAINTS;

const CAMERA_MESSAGES = {
  off: { title: 'Camera off', hint: 'Turn it on to read stickers and measure width.' },
  starting: { title: 'Starting camera…', hint: 'Allow camera access if the browser asks.' },
  on: { title: 'Point at the sticker', hint: 'Hold the QR inside the frame. It reads on its own.' },
  blocked: {
    title: 'Camera blocked',
    hint: "Allow camera access from the browser's address bar, or type the code below.",
  },
  unavailable: { title: 'No camera found', hint: 'Type the code printed under the QR below.' },
} as const satisfies Record<CameraState, { title: string; hint: string }>;

const DETECTION_MESSAGES = {
  off: '',
  connecting: 'Starting live detection…',
  live: 'Looking for objects…',
  unavailable: "Live detection isn't available right now. You can still type the width.",
} as const satisfies Record<DetectionStatus, string>;

const LISTED_LABELS = 3;

const SELECT_CLASS = 'data-[size=default]:h-11 w-full bg-card px-4 sm:w-auto sm:min-w-40';

type SteadyWidth = { widthMm: number | null; isSteady: boolean };

const toDetectionSummary = (status: DetectionStatus, result: DetectionResult | null, width: SteadyWidth) => {
  if (status === 'live' && width.widthMm !== null) {
    const measurement = result?.measurement;
    // The field of view a sticker implies is the number to put in DETECTION_CAMERA_FOV_DEG for this camera
    const scale =
      measurement?.scale_source === 'sticker' ? ` · sticker scale (camera ${measurement.fov_deg.toFixed(2)}°)` : ' · stand scale';
    return `Width ≈ ${formatMm(width.widthMm)} mm${measurement ? scale : ''} · ${width.isSteady ? 'steady' : 'hold still'}`;
  }
  const labels = [...new Set(result?.boxes.map(({ label }) => label))];
  if (status !== 'live' || labels.length === 0) return DETECTION_MESSAGES[status];
  return `Seeing ${labels.slice(0, LISTED_LABELS).join(', ')}`;
};

const CustomScanViewport = ({ batches, crabs, sticker, onScan, onMeasure }: CustomScanViewportProps) => {
  const webcamRef = useRef<Webcam>(null);
  const [cameraState, setCameraState] = useState<CameraState>('off');
  const [cameraId, setCameraId] = useState<string | null>(null);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [canDetect, setCanDetect] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  const stickerSchema = useMemo(() => buildStickerSchema(batches, crabs), [batches, crabs]);
  const manualCodeFormSchema = useMemo(() => buildManualCodeFormSchema(batches, crabs), [batches, crabs]);
  const form = useForm<ManualCodeFormInput, unknown, ManualCodeFormOutput>({
    resolver: zodResolver(manualCodeFormSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { code: '' },
  });

  const isCameraOn = cameraState === 'on';
  const isWebcamMounted = cameraState === 'starting' || isCameraOn;
  const message = CAMERA_MESSAGES[cameraState];

  // Detection boxes show whenever the camera is on; QR reading runs alongside until a sticker is read
  const isDetecting = isCameraOn;
  const detection = useDetectionSocket(isDetecting);
  const getVideo = useCallback(() => webcamRef.current?.video, []);
  useFrameCapture({ isEnabled: isDetecting, getVideo, canSend: detection.canSend, sendFrame: detection.sendFrame });
  const width = useSteadyWidth(detection.result);
  const detectionSummary = toDetectionSummary(detection.status, detection.result, width);

  // The form's width follows the camera live once a sticker is read; the workspace decides whether to apply it
  useEffect(() => {
    if (sticker) onMeasure(width.widthMm, width.isSteady);
  }, [sticker, width.widthMm, width.isSteady, onMeasure]);
  const cameras = useCameraDevices(isCameraOn);

  useEffect(() => {
    if (!isCameraOn || sticker) return;
    let isActive = true;
    let isReading = false;
    let timer: number | undefined;

    void createQrReader().then((reader) => {
      if (!isActive) return;
      setCanDetect(reader !== null);
      if (!reader) return;

      timer = window.setInterval(async () => {
        const video = webcamRef.current?.video;
        // ZXing can take longer than one tick on slow phones; skip ticks instead of queueing reads
        if (!video || video.readyState < 2 || isReading) return;
        isReading = true;
        const results = barcodeResultsSchema.safeParse(await reader.detect(video).catch(() => []));
        isReading = false;
        if (!isActive) return;
        const rawValue = results.success ? results.data[0]?.rawValue : undefined;
        if (!rawValue) return;
        const parsed = stickerSchema.safeParse(rawValue);
        if (parsed.success) {
          setReadError(null);
          onScan(parsed.data);
        } else {
          setReadError(parsed.error.issues[0]?.message ?? "That QR isn't a CrabFarm sticker. Try the sticker on the crab's back.");
        }
      }, DETECT_EVERY_MS);
    });

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, [isCameraOn, sticker, onScan, stickerSchema]);

  // Without camera support (old browser, plain http) react-webcam reports it through onUserMediaError
  const handleStartCamera = () => {
    setCameraId(readSavedCamera());
    setCameraState('starting');
  };

  const handleCameraReady = (stream: MediaStream) => {
    setActiveCameraId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? null);
    setCameraState('on');
  };

  const handleCameraError = (error: string | DOMException) => {
    // A remembered camera that was unplugged: forget it and fall back to the default camera
    if (cameraId && error instanceof DOMException && error.name === 'OverconstrainedError') {
      saveCamera(null);
      setCameraId(null);
      return;
    }
    const isBlocked = error instanceof DOMException && error.name === 'NotAllowedError';
    setCameraState(isBlocked ? 'blocked' : 'unavailable');
  };

  const handleSwitchCamera = (nextCameraId: string) => {
    if (nextCameraId === activeCameraId) return;
    saveCamera(nextCameraId);
    setCameraId(nextCameraId);
    setCameraState('starting');
  };

  // Unmounting the webcam stops its tracks, so the camera light goes off
  const handleStopCamera = () => setCameraState('off');

  const handleManualCode = ({ code }: ManualCodeFormOutput) => {
    onScan(code);
    form.reset({ code: '' });
  };

  return (
    <Card className="gap-5 rounded-2xl py-5 sm:py-6">
      <CardContent className="flex flex-col gap-5 px-4 sm:px-6">
        <div className="relative aspect-4/3 overflow-hidden rounded-xl border border-border bg-sidebar text-sidebar-foreground">
          {isWebcamMounted && (
            <Webcam
              key={cameraId ?? 'default'}
              ref={webcamRef}
              audio={false}
              videoConstraints={toVideoConstraints(cameraId)}
              onUserMedia={handleCameraReady}
              onUserMediaError={handleCameraError}
              aria-label="Camera preview"
              className={cn('absolute inset-0 size-full object-cover', !isCameraOn && 'hidden')}
            />
          )}

          {isDetecting && <CustomDetectionOverlay result={detection.result} />}

          {isCameraOn && !sticker && (
            <div aria-hidden className="absolute inset-0 flex items-center justify-center">
              <div className="aspect-square w-1/2 max-w-56 rounded-2xl border-2 border-sidebar-primary/80" />
            </div>
          )}

          <div
            role="status"
            className={cn(
              'absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center',
              isCameraOn && 'inset-auto inset-x-0 bottom-0 bg-sidebar/80 py-3 backdrop-blur',
            )}
          >
            {sticker ? (
              <>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <CircleCheck className="size-4.5 text-sidebar-primary" aria-hidden />
                  <span className="font-mono">{sticker.code}</span> read
                </p>
                {detectionSummary && <p className="max-w-xs text-sm text-sidebar-foreground/75">{detectionSummary}</p>}
              </>
            ) : (
              <>
                {!isCameraOn &&
                  (cameraState === 'blocked' || cameraState === 'unavailable' ? (
                    <CameraOff className="size-7 text-sidebar-foreground/70" aria-hidden />
                  ) : (
                    <Camera className="size-7 text-sidebar-foreground/70" aria-hidden />
                  ))}
                <p className="text-sm font-semibold">{message.title}</p>
                <p className="max-w-xs text-sm text-sidebar-foreground/75">
                  {isCameraOn && !canDetect
                    ? "The QR reader couldn't load. Check your connection, or type the code below."
                    : message.hint}
                </p>
              </>
            )}
          </div>
        </div>

        {readError && (
          <p role="alert" className="text-sm text-destructive">
            {readError}
          </p>
        )}

        {isCameraOn ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            {cameras.length > 1 && (
              <Select value={activeCameraId ?? undefined} onValueChange={handleSwitchCamera}>
                <SelectTrigger aria-label="Camera" className={cn(SELECT_CLASS, 'sm:max-w-56')}>
                  <SwitchCamera aria-hidden />
                  <SelectValue placeholder="Choose a camera" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map(({ id, label }) => (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button type="button" variant="outline" className="h-11 w-full bg-card/60 sm:w-auto sm:px-5" onClick={handleStopCamera}>
              <CameraOff aria-hidden />
              Stop camera
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            className="h-11 w-full sm:mx-auto sm:w-auto sm:px-5"
            disabled={cameraState === 'starting'}
            onClick={handleStartCamera}
          >
            <ScanLine aria-hidden />
            {cameraState === 'starting' ? 'Starting camera…' : 'Start camera'}
          </Button>
        )}

        <form noValidate onSubmit={form.handleSubmit(handleManualCode)} className="border-t border-border pt-5">
          <Controller
            name="code"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="manual-code">Or type the code under the QR</FieldLabel>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    {...field}
                    id="manual-code"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder="B1-A1"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={fieldState.invalid ? 'manual-code-error' : 'manual-code-hint'}
                    className="h-11 bg-card font-mono"
                  />
                  <Button type="submit" variant="outline" className="h-11 bg-card/60 px-5">
                    Use code
                  </Button>
                </div>
                <FieldError id="manual-code-error" errors={[fieldState.error]} />
                <FieldDescription id="manual-code-hint">
                  Batch, then crab, like B1-A1. Spaces and lowercase are fine.
                </FieldDescription>
              </Field>
            )}
          />
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomScanViewport;
