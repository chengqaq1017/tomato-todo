import { isTauri } from "@tauri-apps/api/core";

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
