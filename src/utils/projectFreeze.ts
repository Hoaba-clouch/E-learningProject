export function isTruthyFlag(val: string | null): boolean {
  return val === "true" || val === "1";
}

export function isGlobalSubmissionLocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return isTruthyFlag(
      window.localStorage.getItem("codemind_projects_submission_locked")
    );
  } catch {
    return false;
  }
}

export function isProjectFrozen(projectId?: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (isGlobalSubmissionLocked()) {
      return true;
    }
    if (projectId) {
      const pVal = window.localStorage.getItem(`codemind_project_locked_${projectId}`);
      const kVal = window.localStorage.getItem(
        `codemind_kanban_sprint_locked_${projectId}`
      );
      const gVal = window.localStorage.getItem(`codemind_git_repo_locked_${projectId}`);
      if (isTruthyFlag(pVal) || isTruthyFlag(kVal) || isTruthyFlag(gVal)) {
        return true;
      }
      if (pVal !== null || kVal !== null || gVal !== null) {
        return false;
      }
    }
    return isTruthyFlag(
      window.localStorage.getItem("codemind_kanban_sprint_locked")
    );
  } catch {
    return false;
  }
}

function broadcastLockChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("codemind-project-lock-changed"));
  window.dispatchEvent(new Event("codemind-submission-lock-changed"));
}

export function setGlobalSubmissionLocked(locked: boolean): void {
  if (typeof window === "undefined") return;
  const serialized = locked ? "true" : "false";
  try {
    window.localStorage.setItem("codemind_projects_submission_locked", serialized);
    if (!locked) {
      window.localStorage.setItem("codemind_kanban_sprint_locked", "false");
      const prefixes = [
        "codemind_project_locked_",
        "codemind_kanban_sprint_locked_",
        "codemind_git_repo_locked_",
      ];
      const perProjectKeys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && prefixes.some((prefix) => key.startsWith(prefix))) {
          perProjectKeys.push(key);
        }
      }
      for (const key of perProjectKeys) {
        window.localStorage.setItem(key, "false");
      }
    }
  } catch {
    // Ignore storage quota / privacy mode errors
  }
  broadcastLockChange();
}

export function setProjectFrozen(projectId: string, locked: boolean): void {
  if (typeof window === "undefined") return;
  const serialized = locked ? "true" : "false";
  try {
    if (projectId) {
      window.localStorage.setItem(`codemind_project_locked_${projectId}`, serialized);
      window.localStorage.setItem(
        `codemind_kanban_sprint_locked_${projectId}`,
        serialized
      );
      window.localStorage.setItem(`codemind_git_repo_locked_${projectId}`, serialized);
    }
    if (!locked) {
      window.localStorage.setItem("codemind_kanban_sprint_locked", "false");
      window.localStorage.setItem("codemind_projects_submission_locked", "false");
    }
  } catch {
    // Ignore storage quota / privacy mode errors
  }
  broadcastLockChange();
}

export function subscribeProjectLockChanges(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("codemind-project-lock-changed", handler);
  window.addEventListener("codemind-submission-lock-changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("codemind-project-lock-changed", handler);
    window.removeEventListener("codemind-submission-lock-changed", handler);
    window.removeEventListener("storage", handler);
  };
}
