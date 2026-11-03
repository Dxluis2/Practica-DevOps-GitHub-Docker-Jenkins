
import { useState, type FormEvent } from 'react'
import {
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth'
import { auth } from '../firebase'
import { GraduationCap, UserRound, Mail, Lock } from 'lucide-react'

type RegisterProps = {
  onLogin: () => void
}

export default function Register({ onLogin }: RegisterProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)

    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      )

      await updateProfile(result.user, {
        displayName: name.trim()
      })
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String(err.code)
          : ''

      if (code === 'auth/email-already-in-use') {
        setError('Este correo ya tiene una cuenta registrada.')
      } else if (code === 'auth/invalid-email') {
        setError('Escribe un correo electrónico válido.')
      } else if (code === 'auth/weak-password') {
        setError('La contraseña es demasiado débil.')
      } else {
        setError('No pudimos crear la cuenta. Inténtalo de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand-icon">
          <GraduationCap size={32} />
        </div>

        <h1>Crea tu cuenta</h1>
        <p className="auth-description">
          Empieza a organizar tus materias y tareas escolares.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Nombre completo
            <div className="auth-input">
              <UserRound size={18} />
              <input
                type="text"
                placeholder="Tu nombre"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          </label>

          <label>
            Correo electrónico
            <div className="auth-input">
              <Mail size={18} />
              <input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label>
            Contraseña
            <div className="auth-input">
              <Lock size={18} />
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
          </label>

          <label>
            Confirmar contraseña
            <div className="auth-input">
              <Lock size={18} />
              <input
                type="password"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="primary-button auth-submit" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-switch">
          ¿Ya tienes cuenta?{' '}
          <button type="button" onClick={onLogin}>
            Iniciar sesión
          </button>
        </p>

        <p className="auth-footer">Agenda Escolar · Tu espacio académico</p>
      </section>
    </main>
  )
}
