let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

export function playAlarmSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'square'
      gain.gain.value = 0.15
      const start = now + i * 0.3
      osc.start(start)
      osc.stop(start + 0.2)
    }
  } catch {
    // Audio not available
  }
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

export function showTimerNotification(tournamentName: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Zeit abgelaufen', { body: tournamentName, icon: undefined })
  }
}
