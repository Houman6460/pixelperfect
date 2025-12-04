import React from 'react';
import { Play, Film, Clock } from 'lucide-react';
import { VideoTimeline, TimelineSegment, MODEL_CAPABILITY_REGISTRY } from '../../types/videoTimeline';

interface TimelineTrackProps {
  timeline: VideoTimeline;
  onSegmentClick: (segmentId: number) => void;
  selectedSegmentId?: number;
  isPlaying?: boolean;
  currentTime?: number;
}

export default function TimelineTrack({
  timeline,
  onSegmentClick,
  selectedSegmentId,
  isPlaying = false,
  currentTime = 0,
}: TimelineTrackProps) {
  const totalDuration = timeline.total_duration_sec;
  
  // Calculate cumulative time for each segment
  const getSegmentTimes = () => {
    let cumulative = 0;
    return timeline.segments.map((seg) => {
      const start = cumulative;
      cumulative += seg.duration_sec;
      return { ...seg, startTime: start, endTime: cumulative };
    });
  };

  const segmentsWithTimes = getSegmentTimes();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generated': return 'bg-emerald-500';
      case 'generating': return 'bg-yellow-500 animate-pulse';
      case 'error': return 'bg-red-500';
      case 'modified': return 'bg-orange-500';
      default: return 'bg-slate-600';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      {/* Time markers */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500">
        <span>{formatTime(0)}</span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Total: {formatTime(totalDuration)}
        </span>
        <span>{formatTime(totalDuration)}</span>
      </div>

      {/* Track container */}
      <div className="relative h-20 bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        {/* Segments */}
        <div className="absolute inset-0 flex">
          {segmentsWithTimes.map((segment, index) => {
            const widthPercent = (segment.duration_sec / totalDuration) * 100;
            const model = MODEL_CAPABILITY_REGISTRY[segment.model];
            const isSelected = segment.segment_id === selectedSegmentId;

            return (
              <button
                key={segment.segment_id}
                onClick={() => onSegmentClick(segment.segment_id)}
                className={`relative h-full flex flex-col items-center justify-center transition-all ${
                  isSelected ? 'ring-2 ring-purple-500 ring-inset z-10' : ''
                }`}
                style={{ width: `${widthPercent}%`, minWidth: '40px' }}
                aria-label={`Select segment ${index + 1}: ${segment.prompt || 'No prompt'}`}
              >
                {/* Segment background */}
                <div
                  className={`absolute inset-0 ${
                    segment.thumbnail_url
                      ? ''
                      : index % 2 === 0
                      ? 'bg-slate-700/50'
                      : 'bg-slate-700/30'
                  }`}
                >
                  {segment.thumbnail_url && (
                    <img
                      src={segment.thumbnail_url}
                      alt=""
                      className="w-full h-full object-cover opacity-60"
                    />
                  )}
                </div>

                {/* Segment content */}
                <div className="relative z-10 flex flex-col items-center gap-1 px-1">
                  <div className="flex items-center gap-1">
                    <span className="w-5 h-5 rounded bg-black/50 flex items-center justify-center text-[10px] text-white font-bold">
                      {index + 1}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(segment.status)}`} />
                  </div>
                  <span className="text-[10px] text-white/80 truncate max-w-full px-1">
                    {model?.display_name?.split(' ')[0] || segment.model}
                  </span>
                  <span className="text-[9px] text-white/60">{segment.duration_sec}s</span>
                </div>

                {/* Transition indicator */}
                {index < timeline.segments.length - 1 && segment.transition !== 'none' && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                    <Film className="w-2.5 h-2.5 text-white" />
                  </div>
                )}

                {/* Border between segments */}
                {index < timeline.segments.length - 1 && (
                  <div className="absolute right-0 top-0 bottom-0 w-px bg-slate-600" />
                )}
              </button>
            );
          })}
        </div>

        {/* Playhead */}
        {isPlaying && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 transition-all"
            style={{ left: `${(currentTime / totalDuration) * 100}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
          </div>
        )}
      </div>

      {/* Segment quick info */}
      <div className="flex items-center gap-4 px-1 text-xs text-slate-400">
        <span>{timeline.segments.length} segments</span>
        <span>•</span>
        <span>{timeline.segments.filter(s => s.status === 'generated').length} generated</span>
        <span>•</span>
        <span>{timeline.segments.filter(s => s.status === 'pending' || s.status === 'modified').length} pending</span>
      </div>
    </div>
  );
}
