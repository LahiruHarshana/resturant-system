"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { Button } from "@/components/ui/button";

interface AuditLog {
  id: string;
  at: string;
  actorId: string;
  actorName?: string;
  entity: string;
  entityId: string;
  action: string;
  metadata: Record<string, unknown>;
}

export function AuditLogsClient() {
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-logs", page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/audit-logs?page=${page}&pageSize=20`);
      if (!res.ok) throw new Error("Failed to load audit logs");
      return res.json();
    },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Audit Logs"
        description="View system audit trail and securely redacted operational events."
      />

      {isLoading && <LoadingSkeleton />}
      {error && <ErrorState title="Error" description={error.message} />}

      {!isLoading && !error && data && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                      Actor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                  {data.items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400"
                      >
                        No audit logs found.
                      </td>
                    </tr>
                  ) : (
                    data.items.map((log: AuditLog) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-zinc-900 dark:text-zinc-100">
                          {new Date(log.at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-zinc-900 dark:text-zinc-100">
                          {log.actorName || log.actorId || "System"}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-zinc-900 dark:text-zinc-100">
                          {log.action}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-zinc-900 dark:text-zinc-100">
                          {log.entity} ({log.entityId})
                        </td>
                        <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                          <Button
                            variant="secondary"
                            onClick={() => setSelectedLog(log)}
                            aria-label={`View details for ${log.action}`}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Previous page"
                >
                  Previous
                </Button>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Page {page} of {data.totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  Next
                </Button>
              </div>
            )}
          </div>

          {selectedLog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl dark:bg-zinc-900">
                <div className="flex items-center justify-between border-b border-zinc-200 p-6 dark:border-zinc-800">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Audit Log Details
                  </h3>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    aria-label="Close details"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-4 overflow-y-auto p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Action
                      </p>
                      <p className="text-zinc-900 dark:text-zinc-100">
                        {selectedLog.action}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Actor
                      </p>
                      <p className="text-zinc-900 dark:text-zinc-100">
                        {selectedLog.actorName ||
                          selectedLog.actorId ||
                          "System"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Entity
                      </p>
                      <p className="text-zinc-900 dark:text-zinc-100">
                        {selectedLog.entity} ({selectedLog.entityId})
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Time
                      </p>
                      <p className="text-zinc-900 dark:text-zinc-100">
                        {new Date(selectedLog.at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Redacted Metadata
                    </p>
                    <pre className="overflow-x-auto rounded-md bg-zinc-100 p-4 text-sm text-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
