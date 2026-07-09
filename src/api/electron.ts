import { getSession, normalizeRole } from '../auth'

function getActor() {
	const session = getSession()
	return {
		username: session?.username || '',
		role: normalizeRole(session?.role || '')
	}
}

function withActor<T extends Record<string, any>>(payload: T | null | undefined) {
	return {
		...(payload || {} as T),
		actor: getActor()
	}
}

export const api = {
	...window.api,
	crearReserva: (data: any) => window.api.crearReserva(withActor(data)),
	borrarReserva: (data: any) => window.api.borrarReserva(typeof data === 'object' ? { ...data, actor: getActor() } : { id: data, actor: getActor() }),
	moverReserva: (data: any) => window.api.moverReserva(withActor(data)),
	actualizarEstadoReserva: (id: number, estado: string) => window.api.actualizarEstadoReserva(withActor({ id, estado })),
	actualizarReserva: (data: any) => window.api.actualizarReserva(withActor(data)),
	actualizarNotasReserva: (idOrPayload: any, notas?: string) => {
		const payload = typeof idOrPayload === 'object' && idOrPayload !== null
			? { ...idOrPayload, actor: getActor() }
			: { id: idOrPayload, notas, actor: getActor() }
		return window.api.actualizarNotasReserva(payload)
	},
	crearApronte: (data: any) => window.api.crearApronte(withActor(data)),
	borrarApronte: (data: any) => window.api.borrarApronte(typeof data === 'object' ? { ...data, actor: getActor() } : { id: data, actor: getActor() }),
	actualizarApronte: (data: any) => window.api.actualizarApronte(withActor(data))
}

export const ipc = window.ipcRenderer
