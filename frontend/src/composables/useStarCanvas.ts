import { ref, onMounted, onUnmounted } from 'vue'

interface Particle {
  x: number
  y: number
  r: number
  v: number
}

export function useStarCanvas() {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const particles: Particle[] = []
  let animId = 0

  function resize() {
    const canvas = canvasRef.value
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    particles.length = 0
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.8 + 0.25,
        v: Math.random() * 0.45 + 0.1,
      })
    }
  }

  function draw() {
    const canvas = canvasRef.value
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#05070d'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (const p of particles) {
      ctx.beginPath()
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
      p.y += p.v
      if (p.y > canvas.height) {
        p.y = 0
        p.x = Math.random() * canvas.width
      }
    }
    animId = requestAnimationFrame(draw)
  }

  onMounted(() => {
    resize()
    draw()
    window.addEventListener('resize', resize)
  })

  onUnmounted(() => {
    cancelAnimationFrame(animId)
    window.removeEventListener('resize', resize)
  })

  return { canvasRef }
}
