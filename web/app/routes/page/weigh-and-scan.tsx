import { QrCode, ScanLine, ClipboardCheck } from 'lucide-react';
import QrCodeGenerator from '~/components/qr-code-generator';
import ScanCrabWidth from '~/components/scan-crab-width';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useIsMobile } from '~/hooks/use-mobile';

const STEPS = [
    {
        letter: 'A',
        title: 'Generate & Print',
        description: 'Create a batch and print a QR for each crab.',
        icon: QrCode,
    },
    {
        letter: 'B',
        title: 'Scan Width',
        description: 'Point the camera at the crab QR to measure width.',
        icon: ScanLine,
    },
    {
        letter: 'C',
        title: 'Review & Save',
        description: 'Confirm batch, name, weight & width, then save.',
        icon: ClipboardCheck,
    },
];

const WeighAndScan = () => {
    const mobile = useIsMobile();

    return (
        <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 overflow-x-auto">
            {/* Page header */}
            <div className="border-b border-border/40 pb-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Weigh and Scan</h1>
                <p className="text-sm text-muted-foreground">
                    Generate batches, print QR codes, then scan each crab to log its weight and width.
                </p>
            </div>

            {/* Process stepper */}
            <div className="grid gap-3 md:grid-cols-3">
                {STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    return (
                        <div
                            key={step.letter}
                            className="relative flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4"
                        >
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Icon className="size-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                        Step {idx + 1} &middot; {step.letter}
                                    </span>
                                </div>
                                <p className="mt-0.5 text-sm font-semibold text-foreground">{step.title}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {mobile ? (
                <Tabs defaultValue="qr-code-generator">
                    <div className="flex h-full flex-1 flex-col gap-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="qr-code-generator" className="gap-1.5">
                                <QrCode className="size-4" />
                                <span>Generate</span>
                            </TabsTrigger>
                            <TabsTrigger value="scan-crab-width" className="gap-1.5">
                                <ScanLine className="size-4" />
                                <span>Scan &amp; Save</span>
                            </TabsTrigger>
                        </TabsList>

                        <div className="grid auto-rows-min gap-4">
                            <TabsContent value="qr-code-generator">
                                <QrCodeGenerator />
                            </TabsContent>
                            <TabsContent value="scan-crab-width">
                                <ScanCrabWidth />
                            </TabsContent>
                        </div>
                    </div>
                </Tabs>
            ) : (
                <div className="grid auto-rows-min gap-4 xl:grid-cols-2">
                    <QrCodeGenerator />
                    <ScanCrabWidth />
                </div>
            )}
        </div>
    );
};

export default WeighAndScan;
