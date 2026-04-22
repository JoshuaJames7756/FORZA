// src/components/DesktopBlock.jsx
// Se renderiza cuando window.innerWidth > 768px
// Genera un QR code automático apuntando a la URL actual de despliegue

import { useEffect, useRef } from 'react'
import styles from '../assets/css/modules/DesktopBlock.module.css'

export default function DesktopBlock() {
  const qrRef = useRef(null)
  const appUrl = window.location.origin  // captura la URL de despliegue automáticamente

  useEffect(() => {
    // Cargamos QRCode.js desde CDN solo en cliente
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
    script.onload = () => {
      if (qrRef.current && window.QRCode) {
        qrRef.current.innerHTML = ''
        new window.QRCode(qrRef.current, {
          text: appUrl,
          width: 160,
          height: 160,
          colorDark: '#CCFF00',
          colorLight: '#1A1A1A',
          correctLevel: window.QRCode.CorrectLevel.M,
        })
      }
    }
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [appUrl])

  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>

        {/* Logo */}
        <div className={styles.logoCircle}>
          <span className={styles.logoText}>
            FORZ<span className={styles.arrow}>↗</span>A
          </span>
        </div>

        {/* Mensaje */}
        <h1 className={styles.title}>
          Diseñada para<br />
          <span className={styles.accent}>tu celular.</span>
        </h1>

        <p className={styles.message}>
          Escanea el código con tu cámara<br />
          para comenzar.
        </p>

        {/* QR */}
        <div className={styles.qrWrapper}>
          <div ref={qrRef} className={styles.qrCode} />
        </div>

        <span className={styles.url}>{appUrl}</span>
      </div>
    </div>
  )
}