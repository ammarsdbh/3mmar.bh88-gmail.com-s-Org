import { Shift } from '../types';
import { soundFX } from './audio';

const STORAGE_MUTED_KEY = 'natan_muted_shift_alerts';
const SESSION_NOTIFIED_KEY = 'natan_notified_shift_alerts';

/**
 * Checks if browser notifications are supported
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Gets current notification permission
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Requests permission for notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

/**
 * Gets list of muted shift IDs from localStorage
 */
export function getMutedShiftIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_MUTED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Checks if a specific shift's reminder notification is muted/disabled
 */
export function isShiftNotificationMuted(shiftId: string): boolean {
  const muted = getMutedShiftIds();
  return muted.includes(shiftId);
}

/**
 * Toggles muted state for a shift notification
 * Returns new muted status (true = muted/disabled, false = active)
 */
export function toggleShiftNotificationMute(shiftId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const muted = getMutedShiftIds();
    let updated: string[];
    let isNowMuted: boolean;

    if (muted.includes(shiftId)) {
      updated = muted.filter((id) => id !== shiftId);
      isNowMuted = false;
    } else {
      updated = [...muted, shiftId];
      isNowMuted = true;
    }

    localStorage.setItem(STORAGE_MUTED_KEY, JSON.stringify(updated));
    return isNowMuted;
  } catch {
    return false;
  }
}

/**
 * Checks if a shift has already triggered a notification in this session
 */
function hasShiftBeenNotified(shiftId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(SESSION_NOTIFIED_KEY);
    const notified: string[] = raw ? JSON.parse(raw) : [];
    return notified.includes(shiftId);
  } catch {
    return false;
  }
}

/**
 * Marks a shift as notified in this session
 */
function markShiftAsNotified(shiftId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(SESSION_NOTIFIED_KEY);
    const notified: string[] = raw ? JSON.parse(raw) : [];
    if (!notified.includes(shiftId)) {
      notified.push(shiftId);
      sessionStorage.setItem(SESSION_NOTIFIED_KEY, JSON.stringify(notified));
    }
  } catch {}
}

/**
 * Parses a shift date and start time into a Date object
 */
export function parseShiftStartTime(shift: Shift): Date | null {
  try {
    const now = new Date();
    let shiftDateStr = shift.date;

    // If shift.date is missing or placeholder, use today
    if (!shiftDateStr || shiftDateStr.trim().length === 0) {
      shiftDateStr = now.toISOString().split('T')[0];
    }

    // Try parsing HH:MM or HH:MM:SS or 12h format (e.g. 02:00 PM)
    const timeMatch = shift.startTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (!timeMatch) return null;

    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const meridiem = timeMatch[4] ? timeMatch[4].toUpperCase() : null;

    if (meridiem === 'PM' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    // Normalize date string (support YYYY-MM-DD or DD-MM-YYYY or DD/MM/YYYY)
    let year = now.getFullYear();
    let month = now.getMonth();
    let day = now.getDate();

    if (shiftDateStr.includes('-') || shiftDateStr.includes('/')) {
      const parts = shiftDateStr.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
        } else {
          // DD-MM-YYYY
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          year = parseInt(parts[2], 10);
        }
      }
    }

    const shiftDate = new Date(year, month, day, hours, minutes, 0, 0);

    // If calculated date is already past by more than 12 hours and date wasn't explicit, check tomorrow
    if (shiftDate.getTime() < now.getTime() - 12 * 60 * 60 * 1000 && (!shift.date || shift.date === 'اليوم' || shift.date === 'Today')) {
      shiftDate.setDate(shiftDate.getDate() + 1);
    }

    return shiftDate;
  } catch {
    return null;
  }
}

/**
 * Triggers a local browser notification and sound chime
 */
export function sendShiftLocalNotification(shift: Shift, isTest = false): boolean {
  soundFX.playShiftReminder();

  const title = isTest
    ? `🔔 تجربة تنبيه الشفت: ${shift.district || shift.city}`
    : `⏰ تنبيه: موعد شفت نينجا يبدأ بعد ساعة!`;

  const body = isTest
    ? `هكذا سيصلك إشعار التذكير قبل بدء الشفت بساعة. فرع: ${shift.district} (${shift.startTime} - ${shift.endTime}).`
    : `شفتك في فرع (${shift.district || shift.storeName}) سيبدأ الساعة ${shift.startTime}. استعد للانطلاق لتجنب الغرامات!`;

  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `shift-reminder-${shift.id}`,
        requireInteraction: true,
      });
    } catch (e) {
      console.warn('Native notification failed:', e);
    }
  }

  if (!isTest) {
    markShiftAsNotified(shift.id);
  }

  return true;
}

/**
 * Checks all captured shifts and triggers reminder for any shift starting in ~60 minutes (50-65 mins)
 */
export function checkUpcomingShiftReminders(
  capturedShifts: Shift[],
  onNotify?: (shift: Shift, minutesRemaining: number) => void
): Shift[] {
  const triggered: Shift[] = [];
  const now = new Date().getTime();

  for (const shift of capturedShifts) {
    if (isShiftNotificationMuted(shift.id)) continue;
    if (hasShiftBeenNotified(shift.id)) continue;

    const startDate = parseShiftStartTime(shift);
    if (!startDate) continue;

    const diffMinutes = Math.round((startDate.getTime() - now) / 60000);

    // If shift starts in 50 to 65 minutes (1 hour before start)
    if (diffMinutes >= 50 && diffMinutes <= 65) {
      sendShiftLocalNotification(shift, false);
      triggered.push(shift);
      if (onNotify) {
        onNotify(shift, diffMinutes);
      }
    }
  }

  return triggered;
}
