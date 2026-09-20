import { useEffect, useRef, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, LoaderCircle, X } from 'lucide-react'
import { requestJSON, type Person } from './api'

type Props = { person: Person; onClose: () => void; onSaved: (name: string) => void }

export function CapacityEditor({ person, onClose, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (weeklyHours: number) =>
      requestJSON(`/api/people/${person.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyHours }),
      }),
    onSuccess: async () => {
      // Every cached range depends on this value, including ranges not on screen.
      await queryClient.invalidateQueries({ queryKey: ['capacity'] })
      onSaved(person.name)
      onClose()
    },
  })

  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!mutation.isPending && event.currentTarget.reportValidity()) {
      mutation.mutate(Number(new FormData(event.currentTarget).get('weeklyHours')))
    }
  }

  return (
    <dialog
      ref={dialog}
      className="capacity-dialog"
      aria-labelledby="edit-title"
      aria-describedby="edit-person edit-scope"
      onCancel={(event) => {
        if (mutation.isPending) event.preventDefault()
        else onClose()
      }}
    >
      <form onSubmit={save} aria-busy={mutation.isPending}>
        <div className="dialog-heading">
          <h2 id="edit-title">Edit capacity</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close editor"
            title="Close editor"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            <X size={18} />
          </button>
        </div>
        <p id="edit-person" className="edit-person">
          {person.name}
        </p>
        <label className="hours-field" htmlFor="weekly-hours">
          Hours per week
        </label>
        <div className="hours-input">
          <input
            id="weekly-hours"
            name="weeklyHours"
            type="number"
            min="0"
            max="168"
            step="any"
            required
            autoFocus
            defaultValue={person.weeklyHours}
            disabled={mutation.isPending}
          />
          <span>h / week</span>
        </div>
        <p id="edit-scope" className="edit-scope">
          Applies to all weeks, including past dates. Partial weeks are prorated.
        </p>
        {mutation.isError && (
          <p className="error" role="alert">
            {mutation.error.message}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancel
          </button>
          <button type="submit" className="button primary" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <LoaderCircle size={16} className="spinning" />
            ) : (
              <Check size={16} />
            )}{' '}
            {mutation.isPending ? 'Saving...' : 'Save capacity'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
