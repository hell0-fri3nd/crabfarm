import React, { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent,
} from './ui/chart'
import { Button } from './ui/button'
import { Switch } from './ui/switch'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import {
  Boxes,
  Layers,
  Loader2,
  Sparkles,
  Tag,
} from 'lucide-react'
import type { Crab } from '~/types/crab'
import type { CrabBatch } from '~/types/crabs'
import { getCrabLogs } from '~/api/crab'
import { getBatches } from '~/api/crabs'
import { useIsMobile } from '~/hooks/use-mobile'
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router'
import { useMobileNavigation } from '~/hooks/user-mobile-navigations'
import { accessExpired, clearAuth, logout, refreshExpired } from '~/store/auth/auth-slice'
import { persistor, type AppDispatch } from '~/store/store'
import { postPredictedCrab } from '~/api/predict'
import { toast } from 'sonner'

interface ProcessedData {
  date: string
  width: number
  weight: number
}

// Transform raw logs into chart-ready data
function transformLogs(logs: Crab[]): { actual: ProcessedData[]; prediction: ProcessedData[] } {
  const actual = logs
    .filter((log) => log.type === 'actual')
    .map((log) => ({
      date: new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      width: log.width,
      weight: log.weight,
    }))

  const prediction = logs
    .filter((log) => log.type === 'prediction')
    .map((log) => ({
      date: new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      width: log.width,
      weight: log.weight,
    }))

  return { actual, prediction }
}

function buildCrabData(logs?: Crab[]) {

  const crabMap: Record<string, Crab[]> = {}
  logs?.forEach((log) => {
    if (!crabMap[log.crab_id]) {
      crabMap[log.crab_id] = []
    }
    crabMap[log.crab_id].push(log)
  })

  const CRAB_DATA: Record<string, { actual: ProcessedData[]; prediction: ProcessedData[]; name: string; crab_id: Number; batch_id?: number | null }> = {}

  Object.entries(crabMap).forEach(([crabId, crabLogs]) => {
    const { actual, prediction } = transformLogs(crabLogs)
    const crabName = crabLogs[0]?.crab_name
    const crabID = Number(crabId)
    const batch_id = crabLogs[0]?.batch_id ?? null
    CRAB_DATA[crabId] = { actual, prediction, name: crabName, crab_id: crabID, batch_id }
  })

  return CRAB_DATA
}

const chartConfig = {
  width: {
    label: 'Width (cm)',
    theme: {
      light: '#22c55e',
      dark: '#16a34a',
    },
  },
  weight: {
    label: 'Weight (g)',
    theme: {
      light: '#3b82f6',
      dark: '#1d4ed8',
    },
  },
}

const CrabChart = () => {
  const isMobile = useIsMobile()

  const { data, isLoading, error } = useQuery<Crab[]>({
    queryKey: ['crabLogs', 'all'],
    queryFn: () => getCrabLogs('all'),
    refetchInterval: 500,
    retry: false,
  });

  const {
    data: batches = [],
    isLoading: batchesLoading,
  } = useQuery<CrabBatch[]>({
    queryKey: ['batches'],
    queryFn: getBatches,
    retry: false,
  });

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const cleanup = useMobileNavigation();

  const [selectedBatch, setSelectedBatch] = useState<string>('all')
  const [selectedGroup, setSelectedGroup] = useState<string>('A')
  const [selectedCrab, setSelectedCrab] = useState<string | null>(null)
  const [isActual, setIsActual] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  // Default to the first batch once batches are loaded
  React.useEffect(() => {
    if (batches.length > 0 && selectedBatch === 'all') {
      setSelectedBatch(String(batches[0].id))
    }
  }, [batches, selectedBatch])

  React.useEffect(() => {

    const errStr = error as unknown as string;
    if (!error) return;
    
    if (errStr === 'MISSING_ACCESS_TOKEN') {
      dispatch(accessExpired());
      navigate('/access-token');
    }
    
    if (errStr  === 'MISSING_REFRESH_TOKEN') {
      dispatch(accessExpired());
      dispatch(refreshExpired());
      dispatch(clearAuth());
      cleanup();
      dispatch(logout());
      persistor.purge();
      navigate('/access-token');
    }
    
  }, [error, dispatch, navigate, cleanup]);

  // Unique groups from fetched logs (independent of current filters)
  const allGroups = React.useMemo(() => {
    const set = new Set<string>()
    data?.forEach((log) => log.group_by && set.add(log.group_by))
    return Array.from(set).sort()
  }, [data])

  // Filter logs by batch + group, then group by crab
  const filteredCrabData = React.useMemo(() => {
    const filtered =
      data?.filter((log) => {
        const batchOk = selectedBatch === 'all' || String(log.batch_id ?? '') === selectedBatch
        const groupOk = selectedGroup === 'all' || log.group_by === selectedGroup
        return batchOk && groupOk
      }) ?? []
    return buildCrabData(filtered)
  }, [data, selectedBatch, selectedGroup])

  const crabIds = Object.keys(filteredCrabData)

  // Auto-select the first crab whenever the list changes
  React.useEffect(() => {
    if (crabIds.length === 0) {
      setSelectedCrab(null)
      return
    }
    if (!selectedCrab || !filteredCrabData[selectedCrab]) {
      setSelectedCrab(crabIds[0])
    }
  }, [crabIds, filteredCrabData, selectedCrab])

  const handleBatchChange = (value: string) => {
    setSelectedBatch(value)
  }

  const handleGroupChange = (value: string) => {
    setSelectedGroup(value)
  }

  const selectedBatchLabel = React.useMemo(() => {
    if (selectedBatch === 'all') return 'All batches'
    const match = batches.find((b) => String(b.id) === selectedBatch)
    return match?.description ?? `BATCH-${selectedBatch}`
  }, [selectedBatch, batches])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex h-80 flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading prediction data…</p>
        </CardContent>
      </Card>
    )
  }

  if (crabIds.length === 0 || !selectedCrab || !filteredCrabData[selectedCrab]) {
    return (
      <Card>
        <CardContent className="flex h-80 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-medium text-foreground">No matching data</p>
          <p className="text-xs text-muted-foreground">
            No crab logs found for the selected {selectedBatch !== 'all' ? 'batch' : 'group'}. Try widening your filters.
          </p>
        </CardContent>
      </Card>
    )
  }

  const crab_data = filteredCrabData[selectedCrab]
  const displayData = isActual ? crab_data.actual : crab_data.prediction
  const crabName = crab_data.name

  const generatePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const { status_code, detail } = await postPredictedCrab(
        Number(crab_data.crab_id),
        crab_data.batch_id
      );

      const toastType =
        status_code === 201
          ? "success"
          : status_code === 200
          ? "warning"
          : "error";

      toast[toastType](detail ?? "Failed to generate prediction", {
        position: "top-right",
      });
    } catch (error: any) {
      toast.error(
        error?.detail ?? "Something went wrong",
        { position: "top-right" }
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
   <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-lg sm:text-2xl font-bold">
            {crabName} - Growth Monitor
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Daily width and weight measurements over {displayData.length} days
          </CardDescription>
        </div>

        {/* Filter bar */}
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm font-medium text-muted-foreground">
              <Boxes className="size-4" />
              <span>Filters</span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-1 sm:flex-wrap sm:items-center sm:gap-3">
              <Select value={selectedBatch} onValueChange={handleBatchChange}>
                <SelectTrigger className="w-full justify-between gap-2 border-border/50 hover:bg-accent sm:w-auto sm:min-w-40">
                  <SelectValue placeholder="Batch" />
                </SelectTrigger>
                <SelectContent align="end" className="w-48">
                  <SelectGroup>
                    <SelectLabel>Batch Crab</SelectLabel>
                    <SelectItem value="all">All batches</SelectItem>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.description}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select value={selectedGroup} onValueChange={handleGroupChange}>
                <SelectTrigger className="w-full justify-between gap-2 border-border/50 hover:bg-accent sm:w-auto sm:min-w-40">
                  <SelectValue placeholder="Group" />
                </SelectTrigger>
                <SelectContent align="end" className="w-48">
                  <SelectGroup>
                    <SelectLabel>Crab Group</SelectLabel>
                    <SelectItem value="all">All groups</SelectItem>
                    {allGroups.map((g) => (
                      <SelectItem key={g} value={g}>
                        Group {g}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select
                value={selectedCrab ?? ''}
                onValueChange={(value) => setSelectedCrab(value)}
              >
                <SelectTrigger className="w-full justify-between gap-2 border-border/50 hover:bg-accent sm:w-auto sm:min-w-40">
                  <SelectValue placeholder="Crab" />
                </SelectTrigger>
                <SelectContent align="end" className="w-48">
                  <SelectGroup>
                    <SelectLabel>Crab Name</SelectLabel>
                    {crabIds.map((id) => (
                      <SelectItem key={id} value={id}>
                        {filteredCrabData[id].name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 sm:w-auto">
              <span className="text-sm font-medium text-muted-foreground">
                {isActual ? 'Actual' : 'Prediction'}
              </span>
              <Switch
                checked={!isActual}
                onCheckedChange={(checked) => setIsActual(!checked)}
              />
            </div>

            <Button
              variant="outline"
              className="w-full justify-between gap-2 border-border/50 hover:bg-accent sm:w-auto"
              onClick={generatePrediction}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {isGenerating ? 'Generating…' : 'Generate Prediction'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2.5 py-1 font-medium text-muted-foreground">
            <Boxes className="size-3" />
            {batchesLoading ? 'Loading…' : selectedBatchLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2.5 py-1 font-medium text-muted-foreground">
            <Layers className="size-3" />
            {selectedGroup === 'all' ? 'All groups' : `Group ${selectedGroup}`}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2.5 py-1 font-medium text-muted-foreground">
            <Tag className="size-3" />
            {crabName}
          </span>
        </div>

        <ChartContainer config={chartConfig} className="h-72 w-full sm:h-96">
          <LineChart
            width={isMobile ? 320 : 800}
            height={isMobile ? 250 : 350}
            data={displayData}
            margin={{ top: 5, right: isMobile ? 5 : 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--muted-foreground))"
              opacity={0.1}
            />

            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />

            <YAxis
              yAxisId="left"
              stroke="var(--color-width)"
              tick={{ fill: 'var(--color-width)', fontSize: 12 }}
              label={{ value: 'Width (cm)', angle: -90, position: 'insideLeft' }}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="var(--color-weight)"
              tick={{ fill: 'var(--color-weight)', fontSize: 12 }}
              label={{ value: 'Weight (g)', angle: 90, position: 'insideRight' }}
            />

            <Tooltip content={<ChartTooltipContent hideLabel={false} />} />
            <Legend content={<ChartLegendContent />} />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="width"
              stroke="var(--color-width)"
              strokeWidth={2.5}
              dot={{ fill: 'var(--color-width)', r: 4 }}
              activeDot={{ r: 6 }}
              name="Width (cm)"
            />

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="weight"
              stroke="var(--color-weight)"
              strokeWidth={2.5}
              dot={{ fill: 'var(--color-weight)', r: 4 }}
              activeDot={{ r: 6 }}
              name="Weight (g)"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>

      <CardFooter>
        {/* Data Summary */}
        <div className="mt-6 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
            <p className="text-sm font-medium text-muted-foreground">Width Range</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-bold text-green-600">
                {displayData.length > 0 ? Math.min(...displayData.map((d) => d.width)).toFixed(1) : '—'}
              </span>
              <span className="text-sm text-muted-foreground">to</span>
              <span className="text-2xl font-bold text-green-600">
                {displayData.length > 0 ? Math.max(...displayData.map((d) => d.width)).toFixed(1) : '—'}
              </span>
              <span className="text-sm text-muted-foreground">cm</span>
            </div>
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
            <p className="text-sm font-medium text-muted-foreground">Weight Range</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-600">
                {displayData.length > 0 ? Math.min(...displayData.map((d) => d.weight)).toFixed(0) : '—'}
              </span>
              <span className="text-sm text-muted-foreground">to</span>
              <span className="text-2xl font-bold text-blue-600">
                {displayData.length > 0 ? Math.max(...displayData.map((d) => d.weight)).toFixed(0) : '—'}
              </span>
              <span className="text-sm text-muted-foreground">g</span>
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

export default CrabChart