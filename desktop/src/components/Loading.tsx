interface LoadingProps {
  text?: string;
}

export default function Loading({ text = "加载中..." }: LoadingProps) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        <span className="text-sm text-gray-500">{text}</span>
      </div>
    </div>
  );
}
