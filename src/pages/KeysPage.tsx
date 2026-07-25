import { useState, useEffect, type FormEvent } from "react";
import Loading from "../components/Loading";
import * as keysApi from "../api/keys";
import type { ApiKey, KeyPermission } from "../types";

// ========== 新建密钥弹窗 ==========

interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (key: ApiKey) => void;
}

function CreateDialog({ open, onClose, onCreated }: CreateDialogProps) {
  const [name, setName] = useState("");
  const [allowPaths, setAllowPaths] = useState("/*");
  const [read, setRead] = useState(true);
  const [write, setWrite] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [newKey, setNewKey] = useState<ApiKey | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const permissions: KeyPermission = {
        allow_paths: allowPaths.split(",").map((s) => s.trim()).filter(Boolean),
        read,
        write,
      };
      const key = await keysApi.createKey({ name, permissions });
      setNewKey(key);
      onCreated(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setAllowPaths("/*");
    setRead(true);
    setWrite(true);
    setError("");
    setNewKey(null);
    onClose();
  };

  // 如果创建成功，显示密钥明文（只显示一次）
  if (newKey) {
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
          <button
            onClick={handleClose}
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            我已保存，关闭
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-medium text-gray-900">创建新密钥</h3>
        {error && (
          <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
              placeholder="例如：开发团队密钥"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              允许路径（多个用逗号分隔）
            </label>
            <input
              type="text"
              value={allowPaths}
              onChange={(e) => setAllowPaths(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="/*, /projects/*"
            />
          </div>
          <div className="mb-6 flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} />
              读取权限
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={write} onChange={(e) => setWrite(e.target.checked)} />
              写入权限
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "创建中..." : "创建"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========== 编辑密钥弹窗 ==========

interface EditDialogProps {
  open: boolean;
  keyItem: ApiKey;
  onClose: () => void;
  onUpdated: () => void;
}

function EditDialog({ open, keyItem, onClose, onUpdated }: EditDialogProps) {
  const [name, setName] = useState(keyItem.name);
  const [allowPaths, setAllowPaths] = useState(keyItem.permissions.allow_paths.join(", "));
  const [read, setRead] = useState(keyItem.permissions.read);
  const [write, setWrite] = useState(keyItem.permissions.write);
  const [isActive, setIsActive] = useState(keyItem.is_active);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(keyItem.name);
    setAllowPaths(keyItem.permissions.allow_paths.join(", "));
    setRead(keyItem.permissions.read);
    setWrite(keyItem.permissions.write);
    setIsActive(keyItem.is_active);
  }, [keyItem]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await keysApi.updateKey(keyItem.id, {
        name,
        permissions: {
          allow_paths: allowPaths.split(",").map((s) => s.trim()).filter(Boolean),
          read,
          write,
        },
        is_active: isActive,
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-medium text-gray-900">编辑密钥</h3>
        {error && (
          <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">允许路径</label>
            <input
              type="text"
              value={allowPaths}
              onChange={(e) => setAllowPaths(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="mb-4 flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} />
              读取
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={write} onChange={(e) => setWrite(e.target.checked)} />
              写入
            </label>
          </div>
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              启用
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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
  const [deleting, setDeleting] = useState(false);

  const pageSize = 20;

  const fetchKeys = async (p: number) => {
    setLoading(true);
    try {
      const data = await keysApi.listKeys(p, pageSize);
      setKeys(data.items);
      setTotal(data.total);
      setPage(data.page);
    } catch (err) {
      console.error("获取密钥列表失败", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await keysApi.deleteKey(deleteTarget.id);
      setDeleteTarget(null);
      fetchKeys(page);
    } catch (err) {
      console.error("删除失败", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">密钥管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理 API 密钥，控制客户端访问权限</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          创建密钥
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : keys.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <p className="text-gray-500">暂无密钥，点击"创建密钥"开始</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">名称</th>
                <th className="px-4 py-3">路径</th>
                <th className="px-4 py-3">权限</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">创建时间</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{key.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <code className="text-xs">{key.permissions.allow_paths.join(", ")}</code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 text-xs">
                      {key.permissions.read && (
                        <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">读</span>
                      )}
                      {key.permissions.write && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">写</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {key.is_active ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">启用</span>
                    ) : (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">禁用</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(key.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditTarget(key)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => setDeleteTarget(key)}
                        className="text-red-600 hover:text-red-800"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 分页 */}
          {total > pageSize && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-gray-500">
              <span>共 {total} 条</span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchKeys(page - 1)}
                  disabled={page <= 1}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-30"
                >
                  上一页
                </button>
                <span className="px-2 py-1">第 {page} 页</span>
                <button
                  onClick={() => fetchKeys(page + 1)}
                  disabled={page * pageSize >= total}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-30"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 弹窗 */}
      <CreateDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => fetchKeys(1)}
      />

      {editTarget && (
        <EditDialog
          open
          keyItem={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={() => fetchKeys(page)}
        />
      )}

      {/* 删除确认 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-medium text-gray-900">确认删除</h3>
            <p className="mb-6 text-sm text-gray-600">
              确定要删除密钥 <strong>{deleteTarget.name}</strong> 吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "删除中..." : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
