
import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth'
import { GraduationCap, Mail, Lock, ArrowLeft } from 'lucide-react'
import { auth } from '../firebase'

type LoginProps = {
  onRegister: () => void
}

function Login({ onRegister }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [recovering, setRecovering] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      )
    } catch {
      setError('Correo o contraseña incorrectos.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRecovery(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      await sendPasswordResetEmail(auth, email.trim())

      setMessage(
        'Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.'
      )
    } catch {
      setError(
        'No se pudo procesar la solicitud. Inténtalo nuevamente más tarde.'
      )
    } finally {
      setLoading(false)
    }
  }

  function changeMode() {
    setRecovering(!recovering)
    setError('')
    setMessage('')
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand-icon">
          <GraduationCap size={32} />
        </div>

        <h1>Agenda Escolar</h1>

        <p className="auth-description">
          {recovering
            ? 'Recupera el acceso a tu cuenta'
            : 'Inicia sesión para organizar tus actividades escolares'}
        </p>

        <form
          onSubmit={recovering ? handleRecovery : handleLogin}
          className="auth-form"
        >
          <label htmlFor="login-email">
            Correo electrónico
          </label>

          <div className="auth-input">
            <Mail size={18} />
            <input
              id="login-email"
              type="email"
              placeholder="correo@ejemplo.com"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          {!recovering && (
            <>
              <label htmlFor="login-password">
                Contraseña
              </label>

              <div className="auth-input">
                <Lock size={18} />
                <input
                  id="login-password"
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="button"
                className="auth-forgot-password"
                onClick={changeMode}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </>
          )}

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="auth-success" role="status">
              {message}
            </p>
          )}

          <button
            type="submit"
            className="primary-button auth-submit"
            disabled={loading}
          >
            {loading
              ? 'Procesando...'
              : recovering
                ? 'Enviar enlace de recuperación'
                : 'Iniciar sesión'}
          </button>
        </form>

        {recovering ? (
          <button
            type="button"
            className="auth-back-button"
            onClick={changeMode}
          >
            <ArrowLeft size={16} />
            Volver a iniciar sesión
          </button>
        ) : (
          <p className="auth-register-text">
            ¿No tienes una cuenta?{' '}
            <button type="button" onClick={onRegister}>
              Regístrate
            </button>
          </p>
        )}
      </section>
    </main>
  )
}

export default Login
