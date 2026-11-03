
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Home, BookOpen, ClipboardList, CalendarDays, Bell, ChevronLeft,
  ChevronRight, Check, Clock, Trash2, X, GraduationCap, CircleCheck,
  Cloud, Menu, ListTodo, Plus, Search, UserRound, Settings,
  LogOut, ArrowRight, Pencil
} from 'lucide-react'
import {
  onAuthStateChanged,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  type User
} from 'firebase/auth'
import { auth, db, messagingPromise } from './firebase'
import { getToken } from 'firebase/messaging'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import Login from './pages/Login'
import Register from './pages/Register'
import './App.css'

type Subject = {
  id: string
  name: string
  color: string
}

type Task = {
  id: string
  title: string
  subjectId: string
  date: string
  time?: string
  dueAt?: string
  timeZone?: string
  description: string
  completed: boolean
}

type Page =
  | 'Inicio'
  | 'Materias'
  | 'Tareas'
  | 'Calendario'
  | 'Perfil'

const colors = [
  '#4f6df5',
  '#18a77a',
  '#e59b2f',
  '#d96891',
  '#8167d8',
  '#1597b5'
]

const today = new Date()

const dateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function App() {
  // Autenticación Firebase
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authPage, setAuthPage] = useState<'login' | 'register'>('login')
  const [logoutError, setLogoutError] = useState('')
  const [profileName, setProfileName] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser)
      setAuthReady(true)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    setProfileName(user?.displayName || '')
  }, [user])

  useEffect(() => {
    if (!user) {
      setSubjects([])
      setTasks([])
      return
    }

    const subjectsRef = collection(
      db,
      'users',
      user.uid,
      'subjects'
    )

    const tasksRef = collection(
      db,
      'users',
      user.uid,
      'tasks'
    )

    const unsubscribeSubjects = onSnapshot(
      subjectsRef,
      snapshot => {
        const data: Subject[] = snapshot.docs.map(item => ({
          id: item.id,
          ...(item.data() as Omit<Subject, 'id'>),
        }))

        setSubjects(data)
      },
      error => {
        console.error('Error cargando materias:', error)
        setSyncError('No se pudieron cargar las materias.')
      }
    )

    const unsubscribeTasks = onSnapshot(
      tasksRef,
      snapshot => {
        const data: Task[] = snapshot.docs.map(item => ({
          id: item.id,
          ...(item.data() as Omit<Task, 'id'>),
        }))

        setTasks(data)
      },
      error => {
        console.error('Error cargando tareas:', error)
        setSyncError('No se pudieron cargar las tareas.')
      }
    )

    return () => {
      unsubscribeSubjects()
      unsubscribeTasks()
    }
  }, [user])

  // Datos de la agenda sincronizados con Firebase Firestore
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [tasks, setTasks] = useState<Task[]>([])

  const [page, setPage] = useState<Page>('Inicio')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'task' | 'subject' | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null)
  const [syncError, setSyncError] = useState('')

  // No esperamos la confirmación del servidor: Firestore aplica la escritura
  // a su caché local y la envía cuando recupera la conexión.
  function queueWrite(operation: Promise<unknown>, description: string) {
    setSyncError('')
    void operation.catch(error => {
      console.error(`Error al ${description}:`, error)
      setSyncError(`No se pudo ${description}. Revisa tu conexión y los permisos de Firebase.`)
    })
  }
  const [menuOpen, setMenuOpen] = useState(false)

  const [month, setMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  )

  const [taskTitle, setTaskTitle] = useState('')
  const [taskSubject, setTaskSubject] = useState('')
  const [taskDate, setTaskDate] = useState(dateKey(today))
  const [taskTime, setTaskTime] = useState('18:00')
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [taskDescription, setTaskDescription] = useState('')
  const [subjectName, setSubjectName] = useState('')
  const [subjectColor, setSubjectColor] = useState(colors[0])


  const completed = tasks.filter(task => task.completed).length
  const pending = tasks.length - completed

  const todayTasks = tasks.filter(
    task => task.date === dateKey(today) && !task.completed
  )

  const upcoming = useMemo(() => {
    return tasks
      .filter(task => !task.completed && task.date >= dateKey(today))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5)
  }, [tasks])

  const visibleTasks = useMemo(() => {
    return tasks.filter(task => {
      const subject = subjects.find(
        item => item.id === task.subjectId
      )

      return `${task.title} ${subject?.name || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
    })
  }, [tasks, subjects, search])

  const subjectFor = (id: string) =>
    subjects.find(subject => subject.id === id)

  const prettyDate = (value: string) => {
    if (!value) return ''

    return new Date(`${value}T12:00:00`).toLocaleDateString(
      'es-MX',
      {
        day: 'numeric',
        month: 'short'
      }
    )
  }

  async function enableNotifications() {
    if (!user || notificationsLoading) return

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert('Este navegador no admite notificaciones push.')
      return
    }

    if (!window.isSecureContext) {
      alert('Las notificaciones necesitan HTTPS o localhost.')
      return
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      alert('Falta configurar VITE_FIREBASE_VAPID_KEY en el archivo .env.local.')
      return
    }

    setNotificationsLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        alert('Debes permitir las notificaciones en el navegador.')
        return
      }

      const messaging = await messagingPromise
      if (!messaging) {
        alert('Firebase Messaging no es compatible con este navegador.')
        return
      }

      // Utilizamos el Service Worker de la PWA, sin registrar uno adicional.
      const registration = await navigator.serviceWorker.ready
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      })

      if (!token) {
        alert('No se pudo obtener el token de notificaciones.')
        return
      }

      await setDoc(doc(db, 'users', user.uid, 'fcmTokens', token), {
        token,
        updatedAt: serverTimestamp(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })

      alert('Notificaciones activadas correctamente en este dispositivo.')
    } catch (error) {
      console.error('Error activando notificaciones:', error)
      alert('No se pudieron activar las notificaciones. Revisa los permisos y las reglas de Firestore.')
    } finally {
      setNotificationsLoading(false)
    }
  }

  function closeModal() {
    setModal(null)
    setEditingTaskId(null)
    setEditingSubjectId(null)
  }

  function openNewSubject() {
    setEditingSubjectId(null)
    setSubjectName('')
    setSubjectColor(colors[subjects.length % colors.length])
    setModal('subject')
  }

  function openEditSubject(id: string) {
    const subject = subjects.find(item => item.id === id)
    if (!subject) return
    setEditingSubjectId(id)
    setSubjectName(subject.name)
    setSubjectColor(subject.color)
    setModal('subject')
  }

  function openNewTask() {
    setEditingTaskId(null)
    setTaskTitle('')
    setTaskSubject('')
    setTaskDate(dateKey(new Date()))
    setTaskTime('18:00')
    setTaskDescription('')
    setModal('task')
  }

  function openEditTask(id: string) {
    const task = tasks.find(item => item.id === id)
    if (!task) return
    setEditingTaskId(id)
    setTaskTitle(task.title)
    setTaskSubject(task.subjectId)
    setTaskDate(task.date)
    setTaskTime(task.time || '18:00')
    setTaskDescription(task.description || '')
    setModal('task')
  }

  function saveSubject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!subjectName.trim() || !user) return
    const data = { name: subjectName.trim(), color: subjectColor }
    if (editingSubjectId) {
      queueWrite(
        updateDoc(doc(db, 'users', user.uid, 'subjects', editingSubjectId), data),
        'actualizar la materia'
      )
    } else {
      const newRef = doc(collection(db, 'users', user.uid, 'subjects'))
      queueWrite(setDoc(newRef, data), 'crear la materia')
    }
    closeModal()
  }

  function saveTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!taskTitle.trim() || !taskSubject || !taskDate || !taskTime || !user) return

    const dueDate = new Date(`${taskDate}T${taskTime}:00`)
    const original = editingTaskId ? tasks.find(item => item.id === editingTaskId) : null
    if (Number.isNaN(dueDate.getTime()) ||
        (dueDate.getTime() <= Date.now() && (!original || !original.completed))) {
      alert('Selecciona una fecha y hora de entrega futuras.')
      return
    }

    const data = {
      title: taskTitle.trim(),
      subjectId: taskSubject,
      date: taskDate,
      time: taskTime,
      dueAt: dueDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      description: taskDescription.trim(),
    }

    if (editingTaskId) {
      const batch = writeBatch(db)
      batch.update(doc(db, 'users', user.uid, 'tasks', editingTaskId), data)
      if (original && original.dueAt !== data.dueAt) {
        // Conservamos el reinicio de recordatorios de la versión anterior.
        // Las reglas de Firestore deben permitir borrar estos documentos.
        for (const kind of ['24h', '3h']) {
          batch.delete(doc(db, 'users', user.uid, 'tasks', editingTaskId, 'reminders', kind))
        }
      }
      queueWrite(batch.commit(), 'actualizar la tarea')
    } else {
      const newRef = doc(collection(db, 'users', user.uid, 'tasks'))
      queueWrite(setDoc(newRef, { ...data, completed: false }), 'crear la tarea')
    }
    closeModal()
  }

  function toggleTask(id: string) {
    if (!user) return
    const task = tasks.find(item => item.id === id)
    if (!task) return
    queueWrite(
      updateDoc(doc(db, 'users', user.uid, 'tasks', id), { completed: !task.completed }),
      'actualizar la tarea'
    )
  }

  function deleteTask(id: string) {
    if (!user) return
    queueWrite(deleteDoc(doc(db, 'users', user.uid, 'tasks', id)), 'eliminar la tarea')
  }

  function deleteSubject(id: string) {
    if (!user) return
    const subject = subjectFor(id)
    if (!subject) return
    if (!confirm(`¿Eliminar la materia "${subject.name}" y sus tareas?`)) return

    // Una sola escritura atómica: se aplica localmente aunque no haya internet.
    const batch = writeBatch(db)
    const relatedTasks = tasks.filter(task => task.subjectId === id)
    relatedTasks.forEach(task => {
      batch.delete(doc(db, 'users', user.uid, 'tasks', task.id))
    })
    batch.delete(doc(db, 'users', user.uid, 'subjects', id))
    queueWrite(batch.commit(), 'eliminar la materia')
  }

  function goTo(nextPage: Page) {
    setPage(nextPage)
    setSearch('')
    setMenuOpen(false)
  }

  async function handleLogout() {
    setLogoutError('')

    try {
      await signOut(auth)
      setPage('Inicio')
      setMenuOpen(false)
      setAuthPage('login')
    } catch {
      setLogoutError(
        'No se pudo cerrar la sesión. Inténtalo de nuevo.'
      )
    }
  }

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user || !profileName.trim()) return
    setProfileSaving(true)
    setProfileMessage('')
    setProfileError('')
    try {
      await updateProfile(user, { displayName: profileName.trim() })
      setProfileMessage('Tu nombre se actualizó correctamente.')
    } catch {
      setProfileError('No se pudieron guardar los cambios. Inténtalo de nuevo.')
    } finally {
      setProfileSaving(false)
    }
  }

  async function sendPasswordReset() {
    if (!user?.email) {
      setProfileError('Tu cuenta no tiene un correo electrónico registrado.')
      setProfileMessage('')
      return
    }
    setProfileMessage('')
    setProfileError('')
    try {
      await sendPasswordResetEmail(auth, user.email)
      setProfileMessage(`Enviamos un enlace para cambiar tu contraseña a ${user.email}.`)
    } catch {
      setProfileError('No se pudo enviar el correo. Inténtalo más tarde.')
    }
  }

  const monthName = month.toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric'
  })

  const firstDay = new Date(
    month.getFullYear(),
    month.getMonth(),
    1
  ).getDay()

  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0
  ).getDate()

  const calendarCells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ]

  const navigation = [
    { name: 'Inicio' as Page, icon: Home },
    { name: 'Materias' as Page, icon: BookOpen },
    { name: 'Tareas' as Page, icon: ClipboardList },
    { name: 'Calendario' as Page, icon: CalendarDays },
    { name: 'Perfil' as Page, icon: UserRound }
  ]

  const displayName =
    user?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    'Estudiante'

  const initials =
    displayName
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || 'ES'

  // Esperar a que Firebase determine si hay una sesión.
  if (!authReady) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand-icon">
            <GraduationCap size={32} />
          </div>
          <h1>Agenda Escolar</h1>
          <p className="auth-description">
            Preparando tu espacio académico...
          </p>
        </section>
      </main>
    )
  }

  // Si no hay sesión, mostrar login o registro.
  if (!user) {
    return authPage === 'login' ? (
      <Login
        onRegister={() => setAuthPage('register')}
      />
    ) : (
      <Register
        onLogin={() => setAuthPage('login')}
      />
    )
  }

  return (
    <div className="app-shell">
      {menuOpen && (
        <button
          className="mobile-overlay"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-icon">
            <GraduationCap size={23} />
          </div>

          <div>
            <strong>Agenda</strong>
            <span>Recordatorio de Actividades</span>
          </div>

          <button
            className="icon-button mobile-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={19} />
          </button>
        </div>

        <nav className="nav-menu">
          {navigation.map(item => {
            const Icon = item.icon

            return (
              <button
                key={item.name}
                className={`nav-item ${page === item.name ? 'active' : ''}`}
                onClick={() => goTo(item.name)}
              >
                <Icon size={19} />
                <span>{item.name}</span>

                {item.name === 'Tareas' && pending > 0 && (
                  <small>{pending}</small>
                )}
              </button>
            )
          })}
        </nav>

        <div className="side-section-heading">
          <span>MIS MATERIAS</span>

          <button
            className="tiny-add"
            onClick={openNewSubject}
            aria-label="Agregar materia"
          >
            <Plus size={17} />
          </button>
        </div>

        <div className="subject-menu">
          {subjects.slice(0, 6).map(subject => (
            <button
              key={subject.id}
              className="subject-menu-item"
              onClick={() => {
                goTo('Materias')
                setSearch(subject.name)
              }}
            >
              <i style={{ background: subject.color }} />
              {subject.name}
            </button>
          ))}

          {subjects.length === 0 && (
            <p className="side-empty">
              Agrega tus materias para comenzar.
            </p>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="cloud-icon">
            <Cloud size={18} />
          </div>

          <div>
            <strong>Tu espacio escolar</strong>
            <p>Todo organizado en un solo lugar.</p>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-button menu-toggle"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={21} />
          </button>

          <div className="breadcrumb">
            Mi espacio <span>/</span>
            <strong>{page}</strong>
          </div>

          <div className="topbar-right">
            <div className="today-label">
              <CalendarDays size={16} />
              {today.toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'long'
              })}
            </div>

            <button
              className="notification-button"
              type="button"
              aria-label="Activar notificaciones"
              title="Activar notificaciones"
              disabled={notificationsLoading}
              onClick={() => void enableNotifications()}
            >
              <Bell size={19} />
              <i />
            </button>

            <button
              className="profile-mini"
              onClick={() => goTo('Perfil')}
            >
              <span className="avatar">{initials}</span>

              <span className="profile-mini-text">
                <strong>{displayName}</strong>
                <small>Estudiante</small>
              </span>

              <ChevronRight size={16} />
            </button>
          </div>
        </header>

        <div className="content">
          {syncError && (
            <p role="alert" style={{ color: '#b91c1c', marginBottom: 16 }}>
              {syncError}
            </p>
          )}
          {page === 'Inicio' && (
            <>
              <section className="hero">
                <div>
                  <h1>Hola, {displayName}.</h1>
                  <p>
                    Revisa tus actividades, materias y próximas
                    fechas desde un solo lugar.
                  </p>
                </div>

                <div className="hero-actions">
                  <button
                    className="secondary-button"
                    onClick={() => goTo('Calendario')}
                  >
                    <CalendarDays size={17} />
                    Ver calendario
                  </button>

                  <button
                    className="primary-button"
                    onClick={openNewTask}
                  >
                    <Plus size={18} />
                    Nueva tarea
                  </button>
                </div>
              </section>

              <section className="stats-grid">
                <StatCard
                  title="Materias"
                  value={subjects.length}
                  note="Asignaturas activas"
                  icon={<BookOpen size={20} />}
                  type="purple"
                />

                <StatCard
                  title="Pendientes"
                  value={pending}
                  note="Por completar"
                  icon={<Clock size={20} />}
                  type="orange"
                />

                <StatCard
                  title="Completadas"
                  value={completed}
                  note="Actividades terminadas"
                  icon={<CircleCheck size={20} />}
                  type="green"
                />

                <StatCard
                  title="Para hoy"
                  value={todayTasks.length}
                  note="Entregas de hoy"
                  icon={<CalendarDays size={20} />}
                  type="blue"
                />
              </section>

              <section className="home-grid">
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Próximas actividades</h2>
                      <p>Lo más importante que tienes por delante</p>
                    </div>

                    <button
                      className="text-button"
                      onClick={() => goTo('Tareas')}
                    >
                      Ver tareas
                      <ArrowRight size={16} />
                    </button>
                  </div>

                  {upcoming.length === 0 ? (
                    <EmptyState
                      icon={<ListTodo size={32} />}
                      title="Aún no tienes actividades"
                      text="Agrega tu primera tarea para comenzar a organizar tu semana."
                      action={
                        <button
                          className="primary-button"
                          onClick={openNewTask}
                        >
                          <Plus size={17} />
                          Agregar tarea
                        </button>
                      }
                    />
                  ) : (
                    <div className="task-list">
                      {upcoming.map(task => (
                        <TaskRow
                          onEdit={openEditTask}
                          key={task.id}
                          task={task}
                          subject={subjectFor(task.subjectId)}
                          prettyDate={prettyDate}
                          onToggle={toggleTask}
                          onDelete={deleteTask}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="panel quick-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Accesos rápidos</h2>
                      <p>Continúa con lo que necesitas</p>
                    </div>
                  </div>

                  <div className="quick-actions">
                    <QuickAction
                      icon={<Plus size={19} />}
                      title="Crear tarea"
                      text="Registra una nueva actividad"
                      type="blue-bg"
                      onClick={openNewTask}
                    />

                    <QuickAction
                      icon={<BookOpen size={19} />}
                      title="Agregar materia"
                      text="Organiza tus asignaturas"
                      type="purple-bg"
                      onClick={openNewSubject}
                    />
                  </div>
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Mis materias</h2>
                    <p>
                      Tus asignaturas y el trabajo pendiente de cada una
                    </p>
                  </div>

                  <button
                    className="text-button"
                    onClick={() => goTo('Materias')}
                  >
                    Ver materias
                    <ArrowRight size={16} />
                  </button>
                </div>

                {subjects.length === 0 ? (
                  <div className="subject-empty">
                    <div className="empty-illustration small-illustration">
                      <BookOpen size={27} />
                    </div>

                    <div>
                      <h3>Aún no tienes materias</h3>
                      <p>
                        Agrega las materias que estás cursando para comenzar.
                      </p>
                    </div>

                    <button
                      className="secondary-button"
                      onClick={openNewSubject}
                    >
                      <Plus size={17} />
                      Agregar materia
                    </button>
                  </div>
                ) : (
                  <SubjectGrid
                    onEdit={openEditSubject}
                    subjects={subjects.slice(0, 4)}
                    tasks={tasks}
                    onDelete={deleteSubject}
                  />
                )}
              </section>
            </>
          )}

          {page === 'Materias' && (
            <PageHeader
              eyebrow="ORGANIZACIÓN ACADÉMICA"
              title="Mis materias"
              description="Consulta tus asignaturas y organiza las actividades de cada una."
              action={
                <button
                  className="primary-button"
                  onClick={openNewSubject}
                >
                  <Plus size={18} />
                  Nueva materia
                </button>
              }
            >
              <div className="search-box">
                <Search size={17} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar una materia..."
                />
              </div>

              <div style={{ height: 15 }} />

              {subjects.filter(subject =>
                subject.name.toLowerCase().includes(search.toLowerCase())
              ).length === 0 ? (
                <EmptyState
                  icon={<BookOpen size={32} />}
                  title={
                    search
                      ? 'No encontramos esa materia'
                      : 'Aún no tienes materias'
                  }
                  text="Agrega una asignatura para comenzar."
                  action={
                    !search ? (
                      <button
                        className="primary-button"
                        onClick={openNewSubject}
                      >
                        <Plus size={17} />
                        Agregar materia
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                <SubjectGrid
                  onEdit={openEditSubject}
                  subjects={subjects.filter(subject =>
                    subject.name.toLowerCase().includes(search.toLowerCase())
                  )}
                  tasks={tasks}
                  onDelete={deleteSubject}
                />
              )}
            </PageHeader>
          )}

          {page === 'Tareas' && (
            <PageHeader
              eyebrow="ACTIVIDADES"
              title="Mis tareas"
              description="Consulta, completa y organiza todas tus actividades escolares."
              action={
                <button
                  className="primary-button"
                  onClick={openNewTask}
                >
                  <Plus size={18} />
                  Nueva tarea
                </button>
              }
            >
              <div className="toolbar">
                <div className="search-box">
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar una tarea o materia..."
                  />
                </div>

                <span className="toolbar-count">
                  {visibleTasks.length} actividades
                </span>
              </div>

              <div className="task-list large-list">
                {visibleTasks.length === 0 ? (
                  <EmptyState
                    icon={<ListTodo size={32} />}
                    title="No hay tareas para mostrar"
                    text="Prueba otra búsqueda o crea una nueva actividad."
                  />
                ) : (
                  visibleTasks.map(task => (
                    <TaskRow
                      onEdit={openEditTask}
                      key={task.id}
                      task={task}
                      subject={subjectFor(task.subjectId)}
                      prettyDate={prettyDate}
                      onToggle={toggleTask}
                      onDelete={deleteTask}
                    />
                  ))
                )}
              </div>
            </PageHeader>
          )}

          {page === 'Calendario' && (
            <PageHeader
              eyebrow="PLANEACIÓN"
              title="Calendario"
              description="Visualiza las fechas de entrega y organiza tu semana."
            >
              <div className="calendar-layout">
                <div className="panel calendar-big">
                  <div className="calendar-big-header">
                    <div>
                      <h2>{monthName}</h2>
                      <p>Fechas de tus actividades</p>
                    </div>

                    <div className="calendar-arrows">
                      <button
                        className="icon-button"
                        aria-label="Mes anterior"
                        onClick={() =>
                          setMonth(new Date(
                            month.getFullYear(),
                            month.getMonth() - 1,
                            1
                          ))
                        }
                      >
                        <ChevronLeft size={18} />
                      </button>

                      <button
                        className="icon-button"
                        aria-label="Mes siguiente"
                        onClick={() =>
                          setMonth(new Date(
                            month.getFullYear(),
                            month.getMonth() + 1,
                            1
                          ))
                        }
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="calendar-grid big-grid">
                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(
                      (day, index) => (
                        <span
                          key={`${day}-${index}`}
                          className="weekday"
                        >
                          {day}
                        </span>
                      )
                    )}

                    {calendarCells.map((day, index) => {
                      const key = day
                        ? dateKey(new Date(
                            month.getFullYear(),
                            month.getMonth(),
                            day
                          ))
                        : ''

                      const dayTasks = tasks.filter(
                        task => task.date === key
                      )

                      return (
                        <button
                          key={index}
                          disabled={!day}
                          className={`calendar-day big-day ${
                            day && key === dateKey(today)
                              ? 'current-day'
                              : ''
                          } ${dayTasks.length ? 'has-task' : ''}`}
                        >
                          <span>{day || ''}</span>

                          {dayTasks.slice(0, 2).map(task => (
                            <i
                              key={task.id}
                              style={{
                                background:
                                  subjectFor(task.subjectId)?.color ||
                                  '#4f6df5'
                              }}
                            />
                          ))}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Próximas fechas</h2>
                      <p>Tus siguientes entregas</p>
                    </div>
                  </div>

                  {upcoming.length === 0 ? (
                    <div className="upcoming-empty">
                      <CalendarDays size={20} />
                      <span>No hay fechas próximas.</span>
                    </div>
                  ) : (
                    <div className="upcoming-list">
                      {upcoming.map(task => (
                        <div className="upcoming-item" key={task.id}>
                          <div className="upcoming-date">
                            <strong>
                              {new Date(`${task.date}T12:00:00`).getDate()}
                            </strong>
                            <span>
                              {new Date(`${task.date}T12:00:00`)
                                .toLocaleDateString('es-MX', {
                                  month: 'short'
                                })}
                            </span>
                          </div>

                          <div>
                            <strong>{task.title}</strong>
                            <span>
                              {subjectFor(task.subjectId)?.name || 'Sin materia'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </PageHeader>
          )}

          {page === 'Perfil' && (
            <PageHeader
              eyebrow="CUENTA"
              title="Mi perfil"
              description="Administra la información de tu espacio escolar."
            >
              <div className="profile-card">
                <div className="profile-cover" />

                <div className="profile-body">
                  <div className="profile-avatar-large">{initials}</div>

                  <div>
                    <h2>{displayName}</h2>
                    <p>{user.email || 'Sin correo'} · Estudiante</p>
                  </div>
                </div>

                <div className="profile-details-panel">
                  <div className="profile-section-title">
                    <UserRound size={18} />
                    <div>
                      <h3>Información personal</h3>
                      <p>Actualiza cómo aparece tu nombre en la agenda.</p>
                    </div>
                  </div>

                  <form className="profile-edit-form" onSubmit={saveProfile}>
                    <label htmlFor="profile-name">Nombre completo</label>
                    <input
                      id="profile-name"
                      name="profile-name"
                      autoComplete="name"
                      maxLength={80}
                      required
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      placeholder="Escribe tu nombre"
                    />
                    <label htmlFor="profile-email">Correo electrónico</label>
                    <input id="profile-email" value={user.email || ''} readOnly />
                    <button className="primary-button" type="submit" disabled={profileSaving || !profileName.trim()}>
                      {profileSaving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </form>

                  <div className="profile-account-actions">
                    <button type="button" onClick={() => void sendPasswordReset()}>
                      <Settings size={18} />
                      <span><strong>Cambiar contraseña</strong><small>Recibe un enlace en tu correo</small></span>
                      <ChevronRight size={17} />
                    </button>
                    <button type="button" onClick={() => void handleLogout()}>
                      <LogOut size={18} />
                      <span><strong>Cerrar sesión</strong><small>Salir de tu cuenta de Agenda Escolar</small></span>
                      <ChevronRight size={17} />
                    </button>
                  </div>
                  {profileMessage && <p className="profile-feedback success" role="status">{profileMessage}</p>}
                  {profileError && <p className="profile-feedback error" role="alert">{profileError}</p>}
                  {logoutError && <p className="auth-error" role="alert">{logoutError}</p>}
                </div>
              </div>
            </PageHeader>
          )}

          <footer className="footer">
            <span>Agenda Escolar · Plataforma académica</span>

            <span>
              <span className="online-dot" />
              Fase 2 · Autenticación
            </span>
          </footer>
        </div>
      </main>

      {modal && (
        <div
          className="modal-backdrop"
          onClick={closeModal}
        >
          <div
            className="modal-card"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>
                  {modal === 'task' ? (editingTaskId ? 'Editar tarea' : 'Nueva tarea') : (editingSubjectId ? 'Editar materia' : 'Nueva materia')}
                </h2>

                <p>
                  {modal === 'task'
                    ? (editingTaskId ? 'Modifica los datos de tu tarea.' : 'Registra una actividad para tu agenda.')
                    : (editingSubjectId ? 'Modifica los datos de tu materia.' : 'Agrega una asignatura a tu espacio.')}
                </p>
              </div>

              <button
                className="icon-button"
                onClick={closeModal}
                aria-label="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </div>

            {modal === 'task' ? (
              <form onSubmit={saveTask} className="form-fields">
                <label>
                  Nombre de la tarea

                  <input
                    required
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    placeholder="Ej. Entregar proyecto final"
                    autoFocus
                  />
                </label>

                <label>
                  Materia

                  <select
                    required
                    value={taskSubject}
                    onChange={e => setTaskSubject(e.target.value)}
                  >
                    <option value="">Selecciona una materia</option>

                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>

                {subjects.length === 0 && (
                  <p className="form-hint">
                    Primero agrega una materia para asignarle la tarea.
                  </p>
                )}

                <label>
                  Fecha de entrega

                  <input
                    type="date"
                    required
                    value={taskDate}
                    onChange={e => setTaskDate(e.target.value)}
                  />
                </label>

                <label>
                  Hora de entrega
                  <input
                    type="time"
                    required
                    value={taskTime}
                    onChange={e => setTaskTime(e.target.value)}
                  />
                </label>

                <label>
                  Descripción
                  <span className="optional">(opcional)</span>

                  <textarea
                    rows={3}
                    value={taskDescription}
                    onChange={e => setTaskDescription(e.target.value)}
                    placeholder="Detalles de la actividad..."
                  />
                </label>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={closeModal}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={subjects.length === 0}
                  >
                    {editingTaskId ? <Pencil size={17} /> : <Plus size={17} />}
                    {editingTaskId ? 'Guardar cambios' : 'Crear tarea'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={saveSubject} className="form-fields">
                <label>
                  Nombre de la materia

                  <input
                    required
                    value={subjectName}
                    onChange={e => setSubjectName(e.target.value)}
                    placeholder="Ej. Ingeniería de Software"
                    autoFocus
                  />
                </label>

                <label>
                  Color de la materia
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                    {colors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSubjectColor(color)}
                        aria-label={`Seleccionar color ${color}`}
                        aria-pressed={subjectColor === color}
                        style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: color, cursor: 'pointer',
                          border: subjectColor === color ? '3px solid #1f2937' : '2px solid transparent',
                          outline: subjectColor === color ? '2px solid #ffffff' : 'none',
                          boxShadow: '0 0 0 1px #d1d5db',
                        }}
                      />
                    ))}
                  </div>
                </label>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={closeModal}
                  >
                    Cancelar
                  </button>

                  <button type="submit" className="primary-button">
                    {editingSubjectId ? <Pencil size={17} /> : <Plus size={17} />}
                    {editingSubjectId ? 'Guardar cambios' : 'Agregar materia'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  note,
  icon,
  type
}: {
  title: string
  value: number
  note: string
  icon: ReactNode
  type: string
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{title}</span>
        <div className={`stat-icon ${type}`}>{icon}</div>
      </div>

      <strong className="stat-number">{value}</strong>
      <span className="stat-note">{note}</span>
    </div>
  )
}

function QuickAction({
  icon,
  title,
  text,
  type,
  onClick
}: {
  icon: ReactNode
  title: string
  text: string
  type: string
  onClick: () => void
}) {
  return (
    <button onClick={onClick}>
      <div className={`quick-icon ${type}`}>{icon}</div>

      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>

      <ArrowRight size={17} />
    </button>
  )
}

function PageHeader({
  eyebrow,
  title,
  description,
  action,
  children
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <section className="page-header">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>

        {action}
      </section>

      {children}
    </>
  )
}

function EmptyState({
  icon,
  title,
  text,
  action
}: {
  icon: ReactNode
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-illustration">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}

function TaskRow({
  task,
  subject,
  prettyDate,
  onToggle,
  onDelete,
  onEdit
}: {
  task: Task
  subject?: Subject
  prettyDate: (value: string) => string
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
}) {
  return (
    <div className={`task-row ${task.completed ? 'task-done' : ''}`}>
      <button
        className={`check-button ${task.completed ? 'checked' : ''}`}
        onClick={() => onToggle(task.id)}
        aria-label={task.completed ? 'Marcar pendiente' : 'Completar tarea'}
      >
        {task.completed && <Check size={15} />}
      </button>

      <div className="task-details">
        <strong>{task.title}</strong>

        <span>
          <i
            className="subject-inline-dot"
            style={{ background: subject?.color || '#9aa4b2' }}
          />

          {subject?.name || 'Sin materia'}
          {' · '}
          Entrega {prettyDate(task.date)}{task.time ? ` a las ${task.time}` : ''}
        </span>
      </div>

      <span className={`task-status ${task.completed ? 'status-done' : ''}`}>
        {task.completed ? 'Completada' : 'Pendiente'}
      </span>

      <button
        className="icon-button"
        onClick={() => onEdit(task.id)}
        aria-label="Editar tarea"
        title="Editar tarea"
      >
        <Pencil size={16} />
      </button>

      <button
        className="icon-button delete-button"
        onClick={() => onDelete(task.id)}
        aria-label="Eliminar tarea"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

function SubjectGrid({
  subjects,
  tasks,
  onDelete,
  onEdit
}: {
  subjects: Subject[]
  tasks: Task[]
  onDelete: (id: string) => void
  onEdit: (id: string) => void
}) {
  return (
    <div className="subject-grid">
      {subjects.map(subject => {
        const count = tasks.filter(
          task => task.subjectId === subject.id && !task.completed
        ).length

        const total = tasks.filter(
          task => task.subjectId === subject.id
        ).length

        return (
          <div className="subject-card" key={subject.id}>
            <div
              className="subject-banner"
              style={{ background: subject.color }}
            />

            <div className="subject-card-body">
              <div
                className="subject-card-icon"
                style={{
                  background: `${subject.color}18`,
                  color: subject.color
                }}
              >
                <BookOpen size={21} />
              </div>

              <div className="subject-card-info">
                <strong>{subject.name}</strong>
                <span>
                  {count} pendientes · {total} actividades
                </span>
              </div>

              <button
                className="icon-button"
                onClick={() => onEdit(subject.id)}
                aria-label={`Editar ${subject.name}`}
                title="Editar materia"
              >
                <Pencil size={16} />
              </button>

              <button
                className="icon-button delete-button"
                onClick={() => onDelete(subject.id)}
                aria-label={`Eliminar ${subject.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="subject-card-footer">
              <span>Espacio de materia</span>
              <ArrowRight size={16} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default App
