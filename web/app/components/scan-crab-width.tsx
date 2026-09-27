import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
    Boxes,
    ImageIcon,
    Layers,
    Loader2,
    Package,
    Save,
    ScanQrCode,
    Scale,
    Ruler,
    Tag,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from './ui/select';

import { persistor, type AppDispatch, type RootState } from '~/store/store';
import { accessExpired, clearAuth, logout, refreshExpired } from '~/store/auth/auth-slice';
import { useMobileNavigation } from '~/hooks/user-mobile-navigations';
import { status, start } from '~/store/camera-slice';
import { crab } from '~/store/crab-slice';
import { getBatches, insertCrabLog } from '~/api/crabs';
import type { CrabBatch } from '~/types/crabs';

interface CameraData {
    camera_status: boolean;
    camera_url?: string;
    extracted_data?: string;
    width_cm?: number;
}

interface ScannedQr {
    id?: number;
    name?: string;
    group_by?: string;
    batch_id?: number | null;
}

const GROUP_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

const ScanCrabWidth = () => {
    const dispatch = useDispatch<AppDispatch>();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const cleanup = useMobileNavigation();
    const { groups } = useSelector((state: RootState) => state.crab);

    const [cameraLoading, setCameraLoading] = React.useState(false);
    const [weight, setWeight] = React.useState<number>(0);

    // form state (Step C)
    const [batchId, setBatchId] = React.useState<number | null>(null);
    const [group, setGroup] = React.useState<string>('A');
    const [crabId, setCrabId] = React.useState<number | null>(null);
    const [crabName, setCrabName] = React.useState<string>('');
    const [widthInput, setWidthInput] = React.useState<string>('');
    const [weightInput, setWeightInput] = React.useState<string>('');

    /* --------------------- Camera polling --------------------- */
    const {
        data,
        error,
        isLoading,
    } = useQuery<CameraData | null, string>({
        queryKey: ['camera-status'],
        queryFn: async () => {
            try {
                const data = await dispatch(status()).unwrap();
                setCameraLoading(!!data?.camera_status);
                return {
                    camera_status: data?.camera_status,
                    camera_url: data?.camera_url,
                    extracted_data: data?.extracted_data,
                    width_cm: data?.width_cm,
                };
            } catch (err: any) {
                throw err?.message || 'UNKNOWN_ERROR';
            }
        },
        refetchInterval: 1000,
        retry: false,
    });

    React.useEffect(() => {
        if (!error) return;
        if (error === 'TOKEN_ACCESS_EXPIRED') {
            dispatch(accessExpired());
            navigate('/access-token');
        }
        if (error === 'TOKEN_REFRESH_EXPIRED') {
            dispatch(accessExpired());
            dispatch(refreshExpired());
            dispatch(clearAuth());
            cleanup();
            dispatch(logout());
            persistor.purge();
            navigate('/access-token');
        }
    }, [error, dispatch]);

    /* --------------------- Weight websocket --------------------- */
    React.useEffect(() => {
        const socket = new WebSocket(`${import.meta.env.VITE_SOCKET_URL}/sensors`);
        socket.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (payload.weight !== undefined) setWeight(payload.weight);
            } catch {
                // ignore malformed
            }
        };
        return () => socket.close();
    }, []);

    /* --------------------- Parsed scanned QR --------------------- */
    const parsedData: ScannedQr | null = React.useMemo(() => {
        if (!data?.extracted_data) return null;
        try {
            return JSON.parse(data.extracted_data);
        } catch {
            return null;
        }
    }, [data?.extracted_data]);

    /* --------------------- Auto-populate from scan --------------------- */
    React.useEffect(() => {
        if (parsedData?.group_by) setGroup(parsedData.group_by);
        if (parsedData?.name) setCrabName(parsedData.name);
        if (parsedData?.id != null) setCrabId(parsedData.id);
        if (parsedData?.batch_id != null) setBatchId(parsedData.batch_id);
    }, [parsedData?.id, parsedData?.name, parsedData?.group_by, parsedData?.batch_id]);

    // reflect live width from camera into form (still editable)
    React.useEffect(() => {
        if (data?.width_cm != null) setWidthInput(String(data.width_cm));
    }, [data?.width_cm]);

    // reflect live weight from scale
    React.useEffect(() => {
        if (weight) setWeightInput(String(weight));
    }, [weight]);

    /* --------------------- Data queries --------------------- */
    const { data: batches = [], isLoading: batchesLoading } = useQuery<CrabBatch[]>({
        queryKey: ['batches'],
        queryFn: getBatches,
        retry: false,
    });

    React.useEffect(() => {
        dispatch(crab(group));
    }, [dispatch, group]);

    /* --------------------- Mutations --------------------- */
    const startCameraMutation = useMutation({
        mutationFn: async () => {
            const result = await dispatch(start()).unwrap();
            return result;
        },
        onError: (err: any) => {
            toast.error(err?.message ?? 'Failed to start camera', { position: 'top-right' });
        },
    });

    const saveLogMutation = useMutation({
        mutationFn: insertCrabLog,
        onSuccess: () => {
            toast.success('Crab log saved successfully', { position: 'top-right' });
            queryClient.invalidateQueries({ queryKey: ['crab-logs'] });
        },
        onError: (err: unknown) => {
            toast.error(typeof err === 'string' ? err : 'Failed to save crab log', { position: 'top-right' });
        },
    });

    const handleSave = () => {
        if (crabId == null) {
            toast.error('Please choose a crab name from the list', { position: 'top-right' });
            return;
        }
        const w = parseFloat(widthInput);
        const kg = parseFloat(weightInput);
        if (Number.isNaN(w) || Number.isNaN(kg)) {
            toast.error('Weight and width must be numeric', { position: 'top-right' });
            return;
        }
        saveLogMutation.mutate({
            crab_id: crabId,
            type: 'actual',
            width: w,
            weight: kg,
            batch_id: batchId,
        });
    };

    const handleCrabNameChange = (name: string) => {
        setCrabName(name);
        const match = (groups ?? []).find((c) => c.name === name);
        setCrabId(match ? match.id : null);
    };

    const activeBatch = React.useMemo(
        () => batches.find((b) => b.id === batchId) ?? null,
        [batches, batchId],
    );

    return (
        <div className="flex flex-col gap-4">
            {/* Step B: Camera scan */}
            <Card className="overflow-hidden border">
                <CardHeader className="gap-2">
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            B
                        </span>
                        <div>
                            <CardTitle className="text-lg">Scan the QR Code to measure width</CardTitle>
                            <CardDescription className="mt-1">
                                Align the camera with the crab’s QR code to read its width automatically.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="relative flex h-60 items-center justify-center overflow-hidden rounded-xl border bg-muted/40 md:h-[420px]">
                        {data?.camera_status && data?.camera_url ? (
                            <img
                                alt="Live camera feed"
                                className="h-full w-full object-cover"
                                src={data.camera_url}
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-center">
                                <div className="flex size-12 items-center justify-center rounded-full bg-background text-muted-foreground/60">
                                    <ImageIcon className="size-6" />
                                </div>
                                <p className="text-sm font-medium text-foreground">Camera is offline</p>
                                <p className="text-xs text-muted-foreground">Press Scan QR Code to start the feed.</p>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                            {parsedData?.name ? (
                                <Badge variant="outline" className="gap-1">
                                    <Tag className="size-3" />
                                    {parsedData.name}
                                </Badge>
                            ) : null}
                            {parsedData?.group_by ? (
                                <Badge variant="outline" className="gap-1">
                                    <Layers className="size-3" />
                                    Group {parsedData.group_by}
                                </Badge>
                            ) : null}
                            {parsedData?.batch_id != null ? (
                                <Badge variant="outline" className="gap-1">
                                    <Boxes className="size-3" />
                                    BATCH-{parsedData.batch_id}
                                </Badge>
                            ) : null}
                            {data?.width_cm != null ? (
                                <Badge className="gap-1">
                                    <Ruler className="size-3" />
                                    {data.width_cm} cm
                                </Badge>
                            ) : null}
                        </div>
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => startCameraMutation.mutate()}
                            disabled={cameraLoading || startCameraMutation.isPending || isLoading}
                        >
                            {startCameraMutation.isPending || isLoading ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <ScanQrCode className="size-4" />
                            )}
                            {startCameraMutation.isPending ? 'Starting…' : 'Scan QR Code'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Step C: Review + Save */}
            <Card className="overflow-hidden border">
                <CardHeader className="gap-2">
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            C
                        </span>
                        <div>
                            <CardTitle className="text-lg">Review &amp; Save Crab Data</CardTitle>
                            <CardDescription className="mt-1">
                                Confirm the batch, crab, and measurements before saving. Values auto-fill from the scan and scale.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-5">
                    {/* Row 1: Batch + Group */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground">
                                <Package className="size-3.5" />
                                Batch Crab
                            </Label>
                            {batchesLoading ? (
                                <Skeleton className="h-9 w-full" />
                            ) : (
                                <Select
                                    value={batchId != null ? String(batchId) : ''}
                                    onValueChange={(v) => setBatchId(v ? Number(v) : null)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select batch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Batches</SelectLabel>
                                            {batches.length === 0 ? (
                                                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                                    No batches yet.
                                                </div>
                                            ) : (
                                                batches.map((b) => (
                                                    <SelectItem key={b.id} value={String(b.id)}>
                                                        {b.description}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground">
                                <Layers className="size-3.5" />
                                Crab Group
                            </Label>
                            <Select
                                value={group}
                                onValueChange={(v) => {
                                    setGroup(v);
                                    setCrabName('');
                                    setCrabId(null);
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select group" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Groups</SelectLabel>
                                        {GROUP_OPTIONS.map((g) => (
                                            <SelectItem key={g} value={g}>
                                                Group {g}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 2: Name + Weight + Width */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground">
                                <Tag className="size-3.5" />
                                Crab Name
                            </Label>
                            <Select value={crabName} onValueChange={handleCrabNameChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select crab" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Group {group}</SelectLabel>
                                        {(!groups || groups.length === 0) ? (
                                            <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                                No crabs in this group.
                                            </div>
                                        ) : (
                                            groups.map((c) => (
                                                <SelectItem key={c.id} value={c.name}>
                                                    {c.name}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="crab-weight"
                                className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground"
                            >
                                <Scale className="size-3.5" />
                                Crab Weight (grams)
                            </Label>
                            <Input
                                id="crab-weight"
                                type="number"
                                inputMode="decimal"
                                value={weightInput}
                                placeholder="0.00"
                                className="h-10"
                                onChange={(e) => setWeightInput(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="crab-width"
                                className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground"
                            >
                                <Ruler className="size-3.5" />
                                Crab Width (cm)
                            </Label>
                            <Input
                                id="crab-width"
                                type="number"
                                inputMode="decimal"
                                value={widthInput}
                                placeholder="0.00"
                                className="h-10"
                                onChange={(e) => setWidthInput(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Summary + Action */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant="outline" className="gap-1">
                                <Boxes className="size-3" />
                                {activeBatch?.description ?? 'No batch'}
                            </Badge>
                            <Badge variant={crabName ? 'default' : 'outline'} className="gap-1">
                                <Tag className="size-3" />
                                {crabName || 'No crab'}
                            </Badge>
                        </div>
                        <Button
                            className="gap-2"
                            onClick={handleSave}
                            disabled={saveLogMutation.isPending || crabId == null}
                        >
                            {saveLogMutation.isPending ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Save className="size-4" />
                            )}
                            {saveLogMutation.isPending ? 'Saving…' : 'Save Crab Data'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ScanCrabWidth;
