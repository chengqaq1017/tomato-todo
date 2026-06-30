import { isTauri } from "@tauri-apps/api/core";

export interface NowPlaying {
  isPlaying: boolean;
  title: string;
  artist: string;
  source: string;
}

export async function notify(title: string, body: string) {
  if (!isTauri()) {
    return;
  }

  const notification = await import("@tauri-apps/plugin-notification");
  let allowed = await notification.isPermissionGranted();
  if (!allowed) {
    const permission = await notification.requestPermission();
    allowed = permission === "granted";
  }

  if (allowed) {
    notification.sendNotification({ title, body });
  }
}

export async function configureAutostart(enabled: boolean) {
  if (!isTauri()) {
    return;
  }

  const autostart = await import("@tauri-apps/plugin-autostart");
  if (enabled) {
    await autostart.enable();
  } else {
    await autostart.disable();
  }
}

export async function getNowPlaying(): Promise<NowPlaying> {
  const empty = { isPlaying: false, title: "", artist: "", source: "" };
  if (!isTauri()) {
    return empty;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<NowPlaying>("get_now_playing");
  } catch (error) {
    console.error(error);
    return empty;
  }
}

export async function setAppFullscreen(enabled: boolean) {
  if (!isTauri()) {
    if (enabled && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
    }
    if (!enabled && document.fullscreenElement) {
      await document.exitFullscreen?.();
    }
    return;
  }

  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setFullscreen(enabled);
}

export async function registerGlobalShortcuts(actions: {
  toggleTimer: () => void;
  toggleWindow: () => void;
}) {
  if (!isTauri()) {
    return;
  }

  const shortcuts = await import("@tauri-apps/plugin-global-shortcut");
  await shortcuts.register("CommandOrControl+Alt+Space", actions.toggleTimer);
  await shortcuts.register("CommandOrControl+Alt+T", actions.toggleWindow);
}
