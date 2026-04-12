export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function isNotificationsSupported(): boolean {
  return 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

// Local notification (no service worker needed)
export function showLocalNotification(title: string, options?: NotificationOptions): void {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    })
  }
}

// Check if favorites have changed conditions and notify
export function checkAndNotifyConditionChanges(
  previousScores: Record<string, number>,
  currentScores: Record<string, number>
): void {
  for (const [locationId, currentScore] of Object.entries(currentScores)) {
    const prevScore = previousScores[locationId]
    if (prevScore === undefined) continue

    // Notify on significant changes (crossing thresholds)
    if (prevScore >= 5 && currentScore < 3) {
      showLocalNotification(`Weather Alert: ${locationId}`, {
        body: `Conditions have deteriorated from ${prevScore.toFixed(1)} to ${currentScore.toFixed(1)}. Exercise caution.`,
        tag: `condition-change-${locationId}`,
      })
    } else if (prevScore < 5 && currentScore >= 7) {
      showLocalNotification(`Good news: ${locationId}`, {
        body: `Conditions have improved to ${currentScore.toFixed(1)}/10. Good window for hiking.`,
        tag: `condition-change-${locationId}`,
      })
    }
  }
}
