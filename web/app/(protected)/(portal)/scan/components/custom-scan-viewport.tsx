'use client';

import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, CameraOff, CircleCheck, QrCode, ScanLine } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { barcodeResultsSchema, crabCodeSchema, manualCodeFormSchema } from '../types/scan';

import type { ManualCodeFormInput, ManualCodeFormOutput, ScannedSticker } from '../types/scan';

type CameraState = 'off' | 'starting' | 'on' | 'blocked' | 'unavailable';

type CustomScanViewportProps = {
  sticker: ScannedSticker | null;
  testCodes: readonly string[];
  onScan: (sticker: ScannedSticker) => void;
  onCameraChange: (isOn: boolean) => void;
};

const DETECT_EVERY_MS = 500;

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

const createDetector = () => {
  const Detector = Reflect.get(window, 'BarcodeDetector');
  return typeof Detector === 'function' ? new Detector({ formats: ['qr_code'] }) : null;
};

const CustomScanViewport = ({ sticker, testCodes, onScan, onCameraChange }: CustomScanViewportProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraState, setCameraState] = useState<CameraState>('off');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [canDetect, setCanDetect] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  const [testCodeIndex, setTestCodeIndex] = useState(0);
  const form = useForm<ManualCodeFormInput, unknown, ManualCodeFormOutput>({
    resolver: zodResolver(manualCodeFormSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { code: '' },
  });

  const isCameraOn = cameraState === 'on';
  const message = CAMERA_MESSAGES[cameraState];

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
    return () => stream?.getTracks().forEach((track) => track.stop());
  }, [stream]);

  useEffect(() => {
    if (!isCameraOn || sticker) return;
    const detector = createDetector();
    if (!detector) return;

    const timer = window.setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      const results = barcodeResultsSchema.safeParse(await detector.detect(video));
      const rawValue = results.success ? results.data[0]?.rawValue : undefined;
      if (!rawValue) return;
      const parsed = crabCodeSchema.safeParse(rawValue);
      if (parsed.success) {
        setReadError(null);
        onScan(parsed.data);
      } else {
        setReadError("That QR isn't a CrabFarm sticker. Try the sticker on the crab's back.");
      }
    }, DETECT_EVERY_MS);

    return () => window.clearInterval(timer);
  }, [isCameraOn, sticker, onScan]);

  const handleStartCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
      return;
    }
    setCameraState('starting');
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setStream(nextStream);
      setCanDetect(createDetector() !== null);
      setCameraState('on');
      onCameraChange(true);
    } catch (error) {
      const isBlocked = error instanceof DOMException && error.name === 'NotAllowedError';
      setCameraState(isBlocked ? 'blocked' : 'unavailable');
    }
  };

  const handleStopCamera = () => {
    setStream(null);
    setCameraState('off');
    onCameraChange(false);
  };

  const handleManualCode = ({ code }: ManualCodeFormOutput) => {
    onScan(code);
    form.reset({ code: '' });
  };

  const handleTestCode = () => {
    const parsed = crabCodeSchema.safeParse(testCodes[testCodeIndex % testCodes.length]);
    if (!parsed.success) return;
    setTestCodeIndex((current) => current + 1);
    onScan(parsed.data);
  };

  return (
    <Card className="gap-5 rounded-2xl py-5 sm:py-6">
      <CardContent className="flex flex-col gap-5 px-4 sm:px-6">
        <div className="relative aspect-4/3 overflow-hidden rounded-xl border border-border bg-sidebar text-sidebar-foreground">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            aria-label="Camera preview"
            className={cn('absolute inset-0 size-full object-cover', !isCameraOn && 'hidden')}
          />

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
              <p className="flex items-center gap-2 text-sm font-semibold">
                <CircleCheck className="size-4.5 text-sidebar-primary" aria-hidden />
                <span className="font-mono">{sticker.code}</span> read
              </p>
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
                    ? "This browser can't read QR codes from the camera. Type the code below."
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
          <Button type="button" variant="outline" className="h-11 w-full bg-card/60 sm:mx-auto sm:w-auto sm:px-5" onClick={handleStopCamera}>
            <CameraOff aria-hidden />
            Stop camera
          </Button>
        ) : (
          <Button
            type="button"
            className="h-11 w-full sm:mx-auto sm:w-auto sm:px-5"
            disabled={cameraState === 'starting'}
            onClick={() => void handleStartCamera()}
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
                    placeholder="B3-B-02"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={fieldState.invalid ? 'manual-code-error' : 'manual-code-hint'}
                    className="h-11 bg-card font-mono"
                  />
                  <Button type="submit" variant="outline" className="h-11 bg-card/60 px-5">
                    Use code
                  </Button>
                </div>
                <FieldError id="manual-code-error" errors={[fieldState.error]} />
                <FieldDescription id="manual-code-hint">Spaces and lowercase are fine.</FieldDescription>
              </Field>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            className="mt-3 h-11 w-full text-muted-foreground sm:w-auto"
            onClick={handleTestCode}
          >
            <QrCode aria-hidden />
            Use a test code
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomScanViewport;
