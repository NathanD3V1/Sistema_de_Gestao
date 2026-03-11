interface StatusTimelineProps {
  statuses: Array<{
    status: string;
    label: string;
    completed: boolean;
    timestamp?: Date;
  }>;
}

export function StatusTimeline({ statuses }: StatusTimelineProps) {
  return (
    <div className="space-y-4">
      {statuses.map((item, index) => (
        <div key={index} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
              item.completed ? 'bg-success' : 'bg-gray-300'
            }`}
          >
            {item.completed ? '✓' : index + 1}
          </div>
          <div className="ml-4 flex-1">
            <p className="font-semibold text-gray-800">{item.label}</p>
            {item.timestamp && (
              <p className="text-sm text-gray-500">
                {new Date(item.timestamp).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
