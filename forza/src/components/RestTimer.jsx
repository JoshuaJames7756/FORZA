// src/components/RestTimer.jsx
import { useEffect } from 'react'
import { useTimer } from '../hooks/useTimer'
import styles from '../assets/css/modules/RestTimer.module.css'

const RADIUS      = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const PRESET_OPTIONS = [
  { label: '60s',  secs: 60  },
  { label: '90s',  secs: 90  },
  { label: '2min', secs: 120 },
  { label: '3min', secs: 180 },
]

/**
 * @param {Object} props
 * @param {number}   props.defaultSeconds  - duración por defecto del set
 * @param {boolean}  props.autoStart       - si debe iniciar automáticamente
 * @param {Function} props.onFinish        - callback cuando termina
 */
export default function RestTimer({ defaultSeconds = 90, autoStart = false, onFinish }) {
  const timer = useTimer(defaultSeconds)

  useEffect(() => {
    if (autoStart) timer.start(defaultSeconds)
  }, [autoStart])

  useEffect(() => {
    if (timer.isFinished && onFinish) onFinish()
  }, [timer.isFinished])

  const strokeOffset = CIRCUMFERENCE * (1 - timer.progress)
  const mins = String(Math.floor(timer.remaining / 60)).padStart(2, '0')
  const secs = String(timer.remaining % 60).padStart(2, '0')

  const ringColor = timer.isFinished
    ? '#ff5050'
    : timer.remaining <= 10 && timer.isRunning
    ? '#ffaa00'
    : 'var(--color-primary)'

  return (
    <div className={styles.wrapper}>

      {/* SVG circular ring */}
      <div className={styles.ringWrap}>
        <svg width="130" height="130" viewBox="0 0 130 130">
          {/* Track */}
          <circle
            cx="65" cy="65" r={RADIUS}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="6"
          />
          {/* Progress arc */}
          <circle
            cx="65" cy="65" r={RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeOffset}
            transform="rotate(-90 65 65)"
            style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
          />
        </svg>

        {/* Time display */}
        <div className={styles.timeDisplay}>
          {timer.isFinished ? (
            <span className={styles.finishedText}>¡Listo!</span>
          ) : timer.remaining === 0 && !timer.isRunning ? (
            <span className={styles.idleText}>—</span>
          ) : (
            <span className={`${styles.time} ${timer.remaining <= 10 && timer.isRunning ? styles.timeWarning : ''}`}>
              {mins}:{secs}
            </span>
          )}
          <span className={styles.timeLabel}>descanso</span>
        </div>
      </div>

      {/* Presets */}
      <div className={styles.presets}>
        {PRESET_OPTIONS.map(p => (
          <button
            key={p.secs}
            className={`${styles.presetBtn} ${timer.duration === p.secs && timer.isRunning ? styles.presetActive : ''}`}
            onClick={() => timer.start(p.secs)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        {!timer.isRunning && timer.remaining === 0 ? (
          <button className={styles.ctrlBtn} onClick={() => timer.start()}>
            ▶ Iniciar
          </button>
        ) : timer.isRunning ? (
          <button className={styles.ctrlBtn} onClick={timer.pause}>
            ⏸ Pausar
          </button>
        ) : (
          <>
            <button className={styles.ctrlBtnGhost} onClick={timer.stop}>Reiniciar</button>
            <button className={styles.ctrlBtn} onClick={timer.resume}>▶ Continuar</button>
          </>
        )}
      </div>

    </div>
  )
}