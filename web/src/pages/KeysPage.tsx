import { useState, useEffect, type FormEvent } from "react";
import Loading from "../components/Loading";
import PathSelector from "../components/PathSelector";
import * as keysApi from "../api/keys";
import { getServerBaseUrl, copyToClipboard, formatConnectionInfo } from "../api/share";
import type { ApiKey, KeyPermission } from "../types";

// ========== 创建弹窗 ==========
function CreateDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (k: ApiKey) => void }) {
  const [name, setName] = useState("");
  const [allowPaths, setAllowPaths] = useState<string[]>(["/"]);
  const [read, setRead] = useState(true);
  const [write, setWrite] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setSubmitting(true);
    try {
      const permissions: KeyPermission = {
        allow_paths: allowPaths, read, write,
      };
      const key = await keysApi.createKey({ name, permissions });
      setNewKey(key);
      onCreated(key);
    } catch (err) { setError(err instanceof Error ? err.message : "创建失败"); }
    finally { setSubmitting(false); }
  };

  const handleClose = () => { setName(""); setAllowPaths(["/"]); setRead(true); setWrite(true); setError(""); setNewKey(null); onClose(); };

  if (newKey) {
    const baseUrl = getServerBaseUrl();
    const connText = formatConnectionInfo(baseUrl, newKey.key || "");
    const handleCopy = async () => {
      const ok = await copyToClipboard(connText);
      if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
    };
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <h3 className="mb-4 text-lg font-medium text-gray-900">密钥创建成功</h3>
          <div className="mb-4 rounded border border-yellow-300 bg-yellow-50 p-3 text-sm">
            <p className="mb-1 font-medium text-yellow-800">⚠ 请立即保存此密钥</p>
            <p className="text-yellow-700">密钥明文仅在此刻显示一次，关闭后将无法再次查看。</p>
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">密钥</label>
            <code className="block break-all rounded bg-gray-100 px-3 py-2 text-sm">{newKey.key}</code>
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">连接信息（分享给其他端使用）</label>
            <pre className="whitespace-pre-wrap break-all rounded bg-gray-50 px-3 py-2 text-xs text-gray-700">{connText}</pre>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCopy} className={`flex-1 rounded px-4 py-2 text-sm font-medium transition-colors ${copied ? "bg-green-600 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
              {copied ? "已复制 ✓" : "复制连接信息"}
            </button>
            <button onClick={handleClose} className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">关闭</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-medium text-gray-900">创建新密钥</h3>
        {error && <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">名称</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" required placeholder="例如：开发团队密钥" />
          </div>
          <div className="mb-4">
            <PathSelector value={allowPaths} onChange={setAllowPaths} />
          </div>
          <div className="mb-6 flex gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} />读取权限</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={write} onChange={(e) => setWrite(e.target.checked)} />写入权限</label>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={handleClose} className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">取消</button>
            <button type="submit" disabled={submitting} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{submitting ? "创建中..." : "创建"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========== 编辑弹窗 ==========
function EditDialog({ open, keyItem, onClose, onUpdated }: { open: boolean; keyItem: ApiKey; onClose: () => void; onUpdated: () => void }) {
  const [name, setName] = useState(keyItem.name);
  const [allowPaths, setAllowPaths] = useState<string[]>(keyItem.permissions.allow_paths);
  const [read, setRead] = useState(keyItem.permissions.read);
  const [write, setWrite] = useState(keyItem.permissions.write);
  const [isActive, setIsActive] = useState(keyItem.is_active);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setName(keyItem.name); setAllowPaths(keyItem.permissions.allow_paths); setRead(keyItem.permissions.read); setWrite(keyItem.permissions.write); setIsActive(keyItem.is_active); }, [keyItem]);
  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(""); setSubmitting(true);
    try {
      await keysApi.updateKey(keyItem.id, {
        name,
        permissions: { allow_paths: allowPaths, read, write },
        is_active: isActive,
      });
      onUpdated(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "更新失败"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-medium text-gray-900">编辑密钥</h3>
        {error && <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4"><label className="mb-1 block text-sm font-medium text-gray-700">名称</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" /></div>
          <div className="mb-4"><PathSelector value={allowPaths} onChange={setAllowPaths} /></div>
          <div className="mb-4 flex gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} />读取</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={write} onChange={(e) => setWrite(e.target.checked)} />写入</label>
          </div>
          <div className="mb-6"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />启用</label></div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">取消</button>
            <button type="submit" disabled={submitting} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{submitting ? "保存中..." : "保存"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========== 分享按钮 ==========
function ShareButton({ keyName }: { keyName: string }) {
  const [copied, setCopied] = useState(false);
  const autoKey = localStorage.getItem("api_key_auto");
  if (keyName !== "Web 管理端自动生成" || !autoKey) return null;
  const connText = formatConnectionInfo(getServerBaseUrl(), autoKey);
  const handleClick = async () => {
    const ok = await copyToClipboard(connText);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };
  return <button onClick={handleClick} className={`text-sm transition-colors ${copied ? "text-green-600" : "text-indigo-600 hover:text-indigo-800"}`}>{copied ? "已复制 ✓" : "分享"}</button>;
}

// ========== 主页面 ==========
export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiKey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);
  const [batchDeleteIds, setBatchDeleteIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const pageSize = 20;

  const visibleKeys = keys.filter((k) => k.name !== "Web 管理端自动生成");

  const fetchKeys = async (p: number) => {
    setLoading(true);
    try { const data = await keysApi.listKeys(p, pageSize); setKeys(data.items); setTotal(data.total); setPage(data.page); }
    catch (err) { console.error("获取密钥列表失败", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchKeys(page); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await keysApi.deleteKey(deleteTarget.id); setDeleteTarget(null); fetchKeys(page); }
    catch (err) { console.error("删除失败", err); }
    finally { setDeleting(false); }
  };

  const handleBatchDelete = async () => {
    if (batchDeleteIds.size === 0) return;
    setDeleting(true);
    try {
      await Promise.all(Array.from(batchDeleteIds).map((id) => keysApi.deleteKey(id)));
      setBatchDeleteIds(new Set());
      fetchKeys(page);
    } catch (err) { console.error("批量删除失败", err); }
    finally { setDeleting(false); }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(batchDeleteIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setBatchDeleteIds(next);
  };

  const toggleSelectAll = () => {
    if (batchDeleteIds.size === visibleKeys.length) {
      setBatchDeleteIds(new Set());
    } else {
      setBatchDeleteIds(new Set(visibleKeys.map((k) => k.id)));
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">密钥管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理 API 密钥，控制客户端访问权限</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">创建密钥</button>
      </div>

      {loading ? <Loading /> : visibleKeys.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center"><p className="text-gray-500">暂无密钥，点击"创建密钥"开始</p></div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          {/* 批量操作栏 */}
          {batchDeleteIds.size > 0 && (
            <div className="flex items-center justify-between border-b bg-red-50 px-4 py-2">
              <span className="text-sm text-red-700">已选 {batchDeleteIds.size} 项</span>
              <button
                onClick={() => setBatchDeleteIds(new Set())}
                className="rounded border border-red-200 bg-white px-3 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                取消选择
              </button>
              <button
                onClick={() => setDeleteTarget({ id: 0, name: `选中 ${batchDeleteIds.size} 个密钥` } as ApiKey)}
                disabled={deleting}
                className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                批量删除
              </button>
            </div>
          )}
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-2 py-3">
                  <input
                    type="checkbox"
                    checked={visibleKeys.length > 0 && batchDeleteIds.size === visibleKeys.length}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3">名称</th><th className="px-4 py-3">路径</th><th className="px-4 py-3">权限</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">创建时间</th><th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleKeys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-2 py-3">
                    <input
                      type="checkbox"
                      checked={batchDeleteIds.has(key.id)}
                      onChange={() => toggleSelect(key.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-600"><code className="text-xs">{key.permissions.allow_paths.join(", ")}</code></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 text-xs">
                      {key.permissions.read && <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">读</span>}
                      {key.permissions.write && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">写</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">{key.is_active ? <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">启用</span> : <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">禁用</span>}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(key.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <ShareButton keyName={key.name} />
                      <button onClick={() => setEditTarget(key)} className="text-blue-600 hover:text-blue-800">编辑</button>
                      <button onClick={() => setDeleteTarget(key)} className="text-red-600 hover:text-red-800">删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > pageSize && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-gray-500">
              <span>共 {visibleKeys.length} 条</span>
              <div className="flex gap-2">
                <button onClick={() => fetchKeys(page - 1)} disabled={page <= 1} className="rounded border px-3 py-1 text-sm disabled:opacity-30">上一页</button>
                <span className="px-2 py-1">第 {page} 页</span>
                <button onClick={() => fetchKeys(page + 1)} disabled={page * pageSize >= total} className="rounded border px-3 py-1 text-sm disabled:opacity-30">下一页</button>
              </div>
            </div>
          )}
        </div>
      )}

      <CreateDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => fetchKeys(1)} />
      {editTarget && <EditDialog open keyItem={editTarget} onClose={() => setEditTarget(null)} onUpdated={() => fetchKeys(page)} />}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-medium text-gray-900">确认删除</h3>
            <p className="mb-6 text-sm text-gray-600">
              {deleteTarget.id === 0
                ? <>确定要删除选中的 <strong>{batchDeleteIds.size}</strong> 个密钥吗？此操作不可撤销。</>
                : <>确定要删除密钥 <strong>{deleteTarget.name}</strong> 吗？此操作不可撤销。</>
              }
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setDeleteTarget(null); setBatchDeleteIds(new Set()); }} className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">取消</button>
              <button onClick={deleteTarget.id === 0 ? handleBatchDelete : handleDelete} disabled={deleting} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">{deleting ? "删除中..." : "确认删除"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
