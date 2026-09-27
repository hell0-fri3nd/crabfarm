import React, { useState } from 'react'
import { Button } from './ui'
import { Pause, Play, Square } from 'lucide-react'
import { toast } from 'sonner';
import { pauseFeeding, startFeeding, stopFeeding } from '~/api/control';

const ControlButtons = () => {
    const [systemStatus, setSystemStatus] = React.useState<'stopped' | 'running' | 'paused'>('stopped');
    const [activeFeeders, setActiveFeeders] = React.useState<Record<string, boolean>>({});
    
    const handleStart = async () => {
        try {
            setSystemStatus('running');

            const { status_code, detail } = await startFeeding();
            const toastType = status_code === 200 ? "success" : detail.success ? "success" : "error";
            
            toast[toastType](detail.success ? "Feeding started" : "Failed to start feeding", {
                position: "top-right",
            });
                       

        } catch (error: any) {
            toast.error(
                error?.detail ?? "Something went wrong",
                { position: "top-right" }
            );
        }
    };

    const handlePause = async () => {
        try {
            setSystemStatus('paused');

            const { status_code, detail } = await pauseFeeding();
            const toastType = status_code === 200 ? "success" : detail.success ? "success" : "error";
            
            toast[toastType](detail.success ? "Feeding paused" : "Failed to pause feeding", {
                position: "top-right",
            });

        } catch (error: any) {
            toast.error(
                error?.detail ?? "Something went wrong",
                { position: "top-right" }
            );
        }
    };

    const handleStop = async () => {
        try {
            setSystemStatus('stopped');

            const { status_code, detail } = await stopFeeding();
            const toastType = status_code === 200 ? "success" : detail.success ? "success" : "error";
            
            toast[toastType](detail.success ? "Feeding stopped" : "Failed to stop feeding", {
                position: "top-right",
            });

        }catch(error: any) {
            toast.error(
                error?.detail ?? "Something went wrong",
                { position: "top-right" }
            );
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4 pt-2">
            
            {/* LEFT COLUMN: Buttons */}
            <div className="flex items-center justify-center md:justify-start gap-2">
                <Button
                    variant="outline"
                    size="lg"
                    onClick={handleStart}
                    disabled={systemStatus === 'running'}
                    className="h-10 px-4 font-medium"
                >
                    <Play className="w-4 h-4 mr-2" />
                    Start
                </Button>

                <Button
                    variant="outline"
                    size="lg"
                    onClick={handlePause}
                    disabled={systemStatus !== 'running'}
                    className="h-10 px-4 font-medium"
                >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                </Button>

                <Button
                    variant="outline"
                    size="lg"
                    onClick={handleStop}
                    disabled={systemStatus === 'stopped'}
                    className="h-10 px-4 font-medium"
                >
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                </Button>
            </div>

            {/* RIGHT COLUMN: Status */}
            <div className="text-sm text-right">
                <span className="text-muted-foreground">Status: </span>
                <span
                className={`font-semibold ${
                    systemStatus === 'running'
                        ? 'text-green-600'
                        : systemStatus === 'paused'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                }`}>
                    {systemStatus === 'running' && 'Running'}
                    {systemStatus === 'paused' && 'Paused'}
                    {systemStatus === 'stopped' && 'Stopped'}
                </span>
            </div>

        </div>
    )
}

export default ControlButtons