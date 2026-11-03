
import { initializeApp, cert } from 'firebase-admin/app'
import {
  getFirestore,
  FieldValue,
  Timestamp
} from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

const secret = process.env.FIREBASE_SERVICE_ACCOUNT

if (!secret) {
  console.error('Falta FIREBASE_SERVICE_ACCOUNT.')
  process.exit(1)
}

let credentials

try {
  credentials = JSON.parse(secret)
} catch {
  console.error('FIREBASE_SERVICE_ACCOUNT no es un JSON valido.')
  process.exit(1)
}

initializeApp({
  credential: cert(credentials)
})

const db = getFirestore()
const messaging = getMessaging()

const dryRun = process.argv.includes('--dry-run')
const now = Date.now()

const graceMs = 3 * 60 * 60 * 1000
const lockMs = 10 * 60 * 1000

const reminders = [
  { kind: '24h', hours: 24 },
  { kind: '3h', hours: 3 }
]

const stats = {
  users: 0,
  tasks: 0,
  eligible: 0,
  sent: 0,
  skipped: 0,
  errors: 0
}

function formatDate(ms) {
  return new Date(ms).toISOString()
}

async function reserve(ref, dueAt) {
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    const data = snap.data()

    if (
      data?.dueAt === dueAt &&
      data?.status === 'sent'
    ) {
      return false
    }

    if (
      data?.dueAt === dueAt &&
      data?.status === 'processing' &&
      data.lockUntil?.toMillis() > Date.now()
    ) {
      return false
    }

    tx.set(ref, {
      status: 'processing',
      dueAt,
      lockUntil: Timestamp.fromMillis(
        Date.now() + lockMs
      ),
      updatedAt: FieldValue.serverTimestamp()
    })

    return true
  })
}

async function sendReminder(userRef, taskRef, task, kind) {
  const reminderRef = taskRef.collection('reminders').doc(kind)

  if (dryRun) {
    console.log(
      `[SIMULACION] ${kind}: ${task.title} (${taskRef.path})`
    )
    return
  }

  const reserved = await reserve(reminderRef, task.dueAt)

  if (!reserved) {
    console.log(
      `Recordatorio ya enviado o en proceso: ${kind} - ${task.title}`
    )
    stats.skipped++
    return
  }

  try {
    const fresh = await taskRef.get()
    const current = fresh.data()

    if (
      !fresh.exists ||
      current?.completed !== false ||
      current?.dueAt !== task.dueAt
    ) {
      await reminderRef.delete()
      stats.skipped++
      return
    }

    const tokenDocs = await userRef
      .collection('fcmTokens')
      .get()

    const tokens = [
      ...new Set(
        tokenDocs.docs
          .map(doc => doc.data().token)
          .filter(token =>
            typeof token === 'string' &&
            token.length > 0
          )
      )
    ]

    if (tokens.length === 0) {
      console.log(
        `Sin dispositivos registrados: ${userRef.id}`
      )
      await reminderRef.delete()
      stats.skipped++
      return
    }

    let successes = 0

    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500)

      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        data: {
          title: kind === '24h'
            ? 'Tu tarea vence mañana'
            : 'Tu tarea vence en 3 horas',
          body: `${task.title} esta pendiente de entrega.`,
          url: '/?page=Tareas'
        },
        webpush: {
          headers: {
            Urgency: 'high'
          }
        }
      })

      successes += response.successCount

      response.responses.forEach((result, index) => {
        if (!result.success) {
          console.error(
            `Error en dispositivo ${i + index + 1}:`,
            result.error?.code
          )
        }
      })
    }

    if (successes === 0) {
      console.log(
        `No se pudo enviar: ${kind} - ${task.title}`
      )
      await reminderRef.delete()
      stats.errors++
      return
    }

    await reminderRef.set({
      status: 'sent',
      dueAt: task.dueAt,
      sentAt: FieldValue.serverTimestamp(),
      successCount: successes
    })

    stats.sent += successes

    console.log(
      `Enviado ${kind}: ${task.title} (${successes} dispositivo(s))`
    )
  } catch (error) {
    console.error(
      `Error procesando ${taskRef.path} (${kind}):`,
      error
    )
    stats.errors++
    process.exitCode = 1
  }
}

async function main() {
  console.log('====================================')
  console.log('AGENDA ESCOLAR - RECORDATORIOS')
  console.log(`Fecha UTC: ${formatDate(now)}`)
  console.log(`Simulacion: ${dryRun ? 'SI' : 'NO'}`)
  console.log('====================================')

  const users = await db.collection('users').listDocuments()

  stats.users = users.length

  for (const userRef of users) {
    const tasks = await userRef
      .collection('tasks')
      .where('completed', '==', false)
      .get()

    stats.tasks += tasks.size

    for (const taskDoc of tasks.docs) {
      const task = taskDoc.data()

      if (typeof task.dueAt !== 'string') {
        continue
      }

      const due = Date.parse(task.dueAt)

      if (!Number.isFinite(due)) {
        console.log(
          `Fecha invalida: ${taskDoc.ref.path}`
        )
        continue
      }

      const hoursRemaining = (due - now) / 3600000

      console.log(
        `Tarea: ${task.title} | Faltan ${hoursRemaining.toFixed(2)} horas`
      )

      for (const { kind, hours } of reminders) {
        const target = due - hours * 3600000
        const delay = now - target

        if (delay < 0 || delay >= graceMs) {
          continue
        }

        // Evita enviar el aviso de 24h cuando
        // ya se esta demasiado cerca de la entrega.
        if (kind === '24h' && hoursRemaining <= 3) {
          continue
        }

        // No enviar avisos cuando la tarea ya vencio.
        if (hoursRemaining <= 0) {
          continue
        }

        stats.eligible++

        await sendReminder(
          userRef,
          taskDoc.ref,
          task,
          kind
        )
      }
    }
  }

  console.log('====================================')
  console.log('RESUMEN')
  console.log(`Usuarios: ${stats.users}`)
  console.log(`Tareas pendientes: ${stats.tasks}`)
  console.log(`Recordatorios elegibles: ${stats.eligible}`)
  console.log(`Envios exitosos a dispositivos: ${stats.sent}`)
  console.log(`Omitidos: ${stats.skipped}`)
  console.log(`Errores: ${stats.errors}`)
  console.log('====================================')
}

main().catch(error => {
  console.error('Error general:', error)
  process.exitCode = 1
})
