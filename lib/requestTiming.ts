const PERFORMANCE_TRACE_HEADER = 'x-song-room-performance-trace';

type TimingStage = {
  name: string;
  durationMs: number;
};

function roundDuration(value: number) {
  return Math.round(value * 10) / 10;
}

function sanitizeTraceId(value: string | null) {
  const trimmed = value?.trim() ?? '';
  return /^[a-zA-Z0-9-]{1,64}$/.test(trimmed) ? trimmed : null;
}

export function readPerformanceTraceId(request: Request) {
  return sanitizeTraceId(request.headers.get(PERFORMANCE_TRACE_HEADER));
}

export class RequestTiming {
  private readonly startedAt = performance.now();
  private readonly stages: TimingStage[] = [];

  async measure<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const startedAt = performance.now();

    try {
      return await operation();
    } finally {
      this.stages.push({
        name,
        durationMs: roundDuration(performance.now() - startedAt),
      });
    }
  }

  record(name: string, startedAt: number) {
    this.stages.push({
      name,
      durationMs: roundDuration(performance.now() - startedAt),
    });
  }

  attach(response: Response) {
    const serverTiming = [
      ...this.stages,
      { name: 'total', durationMs: this.totalMs() },
    ]
      .map(stage => `${stage.name};dur=${stage.durationMs}`)
      .join(', ');

    response.headers.set('Server-Timing', serverTiming);
    return response;
  }

  logPreview(
    route: string,
    request: Request,
    status: number,
    details: Record<string, number | string | boolean | null> = {}
  ) {
    if (process.env.VERCEL_ENV !== 'preview') return;

    console.info(JSON.stringify({
      level: 'info',
      message: 'request_timing',
      route,
      status,
      requestId: request.headers.get('x-vercel-id'),
      traceId: readPerformanceTraceId(request),
      totalMs: this.totalMs(),
      stages: Object.fromEntries(this.stages.map(stage => [stage.name, stage.durationMs])),
      ...details,
    }));
  }

  private totalMs() {
    return roundDuration(performance.now() - this.startedAt);
  }
}
