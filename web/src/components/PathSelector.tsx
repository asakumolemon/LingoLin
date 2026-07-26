import { useState, type KeyboardEvent } from "react";

interface PathSelectorProps {
  value: string[];
  onChange: (paths: string[]) => void;
}

export default function PathSelector({ value, onChange }: PathSelectorProps) {
  const [input, setInput] = useState("");

  const addPath = (raw: string) => {
    // 清理输入：去除空格、尾部 /
    let p = raw.trim();
    if (!p) return;
    p = p.replace(/\/+$/g, "") || "/";
    // 已有则不重复添加
    if (value.includes(p)) return;
    onChange([...value, p]);
    setInput("");
  };

  const removePath = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const setRoot = () => {
    onChange(["/"]);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPath(input);
    }
  };

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        允许访问路径
      </label>

      {/* chip 列表 */}
      <div className="mb-2 flex min-h-[2rem] flex-wrap items-center gap-1.5">
        {value.length === 0 && (
          <span className="text-xs text-gray-400">还未添加路径</span>
        )}
        {value.map((p, i) => (
          <span
            key={p}
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
          >
            {p}
            <button
              type="button"
              onClick={() => removePath(i)}
              className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-blue-200"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* 输入 + 常用操作 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入路径后按回车添加"
          className="flex-1 rounded border px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => addPath(input)}
          className="rounded border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30"
          disabled={!input.trim()}
        >
          添加
        </button>
        <button
          type="button"
          onClick={setRoot}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            value.length === 1 && value[0] === "/"
              ? "bg-blue-600 text-white"
              : "border text-gray-600 hover:bg-gray-50"
          }`}
        >
          全路径 /
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-400">
        输入路径后按回车，支持多个路径。使用 / 允许访问全部文件。
      </p>
    </div>
  );
}
