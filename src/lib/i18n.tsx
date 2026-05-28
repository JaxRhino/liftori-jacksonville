import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from './supabase'

export type Lang = 'en' | 'es'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: StringKey) => string
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

const STORAGE_KEY = 'jax-lang'

export const STRINGS = {
  'header.cityOfJacksonville':   { en: 'City of Jacksonville',           es: 'Ciudad de Jacksonville' },
  'header.poweredByLiftori':     { en: 'Powered by Liftori',             es: 'Impulsado por Liftori' },
  'header.signIn':               { en: 'Sign in',                        es: 'Iniciar sesion' },
  'header.signOut':              { en: 'Sign out',                       es: 'Cerrar sesion' },
  'header.citizen':              { en: 'citizen',                        es: 'ciudadano' },
  'footer.tagline':              { en: 'City of Jacksonville Citizen Services - 630-CITY (904-630-2489) - Demo build by Liftori, LLC', es: 'Servicios al Ciudadano de la Ciudad de Jacksonville - 630-CITY (904-630-2489) - Demostracion por Liftori, LLC' },

  'nav.dashboard':               { en: 'Dashboard',                      es: 'Panel' },
  'nav.cases':                   { en: 'Cases',                          es: 'Casos' },
  'nav.teamChat':                { en: 'Team chat',                      es: 'Chat de equipo' },
  'nav.calendar':                { en: 'Calendar',                       es: 'Calendario' },
  'nav.notes':                   { en: 'Notes',                          es: 'Notas' },
  'nav.tasks':                   { en: 'Tasks',                          es: 'Tareas' },
  'nav.email':                   { en: 'Email',                          es: 'Correo' },
  'nav.meet':                    { en: 'Meet',                           es: 'Reunirse' },
  'nav.knowledge':               { en: 'Knowledge',                      es: 'Base de conocimiento' },
  'nav.workspace':               { en: 'Workspace',                      es: 'Espacio de trabajo' },
  'nav.workspaceCaption':        { en: 'One stop for everything you do.', es: 'Un solo lugar para todo lo que haces.' },

  'landing.demoBadge':           { en: 'Demo Preview - City of Jacksonville', es: 'Demostracion - Ciudad de Jacksonville' },
  'landing.heroTitle1':          { en: 'A modern',                       es: 'Una' },
  'landing.heroTitleHighlight':  { en: 'citizen platform',               es: 'plataforma ciudadana moderna' },
  'landing.heroTitle2':          { en: ' - and a desktop your employees will actually thank you for.', es: ' - y un escritorio de trabajo que tus empleados si te van a agradecer.' },
  'landing.heroBody':            { en: 'Liftori is the AI-native alternative to Salesforce Public Sector. Built on the same Azure stack Mayor Deegan already champions. Live in six weeks, not six years.', es: 'Liftori es la alternativa nativa de IA a Salesforce Public Sector. Construido sobre la misma plataforma Azure que la Alcaldesa Deegan ya promueve. En vivo en seis semanas, no en seis anos.' },
  'landing.signinDemo':          { en: 'Sign in to demo',                es: 'Iniciar sesion en la demostracion' },
  'landing.createCitizen':       { en: 'Create a citizen account',       es: 'Crear cuenta de ciudadano' },
  'landing.viewTransparency':    { en: 'View transparency dashboard',    es: 'Ver panel de transparencia' },
  'landing.demoNote':            { en: 'Demo data only. Not a live City of Jacksonville system. Production deployment pending procurement award.', es: 'Solo datos de demostracion. No es un sistema en vivo de la Ciudad de Jacksonville. Despliegue de produccion pendiente de adjudicacion.' },
  'landing.what1':               { en: 'What Oracle AgentWeb does not do', es: 'Lo que Oracle AgentWeb no hace' },
  'landing.what2':               { en: 'Your employees deserve better tools.', es: 'Tus empleados merecen mejores herramientas.' },
  'landing.what3':               { en: 'MyJax citizens see a paginated FAQ. The CSRs working those cases see fourteen empty form fields, a Last Name customer search, and a Refresh button. We built the alternative.', es: 'Los ciudadanos de MyJax ven preguntas frecuentes paginadas. Los agentes que trabajan esos casos ven catorce campos vacios, una busqueda por apellido y un boton de Actualizar. Construimos la alternativa.' },
  'landing.pillar1.t':           { en: 'Real-time team chat in every case', es: 'Chat de equipo en tiempo real en cada caso' },
  'landing.pillar1.b':           { en: 'No more pivoting to Teams or hallway conversations. Agents mention coworkers, react with emoji, and resolve cases together inside the case itself.', es: 'Se acabo cambiar a Teams o las conversaciones de pasillo. Los agentes mencionan a colegas, reaccionan con emoji y resuelven casos juntos dentro del propio caso.' },
  'landing.pillar2.t':           { en: 'One-click video calls from any case', es: 'Videollamadas de un clic desde cualquier caso' },
  'landing.pillar2.b':           { en: 'Pull a supervisor into a tricky code-enforcement call. Loop in a field crew on a damaged hydrant. Optional citizen video for visual issues.', es: 'Incluye a un supervisor en una llamada complicada de cumplimiento de codigo. Suma a una cuadrilla de campo por un hidrante danado. Video opcional con el ciudadano para asuntos visuales.' },
  'landing.pillar3.t':           { en: 'Live updates - no refresh button', es: 'Actualizaciones en vivo - sin boton de Actualizar' },
  'landing.pillar3.b':           { en: 'When a field crew updates status from the truck, every agent watching that case sees it within 500 milliseconds. AgentWeb requires manual refresh.', es: 'Cuando una cuadrilla de campo actualiza el estado desde el camion, todos los agentes que ven ese caso lo notan en 500 milisegundos. AgentWeb requiere actualizacion manual.' },
  'landing.pillar4.t':           { en: 'Semantic search across every case', es: 'Busqueda semantica en todos los casos' },
  'landing.pillar4.b':           { en: 'Flooding on Atlantic Boulevard finds every related case in milliseconds. Replaces last-name string match with embedding-based intent search.', es: 'Inundacion en Atlantic Boulevard encuentra cada caso relacionado en milisegundos. Reemplaza la busqueda por apellido con busqueda semantica basada en embeddings.' },
  'landing.pillar5.t':           { en: 'ArcGIS-native from day one',     es: 'Nativo de ArcGIS desde el dia uno' },
  'landing.pillar5.b':           { en: 'Every case geocoded, enriched with council district and service zone, mirrored to maps.coj.net. Public dashboards consume the same feature layer.', es: 'Cada caso geolocalizado, enriquecido con distrito del concejo y zona de servicio, espejado a maps.coj.net. Los paneles publicos consumen la misma capa de datos.' },
  'landing.pillar6.t':           { en: 'Mobile agent desktop',           es: 'Escritorio del agente para movil' },
  'landing.pillar6.b':           { en: 'CSRs handle cases from their phone in the field, the break room, or the parking lot. Oracle AgentWeb is desktop-only.', es: 'Los agentes manejan casos desde su telefono en el campo, el comedor o el estacionamiento. Oracle AgentWeb es solo para escritorio.' },
  'landing.pillar7.t':           { en: 'Section 508 / WCAG 2.1 AA from day one', es: 'Seccion 508 / WCAG 2.1 AA desde el dia uno' },
  'landing.pillar7.b':           { en: 'Accessibility is not a retrofit. Keyboard navigation, screen-reader labels, color contrast, focus rings - built in.', es: 'La accesibilidad no es un parche posterior. Navegacion con teclado, etiquetas para lectores de pantalla, contraste de color y anillos de enfoque - integrados.' },
  'landing.quoteLabel':          { en: 'The Anchor Narrative',           es: 'La narrativa ancla' },
  'landing.quote':               { en: 'Boston tried Salesforce for their 311 system. Four years and four times the cost later, they walked. The City of Jacksonville does not have four years to waste.', es: 'Boston intento Salesforce para su sistema 311. Cuatro anos y cuatro veces el costo despues, abandonaron. La Ciudad de Jacksonville no tiene cuatro anos que perder.' },
  'landing.quoteTagline':        { en: 'Liftori is built so this never happens to you.', es: 'Liftori esta construido para que esto nunca te pase.' },

  'login.title':                 { en: 'Sign in',                        es: 'Iniciar sesion' },
  'login.subtitle':              { en: 'Citizens, city employees, and administrators all sign in here.', es: 'Ciudadanos, empleados municipales y administradores inician sesion aqui.' },
  'login.email':                 { en: 'Email',                          es: 'Correo electronico' },
  'login.password':              { en: 'Password',                       es: 'Contrasena' },
  'login.submit':                { en: 'Sign in',                        es: 'Iniciar sesion' },
  'login.noAccount':             { en: 'Do not have an account?',         es: 'No tienes una cuenta?' },
  'login.createOne':             { en: 'Create one',                     es: 'Crear una' },

  'signup.title':                { en: 'Create citizen account',         es: 'Crear cuenta de ciudadano' },
  'signup.subtitle':             { en: 'City employees: please ask your supervisor for an invite link.', es: 'Empleados municipales: por favor pidan a su supervisor un enlace de invitacion.' },
  'signup.fullName':             { en: 'Full Name',                      es: 'Nombre completo' },
  'signup.submit':                { en: 'Create account',                es: 'Crear cuenta' },
  'signup.haveAccount':          { en: 'Already have an account?',       es: 'Ya tienes una cuenta?' },
  'signup.passwordHint':         { en: 'At least 8 characters',          es: 'Al menos 8 caracteres' },
  'signup.successTitle':         { en: 'Account created',                es: 'Cuenta creada' },
  'signup.successBody':          { en: 'Check your email for a confirmation link, then sign in to access your citizen dashboard.', es: 'Revisa tu correo para encontrar el enlace de confirmacion, luego inicia sesion para acceder a tu panel de ciudadano.' },
  'signup.goToSignIn':           { en: 'Go to sign in',                  es: 'Ir a iniciar sesion' },

  'citizen.dashboard':           { en: 'Citizen dashboard',              es: 'Panel del ciudadano' },
  'citizen.hi':                  { en: 'Hi',                             es: 'Hola' },
  'citizen.welcomeSub':          { en: 'Everything you need from the City of Jacksonville, in one place.', es: 'Todo lo que necesitas de la Ciudad de Jacksonville, en un solo lugar.' },
  'citizen.open':                { en: 'Open',                           es: 'Abiertos' },
  'citizen.resolved':            { en: 'Resolved',                       es: 'Resueltos' },
  'citizen.aiAssistant':         { en: 'AI assistant',                   es: 'Asistente de IA' },
  'citizen.reportSomething':     { en: 'Report something?',              es: 'Reportar algo?' },
  'citizen.reportBody':          { en: 'Tell us what is going on in plain English - pothole, missed pickup, stray animal, overgrown lot. We will route it to the right department and let you track it.', es: 'Cuentanos que pasa con tus propias palabras - bache, recoleccion perdida, animal extraviado, lote sin mantenimiento. Lo enrutamos al departamento correcto y te dejamos seguirlo.' },
  'citizen.newRequest':          { en: 'Start a new request',            es: 'Iniciar nueva solicitud' },
  'citizen.orCall':              { en: 'Or call 630-CITY',               es: 'O llama al 630-CITY' },
  'citizen.yourAddress':         { en: 'Your address',                   es: 'Tu direccion' },
  'citizen.noAddress':           { en: 'No address set',                 es: 'Sin direccion registrada' },
  'citizen.councilDistrict':     { en: 'Council district',               es: 'Distrito del concejo' },
  'citizen.evacZone':            { en: 'Evac zone',                      es: 'Zona de evacuacion' },
  'citizen.hauler':              { en: 'Hauler',                         es: 'Recolector' },
  'citizen.notSet':              { en: 'Not set',                        es: 'No registrada' },
  'citizen.notAssigned':         { en: 'Not assigned',                   es: 'No asignado' },
  'citizen.myRequests':          { en: 'My service requests',            es: 'Mis solicitudes de servicio' },
  'citizen.myRequestsSub':       { en: 'Live status from every department.', es: 'Estado en vivo de cada departamento.' },
  'citizen.newReqShort':         { en: '+ New request',                  es: '+ Nueva solicitud' },
  'citizen.loading':             { en: 'Loading...',                       es: 'Cargando...' },
  'citizen.noneYet':             { en: 'No requests yet',                es: 'Aun no hay solicitudes' },
  'citizen.noneYetSub':          { en: 'Use the AI assistant to report your first issue.', es: 'Usa el asistente de IA para reportar tu primer asunto.' },
  'citizen.startNow':            { en: 'Start now',                      es: 'Empezar ahora' },
  'citizen.neighborhood':        { en: 'In your neighborhood',           es: 'En tu vecindario' },
  'citizen.neighborhoodNone':    { en: 'No recent activity nearby.',     es: 'Sin actividad reciente cerca.' },
  'citizen.neighborhoodFooter1': { en: 'Public service requests from Council District', es: 'Solicitudes de servicio publico del Distrito' },
  'citizen.helpfulArticles':     { en: 'Helpful articles',               es: 'Articulos utiles' },
  'citizen.tile.waste':          { en: 'Waste &amp; Recycling',              es: 'Basura y reciclaje' },
  'citizen.tile.wasteSub':       { en: 'Pickup, missed routes, bulk',    es: 'Recoleccion, rutas perdidas, voluminoso' },
  'citizen.tile.dumping':        { en: 'Illegal dumping',                es: 'Vertido ilegal' },
  'citizen.tile.dumpingSub':     { en: 'Send a photo + location',        es: 'Envia una foto + ubicacion' },
  'citizen.tile.faqs':           { en: 'Browse FAQs',                    es: 'Ver preguntas frecuentes' },
  'citizen.tile.faqsSub':        { en: 'articles on city services',      es: 'articulos sobre servicios municipales' },
  'citizen.tile.call':           { en: 'Call 630-CITY',                  es: 'Llamar al 630-CITY' },
  'citizen.tile.callSub':        { en: '(904) 630-2489 - Mon-Sat',       es: '(904) 630-2489 - Lun-Sab' },
  'citizen.resident':            { en: 'Resident',                       es: 'Residente' },

  'intake.back':                 { en: 'Back',                           es: 'Atras' },
  'intake.title':                { en: 'Report an issue',                es: 'Reportar un asunto' },
  'intake.subtitle':             { en: 'Tell me what is going on in plain English. I will route it to the right department and let you track it.', es: 'Cuentame que pasa con tus propias palabras. Lo enruto al departamento correcto y te dejo seguirlo.' },
  'intake.whatsGoingOn':         { en: 'What is going on?',              es: 'Que esta pasando?' },
  'intake.narrativePlaceholder': { en: 'Describe the issue - when, where, what is happening. Add as much detail as you would like.', es: 'Describe el asunto - cuando, donde, que esta pasando. Agrega tantos detalles como quieras.' },
  'intake.where':                { en: 'Where? (optional)',              es: 'Donde? (opcional)' },
  'intake.addressPlaceholder':   { en: 'Address or cross-streets in Jacksonville', es: 'Direccion o intersecciones en Jacksonville' },
  'intake.processing':           { en: 'Routing your request...',          es: 'Enrutando tu solicitud...' },
  'intake.process':              { en: 'Process with AI',                es: 'Procesar con IA' },
  'intake.orTryOne':             { en: 'Or try one of these',            es: 'O prueba una de estas' },
  'intake.trustFooter':          { en: 'Need to talk to someone live? Call 630-CITY (904-630-2489), Mon-Thu 8a-5p, Fri 8a-7p, Sat 8a-12p. Emergencies: 911.', es: 'Necesitas hablar con alguien en vivo? Llama al 630-CITY (904-630-2489), Lun-Jue 8a-5p, Vie 8a-7p, Sab 8a-12p. Emergencias: 911.' },
  'intake.error':                { en: 'We had trouble processing that. Please try rephrasing or contact 630-CITY directly.', es: 'Tuvimos problemas para procesar eso. Intenta reformularlo o contacta al 630-CITY directamente.' },
  'intake.successTitle':         { en: 'Request submitted',              es: 'Solicitud enviada' },
  'intake.ticketNumber':         { en: 'Your ticket number is',          es: 'Tu numero de boleto es' },
  'intake.redirecting':          { en: 'Redirecting to your dashboard...', es: 'Redirigiendo a tu panel...' },
  'intake.routed':               { en: 'Routed for review',              es: 'Enrutado para revision' },
  'intake.routedSub':            { en: 'Review the details below. You can edit anything before submitting.', es: 'Revisa los detalles abajo. Puedes editar cualquier cosa antes de enviar.' },
  'intake.subject':              { en: 'Subject',                        es: 'Asunto' },
  'intake.edit':                 { en: 'Edit',                           es: 'Editar' },
  'intake.done':                 { en: 'Done',                           es: 'Listo' },
  'intake.department':           { en: 'Department',                     es: 'Departamento' },
  'intake.priority':             { en: 'Priority',                       es: 'Prioridad' },
  'intake.address':              { en: 'Address',                        es: 'Direccion' },
  'intake.notProvided':          { en: 'Not provided',                   es: 'No proporcionada' },
  'intake.etaWindow':            { en: 'ETA window',                     es: 'Ventana estimada' },
  'intake.within':               { en: 'Within',                         es: 'En' },
  'intake.hours':                { en: 'hours',                          es: 'horas' },
  'intake.description':          { en: 'Description',                    es: 'Descripcion' },
  'intake.followups':            { en: 'A few quick clarifications would help', es: 'Unas aclaraciones rapidas nos ayudarian' },
  'intake.followupsFooter':      { en: 'Not required - but answering in the description gets it resolved faster.', es: 'No son requeridas - pero responder en la descripcion ayuda a resolverlo mas rapido.' },
  'intake.rewrite':              { en: 'Rewrite',                        es: 'Reescribir' },
  'intake.submit':                { en: 'Submit request',                es: 'Enviar solicitud' },
  'intake.submitting':           { en: 'Submitting...',                    es: 'Enviando...' },
  'priority.emergency':          { en: 'Emergency',                      es: 'Emergencia' },
  'priority.urgent':             { en: 'Urgent',                         es: 'Urgente' },
  'priority.high':               { en: 'High',                           es: 'Alta' },
  'priority.normal':             { en: 'Normal',                         es: 'Normal' },
  'priority.low':                { en: 'Low',                            es: 'Baja' },

  'trans.liveBadge':             { en: 'Live - updated in real time',    es: 'En vivo - actualizado en tiempo real' },
  'trans.heroTitle1':            { en: 'City of Jacksonville -',         es: 'Ciudad de Jacksonville -' },
  'trans.heroTitle2':            { en: 'Service Transparency',           es: 'Transparencia de Servicios' },
  'trans.heroBody':              { en: 'Every public service request, every department, every status - updated as it changes. No login required.', es: 'Cada solicitud de servicio publico, cada departamento, cada estado - actualizado cuando cambia. No requiere iniciar sesion.' },
  'trans.statOpen':              { en: 'Open',                           es: 'Abiertos' },
  'trans.statOpenSub':           { en: 'urgent',                         es: 'urgente(s)' },
  'trans.statActive':            { en: 'Active today',                   es: 'Activos hoy' },
  'trans.statActiveSub':         { en: 'new in last 24h',                es: 'nuevo(s) en ultimas 24h' },
  'trans.statResolved':          { en: 'Resolved',                       es: 'Resueltos' },
  'trans.statResolvedSub':       { en: 'cases',                          es: 'casos' },
  'trans.statUrgent':            { en: 'Urgent / emergency',             es: 'Urgentes / emergencia' },
  'trans.statUrgentSub':         { en: 'active',                         es: 'activo(s)' },
  'trans.activeRequests':        { en: 'Active service requests',        es: 'Solicitudes de servicio activas' },
  'trans.openCount':             { en: 'open',                           es: 'abiertos' },
  'trans.urgentCount':           { en: 'urgent - live',                  es: 'urgentes - en vivo' },
  'trans.byDepartment':          { en: 'By department',                  es: 'Por departamento' },
  'trans.recentlyResolved':      { en: 'Recently resolved',              es: 'Resueltos recientemente' },
  'trans.noResolved':            { en: 'No resolved cases yet to show.', es: 'Sin casos resueltos todavia para mostrar.' },
  'trans.poweredFooter':         { en: 'Powered by Liftori - feeding clean data to the City Power BI dashboards', es: 'Impulsado por Liftori - alimentando datos limpios a los paneles Power BI de la Ciudad' },
  'trans.backToCityHall':        { en: 'Back to City Hall',              es: 'Volver al Ayuntamiento' },
  'trans.legendPriority':        { en: 'Priority',                       es: 'Prioridad' },

  'meet.cityOfJacksonville':     { en: 'City of Jacksonville',           es: 'Ciudad de Jacksonville' },
  'meet.invite':                 { en: 'Video meeting invite',           es: 'Invitacion a reunion por video' },
  'meet.invited':                { en: 'You are invited',                 es: 'Estas invitado' },
  'meet.startsSoon':             { en: 'starts soon',                    es: 'comienza pronto' },
  'meet.minutes':                { en: 'minutes',                        es: 'minutos' },
  'meet.agenda':                 { en: 'Agenda',                         es: 'Agenda' },
  'meet.yourName':               { en: 'Your name (so attendees can identify you)', es: 'Tu nombre (para que los asistentes te identifiquen)' },
  'meet.namePlaceholder':        { en: 'Jane Doe',                       es: 'Juan Perez' },
  'meet.joinMeeting':            { en: 'Join meeting',                   es: 'Unirse a la reunion' },
  'meet.hostedBy':               { en: 'Hosted by City of Jacksonville Citizen Services - 630-CITY - Powered by Liftori', es: 'Organizado por Servicios al Ciudadano de la Ciudad de Jacksonville - 630-CITY - Impulsado por Liftori' },
  'meet.inviteNotFound':         { en: 'Invite not found',               es: 'Invitacion no encontrada' },
  'meet.inviteInvalid':          { en: 'This meeting link is invalid or has been deleted.', es: 'Este enlace de reunion no es valido o fue eliminado.' },

  'lang.english':                { en: 'English',                        es: 'Ingles' },
  'lang.spanish':                { en: 'Spanish',                        es: 'Espanol' },
  'lang.language':               { en: 'Language',                       es: 'Idioma' },
} as const

export type StringKey = keyof typeof STRINGS

function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'en'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'en' || saved === 'es') return saved
  const browser = (navigator.language || 'en').slice(0, 2).toLowerCase()
  return browser === 'es' ? 'es' : 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang)

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try { window.localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
    document.documentElement.setAttribute('lang', next)
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user?.id
      if (!uid) return
      await supabase.from('profiles').update({ language: next }).eq('id', uid)
    })()
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user?.id
      if (!uid) return
      const { data: row } = await supabase.from('profiles').select('language').eq('id', uid).maybeSingle()
      const dbLang = (row as { language?: string } | null)?.language
      if ((dbLang === 'en' || dbLang === 'es') && dbLang !== lang) {
        setLangState(dbLang)
        try { window.localStorage.setItem(STORAGE_KEY, dbLang) } catch { /* ignore */ }
        document.documentElement.setAttribute('lang', dbLang)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const t = useCallback((key: StringKey) => {
    const row = STRINGS[key]
    if (!row) return key
    return row[lang] || row.en
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return ctx
}

export function useT() {
  return useLanguage().t
}
