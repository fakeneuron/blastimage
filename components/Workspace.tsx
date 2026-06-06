'use client';

/**
 * blastimage — workspace root (BI-003)
 *
 * Client island that owns the {@link useWorkspace} hook and lays out the
 * two-column shell: {@link Sidebar} (session switcher + task list) beside
 * {@link TaskDetail} (the active task). Renders a neutral shell until the
 * mount-time load completes, and a dismissible banner on a save failure.
 */

import { useWorkspace } from '@/lib/useWorkspace';
import Sidebar from '@/components/Sidebar';
import TaskDetail from '@/components/TaskDetail';

export default function Workspace() {
  const ws = useWorkspace();

  if (!ws.ready || !ws.session) {
    return (
      <main className="flex h-screen items-center justify-center">
        <p className="text-sm opacity-50">Loading workspace…</p>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col">
      {ws.error && (
        <div className="flex items-center justify-between gap-4 bg-red-600 px-4 py-2 text-sm text-white">
          <span>{ws.error}</span>
          <button className="shrink-0 underline" onClick={ws.dismissError}>
            Dismiss
          </button>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <Sidebar
          session={ws.session}
          sessions={ws.sessions}
          activeTaskId={ws.activeTaskId}
          onSwitchSession={ws.switchSession}
          onCreateSession={ws.createSession}
          onRenameSession={ws.renameSession}
          onAddTask={ws.addTask}
          onSelectTask={ws.selectTask}
          onRenameTask={ws.renameTask}
          onDeleteTask={ws.deleteTask}
        />
        <TaskDetail
          task={ws.activeTask}
          library={ws.session.refLibrary}
          generating={ws.activeTaskId !== null && ws.generatingTaskId === ws.activeTaskId}
          onRenameTask={ws.renameTask}
          onSetPrompt={ws.setTaskPrompt}
          onAddRefImage={ws.addRefImage}
          onRemoveRefImage={ws.removeRefImage}
          onToggleRef={ws.toggleTaskRef}
          onGenerate={ws.generate}
        />
      </div>
    </main>
  );
}
