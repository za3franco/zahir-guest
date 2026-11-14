// Every error message a person can see from the server, in French and English, in one place.
//
// - `apiError(lang, key)` answers with the message in the user's language, the HTTP status the old code used and a
//   `code` (the key, or the code the caller names) that the app can react to. Texts are for people; the offline sync
//   engine and the screens look at the status and the `code`, never at the text.
// - `serverError(lang, err, where)` is for unexpected failures (database, Stripe, storage): the real message goes to
//   the server logs only, the user gets a translated, neutral text. Raw database messages never reach the screen.
// - Routes that only a robot reads (Stripe and YouCan Pay webhooks, scheduled tasks) keep their English answers.
import { NextResponse } from 'next/server'

export type Lang = 'en' | 'fr'

/** Language of a signed-in user (their FR / EN choice, stored in users.default_language). */
export function langOf(user: { default_language?: string | null } | null | undefined): Lang {
  return user?.default_language === 'en' ? 'en' : 'fr'
}

/** Language for a public route (no signed-in user): the one the page sends, else the browser's, else French. */
export function requestLang(request: Request, bodyLang?: unknown): Lang {
  if (bodyLang === 'en' || bodyLang === 'fr') return bodyLang
  return (request.headers.get('accept-language') ?? '').trim().toLowerCase().startsWith('en') ? 'en' : 'fr'
}

type Entry = { status: number; en: string; fr: string }
function define<T extends Record<string, Entry>>(messages: T): T { return messages }

export const MESSAGES = define({
  // ── General ──────────────────────────────────────────────────────────────
  forbidden: { status: 403, en: 'You are not allowed to do this.', fr: "Vous n'avez pas le droit de faire cela." },
  invalid_request: { status: 400, en: 'Invalid request. Please check the information and try again.', fr: 'Demande invalide. Vérifiez les informations puis réessayez.' },
  not_found: { status: 404, en: 'Not found.', fr: 'Introuvable.' },
  too_many_attempts: { status: 429, en: 'Too many attempts. Please wait an hour and try again.', fr: 'Trop de tentatives. Patientez une heure puis réessayez.' },
  invalid_email: { status: 400, en: 'Please enter a valid email address.', fr: 'Veuillez saisir une adresse email valide.' },
  server_error: { status: 500, en: 'Something went wrong on our side. Please try again.', fr: 'Une erreur est survenue de notre côté. Veuillez réessayer.' },
  save_failed: { status: 500, en: 'Your changes could not be saved. Please try again.', fr: "Vos modifications n'ont pas pu être enregistrées. Veuillez réessayer." },
  nothing_to_update: { status: 400, en: 'Nothing to update.', fr: 'Rien à modifier.' },
  file_invalid: { status: 400, en: 'The file is missing, empty or larger than 4 MB.', fr: 'Le fichier est absent, vide ou dépasse 4 Mo.' },
  file_unreadable: { status: 400, en: 'This file could not be read.', fr: "Ce fichier n'a pas pu être lu." },

  // ── Things that cannot be found ─────────────────────────────────────────
  audit_not_found: { status: 404, en: 'Audit not found.', fr: 'Audit introuvable.' },
  workspace_not_found: { status: 404, en: 'Workspace not found.', fr: 'Espace introuvable.' },
  user_not_found: { status: 404, en: 'User not found.', fr: 'Utilisateur introuvable.' },
  client_not_found: { status: 404, en: 'Client not found.', fr: 'Client introuvable.' },
  report_not_found: { status: 404, en: 'Report not found.', fr: 'Rapport introuvable.' },

  // ── Audit (also read by the phone in offline mode: keep the keys, they are sent as `code`) ──
  audit_closed: { status: 409, en: 'This audit has already been submitted and can no longer be changed.', fr: 'Cet audit a déjà été soumis et ne peut plus être modifié.' },
  unknown_standard: { status: 400, en: 'This question is no longer part of the questionnaire.', fr: "Cette question ne fait plus partie du questionnaire." },
  unknown_section: { status: 400, en: 'This section is no longer part of the questionnaire.', fr: 'Cette section ne fait plus partie du questionnaire.' },
  audit_not_submittable: { status: 400, en: 'This audit cannot be submitted in its current state.', fr: "Cet audit ne peut pas être soumis dans son état actuel." },
  no_scores: { status: 400, en: 'No scores yet. Submit the audit first.', fr: "Pas encore de notes. Soumettez d'abord l'audit." },

  // ── Campaigns ───────────────────────────────────────────────────────────
  status_admin_only: { status: 403, en: 'Only administrators can move a campaign back to an earlier status.', fr: 'Seuls les administrateurs peuvent ramener une campagne à un statut précédent.' },
  status_transition: { status: 400, en: 'This status change is not possible.', fr: "Ce changement de statut n'est pas possible." },
  campaign_published: { status: 400, en: 'A published campaign cannot be deleted. Unpublish it first.', fr: "Une campagne publiée ne peut pas être supprimée. Dépubliez-la d'abord." },

  // ── Questionnaires ──────────────────────────────────────────────────────
  structure_conflict: { status: 409, en: 'This questionnaire changed in the meantime. Reload the page and try again.', fr: "Ce questionnaire a changé entre-temps. Rechargez la page puis réessayez." },
  import_failed: { status: 500, en: 'The questionnaire could not be created. Nothing was saved.', fr: "Le questionnaire n'a pas pu être créé. Rien n'a été enregistré." },

  // ── People ──────────────────────────────────────────────────────────────
  cannot_remove_self: { status: 400, en: 'You cannot remove yourself.', fr: 'Vous ne pouvez pas vous supprimer vous-même.' },
  access_role_invalid: { status: 400, en: 'Access only applies to client, property and department managers.', fr: "L'accès ne concerne que les responsables de client, d'établissement et de département." },
  missing_fields: { status: 400, en: 'Please fill in all required fields.', fr: 'Veuillez remplir tous les champs obligatoires.' },
  invalid_role: { status: 400, en: 'Invalid role.', fr: 'Rôle invalide.' },
  invalid_name: { status: 400, en: 'Please enter a valid name.', fr: 'Veuillez saisir un nom valide.' },
  invalid_language: { status: 400, en: 'Invalid language.', fr: 'Langue invalide.' },
  email_exists: { status: 409, en: 'A user with this email already exists.', fr: 'Un utilisateur avec cet email existe déjà.' },
  message_required: { status: 400, en: 'Please write a message.', fr: 'Veuillez écrire un message.' },
  message_too_long: { status: 400, en: 'Your message is too long.', fr: 'Votre message est trop long.' },
  send_failed: { status: 500, en: 'Your message could not be sent. Please try again.', fr: "Votre message n'a pas pu être envoyé. Veuillez réessayer." },

  // ── Billing ─────────────────────────────────────────────────────────────
  invalid_plan: { status: 400, en: 'Invalid plan.', fr: 'Forfait invalide.' },
  checkout_unavailable: { status: 500, en: 'Payment page unavailable. Please try again.', fr: 'Page de paiement indisponible. Veuillez réessayer.' },
  change_failed: { status: 500, en: 'The plan change failed. Nothing was changed. Please try again.', fr: "Le changement d'offre a échoué. Rien n'a été modifié. Veuillez réessayer." },
  card_declined: { status: 402, en: 'Your card was declined, so nothing was changed. Update your card in the billing portal, then try again.', fr: "Votre carte a été refusée, rien n'a été modifié. Mettez à jour votre carte dans le portail de facturation, puis réessayez." },
  portal_unavailable: { status: 500, en: 'Billing portal unavailable. Please try again.', fr: 'Portail de facturation indisponible. Veuillez réessayer.' },

  // ── Super admin (internal tool, same language rule as everything else) ──
  invalid_tenant: { status: 400, en: 'Invalid workspace.', fr: 'Espace invalide.' },
  internal_workspace: { status: 400, en: 'This action is not possible on the internal workspace.', fr: "Cette action n'est pas possible sur l'espace interne." },
  tenant_fields_required: { status: 400, en: 'Company, admin name, a valid email and a plan are required.', fr: "L'entreprise, le nom de l'administrateur, un email valide et une offre sont obligatoires." },
  contract_value: { status: 400, en: 'Contract value must be a positive number.', fr: 'La valeur du contrat doit être un nombre positif.' },
  tenant_create_failed: { status: 500, en: 'Could not create the workspace. Nothing was saved.', fr: "L'espace n'a pas pu être créé. Rien n'a été enregistré." },
  confirm_name: { status: 400, en: 'Type the exact workspace name to confirm.', fr: "Saisissez le nom exact de l'espace pour confirmer." },
  stripe_cancel_failed: { status: 502, en: 'Stripe could not cancel the subscription. Nothing was deleted.', fr: "Stripe n'a pas pu annuler l'abonnement. Rien n'a été supprimé." },
  delete_stopped: { status: 500, en: 'Deletion stopped at step "{step}". See the server logs.', fr: 'La suppression s\'est arrêtée à l\'étape « {step} ». Voir les journaux du serveur.' },
  already_paying: { status: 400, en: 'This workspace already pays for a plan.', fr: 'Cet espace paie déjà une offre.' },
})

export type ErrorKey = keyof typeof MESSAGES

export type ApiErrorOptions = {
  /** Overrides the status of the catalogue (rarely needed). */
  status?: number
  /** Replaces `{name}` placeholders in the text. */
  params?: Record<string, string | number>
  /** The `code` sent with the text; defaults to the key. Keep the code an existing client already reads. */
  code?: string
  /** More fields for the JSON body (for example `status` of an audit). */
  extra?: Record<string, unknown>
}

/** The text of a message in a language (for the rare place that needs a string rather than a response). */
export function errorText(lang: Lang, key: ErrorKey, params?: Record<string, string | number>): string {
  const text: string = MESSAGES[key][lang]
  return params ? text.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? '')) : text
}

/** JSON error answer in the user's language: `{ error: <text>, code }`, with the status of the catalogue. */
export function apiError(lang: Lang, key: ErrorKey, opts: ApiErrorOptions = {}): NextResponse {
  return NextResponse.json(
    { error: errorText(lang, key, opts.params), code: opts.code ?? key, ...opts.extra },
    { status: opts.status ?? MESSAGES[key].status }
  )
}

/** Unexpected failure: log the real reason for us, show a translated neutral message to the person. */
export function serverError(lang: Lang, err: unknown, where: string, key: ErrorKey = 'server_error', opts: ApiErrorOptions = {}): NextResponse {
  const reason = err instanceof Error ? err.message
    : err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message)
    : String(err ?? 'unknown')
  console.error(`[${where}]`, reason)
  return apiError(lang, key, opts)
}
