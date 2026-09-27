import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
    Boxes,
    Download,
    ImageIcon,
    Layers,
    Loader2,
    Package,
    Plus,
    QrCode as QrCodeIcon,
    Tag,
} from 'lucide-react';
import { toPng } from 'html-to-image';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
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
import { Label } from './ui/label';

import QRCode from './custom/qr-code';
import IconLogo from './custom/icon-logo';
import { createBatch, getBatches } from '~/api/crabs';
import type { CrabBatch } from '~/types/crabs';
import type { AppDispatch, RootState } from '~/store/store';
import { crab } from '~/store/crab-slice';

const GROUP_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

interface QrTarget {
    id: number | null;
    name: string | null;
    group_by: string | null;
}

const QrCodeGenerator = () => {
    const dispatch = useDispatch<AppDispatch>();
    const queryClient = useQueryClient();
    const { groups } = useSelector((state: RootState) => state.crab);

    const [batchId, setBatchId] = React.useState<number | null>(null);
    const [group, setGroup] = React.useState<string>('A');
    const [target, setTarget] = React.useState<QrTarget>({ id: null, name: null, group_by: null });
    const [isDownloading, setIsDownloading] = React.useState(false);
    const captureRef = React.useRef<HTMLDivElement>(null);

    // load batches
    const {
        data: batches = [],
        isLoading: batchesLoading,
    } = useQuery<CrabBatch[]>({
        queryKey: ['batches'],
        queryFn: getBatches,
        retry: false,
    });

    // load crabs by group
    React.useEffect(() => {
        dispatch(crab(group));
    }, [dispatch, group]);

    // ensure a batch is selected once list is loaded
    React.useEffect(() => {
        if (batchId == null && batches.length > 0) {
            setBatchId(batches[batches.length - 1].id);
        }
    }, [batches, batchId]);

    const createBatchMutation = useMutation({
        mutationFn: createBatch,
        onSuccess: (newBatch) => {
            queryClient.setQueryData<CrabBatch[]>(['batches'], (prev = []) => [...prev, newBatch]);
            setBatchId(newBatch.id);
            toast.success(`Batch #${newBatch.id} generated`, { position: 'top-right' });
        },
        onError: (err: unknown) => {
            toast.error(typeof err === 'string' ? err : 'Failed to generate batch', { position: 'top-right' });
        },
    });

    const crabMap = React.useMemo(() => {
        const map = new Map<string, QrTarget>();
        (groups ?? []).forEach((c) => map.set(String(c.name), { id: c.id, name: c.name, group_by: c.group_by }));
        return map;
    }, [groups]);

    const activeBatch = React.useMemo(
        () => batches.find((b) => b.id === batchId) ?? null,
        [batches, batchId],
    );

    const canGenerate = batchId != null && !!target.name;

    const handleCrabChange = (value: string) => {
        const selected = crabMap.get(value);
        if (!selected) return;
        setTarget(selected);
    };

    const handleDownload = React.useCallback(async () => {
        if (!captureRef.current) return;
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(captureRef.current, {
                cacheBust: true,
                pixelRatio: 3,
                backgroundColor: '#1F1E1F',
            });
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `batch-${batchId ?? 'x'}-${target.name || 'qr-code'}.png`;
            link.click();
            toast.success('QR image downloaded', { position: 'top-right' });
        } catch (err) {
            console.error('Download failed:', err);
            toast.error('Failed to download QR image', { position: 'top-right' });
        } finally {
            setIsDownloading(false);
        }
    }, [target, batchId]);

    return (
        <Card className="overflow-hidden border">
            <CardHeader className="gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            A
                        </span>
                        <div>
                            <CardTitle className="text-lg">Generate a QR Code for each Crab</CardTitle>
                            <CardDescription className="mt-1">
                                Pick a batch, group and crab. The QR encodes the batch + crab so scanning links every log to the correct batch.
                            </CardDescription>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => createBatchMutation.mutate()}
                        disabled={createBatchMutation.isPending}
                    >
                        {createBatchMutation.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Plus className="size-4" />
                        )}
                        Generate Batch
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-5">
                {/* Preview */}
                <div className="overflow-hidden rounded-xl border bg-muted/40 p-4">
                    {!canGenerate ? (
                        <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
                            <div className="flex size-12 items-center justify-center rounded-full bg-background text-muted-foreground/60">
                                <ImageIcon className="size-6" />
                            </div>
                            <p className="text-sm font-medium text-foreground">Nothing to generate yet</p>
                            <p className="max-w-xs text-xs text-muted-foreground">
                                {batchId == null
                                    ? 'Generate or select a batch first, then pick a crab from a group.'
                                    : 'Select a crab from a group to preview its QR code.'}
                            </p>
                        </div>
                    ) : (
                        <div
                            ref={captureRef}
                            className="grid gap-4 rounded-lg bg-[#1F1E1F] p-4 md:grid-cols-2 md:gap-2 md:p-6"
                        >
                            <div className="flex flex-col items-center justify-center gap-2 text-center text-white">
                                <IconLogo className="size-16 fill-current text-white" />
                                <div className="space-y-0.5">
                                    <h3 className="text-xl font-semibold">CrabFarm</h3>
                                    <p className="text-xs opacity-80">
                                        IoT and Machine learning based aquaculture
                                    </p>
                                </div>
                                <div className="mt-1 space-y-1">
                                    <p className="text-2xl font-bold tracking-tight">{target.name}</p>
                                    <p className="text-xs uppercase tracking-widest opacity-70">
                                        {activeBatch?.description ?? `BATCH-${batchId}`} &middot; Group {group}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center justify-center">
                                <QRCode
                                    id={target.id}
                                    name={target.name}
                                    group_by={target.group_by}
                                    batch_id={batchId}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Selectors */}
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground">
                            <Package className="size-3.5" />
                            Batch
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
                                                No batches yet. Click Generate Batch.
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
                        <Select value={group} onValueChange={(v) => { setGroup(v); setTarget({ id: null, name: null, group_by: null }); }}>
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

                    <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground">
                            <Tag className="size-3.5" />
                            Crab Name
                        </Label>
                        <Select value={target.name ?? ''} onValueChange={handleCrabChange}>
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
                </div>

                {/* Summary + Action */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline" className="gap-1">
                            <Boxes className="size-3" />
                            {activeBatch?.description ?? 'No batch'}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                            <Layers className="size-3" />
                            Group {group}
                        </Badge>
                        <Badge variant={target.name ? 'default' : 'outline'} className="gap-1">
                            <QrCodeIcon className="size-3" />
                            {target.name ?? 'No crab'}
                        </Badge>
                    </div>
                    <Button
                        onClick={handleDownload}
                        disabled={!canGenerate || isDownloading}
                        className="gap-2"
                    >
                        {isDownloading ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Download className="size-4" />
                        )}
                        {isDownloading ? 'Generating…' : 'Download QR'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default QrCodeGenerator;
