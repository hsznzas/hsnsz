import confetti from 'canvas-confetti'

export const triggerCompletionConfetti = () => {
  // First burst - centered
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
  })

  // Second burst - left side
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors: ['#10b981', '#34d399', '#f59e0b', '#fbbf24'],
    })
  }, 150)

  // Third burst - right side
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors: ['#10b981', '#34d399', '#f59e0b', '#fbbf24'],
    })
  }, 300)
}

export const triggerQuickWinConfetti = () => {
  // Smaller celebration for quick wins
  confetti({
    particleCount: 60,
    spread: 50,
    origin: { y: 0.7 },
    colors: ['#f59e0b', '#fbbf24', '#fcd34d'],
    scalar: 0.8,
  })
}

export const triggerMilestoneConfetti = () => {
  // Big celebration for milestones (e.g., completing 50% or 100%)
  const duration = 2000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      return clearInterval(interval)
    }

    const particleCount = 50 * (timeLeft / duration)
    
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#10b981', '#34d399', '#6ee7b7'],
    })
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#f59e0b', '#fbbf24', '#fcd34d'],
    })
  }, 250)
}
